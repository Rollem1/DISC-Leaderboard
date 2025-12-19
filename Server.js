const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
app.use(bodyParser.json());
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

// ✅ Background image path (served from /public/backgrounds/)
let backgroundImage = null;

// ✅ Font size state
let fontSizes = {
  scoreboard: 28,
  warmup: 24,
  message: 32,
  competition: 36,
  category: 28,
  table: 24,
  currentNext: 28
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
    backgroundImage   // ✅ include bg image in payload
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

app.post('/uploadBackground', bgUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Save relative path for client usage
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

// ✅ Unified config route
app.post('/config', (req, res) => {
  if (req.body.competitionName != null) competitionName = req.body.competitionName;
  if (req.body.categoryName != null) categoryName = req.body.categoryName;

  if (req.body.scoreboardFont != null) fontSizes.scoreboard = parseInt(req.body.scoreboardFont);
  if (req.body.warmupFont != null) fontSizes.warmup = parseInt(req.body.warmupFont);
  if (req.body.messageFont != null) fontSizes.message = parseInt(req.body.messageFont);
  if (req.body.competitionFont != null) fontSizes.competition = parseInt(req.body.competitionFont);
  if (req.body.categoryFont != null) fontSizes.category = parseInt(req.body.categoryFont);
  if (req.body.tableFont != null) fontSizes.table = parseInt(req.body.tableFont);
  if (req.body.currentNextFont != null) fontSizes.currentNext = parseInt(req.body.currentNextFont);

  res.sendStatus(200);
  broadcast();
});

// ✅ Upload CSV
app.post('/upload', multer({ dest: 'uploads/' }).single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

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

      // Force warmup view after CSV load
      viewMode = "warmup";

      console.log("✅ Leaderboard updated from CSV");

      res.json(currentPayload());
      broadcast();
    });
});

// ✅ Update score
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

// ✅ Warmup group
app.post('/setWarmupGroup', (req, res) => {
  warmupGroup = req.body.group ?? null;
  warmupSkaters = warmupGroup != null
    ? leaderboard.filter(p => String(p.group) === String(warmupGroup))
    : [];
  res.sendStatus(200);
  broadcast();
});

// ✅ Message
app.post('/setMessage', (req, res) => {
  messageText = req.body.message || "";
  res.sendStatus(200);
  broadcast();
});

// ✅ View mode
app.post('/setViewMode', (req, res) => {
  viewMode = req.body.mode || "scoreboard";
  res.sendStatus(200);
  broadcast();
});

// -------------------- Server --------------------
server.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));