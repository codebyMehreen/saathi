# Saathi demo video: shot list

Target length about 2 minutes (Devpost asks for 1 to 3). This lists what to show and click, in order.
The words are yours: the Devpost Learn rules ask that narration and submission text are written by
the learner, so each shot only names the point to make, not a line to read.

## Before recording

- `npm run dev`, open http://localhost:5173 in a clean browser window (no bookmarks bar, no other tabs). Window about 1440×900; browser zoom 90% if the phone looks cramped.
- Click **Reset demo**. Make sure there's no demo-mode banner at the top (that means Gemini is connected).
- Never show `.env`, the terminal with keys, or a real person's bill. The sample bills are fictional.
- Best "wow" shot: print `client/public/samples/electricity.svg` (or show it on a second screen) and take a real phone photo of it, then attach that photo. A crooked, real photo being read correctly is the moment people remember. **Try a sample bill** is the backup.
- Do one full practice run first (Gemini takes about 3 to 8 seconds per bill), then Reset demo before the real take.
- Recording: Windows Game Bar (Win+Alt+R) records one window; OBS if you want a voice track and webcam. Upload to YouTube as Unlisted (or Public) and check the link in a private window.

## Shots

| Time | On screen | Do | Point to make (your words) |
|---|---|---|---|
| 0:00–0:15 | Whole page: phone left (sign-in screen), bank side right | Type the PIN `1234`, **Sign in** | The problem and who it's for: paying bills in the language people actually write; Saathi prepares, people decide. |
| 0:15–0:50 | Phone | Attach the electricity bill photo, type `ye bijli ka bill pay kar do`, send. Wait for the card. | Saathi answered in Roman Urdu because that's how the customer wrote. Point at amount, due date, masked reference, "Why", and "nothing paid yet". |
| 0:50–1:00 | Phone | Point at the "First payment to…" warning and the 15-minute countdown, then tap **Approve**. | Safety checks before money moves; under the limit it pays in one tap: receipt, balance drops. |
| 1:00–1:35 | Phone, then Officer desk | **Try a sample bill → University fee challan**, type `یہ فیس چالان جمع کروا دیں`, send. Tap **Approve**, then **Tap again** (PKR 10,000 or more needs two taps): card turns amber. On the right, the Officer desk shows it; type a note, **Approve payment** (Reject only works with a reason). | Above PKR 25,000 the customer's approval isn't enough; the rule is fixed code, not the AI. Watch the customer's card turn green and the Urdu message arrive. |
| 1:35–1:55 | Activity log tab | Click **Activity log**, scroll slowly. | Every step, who did it and why, including Saathi's own reason; numbers masked. |
| 1:55–2:15 | Whole page | Optional: type `PTCL bill 0412345678 2,350 pay karo`, send, then show the log entry. | Typed account numbers never reach the AI; it sees a placeholder. Then close: built with Gemini + React + Express in the Devpost Learn plan-first flow; team names; what's next (WhatsApp, voice notes, a real bank sandbox). |

## If something goes wrong on camera

- A misread number: tap **Cancel** and say so. That's the point of the approval step. Or just re-take.
- "Couldn't reach my AI": free-tier limit; wait a minute and retry.
- To start over: **Reset demo** (restores PKR 185,000 and clears everything).
