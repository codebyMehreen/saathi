---
doc: checklist
status: approved
---
<!-- Build order written and approved under Mehreen's delegation (18 Oct 2026). -->

# Build Checklist

Build mode: fast (Mehreen asked the agent to carry on by itself; hands-on checkpoints are hers when she records the demo)

## Slices

- [x] **1. A bill photo becomes a payment card**
  Becomes usable: Open the app, tap a sample bill or attach a photo, and Saathi replies in the customer's language with a filled payment card (nothing paid yet).
  Why now: This is the kernel and the biggest risk (can Gemini read a bill photo correctly?). Scaffold, store, agent and card all come in with it.
  PRD ref: `prd.md > The Core Journey` (steps 1-4), `prd.md > Reading a bill or request`, `prd.md > Preparing the payment card`
  Spec ref: `spec.md > Server: Saathi agent`, `spec.md > Server: bank store`, `spec.md > Server: rules`, `spec.md > Client: customer phone`, `spec.md > Sample bills`, `spec.md > File Structure`
  Build: Workspaces, Express server with `/api/state` and `/api/chat`, store, mask, agent (Gemini REST + demo mode), `preparePayment` with overdue/balance/duplicate checks, React page with phone, chat input, image resize, sample bills and payment card, Look and Feel styling.
  Verify (mechanical): `npm test` passes (rules + mask); `npm run dev` starts both; `POST /api/chat` with the electricity sample returns a payment card with the right amount (demo mode, and real Gemini when a key is present); page renders with no console errors.
  Learner check: Open http://localhost:5173, tap "Try a sample bill → Electricity", and check the card matches the bill.
  Commit: `A bill photo becomes a ready-to-approve payment card`

- [x] **2. Approve, officer review and live status**
  Becomes usable: Approve pays small bills with a receipt and lowers the balance; large ones wait on the Officer desk, where Approve/Reject updates the customer's card within seconds.
  Why now: Completes the human-approval loop, the second half of the kernel.
  PRD ref: `prd.md > Customer approval`, `prd.md > Officer review`, `prd.md > The Core Journey` (steps 5-7)
  Spec ref: `spec.md > Server: rules`, `spec.md > Server: app and routes`, `spec.md > Client: officer desk`, `spec.md > Client: page`
  Build: approve/cancel/review routes, `onCustomerApprove`, `review`, `execute`, status templates per language, OfficerDesk, polling, card status states.
  Verify (mechanical): API test runs the full journey in demo mode: electricity → approve → paid, balance −amount; challan → approve → pending_review → officer approve → paid; reject path records note; duplicate blocked.
  Learner check: Approve the electricity bill, then approve the fee challan, switch to Officer desk and approve it; watch the customer card turn green.
  Commit: `Customers approve payments and an officer reviews large ones`

- [x] **3. Activity log with reasons, masking and demo polish**
  Becomes usable: The Activity log tab shows every step with actor and reason, all numbers masked; Reset demo works; README explains how to run it.
  Why now: Explainability is the last part of the kernel and the thing the video ends on.
  PRD ref: `prd.md > Activity log`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Client: activity log`, `spec.md > Server: masking`, `spec.md > Where It Runs and How Someone Tries It`
  Build: ActivityLog component, log entries for every step, mask check across API output, reset, demo-mode banner, README and `.env.example`.
  Verify (mechanical): API test asserts log order/actors and that no full reference or account number appears anywhere in `/api/state`; browser run through the whole journey with no console errors.
  Learner check: Run the whole journey and read the log top to bottom.
  Commit: `Log every step with its reason, masked, and add reset and README`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, with a real Gemini key and a real bill photo
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [x] Show the bill photo on the officer desk, so the officer can check it against what Saathi read (agent review, 20 Oct; verified in browser)
- [x] Mask full names inside AI replies, officer notes and the log, not only on the card (agent review; test in mask.test.js, checked with a real note)
- [x] Retry Gemini once when it is briefly busy or slow (agent review; a real call took 33 s on 20 Oct; tests in agent.test.js)
- [x] "How it works" strip (reads → approves → officer → logged) and a "Replied in …" chip on Saathi's AI replies, so the video explains itself (agent review; checked at desktop and phone width)
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse (generated and paths checked against the code at 021591a; not yet shown to Mehreen)

Activity and evidence: not done yet. Mehreen delegated the build; the wrap-up waits for her (about 3 minutes, before recording).
Route and stops: reference route prepared in app-map.html: ChatInput.jsx send/attach → server/src/agent.js askSaathi → server/src/rules.js preparePayment / onCustomerApprove.
Edit outcome: not applicable yet.
Reflection: not offered yet.
Activity mode: pending.

## Revisions

- Slices 1–3 were written in one pass and committed together, then verified slice by slice (unit tests for rules and masking, an API journey test, and the browser run with real Gemini) — the server routes and rules were small enough that splitting the commit added nothing.
- Masking no longer hides dates — the first real Gemini run logged "due ••••1024": an ISO date looked like a long number.
- Generic number masking no longer spans spaces — a test showed "0412345678 2,350" being merged into one number, which would have hidden the amount.
- Typed numbers go to Gemini as placeholders ([NUM1]) and are restored by the server — needed so "mask before the AI" (scope) still lets a typed reference reach the payment card.
- Urdu status messages wrap amounts, biller names and receipts in left-to-right isolates — "PKR 85,000" at the start of an Urdu sentence displayed scrambled.
