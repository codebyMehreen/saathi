# Saathi · AI banking you approve

**Saathi** (ساتھی, "companion") is an AI banking assistant for customers in Pakistan who would rather write *"ye bijli ka bill pay kar do"* than dig through an English-only banking app.

Send Saathi a photo of a utility bill or fee challan, or just type what you want to pay, in **Urdu, Roman Urdu or English**. Saathi reads it with Gemini and prepares the payment as a clear card. Then the people take over:

- **Nothing is paid until the customer taps Approve.**
- **Anything above PKR 25,000 goes to a bank officer**, who approves or rejects it with a note.
- **Every step is logged with who did it and why**, including the reason Saathi gave, with account and reference numbers masked.

More safety rules, all fixed in the bank's code (`server/src/rules.js`), so the AI cannot argue past them:

- **PKR 10,000 or more takes two taps**: Approve, then "Tap again". The server checks the confirmation too.
- **A daily limit of PKR 50,000** that a customer can approve alone. A payment that would go past it goes to the officer, however small.
- **Cards expire after 15 minutes** if nobody approves them, with a countdown on the card.
- **Warnings on the card**: first payment to a new biller, a name on the bill that isn't the account holder's, a balance that would drop below PKR 5,000. They inform; they don't block.
- **An officer must give a reason to reject**, because the customer is told it in their own language.

The AI reads and explains; the bank's own code makes every money decision. Saathi can never approve, route or move money on its own.

> Proof of concept with a fictional bank ("Saathi Demo Bank"), a fictional customer and fictional sample bills. No real bank, biller or money is involved.

Built for Devpost's [Build With AI: Basics](https://learn-ai-basics.devpost.com/) hackathon, and as the proof of concept for Team Saathi's entry to the Allied Bank 5th Fintech Hackathon (theme: Agentic AI for Banking).

## What it does

| Step | Customer's phone (left) | Bank side (right) |
|---|---|---|
| 1 | Attach a bill photo (or tap **Try a sample bill**) and optionally type a message | |
| 2 | Saathi replies in the customer's language with a payment card: biller, reference (masked), month, due date, amount, account, balance after, and *Why* | Log: customer sent a photo → Saathi read the bill (its reason) → card prepared, nothing paid |
| 3 | Tap **Approve · منظور کریں** | ≤ PKR 25,000: paid, receipt, balance drops |
| 4 | Card turns amber: "With a bank officer for review" | > PKR 25,000: appears on the **Officer desk** with the bill photo, Saathi's reason and the routing reason |
| 5 | Card turns green (or red with the officer's note), and Saathi tells the customer in their language | Officer taps **Approve payment** or **Reject** with a note |
| 6 | | **Activity log**: every step, actor, and reason |

Also handled: overdue bills use the late amount, a bill already paid or waiting can't be prepared again, a payment bigger than the balance is blocked, unreadable photos get a request for a clearer one, and "balance kitna hai?" gets a straight answer.

## Privacy by design

- Typed text is masked **before** it reaches the AI: long numbers become placeholders (`[NUM1]`) and the server puts the real number back afterwards, so Gemini never sees a typed account or reference number.
- Everything the page shows and everything in the log is masked: last 4 digits only, and known full names shortened to first name + initial, even when they appear inside an AI reply or an officer's note.
- Photos are re-encoded in the browser (max 1600 px JPEG), which also strips camera metadata such as GPS location.
- Known gap, by design for a POC: the photo itself is sent to Gemini unredacted. A production version would redact personal fields on-device or with OCR before the AI step.

## Run it

Needs Node 20+ and a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env      # then put your key in GEMINI_API_KEY
npm run dev
```

Open http://localhost:5173. Without a key, Saathi runs in clearly labelled **demo mode**: the two sample bills use stored answers and real photos get an honest "AI not connected" reply.

```bash
npm test                  # rules, masking and the full journey through the API (no AI calls)
npm run build && npm start   # production: one server on http://localhost:3001
```

Optional `.env` settings: `GEMINI_MODEL` (default `gemini-3.5-flash-lite`), `APPROVAL_LIMIT` (default `25000`), `PORT` (default `3001`).

## How it's built

- **client/**: React 19 + Vite + Tailwind CSS 4. One page: the customer's phone on the left, the officer desk and activity log on the right, kept in sync by polling every 2 seconds.
- **server/**: Node + Express 5, all state in memory (restart or **Reset demo** starts fresh).
  - `agent.js` asks Gemini (one automatic retry if Gemini is briefly busy) (REST `generateContent` with a JSON `responseSchema`) to detect the language, the intent and the bill fields, and to give a one-line reason for the audit log.
  - `rules.js` is the only place that decides anything about money: amount (on time or late), balance, duplicates, the approval limit and execution.
  - `mask.js` handles masking and the placeholder swap before the AI.
  - `messages.js`: fixed status messages in three languages (no AI involved in telling a customer what happened to their money).
- **devpost/**: the planning documents written with the Devpost Learn skill pack: `scope.md`, `prd.md`, `spec.md` and the build `checklist.md`.

## Team Saathi

Mehreen Asif (lead) · Javeria Asif · Hammad Sarwar, Government College University Faisalabad.
