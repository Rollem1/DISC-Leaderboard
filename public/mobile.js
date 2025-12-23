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
const warmupGroupLabel = document.getElementById('warmupGroupLabel');
const warmupList = document.getElementById('warmupList');
const generalMessage = document.getElementById('generalMessage');

fetch('/state').then(r => r.json()).then(renderFromState).catch(() => {});
ws.onmessage = e => renderFromState(JSON.parse(e.data));

function hideAllViews() {
  scoreboardView.style.display = 'none';
  warmupView.style.display = 'none';
  messageView.style.display = 'none';
}

function renderFromState(data) {
  competitionEl.textContent = data.competitionName || '';
  categoryEl.textContent = '';

  if (data.backgroundImage) {
    document.body.style.setProperty('--overlay-bg', `url(${data.backgroundImage})`);
  } else {
    document.body.style.setProperty('--overlay-bg', 'none');
  }

  if (data.viewMode === 'scoreboard') renderScoreboardView(data);
  else if (data.viewMode === 'warmup') renderWarmupView(data);
  else if (data.viewMode === 'message') renderMessageView(data);
}

function renderScoreboardView(data) {
  hideAllViews();
  scoreboardView.style.display = 'block';

  const categoryText = data.categoryName || '';
  document.getElementById('scoreboardBanner').textContent =
    categoryText ? `${categoryText} Leaderboard` : 'Leaderboard';

  currentEl.textContent = data.currentSkater
    ? `Current: ${data.currentSkater.name} (${data.currentSkater.club})`
    : '';

  nextEl.textContent = data.nextSkater
    ? `Next: ${data.nextSkater.name}`
    : '';

  leaderboardDiv.innerHTML = '';
  const lb = Array.isArray(data.leaderboard) ? data.leaderboard : [];
  const specials = ['DNF', 'DQ', 'WD'];

  const scored = lb.filter(p => p.score != null).sort((a, b) => {
    const aSpecial = specials.includes(String(a.score).toUpperCase());
    const bSpecial = specials.includes(String(b.score).toUpperCase());
    if (aSpecial && bSpecial) return 0;
    if (aSpecial) return 1;
    if (bSpecial) return -1;
    return parseFloat(b.score) - parseFloat(a.score);
  });

  scored.forEach((player, index) => {
    const row = document.createElement('div');
    row.classList.add('leaderboard-row');
    if (index < 3) row.classList.add('top3');

    if (index < 3) {
      const medal = document.createElement('img');
      if (index === 