const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

fetch('/state')
  .then(r => r.json())
  .then(renderFromState)
  .catch(err => console.error("Initial state fetch failed", err));

ws.onopen = () => console.log("✅ Mobile WebSocket connected");
ws.onmessage = e => renderFromState(JSON.parse(e.data));

function hideAllViews() {
  document.getElementById('scoreboardView').style.display = 'none';
  document.getElementById('warmupView').style.display = 'none';
  document.getElementById('messageView').style.display = 'none';
}

function renderFromState(data) {
  document.getElementById('competitionName').textContent = data.competitionName || '';
  document.getElementById('categoryName').textContent = '';

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
  document.getElementById('scoreboardView').style.display = 'block';

  const categoryText = data.categoryName || '';
  document.getElementById('scoreboardBanner').textContent =
    categoryText ? `${categoryText} Leaderboard` : 'Leaderboard';

  document.getElementById('currentSkater').textContent =
    data.currentSkater ? `Current: ${data.currentSkater.name} (${data.currentSkater.club})` : '';

  document.getElementById('nextSkater').textContent =
    data.nextSkater ? `Next: ${data.nextSkater.name}` : '';

  const leaderboardDiv = document.getElementById('leaderboard');
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
    pos.textContent = index + 1;
    row.appendChild(pos);

    const name = document.createElement('span');
    name.textContent = player.name;
    row.appendChild(name);

    const club = document.createElement('span');
    club.textContent = player.club;
    row.appendChild(club);

    const score = document.createElement('span');
    score.textContent = player.score;
    row.appendChild(score);

    leaderboardDiv.appendChild(row);
  });
}

function renderWarmupView(data) {
  hideAllViews();
  document.getElementById('warmupView').style.display = 'block';

  document.getElementById('warmupBanner').textContent =
    "Warm-Up " + (data.warmupGroup || "");

  const warmupList = document.getElementById('warmupList');
  warmupList.innerHTML = '';

  (data.warmupSkaters || []).forEach(skater => {
    const row = document.createElement('div');
    row.textContent = `${skater.order || ''} ${skater.name} (${skater.club})`;
    warmupList.appendChild(row);
  });
}

function renderMessageView(data) {
  hideAllViews();
  document.getElementById('messageView').style.display = 'flex';
  document.getElementById('messageBanner').textContent = "Announcement";
  document.getElementById('generalMessage').textContent = data.message || '';
}