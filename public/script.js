const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

const bannerLine1 = document.getElementById('bannerLine1');
const bannerLine2 = document.getElementById('bannerLine2');

const scoreboardView = document.getElementById('scoreboardView');
const warmupView = document.getElementById('warmupView');
const messageView = document.getElementById('messageView');

const currentEl = document.getElementById('currentSkater');
const nextEl = document.getElementById('nextSkater');
const leaderboardDiv = document.getElementById('leaderboard');
const scrollingDiv = document.getElementById('scrollingList');
const warmupList = document.getElementById('warmupList');
const generalMessage = document.getElementById('generalMessage');

fetch('/state').then(r => r.json()).then(renderFromState);
ws.onmessage = e => renderFromState(JSON.parse(e.data));

function hideAll() {
  scoreboardView.style.display = 'none';
  warmupView.style.display = 'none';
  messageView.style.display = 'none';
}

function renderFromState(data) {
  // Background
  if (data.backgroundImage) {
    document.body.style.setProperty('--overlay-bg', `url(${data.backgroundImage})`);
  } else {
    document.body.style.removeProperty('--overlay-bg');
  }

  // Banner
  bannerLine1.textContent = data.competitionName || '';

  if (data.viewMode === 'scoreboard') {
    bannerLine2.textContent = `${data.categoryName || ''} Leaderboard`;
  }

  if (data.viewMode === 'warmup') {
    const cat = data.categoryName || '';
    const grp = data.warmupGroup ? `Warmup ${data.warmupGroup}` : 'Warmup';
    bannerLine2.textContent = `${cat} – ${grp}`;
  }

  if (data.viewMode === 'message') {
    bannerLine2.textContent = 'Announcement';
  }

  // Font sizes
  const fs = data.fontSizes || {};

  bannerLine1.style.fontSize = fs.competition + 'px';
  bannerLine2.style.fontSize = fs.scoreboard + 'px';

  currentEl.style.fontSize = fs.currentNext + 'px';
  nextEl.style.fontSize = fs.currentNext + 'px';
  generalMessage.style.fontSize = fs.message + 'px';

  if (data.viewMode === 'scoreboard') renderScoreboard(data);
  if (data.viewMode === 'warmup') renderWarmup(data);
  if (data.viewMode === 'message') renderMessage(data);
}

function renderScoreboard(data) {
  hideAll();
  scoreboardView.style.display = 'block';

  currentEl.textContent = data.currentSkater
    ? `Current Skater: ${data.currentSkater.name} (${data.currentSkater.club})`
    : '';

  nextEl.textContent = data.nextSkater
    ? `Skating next: ${data.nextSkater.name}`
    : '';

  leaderboardDiv.innerHTML = '';
  scrollingDiv.innerHTML = '';

  const fs = data.fontSizes.table;

  // Only scored skaters, sorted
  const scored = data.leaderboard
    .filter(p => p.score != null && p.score !== "")
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

  scored.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.style.fontSize = fs + 'px';

    if (i < 3) row.classList.add('top3');

    row.innerHTML = `
      ${i < 3 ? `<img src="/${['Gold','Silver','Bronze'][i]} 100x100px.png">` : `<span class="medal-spacer"></span>`}
      <span>${i + 1}</span>
      <span>${p.name}</span>
      <span>${p.club}</span>
      <span>${p.score}</span>
    `;

    if (i < 3) leaderboardDiv.appendChild(row);
    else scrollingDiv.appendChild(row);
  });
}

function renderWarmup(data) {
  hideAll();
  warmupView.style.display = 'block';

  warmupList.innerHTML = '';
  const fs = data.fontSizes.table;

  data.warmupSkaters.forEach(s => {
    const row = document.createElement('div');
    row.textContent = `${s.order}. ${s.name} (${s.club})`;
    row.style.fontSize = fs + 'px';
    warmupList.appendChild(row);
  });

  startWarmupScroll();
}

function startWarmupScroll() {
  const container = document.querySelector('.scroll-container');
  const list = warmupList;

  if (!container || !list) return;

  const containerHeight = container.offsetHeight;
  const listHeight = list.scrollHeight;

  if (listHeight <= containerHeight) {
    list.style.animation = 'none';
    return;
  }

  list.innerHTML += list.innerHTML;

  const duration = (listHeight * 2) / 40;

  list.style.animation = `scroll-up ${duration}s linear infinite`;
}

function renderMessage(data) {
  hideAll();
  messageView.style.display = 'block';
  generalMessage.textContent = data.message || '';
}