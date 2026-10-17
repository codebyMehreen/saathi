---
doc: spec
status: approved
---
<!-- Written by the agent from Mehreen's brief (stack: React + Vite + Tailwind,
     Node + Express, Gemini API), under her delegation (18 Oct 2026).
     Approved under that delegation; Mehreen can reopen it. -->

# Saathi — Technical Spec

## How This Works, In Plain Language
Saathi has two pieces that run on your laptop.

- **The web page** (React, styled with Tailwind) shows the customer's phone chat on the left and the bank side (officer desk, activity log) on the right. When the customer attaches a photo, the page shrinks it to a sensible size and sends it with their message to the server.
- **The server** (Node + Express) holds the mock bank: one customer, one account, the payments and the log, all in memory. It sends the photo and message to **Gemini**, which reads the bill and answers in a fixed JSON shape: what language the customer wrote in, what they want, the bill details, a reply and its reason. The server then applies the bank's rules itself (overdue amount, enough balance, already paid, the PKR 25,000 limit) and creates a payment card.

The important split: **Gemini reads and explains; the server's own code decides.** The AI never approves, routes or moves money. That keeps the approval loop trustworthy and makes the rules easy to test without the AI.

The page asks the server for the latest state every two seconds, so when the officer approves on the right, the customer's card on the left turns green by itself. Nothing is stored on disk: restarting resets the demo.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. Page loads → `GET /api/state` → customer (masked account, balance), chat, payments, log → renders phone + bank side.
2. Customer attaches a photo / taps a sample bill → browser draws it on a canvas, exports JPEG (max 1600 px) → `POST /api/chat { text, image: { mimeType, data(base64) } }`.
3. Server logs "Customer sent a message (with photo)" → masks account/CNIC/phone numbers in the typed text → calls Gemini `generateContent` with the image, the text, today's date and a JSON response schema.
4. Gemini returns `{ language, intent, reply, reason, bill{…}, missing[] }` → server logs "Saathi read the bill" with Gemini's reason.
5. If `intent = pay_bill` and amount + reference present → `rules.preparePayment()` picks amount (late amount if overdue), checks balance and duplicates → creates payment `status: awaiting_customer` → logs "Prepared payment card". Chat gets Saathi's reply + the card. Otherwise chat gets the reply only (balance answer, ask for a clearer photo, etc.).
6. Customer taps Approve → `POST /api/payments/:id/approve` → `rules.onCustomerApprove()`: ≤ limit → `execute()` (balance −= amount, receipt `SDB-…`, status `paid`); > limit → status `pending_review`, log reason "PKR 85,000 is above the PKR 25,000 self-approval limit". Cancel → `POST /api/payments/:id/cancel`.
7. Officer taps Approve/Reject → `POST /api/payments/:id/review { decision, note }` → `execute()` or status `rejected` → Saathi posts a short status message in the customer's language (template text, no AI call).
8. Every 2 s the page polls `GET /api/state` → both sides update.

## Stack
- **Node 24 + Express 5** — server and API. https://expressjs.com/ — Mehreen's existing stack.
- **React 19 + Vite 7** — page. https://react.dev, https://vite.dev
- **Tailwind CSS 4** via `@tailwindcss/vite` — styling. https://tailwindcss.com/docs/installation/using-vite
- **Gemini API (REST, `generateContent`)** via built-in `fetch`, no SDK — fewer dependencies, structured JSON output with `responseSchema`. https://ai.google.dev/gemini-api/docs/structured-output, https://ai.google.dev/gemini-api/docs/image-understanding
- **concurrently** — one `npm run dev` starts both. https://www.npmjs.com/package/concurrently
- **node:test** (built in) — tests for the rules and masking; no test framework to install.
- Model: `GEMINI_MODEL`, default `gemini-3.5-flash-lite` (the model Mehreen's other project already uses successfully). Verify early in the build that it reads a bill photo correctly.

## Where It Runs and How Someone Tries It
- Runs locally: Node 20+ and a free Gemini API key from https://aistudio.google.com/apikey.
- Setup: `npm install` (root, installs client and server via workspaces), copy `.env.example` to `.env`, set `GEMINI_API_KEY`.
- Start: `npm run dev` → open http://localhost:5173.
- Without a key the app runs in labelled demo mode (sample bills only).
- Demo recording: the one-page layout shows customer and bank side together; record the browser window at 1280×800 or larger.
- Deployment: not planned (optional for the hackathon). `npm run build && npm start` serves the built page from Express on port 3001 if needed later.

## Look and Feel
From `prd.md > Look and Feel`. Tailwind theme tokens: brand teal `#0f766e` (teal-700) with emerald for success, amber-500 for review, rose-600 for rejected/errors, slate greys for text and surfaces, page background slate-100. Font: Inter (Google Fonts) with system fallback; Urdu strings use "Noto Nastaliq Urdu" with `dir="rtl"` and generous line-height. Rounded-2xl cards, soft shadows, spacious. Phone frame ~390 px wide with a rounded border. Tone of copy: polite, short, reassuring ("Nothing has been paid yet."). Fictional "Saathi Demo Bank"; no real bank names or colours.

## Components

### Server: app and routes (`server/src/app.js`)
Express app, JSON body limit 8 MB, routes below; serves `client/dist` in production. PRD ref: `prd.md > The Core Journey`.
- `GET /api/state` — `{ demoMode, limit, customer, messages, payments, log }` (all masked).
- `POST /api/chat` — `{ text?, image?: { mimeType, data }, sample?: 'electricity' | 'challan' }`.
- `POST /api/payments/:id/approve`, `POST /api/payments/:id/cancel` — customer.
- `POST /api/payments/:id/review` — `{ decision: 'approve' | 'reject', note }` — officer.
- `POST /api/reset` — restore starting state.

### Server: bank store (`server/src/store.js`)
In-memory mock bank: customer, account, messages, payments, log; `reset()`. `addLog(actor, action, reason)`. PRD ref: `prd.md > States and Boundaries`.

### Server: rules (`server/src/rules.js`)
Pure functions, the only place money decisions happen: `chooseAmount(bill, today)`, `preparePayment(bill, store)` (balance + duplicate checks), `onCustomerApprove(payment)`, `review(payment, decision, note)`, `execute(payment)`. Limit `APPROVAL_LIMIT = 25000` (env `APPROVAL_LIMIT` overrides). PRD ref: `prd.md > Preparing the payment card`, `prd.md > Customer approval`, `prd.md > Officer review`.

### Server: masking (`server/src/mask.js`)
`maskNumber("0412345678") → "••••••5678"`, `maskText()` finds 6+ digit runs, CNIC (`12345-1234567-1`) and phone patterns in free text and masks all but last 4. Used on typed text before Gemini and on everything in the log and API output. PRD ref: `prd.md > Activity log`.

### Server: Saathi agent (`server/src/agent.js`)
Builds the prompt (role, today's date in Asia/Karachi, the customer's masked account summary, language rules, "never claim a payment is done"), calls Gemini with `responseMimeType: application/json` and a `responseSchema`, parses and validates. Demo mode: returns stored sample answers for the two sample bills when `GEMINI_API_KEY` is missing. Status messages after approve/review use fixed templates per language (`server/src/messages.js`). PRD ref: `prd.md > Reading a bill or request`.

### Client: page (`client/src/App.jsx`)
Two-column layout, polling every 2 s, demo-mode banner, Reset demo.

### Client: customer phone (`client/src/components/Phone.jsx`, `ChatInput.jsx`, `PaymentCard.jsx`)
Chat thread, message bubbles (RTL for Urdu), attach photo, sample-bill menu, sending/reading indicator, payment card with every field, status colours and Approve/Cancel. Image resize in `client/src/lib/image.js`. PRD ref: `prd.md > Customer approval`, `prd.md > Preparing the payment card`.

### Client: officer desk (`client/src/components/OfficerDesk.jsx`)
Pending list (oldest first) with Saathi's reason and the routing reason, note box, Approve/Reject; recent decisions below. PRD ref: `prd.md > Officer review`.

### Client: activity log (`client/src/components/ActivityLog.jsx`)
Newest-first list: time (PKT), actor badge, action, reason. PRD ref: `prd.md > Activity log`.

### Sample bills (`client/public/samples/*.svg`)
Two fictional bills drawn as SVG (electricity PKR 8,450-ish, university fee challan PKR 85,000-ish), clearly marked SAMPLE, fictional companies. Sent through the same canvas → JPEG path as a real photo, so Gemini reads them like any photo.

## Data Model
All in memory in `store.js`, reset on restart or `POST /api/reset`.
- `customer`: `{ name: "Ayesha Raza", accountTitle: "Current Account", accountNumber: "0123-4567-8901-4821", balance: 185000, currency: "PKR" }` (fictional).
- `messages[]`: `{ id, from: 'customer'|'saathi', text, imageThumb?, paymentId?, language, at }`. `imageThumb` is a small data URL so the chat shows the photo.
- `payments[]`: `{ id, status: 'awaiting_customer'|'pending_review'|'paid'|'rejected'|'cancelled'|'blocked', billerName, billType, reference, customerNameOnBill, billingMonth, dueDate, amount, amountWithinDue, amountAfterDue, overdue, blockedReason?, saathiReason, routingReason?, officerNote?, receipt?, language, createdAt, decidedAt? }`.
- `log[]`: `{ id, at, actor: 'customer'|'saathi'|'rules'|'officer'|'system', action, reason?, paymentId? }`.
API output masks `reference`, `accountNumber` and names on bills (first name + initial).

## File Structure
```
saathi/
├── package.json            # npm workspaces (client, server); dev/build/start/test scripts
├── .env.example            # GEMINI_API_KEY=, GEMINI_MODEL=, APPROVAL_LIMIT=, PORT=
├── README.md               # what it is, how to run, demo flow, team
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js        # loads .env, starts Express on PORT (3001)
│   │   ├── app.js          # routes
│   │   ├── store.js        # in-memory mock bank + log
│   │   ├── rules.js        # amount, balance, duplicate, limit, execute
│   │   ├── mask.js         # masking helpers
│   │   ├── agent.js        # Gemini call, prompt, schema, demo mode
│   │   ├── messages.js     # status message templates per language
│   │   └── samples.js      # demo-mode answers for the sample bills
│   └── test/
│       ├── rules.test.js
│       ├── mask.test.js
│       └── api.test.js     # full journey through the API in demo mode
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js      # React + Tailwind plugins, /api proxy to 3001
│   ├── public/samples/     # electricity.svg, fee-challan.svg
│   └── src/
│       ├── main.jsx, App.jsx, index.css
│       ├── lib/api.js, lib/image.js, lib/format.js
│       └── components/Phone.jsx, ChatInput.jsx, PaymentCard.jsx,
│                     OfficerDesk.jsx, ActivityLog.jsx
└── devpost/                # scope, prd, spec, checklist (+ ignored learner profile)
```

## External Services and Dependencies
- **Gemini API** — `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=KEY`. Body: `contents: [{ parts: [{ text }, { inlineData: { mimeType, data } }] }]`, `generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema }`. Response text at `candidates[0].content.parts[0].text`. Key in `.env` only (gitignored). Free tier has per-minute limits; fine for a demo. Docs: https://ai.google.dev/api/generate-content
- No other external services.

## Important Failure Modes
- **Gemini misreads a number** → the card shows exactly what was read and "Nothing has been paid yet"; customer cancels and resends. The video uses a clear photo.
- **Gemini errors, quota (429) or bad key** → Saathi bubble "I couldn't reach my AI just now, please try again", logged as a system error with the cause; nothing is prepared.
- **Gemini returns malformed JSON** → treated as unreadable: Saathi asks for a clearer photo; logged.

## What Was Simplified and Why
- **In-memory store** instead of a database — the demo starts fresh; a real bank system replaces it anyway.
- **Polling every 2 s** instead of WebSockets — two views on one machine; simpler and good enough.
- **Fixed status-message templates** instead of a second AI call — faster and nothing unseen is sent to the customer.
- **Images are sent to Gemini unmasked** (only typed text is masked before the AI) — masking inside a photo needs OCR + redaction first; the application's "mask before the AI" promise is shown for text and in the log, and named here as the gap a production version closes.
- **Sample bills as fictional SVGs** — no real customer's bill in the repo or the video.

## Decisions and Open Issues
- Stack (React + Vite + Tailwind, Node + Express, Gemini) — Mehreen's choice in her brief.
- AI reads, code decides — agent recommendation following the brief's "nothing executes until the customer taps Approve"; accepted under delegation.
- REST `fetch` instead of the `@google/genai` SDK — implementation detail, fewer dependencies.
- Uncertainty to check early in the build: does `gemini-3.5-flash-lite` read amounts and long reference numbers from a phone photo reliably, and does it reply in Roman Urdu when the customer writes Roman Urdu? Check: run both sample bills and one Roman Urdu message through the real API in slice 1/2; if amounts are wrong, switch `GEMINI_MODEL` to a larger Flash model.
- Open: none blocking the build.
