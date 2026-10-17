---
doc: scope
status: approved
---
<!-- Written by the agent from Mehreen's Saathi brief, under her delegation
     ("do by yourself ask me if you want any information", 18 Oct 2026).
     Approved under that delegation; Mehreen can reopen it. -->

# Saathi

An AI banking assistant that reads a photo of a bill, prepares the payment, and lets a person decide: the customer approves, and a bank officer reviews anything large.

## The Unique Kernel
Saathi does the work, people make the decisions. It reads a bill photo or a message in Urdu, Roman Urdu or English and turns it into a ready-to-approve payment, but nothing moves until the customer taps Approve, payments above a limit wait for a bank officer, and every step is written down with the reason Saathi gave. Most banking chatbots only answer FAQs; Saathi completes a real task while staying under human control.

## Who It's For
A bank customer in Pakistan who pays utility bills and challans every month and is more comfortable writing "bijli ka bill pay kar do" than navigating an English-only banking app. Today they queue at a branch, or find the biller in an app menu and type a 14-digit reference number by hand.
Second user: a bank officer who reviews higher-value payments before they execute.

## The Core Loop
The customer opens Saathi, snaps or uploads their bill (or types a request), and within seconds sees a payment card: biller, reference number, amount, due date, from which account, and Saathi's one-line reason. They tap Approve. Small payments go through with a receipt; large ones show "waiting for officer review" until an officer approves or rejects them with a note. Every month there is another bill, so they come back.

## Inspiration & Identity
Feels like a calm, trustworthy banking app, not a flashy chatbot: a phone-sized chat with clear cards, green for safe/approved, amber for "waiting for review". Bilingual labels (English with Urdu) on the buttons that matter. Built as the proof of concept for Team Saathi's Allied Bank 5th Fintech Hackathon application (theme "Agentic AI for Banking"), so it must not use any real bank's name or branding: a fictional demo bank with mock accounts.

## Why This Matters to the Learner
One demo serves two goals: the Devpost Build With AI submission and the proof of concept Allied Bank asks shortlisted teams for. It is also the same principle Mehreen already runs in production on her posting tool: nothing an AI prepares goes live until a person has approved it.

## What "Working" Looks Like
On a laptop screen, in under a minute: upload a photo of an electricity bill → Saathi replies in the customer's language with a payment card filled from the photo → tap Approve → receipt, balance drops. Then a large fee challan → Approve → "sent to officer review" → switch to the Officer desk, approve it with a note → the customer sees it paid. Open the activity log: every step, who did it, and Saathi's reason.
The "oh, that's cool" beat: a crumpled phone photo becomes a correct, ready-to-approve payment card, and Saathi answers in Roman Urdu because that's how the customer wrote.

## The POC Boundary
- One customer with mock accounts; one officer view. No login.
- Bill/challan photo or typed request → Gemini extracts the details → payment card.
- Approve / Cancel by the customer; threshold routing to officer review; officer Approve / Reject with a note.
- Replies in the language the customer used (Urdu, Roman Urdu, English).
- Activity log with actor, action and the agent's stated reason; personal data masked.
- Mock execution only: the balance changes in memory, a fake receipt number is issued.

## Later
Balance and recent-transaction questions beyond a simple answer, voice notes, cheque reading, WhatsApp channel, officer-side complaint triage and reply drafting (all named in the Allied Bank application), real login and multiple customers.

## Explicitly Cut
- Real bank or biller APIs: not available to us and not needed to prove the approval loop.
- Real money, real accounts, real customer data: a demo must never touch them.
- Any real bank's name or branding: we must not impersonate Allied Bank or anyone else.
- Accounts/authentication: one demo customer is enough to show the flow.
- Deployment: the submission needs a video and a repo; running locally is fine.
