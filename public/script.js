// ===============================
// script.js (Desktop Overlay)
// Final Version — No categoryFont
// ===============================

// Elements
const compNameEl = document.getElementById('competitionName');
const categoryNameEl = document.getElementById('categoryName');
const messageBoxEl = document.getElementById('messageBox');
const scoreboardBannerEl = document.getElementById('scoreboardBanner');
const warmupBannerEl = document.getElementById('warmupBanner');
const currentNextEl = document.getElementById('currentNext');
const tableEl = document.getElementById('scoreTable');
const backgroundEl = document.getElementById('background');

// WebSocket
const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));

ws.onmessage = (event) => {
  const state = JSON.parse(event.data);
  applyState(state);
};

// ------------------------------
// APPLY STATE
// ------------------------------

function applyState(state) {
  // Competition + Category
  compNameEl.textContent = state.competitionName || "";
  categoryNameEl.textContent = state.categoryName || "";

  // Message
  messageBoxEl.textContent = state.messageText || "";

  // Warmup group
  document.getElementById('warmupGroupDisplay').textContent = state.warmupGroup;

  // Background
  if (state.backgroundImage) {
    backgroundEl.style.backgroundImage = `url('${state.backgroundImage}')`;
  } else {
    backgroundEl.style.backgroundImage = 'none';
  }

  // Leaderboard
  renderLeaderboard(state.leaderboard);

  // View mode
  setViewMode(state.viewMode);

  // Fonts
  if (state.fontSizes) {
    applyFontSizes(state.fontSizes);
  }
}

// ------------------------------
// RENDER LEADERBOARD
// ------------------------------

function renderLeaderboard(list) {
  tableEl.innerHTML = "";

  list.forEach(skater => {
    const row = document.createElement('tr');

    const name = document.createElement('td');
    name.textContent = skater.name;

    const club = document.createElement('td');
    club.textContent = skater.club;

    const group = document.createElement('td');
    group.textContent = skater.group;

    const score = document.createElement('td');
    score.textContent = skater.score || "";

    row.appendChild(name);
    row.appendChild(club);
    row.appendChild(group);
    row.appendChild(score);

    tableEl.appendChild(row);
  });
}

// ------------------------------
// VIEW MODE
// ------------------------------

function setViewMode(mode) {
  document.getElementById('scoreboardView').style.display = (mode === 'scoreboard') ? 'block' : 'none';
  document.getElementById('warmupView').style.display = (mode === 'warmup') ? 'block' : 'none';
  document.getElementById('messageView').style.display = (mode === 'message') ? 'block' : 'none';
}

// ------------------------------
// APPLY FONT SIZES
// ------------------------------

function applyFontSizes(fs) {
  // Competition heading
  compNameEl.style.fontSize = fs.competition + "px";

  // Category heading inherits banner font — no categoryFont needed

  // Table font
  tableEl.style.fontSize = fs.table + "px";

  // Scoreboard banner
  scoreboardBannerEl.style.fontSize = fs.scoreboard + "px";

  // Warmup banner
  warmupBannerEl.style.fontSize = fs.warmup + "px";

  // Message banner/box
  messageBoxEl.style.fontSize = fs.message + "px";

  // Current/Next skater
  currentNextEl.style.fontSize = fs.currentNext + "px";
}