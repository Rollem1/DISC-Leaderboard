// =========================
// server.js (Final Version)
// =========================

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static('public'));

// -------------------------
// STATE
// -------------------------

let competitionName = "";
let categoryName = "";
let messageText = "";
let warmupGroup = "1";
let viewMode = "scoreboard";
let backgroundImage = null;

// IMPORTANT: No defaults here.
// Admin panel sends defaults on first load.
let fontSizes = null;

// Leaderboard data
let leaderboard = [];

// -------------------------
// HELPERS
// -------------------------

function broadcastState() {
  const state = {
    competitionName,
    categoryName,
    messageText,
    warmupGroup,
    viewMode,
    backgroundImage,
    leaderboard,
    fontSizes   // ALWAYS INCLUDED
  };

  const json = JSON.stringify(state);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// -------------------------
// ROUTES
// -------------------------

// Admin updates competition name, category name, or font sizes
app.post('/config', (req, res) => {
  const {
    competitionName: comp,
    categoryName: cat,
    competitionFont,
    tableFont,
    scoreboardFont,
    warmupFont,
    messageFont,
    currentNextFont
  } = req.body;

  if (comp !== undefined) competitionName = comp;
  if (cat !== undefined) categoryName = cat;

  // Update font sizes if provided
  if (
    competitionFont !== undefined ||
    tableFont !== undefined ||
    scoreboardFont !== undefined ||
    warmupFont !== undefined ||
    messageFont !== undefined ||
    currentNextFont !== undefined
  ) {
    fontSizes = {
      competition: Number(competitionFont),
      table: Number(tableFont),
      scoreboard: Number(scoreboardFont),
      warmup: Number(warmupFont),
      message: Number(messageFont),
      currentNext: Number(currentNextFont)
    };
  }

  broadcastState();
  res.json({ status: "ok" });
});

// Update score
app.post('/update', (req, res) => {
  const { name, score } = req.body;
  const skater = leaderboard.find(s => s.name === name);
  if (skater) skater.score = score;
  broadcastState();
  res.json({ status: "ok" });
});

// Update warmup group
app.post('/setWarmupGroup', (req, res) => {
  warmupGroup = req.body.group;
  broadcastState();
  res.json({ status: "ok" });
});

// Update message
app.post('/setMessage', (req, res) => {
  messageText = req.body.message;
  broadcastState();
  res.json({ status: "ok" });
});

// Update view mode
app.post('/setViewMode', (req, res) => {
  viewMode = req.body.mode;
  broadcastState();
  res.json({ status: "ok" });
});

// Upload CSV
const upload = multer({ dest: 'uploads/' });
app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const csv = fs.readFileSync(filePath, 'utf8');
  fs.unlinkSync(filePath);

  const lines = csv.split('\n').filter(l => l.trim() !== '');
  leaderboard = lines.map(line => {
    const [name, club, group] = line.split(',');
    return { name, club, group, score: "" };
  });

  broadcastState();
  res.json({ leaderboard });
});

// Background upload
const bgUpload = multer({ dest: 'backgrounds/' });
app.post('/uploadBackground', bgUpload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname);
  const newPath = `public/background${ext}`;

  fs.renameSync(filePath, newPath);
  backgroundImage = `/background${ext}`;

  broadcastState();
  res.json({ status: "ok" });
});

// Clear background
app.post('/clearBackground', (req, res) => {
  backgroundImage = null;
  broadcastState();
  res.json({ status: "ok" });
});

// State endpoint
app.get('/state', (req, res) => {
  res.json({
    competitionName,
    categoryName,
    messageText,
    warmupGroup,
    viewMode,
    backgroundImage,
    leaderboard,
    fontSizes   // ALWAYS INCLUDED
  });
});

// -------------------------
// WEBSOCKETS
// -------------------------

wss.on('connection', ws => {
  // Send full state immediately
  ws.send(JSON.stringify({
    competitionName,
    categoryName,
    messageText,
    warmupGroup,
    viewMode,
    backgroundImage,
    leaderboard,
    fontSizes
  }));
});

// -------------------------
// START SERVER
// -------------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});