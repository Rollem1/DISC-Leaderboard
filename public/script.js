const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

const competitionEl = document.getElementById('competitionName');
const categoryEl = document.getElementById('categoryName');

const scoreboardView = document.getElementById('scoreboardView');
const warmupView = document.getElementById('warmupView');
const messageView = document.getElementById('messageView');

const currentEl = document.getElementById('currentSkater');
const nextEl = document.getElementById('nextSkater');
const leaderboardDiv = document.getElementById('leaderboard');
const scrollingDiv = document.getElementById('scrollingList');

const warmupGroupLabel = document.getElementById('warmupGroupLabel');
const warmupList = document.getElementById('warmupList');

const generalMessage = document.getElementById('generalMessage');

// Banner elements
const scoreboardBanner = document.getElementById('scoreboardBanner');
const warmupBanner = document.getElementById('warmupBanner');
const messageBanner = document.getElementById('messageBanner');

// Mobile detection using CSS media query (works on real iPhones)
function isMobile() {
  return window.matchMedia("(max-width: 600px)").matches;
}

// Initial state fetch + live updates
fetch('/state').then(r => r.json()).then(renderFromState).catch(() => {});
ws.onopen = () => console.log("✅ WebSocket connected");
ws.onmessage = e => renderFromState(JSON.parse(e.data));

function hideAllViews() {
  scoreboardView.style.display = 'none';
  warmupView.style.display = 'none';
  messageView.style.display = 'none';
}

function positionScrollWrapper() {
  const scrollWrapper = document.getElementById('scrollWrapper');
  const leaderboardBlock = document.getElementById('leaderboard');
  if (!scrollWrapper || !leaderboardBlock) return;
  const gap = 5;
  const top = leaderboardBlock.offsetTop + leaderboardBlock.offsetHeight + gap;
  scrollWrapper.style.top = `${top}px`;
  scrollWrapper.style.height = `${window.innerHeight - top}px`;
}

function renderFromState(data) {
  const mobile = isMobile();

  // Competition name
  if (competitionEl) competitionEl.textContent = data.competitionName || '';
  if (categoryEl) categoryEl.textContent = '';

  // Background image
  if (data.backgroundImage) {
    document.body.style.setProperty('--overlay-bg', `url(${data.backgroundImage})`);
  } else {
    document.body.style.setProperty('--overlay-bg', 'none');
  }

  // Apply admin font sizes ONLY on desktop
  if (data.fontSizes && !mobile) {
    if (competitionEl) competitionEl.style.fontSize = data.fontSizes.competition + 'px';
  }

  // Route to correct view
  if (data.viewMode === 'scoreboard') {
    renderScoreboardView(data);
  } else if (data.viewMode === 'warmup') {
    renderWarmupView(data);
  } else if (data.viewMode === 'message') {
    renderMessageView(data);
  }

  // Apply header override LAST
  applyMobileHeaderOverride();
}

function renderScoreboardView(data) {
  hideAllViews();
  scoreboardView.style.display = 'block';

  currentEl.textContent = data.currentSkater
    ? `Current Skater: ${data.currentSkater.name} (${data.currentSkater.club})`
    : '';

  if (data.nextSkater) {
    const remaining = (Array.isArray(data.leaderboard) ? data.leaderboard : [])
      .filter(p => p.score == null);
    const remainingCount = data.currentSkater
      ? remaining.filter(p => p.name !== data.currentSkater.name).length
      : remaining.length;
    nextEl.textContent = `${remainingCount} skaters to skate - Skating next ${data.nextSkater.name}`;
  } else {
    nextEl.textContent = '';
  }

  leaderboardDiv.innerHTML = '';
  scrollingDiv.innerHTML = '';

  requestAnimationFrame(() => {
    positionScrollWrapper();
  });

  // Apply header override LAST
  applyMobileHeaderOverride();
}

function renderWarmupView(data) {
  hideAllViews();
  warmupView.style.display = 'block';

  warmupGroupLabel.textContent = data.warmupGroup ? `Group ${data.warmupGroup}` : '';

  warmupList.innerHTML = '';

  // Apply header override LAST
  applyMobileHeaderOverride();
}

function renderMessageView(data) {
  hideAllViews();
  messageView.style.display = 'flex';

  if (competitionEl) competitionEl.textContent = data.competitionName || '';

  generalMessage.textContent = data.message || 'No message set';

  // Apply header override LAST
  applyMobileHeaderOverride();
}

/* =========================================================
   HEADER-ONLY MOBILE OVERRIDE (runs AFTER every DOM update)
   ========================================================= */
function applyMobileHeaderOverride() {
  if (!isMobile()) return;

  if (competitionEl) {
    competitionEl.style.setProperty("font-size", "20px", "important");
    competitionEl.style.setProperty("line-height", "1.2", "important");
  }
}

// Reposition on load/resize for scoreboard scroll wrapper
window.addEventListener('load', positionScrollWrapper);
window.addEventListener('resize', () => {
  positionScrollWrapper();
  applyMobileHeaderOverride();
});