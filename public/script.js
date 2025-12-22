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

// Mobile detection using CSS media query
function isMobile() {
  return window.matchMedia("(max-width: 600px)").matches;
}

// Initial state fetch + live updates
fetch('/state')
  .then(r => r.json())
  .then(renderFromState)
  .catch(() => {});

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

  // Desktop only: let admin control header font via CSS variable
  if (data.fontSizes && !mobile) {
    document.documentElement.style.setProperty(
      '--header-font',
      data.fontSizes.competition + 'px'
    );
  }

  // Route to correct view
  if (data.viewMode === 'scoreboard') {
    renderScoreboardView(data);
  } else if (data.viewMode === 'warmup') {
    renderWarmupView(data);
  } else if (data.viewMode === 'message') {
    renderMessageView(data);
  }

  // Reposition scroll wrapper after layout changes
  requestAnimationFrame(positionScrollWrapper);
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
      if (index === 0) medal.src = "/Gold 100x100px.png";
      if (index === 1) medal.src = "/Silver 100x100px.png";
      if (index === 2) medal.src = "/Bronze 100x100px.png";
      medal.alt = "Medal";
      row.appendChild(medal);
    } else {
      const spacer = document.createElement('span');
      spacer.classList.add('medal-spacer');
      row.appendChild(spacer);
    }

    const pos = document.createElement('span');
    pos.classList.add('position');
    pos.textContent = index + 1;
    row.appendChild(pos);

    const name = document.createElement('span');
    name.classList.add('name');
    name.textContent = player.name;
    row.appendChild(name);

    const club = document.createElement('span');
    club.classList.add('club');
    club.textContent = player.club;
    row.appendChild(club);

    const score = document.createElement('span');
    score.classList.add('score');
    score.textContent = player.score;
    row.appendChild(score);

    if (index < 3) leaderboardDiv.appendChild(row);
    else scrollingDiv.appendChild(row);
  });
}

function renderWarmupView(data) {
  hideAllViews();
  warmupView.style.display = 'block';

  warmupGroupLabel.textContent = data.warmupGroup ? `Group ${data.warmupGroup}` : '';

  warmupList.innerHTML = '';

  const list = Array.isArray(data.warmupSkaters) ? data.warmupSkaters : [];
  if (list.length > 0) {
    list.forEach(skater => {
      const row = document.createElement('div');
      const order = skater.order != null ? `${skater.order}. ` : '';
      row.textContent = `${order}${skater.name} (${skater.club})`;
      warmupList.appendChild(row);
    });
    adjustScrollSpeed();
  } else {
    const row = document.createElement('div');
    row.textContent = 'No skaters in this group';
    warmupList.appendChild(row);
  }
}

function adjustScrollSpeed() {
  const container = document.querySelector('.scroll-container');
  if (!container) return;
  const containerHeight = container.offsetHeight;
  const textHeight = warmupList.scrollHeight;

  if (textHeight <= containerHeight) {
    warmupList.style.animation = 'none';
    return;
  }
  if (!warmupList.dataset.scrolled) {
    warmupList.innerHTML += warmupList.innerHTML;
    warmupList.dataset.scrolled = true;
  }

  const duration = (textHeight * 2) / 50;
  warmupList.style.animation = `scroll-up ${duration}s linear infinite`;
}

function renderMessageView(data) {
  hideAllViews();
  messageView.style.display = 'flex';

  if (competitionEl) competitionEl.textContent = data.competitionName || '';
  generalMessage.textContent = data.message || 'No message set';
}

// Reposition on load/resize for scoreboard scroll wrapper
window.addEventListener('load', positionScrollWrapper);
window.addEventListener('resize', positionScrollWrapper);