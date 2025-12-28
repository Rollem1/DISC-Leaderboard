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

// -------------------- Default Font Sizes --------------------
const DEFAULT_FONT_SIZES = {
  scoreboard: 54,
  warmup: 54,
  message: 54,
  competition: 54,
  category: 54,
  table: 54,
  currentNext: 54
};

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
backgroundImage = "/backgrounds/Disc_IJS_Background_1_.png";

// Font sizes (start with defaults)
let fontSizes = { ...DEFAULT_FONT_SIZES };

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
    fontSizes: { ...DEFAULT_FONT_SIZES, ...fontSizes }, // ensure complete
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

// -------------------- Unified Config Route --------------------
app.post('/config', (req, res) => {
  if (req.body.competitionName != null) competitionName = req.body.competitionName;
  if (req.body.categoryName != null) categoryName = req.body.categoryName;

  // Merge font sizes safely
  fontSizes = {
    ...fontSizes,
    ...(req.body.scoreboardFont != null && { scoreboard: parseInt(req.body.scoreboardFont) }),
    ...(req.body.warmupFont != null && { warmup: parseInt(req.body.warmupFont) }),
    ...(req.body.messageFont != null && { message: parseInt(req.body.messageFont) }),
    ...(req.body.competitionFont != null && { competition: parseInt(req.body.competitionFont) }),
    ...(req.body.categoryFont != null && { category: parseInt(req.body.categoryFont) }),
    ...(req.body.tableFont != null && { table: parseInt(req.body.tableFont) }),
    ...(req.body.currentNextFont != null && { currentNext: parseInt(req.body.currentNextFont) })
  };

  res.sendStatus(200);
  broadcast();
});

// -------------------- Upload CSV --------------------
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

// -------------------- Update Score --------------------
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