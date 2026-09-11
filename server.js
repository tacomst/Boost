/**
 * Project Boost Bingo — card claim server
 *
 * What this does:
 *  - Serves a signup page (name + email)
 *  - Assigns each person the next unclaimed unique card (no duplicates)
 *  - Remembers assignments by email, so if someone re-visits/refreshes they get the SAME card back
 *  - Serves the assigned card as a PDF download
 *
 * How to run:
 *   1) npm install express
 *   2) node server.js
 *   3) Deploy to any Node host (Render, Railway, Heroku, an internal server, etc.)
 *      Point your QR code at:  https://YOUR-DOMAIN/  (the signup page)
 *
 * Data files expected in this same folder:
 *   - cards_data.json      (50 cards: card_id + grid)
 *   - cards/<CARD_ID>.pdf  (one PDF per card)
 *   - assignments.json     (created automatically — tracks who has which card)
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const CARDS_JSON = path.join(__dirname, "cards_data.json");
const CARDS_DIR = path.join(__dirname, "cards");
const ASSIGNMENTS_FILE = path.join(__dirname, "assignments.json");

const allCards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));

function loadAssignments() {
  if (!fs.existsSync(ASSIGNMENTS_FILE)) return {};
  return JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, "utf8"));
}
function saveAssignments(data) {
  fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(data, null, 2));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(SIGNUP_HTML);
});

// Claim (or re-fetch) a card by email
app.post("/claim", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }
  const emailKey = String(email).trim().toLowerCase();
  const assignments = loadAssignments();

  // Already claimed? Return the same card (idempotent — no duplicate assignment on refresh)
  if (assignments[emailKey]) {
    return res.json({ card_id: assignments[emailKey].card_id, name: assignments[emailKey].name });
  }

  const usedCardIds = new Set(Object.values(assignments).map(a => a.card_id));
  const available = allCards.filter(c => !usedCardIds.has(c.card_id));

  if (available.length === 0) {
    return res.status(410).json({ error: "All 50 cards have been claimed. See an event host." });
  }

  // Assign the next available card (deterministic order; could randomize if preferred)
  const card = available[0];
  assignments[emailKey] = { card_id: card.card_id, name, email, claimed_at: new Date().toISOString() };
  saveAssignments(assignments);

  res.json({ card_id: card.card_id, name });
});

// Serve the claimed PDF
app.get("/card/:cardId.pdf", (req, res) => {
  const cardId = req.params.cardId;
  const filePath = path.join(CARDS_DIR, `${cardId}.pdf`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Card not found.");
  }
  res.download(filePath, `${cardId}.pdf`);
});

// Interactive, clickable version of a card — squares turn green when tapped
app.get("/play/:cardId", (req, res) => {
  const cardId = req.params.cardId;
  const card = allCards.find(c => c.card_id === cardId);
  if (!card) {
    return res.status(404).send("Card not found.");
  }
  res.send(renderPlayHtml(card));
});

function renderPlayHtml(card) {
  const squaresHtml = card.grid.map((label, i) => {
    const isFree = label.trim().toUpperCase() === "FREE";
    return `<div class="sq${isFree ? " free marked" : ""}" data-index="${i}" data-free="${isFree}" onclick="toggleSquare(this)">
      <span>${escapeHtml(label)}</span>
    </div>`;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(card.card_id)} — Project Boost Bingo</title>
<style>
  :root {
    --blue: #004D71;
    --green: #62D84E;
    --dark: #1B1B1B;
    --bg: #F4F8F9;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    background: var(--bg); color: var(--dark);
    display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 16px;
  }
  .header { text-align: center; margin-bottom: 6px; }
  .header h1 { color: var(--blue); font-size: 18px; margin: 0 0 2px; letter-spacing: 0.5px; }
  .header p { margin: 0; font-size: 12px; color: #667; }
  .card-id { font-weight: 700; color: var(--blue); font-size: 15px; margin: 6px 0 14px; }
  .letters {
    display: grid; grid-template-columns: repeat(5, 1fr); max-width: 420px; width: 100%;
    text-align: center; font-weight: 800; color: var(--blue); font-size: 16px; margin-bottom: 4px;
  }
  .grid {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px;
    max-width: 420px; width: 100%;
  }
  .sq {
    aspect-ratio: 1 / 1; background: white; border: 1.5px solid #d7dee1; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 4px; cursor: pointer; user-select: none; transition: background 0.15s, border-color 0.15s, transform 0.08s;
  }
  .sq span { font-size: 11px; font-weight: 600; line-height: 1.15; }
  .sq:active { transform: scale(0.96); }
  .sq.marked {
    background: var(--green); border-color: var(--green); color: white;
  }
  .sq.free { cursor: default; }
  .sq.free span { font-weight: 800; }
  .note { max-width: 420px; text-align: center; font-size: 12px; color: #888; margin-top: 16px; }
  .actions { margin-top: 18px; display: flex; gap: 10px; }
  .btn {
    display: inline-block; text-decoration: none; padding: 10px 16px; border-radius: 8px;
    font-weight: 700; font-size: 13px;
  }
  .btn-outline { border: 1.5px solid var(--blue); color: var(--blue); }
  .btn-outline:hover { background: #eef4f7; }
  .reset { border: none; background: none; color: #c0392b; font-size: 12px; margin-top: 10px; cursor: pointer; text-decoration: underline; }
</style>
</head>
<body>
  <div class="header">
    <h1>PROJECT BOOST BINGO</h1>
    <p>1 Year Anniversary Celebration</p>
  </div>
  <div class="card-id">${escapeHtml(card.card_id)}</div>
  <div class="letters"><div>B</div><div>I</div><div>N</div><div>G</div><div>O</div></div>
  <div class="grid" id="grid">
    ${squaresHtml}
  </div>
  <p class="note">Tap a square when the host calls its answer. FREE is already marked. 5 in a row (any direction) = BINGO!</p>
  <div class="actions">
    <a class="btn btn-outline" href="/card/${encodeURIComponent(card.card_id)}.pdf" target="_blank">Download PDF</a>
  </div>
  <button class="reset" onclick="resetCard()">Reset my marks</button>

<script>
const STORAGE_KEY = 'boost-bingo-marks-${card.card_id}';

function loadMarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveMarks(marks) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(marks)); } catch (e) {}
}

function toggleSquare(el) {
  if (el.dataset.free === "true") return; // FREE always stays marked
  const idx = el.dataset.index;
  const marks = loadMarks();
  const isMarked = el.classList.toggle('marked');
  marks[idx] = isMarked;
  saveMarks(marks);
}

function resetCard() {
  document.querySelectorAll('.sq').forEach(el => {
    if (el.dataset.free === "true") return;
    el.classList.remove('marked');
  });
  saveMarks({});
}

// Restore saved marks on load
(function restore() {
  const marks = loadMarks();
  document.querySelectorAll('.sq').forEach(el => {
    if (el.dataset.free === "true") return;
    if (marks[el.dataset.index]) el.classList.add('marked');
  });
})();
</script>
</body>
</html>
`;
}

// Host-only: quick view of claimed count
app.get("/status", (req, res) => {
  const assignments = loadAssignments();
  res.json({
    total_cards: allCards.length,
    claimed: Object.keys(assignments).length,
    remaining: allCards.length - Object.keys(assignments).length,
  });
});

// Host-only: view who claimed which card (simple table, no auth — keep this URL private)
app.get("/admin", (req, res) => {
  const assignments = loadAssignments();
  const rows = Object.values(assignments).sort((a, b) =>
    a.claimed_at < b.claimed_at ? -1 : 1
  );

  const rowsHtml = rows.map(a => `
    <tr>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.email)}</td>
      <td><strong>${escapeHtml(a.card_id)}</strong></td>
      <td>${new Date(a.claimed_at).toLocaleString()}</td>
    </tr>
  `).join("");

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Project Boost Bingo — Claimed Cards</title>
      <style>
        body { font-family: -apple-system, Arial, sans-serif; margin: 30px; color: #1B1B1B; }
        h1 { color: #004D71; font-size: 20px; }
        .summary { margin-bottom: 20px; font-size: 14px; color: #444; }
        table { border-collapse: collapse; width: 100%; max-width: 800px; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
        th { background: #F4F8F9; color: #004D71; }
        tr:hover { background: #FAFAFA; }
      </style>
    </head>
    <body>
      <h1>Project Boost Bingo — Claimed Cards</h1>
      <div class="summary">${rows.length} of ${allCards.length} cards claimed &middot; ${allCards.length - rows.length} remaining</div>
      <table>
        <tr><th>Name</th><th>Email</th><th>Card ID</th><th>Claimed At</th></tr>
        ${rowsHtml || '<tr><td colspan="4">No cards claimed yet.</td></tr>'}
      </table>
    </body>
    </html>
  `);
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SIGNUP_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Project Boost Bingo — Get Your Card</title>
<style>
  :root {
    --blue: #004D71;
    --green: #62D84E;
    --dark: #1B1B1B;
    --bg: #F4F8F9;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    background: var(--bg); color: var(--dark);
    display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;
  }
  .card {
    background: white; border-radius: 16px; max-width: 420px; width: 100%;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden;
  }
  .header {
    background: var(--blue); color: white; padding: 28px 24px 20px;
    text-align: center;
  }
  .header h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: 0.5px; }
  .header p { margin: 0; opacity: 0.9; font-size: 14px; }
  .body { padding: 24px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; margin-top: 14px; }
  input {
    width: 100%; padding: 11px 12px; border: 1.5px solid #d7dee1; border-radius: 8px;
    font-size: 15px; outline: none;
  }
  input:focus { border-color: var(--blue); }
  button {
    margin-top: 20px; width: 100%; padding: 13px; border: none; border-radius: 8px;
    background: var(--green); color: white; font-weight: 700; font-size: 15px; cursor: pointer;
  }
  button:hover { opacity: 0.92; }
  .result { display: none; text-align: center; padding: 24px; }
  .result h2 { color: var(--blue); margin-bottom: 4px; }
  .card-id-badge {
    display: inline-block; background: var(--bg); border: 2px solid var(--green);
    padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 18px; margin: 12px 0;
  }
  .download-btn {
    display: inline-block; margin-top: 14px; background: var(--green); color: white;
    text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 700;
  }
  .download-btn-secondary {
    display: inline-block; margin-top: 10px; background: transparent; color: var(--blue);
    text-decoration: underline; padding: 4px 6px; border-radius: 8px; font-weight: 600; font-size: 13px;
  }
  .error { color: #c0392b; font-size: 13px; margin-top: 10px; display: none; }
  .footer-note { font-size: 12px; color: #888; margin-top: 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>PROJECT BOOST BINGO</h1>
      <p>1 Year Anniversary Celebration</p>
    </div>
    <div class="body" id="formView">
      <p style="margin-top:0;font-size:14px;">Enter your info to get your unique bingo card. Every card is different — no duplicates!</p>
      <label for="name">Name</label>
      <input id="name" type="text" placeholder="Your name" required />
      <label for="email">Email</label>
      <input id="email" type="email" placeholder="you@company.com" required />
      <button onclick="claimCard()">Get My Bingo Card</button>
      <div class="error" id="errorMsg"></div>
      <div class="footer-note">One card per person. Revisiting this page with the same email returns your same card.</div>
    </div>
    <div class="result" id="resultView">
      <h2>You're in! 🎉</h2>
      <p>Your unique card:</p>
      <div class="card-id-badge" id="cardIdBadge"></div>
      <br/>
      <a class="download-btn" id="playLink" href="#">Play My Card (tap to mark squares)</a>
      <br/>
      <a class="download-btn-secondary" id="downloadLink" href="#" target="_blank">Download PDF version</a>
      <p class="footer-note">Keep your Card ID visible during the game to claim a prize.</p>
    </div>
  </div>

<script>
async function claimCard() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const errorEl = document.getElementById('errorMsg');
  errorEl.style.display = 'none';

  if (!name || !email) {
    errorEl.textContent = 'Please enter your name and email.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const resp = await fetch('/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const data = await resp.json();
    if (!resp.ok) {
      errorEl.textContent = data.error || 'Something went wrong.';
      errorEl.style.display = 'block';
      return;
    }
    document.getElementById('formView').style.display = 'none';
    document.getElementById('resultView').style.display = 'block';
    document.getElementById('cardIdBadge').textContent = data.card_id;
    document.getElementById('playLink').href = '/play/' + data.card_id;
    document.getElementById('downloadLink').href = '/card/' + data.card_id + '.pdf';
  } catch (e) {
    errorEl.textContent = 'Network error — please try again.';
    errorEl.style.display = 'block';
  }
}
</script>
</body>
</html>
`;

app.listen(PORT, () => {
  console.log(`Project Boost Bingo server running at http://localhost:${PORT}`);
});
