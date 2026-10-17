---
doc: prd
status: approved
---
<!-- Written by the agent from Mehreen's Saathi brief and scope.md, under her
     delegation (18 Oct 2026). Approved under that delegation; Mehreen can reopen it. -->

# Saathi — Product Requirements

A bank customer pays a utility bill or challan by sending a photo or a message in Urdu, Roman Urdu or English; Saathi prepares the payment, the customer approves it, and a bank officer reviews anything above a limit. Every step is logged with a reason.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey
1. The customer opens Saathi on a laptop. They see a phone-sized chat on the left ("Assalam o Alaikum! Send me a photo of a bill or tell me what to pay.") with their account balance at the top, and a panel on the right with two tabs: **Officer desk** and **Activity log**.
2. They attach a photo of a bill (or tap **Try a sample bill**), optionally typing a line like "ye bill pay kar do".
3. Saathi shows "Reading your bill…" and within a few seconds replies in the language the customer wrote in, with a **payment card**: biller, bill type, reference/consumer number (partly masked), billing month, due date, amount to pay, paying from (masked account), balance after payment, and "Why: …" (Saathi's one-line reason).
4. The card has **Approve · منظور کریں** and **Cancel**. Nothing has happened to the money yet; the card says so.
5. Customer taps **Approve**:
   - At or below PKR 25,000 → paid immediately. The card turns green with a receipt number; the balance at the top drops.
   - Above PKR 25,000 → the card turns amber, "Sent to a bank officer for review", with the reason.
6. On the **Officer desk** tab the officer sees the pending payment (amount, biller, masked reference, Saathi's reason, the routing reason) and taps **Approve** or **Reject**, with an optional note.
7. Within a couple of seconds the customer's card updates: green "Paid, receipt …" or red "Rejected by officer: <note>", and Saathi posts a short message in the customer's language.
8. The **Activity log** tab lists every step, newest first: time, who (Customer / Saathi / Rules / Officer / System), what happened, and the reason. Personal data is masked.

Success = steps 2–8 work end to end with a real bill photo read by Gemini.

## Screens and Layout
One page, two columns (stacked on narrow screens):
- **Left: Customer phone** — header with "Saathi" and the masked account and balance, a chat thread, and an input bar with attach-photo, text box, send, and a **Try a sample bill** menu (electricity bill, university fee challan).
- **Right: Bank side** — tabs **Officer desk** and **Activity log**. A small **Reset demo** button restores balances and clears history.
A banner shows when the app runs without a Gemini key ("Demo mode: sample answers, Gemini not connected").

## Look and Feel
Calm, trustworthy banking app; not a flashy chatbot. White and soft-grey surfaces, deep teal/green brand colour, amber for "waiting for review", red only for rejected/errors. Rounded cards, generous spacing, readable sizes. Clean sans-serif (Inter or system), with Urdu text rendered in Noto Nastaliq Urdu where it appears. Key buttons carry an Urdu label beside the English. No real bank's name, logo or colours; the fictional bank is "Saathi Demo Bank".

## Features and Behavior

### Reading a bill or request
- Customer can send a photo (camera/gallery file), a typed message, or both.
- Saathi extracts: biller name, bill type (electricity, gas, water, internet/phone, fee challan, tax/government challan, other), reference/consumer number, customer name on the bill, billing month, due date, amount within due date, amount after due date.
- Saathi detects the customer's language (Urdu script, Roman Urdu, English) and replies in it.
- A typed request with a biller, reference number and amount (e.g. "PTCL bill 0412345678 2,350 pay karo") also produces a card.
- "What's my balance?" / "balance kitna hai" gets a short answer from the mock account; no card.
  - [ ] A clear bill photo produces a card with the amount and reference matching the photo.
  - [ ] A Roman Urdu message gets a Roman Urdu reply; an Urdu-script message gets an Urdu reply.

### Preparing the payment card
- If today is after the due date and an after-due amount exists, the card uses that amount and says "Overdue: late amount applies".
- Paying-from account and balance-after are shown; if the balance is too low, the card says so and Approve is disabled.
- If the same reference and amount were already paid or are awaiting review, the card says "Already paid / already in review" and Approve is disabled.
  - [ ] Card shows every field from the journey step 3 and the "Why" line.
  - [ ] Nothing in the activity log says "paid" until Approve is tapped.

### Customer approval
- Approve and Cancel on every ready card. Cancel marks it cancelled; nothing else happens.
- Approve applies the rule: ≤ PKR 25,000 executes; > PKR 25,000 goes to officer review. The rule is fixed code, not the AI's choice.
  - [ ] A PKR 8,000 bill is paid on Approve, balance drops by exactly that amount, a receipt number appears.
  - [ ] An PKR 85,000 challan goes to review and the balance does not change.

### Officer review
- Officer desk lists payments awaiting review (oldest first) and recent decisions.
- Approve executes the payment (if balance still allows); Reject requires no amount change and records the note.
  - [ ] Approving on the officer desk turns the customer's card green without a page reload.
  - [ ] Rejecting with a note shows that note on the customer's card.

### Activity log
- Every step is an entry: message received, Saathi read the bill (with its reason), card prepared, customer approved/cancelled, rules routed to officer (with the limit), officer decision (with note), payment executed (receipt), errors.
- Reference numbers, account numbers, CNIC and phone numbers are masked (last 4 visible).
  - [ ] After the full journey, the log shows each step in order with actor and reason.
  - [ ] No full reference or account number appears anywhere in the log.

## States and Boundaries
- **First use** — welcome message, balance, sample-bill shortcut visible.
- **Reading** — "Reading your bill…" indicator; send disabled.
- **Unreadable / not a bill** — Saathi says it couldn't read a bill and asks for a clearer photo or the reference number and amount; no card.
- **Missing amount or reference** — no card; Saathi asks for the missing detail.
- **AI unavailable** — "Saathi couldn't reach its AI right now, please try again"; logged as an error.
- **No Gemini key** — demo-mode banner; sample bills get sample answers, uploaded photos get a message that Gemini is not connected.
- **Insufficient balance / duplicate** — card shown, Approve disabled, reason visible.
- **Persistence** — everything is in memory; restarting the server or Reset demo restores the starting balance and empties chat, desk and log.

## Product Decisions
- Approval threshold PKR 25,000 — low enough that a fee challan shows officer review, high enough that normal household bills go straight through.
- The AI reads and explains; fixed code decides limits, balance, duplicates and execution — so the agent's stated reason is logged, but it can never approve money on its own.
- Customer and bank views on one screen — the demo video shows both sides of the approval without switching apps.
- Fictional "Saathi Demo Bank" and mock data — never impersonate a real bank or use real money.
- Wrong extraction is fixed by Cancel and resending, not by editing the card — keeps the POC small.

## What We're Building
Everything under The Core Journey and Features and Behavior: photo/text input, Gemini extraction in three languages, payment card with overdue/balance/duplicate checks, approve/cancel, threshold routing, officer desk, live status update, masked activity log, sample bills, reset, demo-mode banner.

## Deferred From the POC
- Editing extracted fields on the card — Cancel and resend is enough to prove the loop.
- Choosing between several accounts — one current account shows the idea.
- Voice notes, cheques, WhatsApp, complaint triage, officer reply drafting — in the Allied Bank pitch, not needed to prove the approval loop.
- Login, multiple customers, multiple officers — one of each is enough for a demo.
- Saving history across restarts — the demo starts fresh each time.

## Possible Later Enhancements
Recent-transactions questions, scheduled/recurring bill reminders, officer risk flags beyond amount (new biller, unusual time), real open-banking integration in a sandbox.

## Non-Goals
- Real payments or real bank/biller connections — out of reach and unsafe for a demo.
- Letting the AI approve anything — the whole point is human approval.
- Any real bank branding — avoid impersonation.

## Open Questions
- None blocking `4-spec`.
