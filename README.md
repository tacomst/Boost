# Project Boost Bingo — Card Claim Site

This is a small, self-contained Node.js web app that:
- Shows a signup page (name + email)
- Assigns each person the next unclaimed one of the 50 unique cards (no duplicates)
- Remembers who has which card (by email) so a page refresh doesn't reassign
- Lets them download their card as a PDF instantly

## Files
- `server.js` — the whole app (signup page + claim logic + PDF download)
- `cards_data.json` — the 50 card definitions
- `cards/BOOST-2026-0XX.pdf` — one ready-made PDF per card
- `assignments.json` — created automatically once people start claiming cards

## Run it locally (to test)
```bash
npm install express
node server.js
```
Then open `http://localhost:3000` in a browser.

## Deploy it for real (before the event)
Any Node-friendly host works — pick whichever your org already uses:
- **Render.com** / **Railway.app** / **Fly.io** — free tier is enough for ~50 signups
- An internal company server, if you have one
- Heroku, if your org still uses it

Steps are the same everywhere:
1. Push this `webapp` folder to a new Git repo (or upload it directly if the host allows).
2. Set the start command to `node server.js` (already in `package.json`).
3. Once deployed, you'll get a live URL like `https://project-boost-bingo.onrender.com`.
4. Regenerate the QR slide to point at that real URL:
   ```bash
   python3 make_qr_slide.py "https://project-boost-bingo.onrender.com"
   ```
   (run this from the parent folder, where `make_qr_slide.py` lives)
5. Put that QR slide (`Project_Boost_Bingo_QR_Slide.pdf`) up on Zoom / in the invite.

## During the event
- Watch `https://YOUR-DOMAIN/status` for a live claimed/remaining count.
- If someone claims by mistake or needs a re-send, you can open `assignments.json` on the
  server to see exactly who has which Card ID.

## Verifying a winner
Use `Project_Boost_Bingo_Answer_Key.pdf` (in the parent folder) — look up their Card ID and
confirm their called squares actually form a line on that card.

## Note on capacity
There are exactly 50 unique cards. The claim page will show a friendly "all cards claimed"
message once the 50th person signs up — plan your invite list/expected attendance accordingly.
If you need more than 50 attendees to play, let Claude know and more unique cards can be
generated from the same 30-item question pool.
