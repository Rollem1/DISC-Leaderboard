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
  if (competitionEl) competitionEl.textContent = data.competitionName || '';
  if (categoryEl) categoryEl.textContent = '';

  if (data.backgroundImage) {
    document.body.style.setProperty('--overlay-bg', `url(${data.backgroundImage})`);
  } else {
    document.body.style.setProperty('--overlay-bg', 'none');
  }

  if (data.fontSizes) {
    if (competitionEl) competitionEl.style.fontSize = data.fontSizes.competition + 'px';

    if (scoreboardBanner) scoreboardBanner.style.fontSize = data.fontSizes.scoreboard + 'px';
    if (warmupBanner) warmupBanner.style.fontSize = data.fontSizes.warmup + 'px';
    if (messageBanner) messageBanner.style.fontSize = data.fontSizes.message + 'px';
    if (generalMessage) generalMessage.style.fontSize = data.fontSizes.message + 'px';

    if (currentEl) currentEl.style.fontSize = data.fontSizes.currentNext + 'px';
    if (nextEl) nextEl.style.fontSize = data.fontSizes.currentNext + 'px';

    document.querySelectorAll('.leaderboard-row').forEach(row => {
      row.style.fontSize = data.fontSizes.table + 'px';
    });
    document.querySelectorAll('#warmupList > div').forEach(row => {
      row.style.fontSize = data.fontSizes.table + 'px';
    });
  }

  if (data.viewMode === 'scoreboard') {
    renderScoreboardView(data);
  } else if (data.viewMode === 'warmup') {
    renderWarmupView(data);
  } else if (data.viewMode === 'message') {
    renderMessageView(data);
  }

  // Apply mobile overrides AFTER state render
  applyMobileFontOverrides();
}

function renderScoreboardView(data) {
  hideAllViews();
  scoreboardView.style.display = 'block';

  if (scoreboardBanner) {
    const categoryText = data.categoryName || data.category || '';
    scoreboardBanner.textContent = categoryText ? `${categoryText} Leaderboard` : 'Leaderboard';
  }

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

    if (data.fontSizes && data.fontSizes.table) {
      row.style.fontSize = data.fontSizes.table + 'px';
    }

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

  requestAnimationFrame(() => {
    positionScrollWrapper();
    const contentHeight = scrollingDiv.scrollHeight;
    const containerHeight = document.getElementById('scrollWrapper').offsetHeight;
    scrollingDiv.style.animation = contentHeight > containerHeight
      ? `scrollOnce ${contentHeight / 30}s linear infinite`
      : 'none';
  });
}

function renderWarmupView(data) {
  hideAllViews();
  warmupView.style.display = 'block';

  if (warmupBanner) {
    const categoryText = data.categoryName || data.category || '';
    const groupPart = data.warmupGroup ? ` Warmup ${data.warmupGroup}` : ' Warmup';
    warmupBanner.textContent = categoryText ? `${categoryText}${groupPart}` : `Warmup${data.warmupGroup ? ' ' + data.warmupGroup : ''}`;
  }

  warmupGroupLabel.textContent = data.warmupGroup ? `Group ${data.warmupGroup}` : '';

  warmupList.innerHTML = '';
  warmupList.dataset.scrolled = '';

  const list = Array.isArray(data.warmupSkaters) ? data.warmupSkaters : [];
  if (list.length > 0) {
    list.forEach(skater => {
      const row = document.createElement('div');
      const order = skater.order != null ? `${skater.order}. ` : '';
      row.textContent = `${order}${skater.name} (${skater.club})`;

      if (data.fontSizes && data.fontSizes.table) {
        row.style.fontSize = data.fontSizes.table + 'px';
      }

      warmupList.appendChild(row);
    });
    adjustScrollSpeed();
  } else {
    const row = document.createElement('div');
    row.textContent = 'No skaters in this group';
    if (data.fontSizes && data.fontSizes.table) {
      row.style.fontSize = data.fontSizes.table + 'px';
    }
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
  if (messageBanner) {
    messageBanner.textContent = 'Announcement';
  }

  generalMessage.textContent = data.message || 'No message set';
}

// Reposition on load/resize for scoreboard scroll wrapper
window.addEventListener('load', positionScrollWrapper);
window.addEventListener('resize', positionScrollWrapper);

/* =========================================================
   MOBILE FONT OVERRIDES (JS-BASED)
   ========================================================= */
function applyMobileFontOverrides() {
  if (window.innerWidth > 600) return;

  if (competitionEl) {
    competitionEl.style.setProperty("font-size", "20px", "important");
    competitionEl.style.setProperty("line-height", "1.2", "important");
  }

  if (scoreboardBanner) scoreboardBanner.style.setProperty("font-size", "18px", "important");
  if (warmupBanner) warmupBanner.style.setProperty("font-size", "18px", "important");
  if (messageBanner) messageBanner.style.setProperty("font-size", "18px", "important");

  if (currentEl) currentEl.style.setProperty("font-size", "18px", "important");
  if (nextEl) nextEl.style.setProperty("font-size", "18px", "important");

  document.querySelectorAll('.leaderboard-row').forEach(row => {
    row.style.setProperty("font-size", "16px", "important");
  });

  document.querySelectorAll('#warmupList > div').forEach(row => {
    row.style.setProperty("font-size", "16px", "important");
  });

  if (generalMessage) generalMessage.style.setProperty("font-size", "18px", "important");
}

window.addEventListener("DOMContentLoaded", applyMobileFontOverrides);
window.addEventListener("resize", applyMobileFontOverrides);