const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const ADMIN_PASSWORD = "changeme123";   // pick your own password

const app = express();
app.use(bodyParser.json());
const ADMIN_PASSWORD = "changeme123";

app.get('/admin', (req, res) => {
  const pass = req.query.p;

  if (pass !== ADMIN_PASSWORD) {
    return res.status(401).send(`
      <h1>Unauthorized</h1>
      <p>You must supply a valid password to access the admin panel.</p>
      <p>Try: /admin?p=${ADMIN_PASSWORD}</p>
    `);
  }

  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// -------------------- State --------------------
let competitionName = "";
let categoryName = "";
let leaderboard = [];
let currentSkater = null;
let nextSkater = null;
let warmupGroup = null;
let warmupSkaters = [];
let viewMode = "scoreboard";
let messageText = "";

// Background image path
let backgroundImage = null;

// -------------------- FONT SIZES (initialised properly) --------------------
let fontSizes = {
  competition: 54,
  table: 54,
  scoreboard: 54,
  warmup: 54,
  message: 54,
  currentNext: 54
};

// -------------------- Helpers --------------------
function recomputeCurrentNext() {
  const nextIndex = leaderboard.findIndex(p => p.score == null);
  currentSkater = nextIndex >= 0 ? leaderboard[nextIndex] : null;
  nextSkater = nextIndex >= 0 && nextIndex + 1 < leaderboard.length
    ? leaderboard[nextIndex + 1]
    : null;
}

function currentPayload() {
  const payload = {
    competitionName,
    categoryName,
    leaderboard,
    currentSkater,
    nextSkater,
    viewMode,
    fontSizes,
    backgroundImage
  };

  if (viewMode === "warmup") {
    payload.warmupGroup = warmupGroup;
    payload.warmupSkaters = warmupSkaters;
  }

  if (viewMode === "message") {
    payload.message = messageText;
  }

  return payload;
}

function broadcast(data = currentPayload()) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

// -------------------- Background upload --------------------
const backgroundsDir = path.join(__dirname, 'public', 'backgrounds');
if (!fs.existsSync(backgroundsDir)) {
  fs.mkdirSync(backgroundsDir, { recursive: true });
}

const bgUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, backgroundsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
      cb(null, `${Date.now()}_${base}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/uploadBackground', bgUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  backgroundImage = `/backgrounds/${req.file.filename}`;
  console.log("✅ Background image uploaded:", backgroundImage);

  broadcast();
  res.json({ success: true, backgroundImage });
});

app.post('/clearBackground', (req, res) => {
  backgroundImage = null;
  console.log("✅ Background image cleared");
  broadcast();
  res.json({ success: true });
});

// -------------------- Endpoints --------------------
app.get('/state', (req, res) => res.json(currentPayload()));

// -------------------- CONFIG (updated safely) --------------------
app.post('/config', (req, res) => {
  if (req.body.competitionName != null) competitionName = req.body.competitionName;
  if (req.body.categoryName != null) categoryName = req.body.categoryName;

  // Update font sizes (categoryFont removed)
  if (req.body.scoreboardFont != null) fontSizes.scoreboard = parseInt(req.body.scoreboardFont);
  if (req.body.warmupFont != null) fontSizes.warmup = parseInt(req.body.warmupFont);
  if (req.body.messageFont != null) fontSizes.message = parseInt(req.body.messageFont);
  if (req.body.competitionFont != null) fontSizes.competition = parseInt(req.body.competitionFont);
  if (req.body.tableFont != null) fontSizes.table = parseInt(req.body.tableFont);
  if (req.body.currentNextFont != null) fontSizes.currentNext = parseInt(req.body.currentNextFont);

  res.sendStatus(200);
  broadcast();
});

// -------------------- CSV Upload --------------------
app.post('/upload', multer({ dest: 'uploads/' }).single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', row => results.push(row))
    .on('end', () => {
      leaderboard = results.map((row, index) => ({
        name: row['Skater Name'],
        club: row['Club'],
        group: row['Warmup Group'],
        score: null,
        order: index + 1
      }));

      recomputeCurrentNext();

      if (warmupGroup != null) {
        warmupSkaters = leaderboard.filter(p => String(p.group) === String(warmupGroup));
      }

      viewMode = "warmup";

      console.log("✅ Leaderboard updated from CSV");

      res.json(currentPayload());
      broadcast();
    });
});

// -------------------- Score Update --------------------
app.post('/update', (req, res) => {
  const { name, score } = req.body;
  const player = leaderboard.find(p => p.name === name);

  if (player) {
    player.score = score;
    recomputeCurrentNext();
    console.log(`✅ Score updated for ${name}: ${score}`);
    res.json({ success: true });
    broadcast();
  } else {
    res.status(404).json({ error: "Skater not found" });
  }
});

// -------------------- Warmup Group --------------------
app.post('/setWarmupGroup', (req, res) => {
  warmupGroup = req.body.group ?? null;
  warmupSkaters = warmupGroup != null
    ? leaderboard.filter(p => String(p.group) === String(warmupGroup))
    : [];
  res.sendStatus(200);
  broadcast();
});

// -------------------- Message --------------------
app.post('/setMessage', (req, res) => {
  messageText = req.body.message || "";
  res.sendStatus(200);
  broadcast();
});

// -------------------- View Mode --------------------
app.post('/setViewMode', (req, res) => {
  viewMode = req.body.mode || "scoreboard";
  res.sendStatus(200);
  broadcast();
});

// -------------------- Server --------------------
server.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));