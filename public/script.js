// ==========================================
// Desktop Overlay Script (Aligned Version)
// ==========================================

// Elements from your actual HTML
const compNameEl = document.getElementById("competitionName");
const categoryNameEl = document.getElementById("categoryName");

const scoreboardView = document.getElementById("scoreboardView");
const warmupView = document.getElementById("warmupView");
const messageView = document.getElementById("messageView");

const scoreboardBannerEl = document.getElementById("scoreboardBanner");
const warmupBannerEl = document.getElementById("warmupBanner");
const messageBannerEl = document.getElementById("messageBanner");

const leaderboardEl = document.getElementById("leaderboard");
const scrollingListEl = document.getElementById("scrollingList");

const currentSkaterEl = document.getElementById("currentSkater");
const nextSkaterEl = document.getElementById("nextSkater");

const warmupListEl = document.getElementById("warmupList");
const warmupGroupLabelEl = document.getElementById("warmupGroupLabel");

const generalMessageEl = document.getElementById("generalMessage");

// WebSocket connection
const ws = new WebSocket(location.origin.replace(/^http/, "ws"));

ws.onmessage = (event) => {
  const state = JSON.parse(event.data);
  applyState(state);
};

// ==========================================
// APPLY STATE
// ==========================================

function applyState(state) {
  // Competition + Category
  compNameEl.textContent = state.competitionName || "";
  categoryNameEl.textContent = state.categoryName || "";

  // View mode
  setViewMode(state.viewMode);

  // Leaderboard
  renderLeaderboard(state.leaderboard);

  // Current / Next
  renderCurrentNext(state.currentSkater, state.nextSkater);

  // Warmup
  if (state.viewMode === "warmup") {
    warmupGroupLabelEl.textContent = state.warmupGroup || "";
    renderWarmupList(state.warmupSkaters || []);
  }

  // Message
  if (state.viewMode === "message") {
    generalMessageEl.textContent = state.message || "";
  }

  // Background
  applyBackground(state.backgroundImage);

  // Fonts
  if (state.fontSizes) {
    applyFontSizes(state.fontSizes);
  }
}

// ==========================================
// VIEW MODE
// ==========================================

function setViewMode(mode) {
  scoreboardView.style.display = mode === "scoreboard" ? "block" : "none";
  warmupView.style.display = mode === "warmup" ? "block" : "none";
  messageView.style.display = mode === "message" ? "block" : "none";
}

// ==========================================
// LEADERBOARD
// ==========================================

function renderLeaderboard(list) {
  leaderboardEl.innerHTML = "";
  scrollingListEl.innerHTML = "";

  if (!Array.isArray(list)) return;

  list.forEach((skater) => {
    // Static leaderboard
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.textContent = `${skater.order}. ${skater.name} (${skater.club}) — ${skater.score ?? ""}`;
    leaderboardEl.appendChild(row);

    // Scrolling list
    const scrollRow = document.createElement("div");
    scrollRow.className = "scroll-row";
    scrollRow.textContent = `${skater.order}. ${skater.name} — ${skater.score ?? ""}`;
    scrollingListEl.appendChild(scrollRow);
  });
}

// ==========================================
// CURRENT / NEXT
// ==========================================

function renderCurrentNext(current, next) {
  currentSkaterEl.textContent = current ? `Current: ${current.name}` : "";
  nextSkaterEl.textContent = next ? `Next: ${next.name}` : "";
}

// ==========================================
// WARMUP LIST
// ==========================================

function renderWarmupList(list) {
  warmupListEl.innerHTML = "";

  list.forEach((skater) => {
    const row = document.createElement("div");
    row.className = "warmup-row";
    row.textContent = `${skater.name} (${skater.club})`;
    warmupListEl.appendChild(row);
  });
}

// ==========================================
// BACKGROUND
// ==========================================

function applyBackground(path) {
  if (!path) {
    document.body.style.backgroundImage = "none";
  } else {
    document.body.style.backgroundImage = `url('${path}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  }
}

// ==========================================
// FONT SIZES
// ==========================================

function applyFontSizes(fs) {
  // Competition heading
  compNameEl.style.fontSize = fs.competition + "px";

  // Category inherits scoreboard banner font
  categoryNameEl.style.fontSize = fs.scoreboard + "px";

  // Scoreboard banner
  scoreboardBannerEl.style.fontSize = fs.scoreboard + "px";

  // Warmup banner
  warmupBannerEl.style.fontSize = fs.warmup + "px";

  // Message banner + box
  messageBannerEl.style.fontSize = fs.message + "px";
  generalMessageEl.style.fontSize = fs.message + "px";

  // Table / leaderboard
  leaderboardEl.style.fontSize = fs.table + "px";
  scrollingListEl.style.fontSize = fs.table + "px";

  // Current / Next
  currentSkaterEl.style.fontSize = fs.currentNext + "px";
  nextSkaterEl.style.fontSize = fs.currentNext + "px";
}