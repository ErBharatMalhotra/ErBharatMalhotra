const fs = require('fs');
const path = require('path');

const USERNAME = 'ErBharatMalhotra';
const TOKEN = process.env.GITHUB_TOKEN;
const PROFILE_DIR = path.join(__dirname, '../../profile');

const QUERY = `
query($username: String!) {
  user(login: $username) {
    name
    login
    repositories(ownerAffiliations: OWNER, first: 100) {
      totalCount
      nodes {
        stargazerCount
        primaryLanguage { name color }
        isPrivate
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
    pullRequests { totalCount }
    issues { totalCount }
    followers { totalCount }
  }
}`;

async function fetchGitHubData() {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { username: USERNAME } }),
  });
  const json = await res.json();
  if (json.errors) { console.error(json.errors); throw new Error('GraphQL failed'); }
  return json.data;
}

function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// ─── Calculate streak from contribution data ───
function calcStreak(weeks) {
  // Flatten all days, most recent first
  const days = [];
  for (const w of weeks) {
    for (const d of w.contributionDays) {
      days.push({ date: d.date, count: d.contributionCount });
    }
  }
  days.reverse(); // most recent first

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const d of days) {
    if (d.count > 0) {
      streak++;
    } else {
      // Allow today to be empty (day not over yet)
      if (d.date === today && streak === 0) continue;
      break;
    }
  }
  return streak;
}

// ─── Premium Color Palette ───
const P = {
  bg:       '#0a0e1a',
  card:     '#111827',
  border:   '#1e293b',
  text:     '#f1f5f9',
  muted:    '#64748b',
  accent:   '#06b6d4',   // cyan
  green:    '#10b981',
  purple:   '#a78bfa',
  yellow:   '#fbbf24',
  orange:   '#fb923c',
  pink:     '#f472b6',
  glow:     'rgba(6,182,212,0.15)',
};

const ANIM = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes countPulse { 0%,100%{ opacity:1; } 50%{ opacity:0.75; } }
  @keyframes shimmer { 0%{ stop-color:#06b6d4; } 50%{ stop-color:#a78bfa; } 100%{ stop-color:#06b6d4; } }
  @keyframes barGrow { from { width:0; } }
  .row { animation: fadeUp 0.5s ease both; }
  .row:nth-child(1) { animation-delay:.1s }
  .row:nth-child(2) { animation-delay:.2s }
  .row:nth-child(3) { animation-delay:.3s }
  .big-num { animation: fadeUp 0.6s ease both; animation-delay:.2s; }
  .bar { animation: barGrow 0.8s ease both; }
`;

// ─── stats.svg — PREMIUM: only strong stats ───
function generateStatsSvg(data) {
  const u = data.user;
  const cal = u.contributionsCollection.contributionCalendar;
  const repos = u.repositories;
  const stars = repos.nodes.reduce((s, r) => s + r.stargazerCount, 0);
  const streak = calcStreak(cal.weeks);

  const H = 220;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="${H}" viewBox="0 0 495 ${H}">
  <defs>
    <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${P.accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${P.purple}" stop-opacity="0.08"/>
    </linearGradient>
    <style>${ANIM}
      .stat-box { transition: transform 0.2s, box-shadow 0.2s; }
    </style>
  </defs>

  <rect width="495" height="${H}" rx="16" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>
  <rect width="495" height="${H}" rx="16" fill="url(#glowGrad)"/>

  <!-- Title -->
  <text x="30" y="38" fill="${P.text}" font-family="Arial,sans-serif" font-size="20" font-weight="bold">GitHub Stats</text>
  <text x="30" y="58" fill="${P.muted}" font-family="Arial,sans-serif" font-size="13">@ErBharatMalhotra</text>

  <!-- 3 Big Numbers -->
  <g class="row">
    <rect x="20" y="75" width="148" height="70" rx="12" fill="${P.bg}" stroke="${P.border}" stroke-width="1"/>
    <text x="94" y="100" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">COMMITS</text>
    <text x="94" y="130" fill="${P.green}" font-family="Arial,sans-serif" font-size="26" font-weight="bold" text-anchor="middle" class="big-num">${fmt(cal.totalContributions)}</text>
  </g>

  <g class="row">
    <rect x="173" y="75" width="148" height="70" rx="12" fill="${P.bg}" stroke="${P.border}" stroke-width="1"/>
    <text x="247" y="100" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">STREAK</text>
    <text x="247" y="130" fill="${P.accent}" font-family="Arial,sans-serif" font-size="26" font-weight="bold" text-anchor="middle" class="big-num">${streak}d</text>
  </g>

  <g class="row">
    <rect x="326" y="75" width="148" height="70" rx="12" fill="${P.bg}" stroke="${P.border}" stroke-width="1"/>
    <text x="400" y="100" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">REPOS</text>
    <text x="400" y="130" fill="${P.purple}" font-family="Arial,sans-serif" font-size="26" font-weight="bold" text-anchor="middle" class="big-num">${repos.totalCount}</text>
  </g>

  <!-- Bottom row: Stars + Followers -->
  <g class="row">
    <rect x="20" y="155" width="230" height="48" rx="10" fill="${P.bg}" stroke="${P.border}" stroke-width="1"/>
    <text x="40" y="183" fill="${P.yellow}" font-family="Arial,sans-serif" font-size="14" font-weight="bold">${fmt(stars)}</text>
    <text x="${40 + String(stars).length * 10 + 10}" y="183" fill="${P.muted}" font-family="Arial,sans-serif" font-size="13">stars earned</text>
  </g>

  <g class="row">
    <rect x="256" y="155" width="218" height="48" rx="10" fill="${P.bg}" stroke="${P.border}" stroke-width="1"/>
    <text x="276" y="183" fill="${P.pink}" font-family="Arial,sans-serif" font-size="14" font-weight="bold">${fmt(u.followers.totalCount)}</text>
    <text x="${276 + String(u.followers.totalCount).length * 10 + 10}" y="183" fill="${P.muted}" font-family="Arial,sans-serif" font-size="13">followers</text>
  </g>
</svg>`;
}

// ─── top-langs.svg — Premium bars ───────────
function generateTopLangsSvg(data) {
  const repos = data.user.repositories.nodes.filter(r => !r.isPrivate);
  const langMap = {};
  repos.forEach(r => {
    if (r.primaryLanguage) {
      const n = r.primaryLanguage.name;
      if (!langMap[n]) langMap[n] = { color: r.primaryLanguage.color || '#8b949e', count: 0 };
      langMap[n].count++;
    }
  });
  const sorted = Object.entries(langMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  const total = sorted.reduce((s, [, v]) => s + v.count, 0);
  const barW = 260, barH = 16, barX = 40, startY = 110;

  const lines = sorted.map(([name, info], i) => {
    const y = startY + i * 34;
    const pct = (info.count / total) * 100;
    const w = Math.max((pct / 100) * barW, 10);
    return `<g class="row">
      <text x="40" y="${y - 6}" fill="${P.text}" font-family="Arial,sans-serif" font-size="13" font-weight="bold">${name}</text>
      <text x="310" y="${y - 6}" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12" text-anchor="end">${pct.toFixed(1)}%</text>
      <rect x="${barX}" y="${y}" width="${barW}" height="${barH}" rx="8" fill="${P.bg}"/>
      <rect x="${barX}" y="${y}" width="${w}" height="${barH}" rx="8" fill="${info.color}" class="bar" style="animation-delay:${0.2 + i * 0.12}s"/>
    </g>`;
  }).join('\n    ');

  const H = startY + sorted.length * 34 + 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${H}" viewBox="0 0 350 ${H}">
  <defs>
    <linearGradient id="gLang" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${P.accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${P.purple}" stop-opacity="0.05"/>
    </linearGradient>
    <style>${ANIM}</style>
  </defs>
  <rect width="350" height="${H}" rx="16" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>
  <rect width="350" height="${H}" rx="16" fill="url(#gLang)"/>
  <text x="40" y="38" fill="${P.text}" font-family="Arial,sans-serif" font-size="17" font-weight="bold">Top Languages</text>
  <text x="40" y="58" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12">${repos.length} repos analyzed</text>
  <line x1="30" y1="72" x2="320" y2="72" stroke="${P.border}" stroke-width="1"/>
  <text x="40" y="92" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11">${sorted.length} languages</text>
    ${lines}
</svg>`;
}

// ─── contributions.svg — Premium heatmap ─────
function generateContribSvg(data) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.slice(-24);
  const cell = 11, gap = 2, sx = 10, sy = 48;
  const W = sx + weeks.length * (cell + gap) + 30;
  const H = sy + 7 * (cell + gap) + 35;

  function g(c) {
    if (c === 0) return '#161b22';
    if (c <= 2) return '#0e4429';
    if (c <= 5) return '#006d32';
    if (c <= 8) return '#26a641';
    return '#39d353';
  }

  let idx = 0;
  const cells = weeks.map((w, wi) =>
    w.contributionDays.map((d, di) => {
      const x = sx + wi * (cell + gap);
      const y = sy + di * (cell + gap);
      const delay = (idx++ * 0.008).toFixed(3);
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${g(d.contributionCount)}" class="row" style="animation-delay:${delay}s"><title>${d.date}: ${d.contributionCount} contributions</title></rect>`;
    }).join('\n    ')
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>${ANIM}
      rect[rx="2"] { transition: transform 0.15s, filter 0.15s; }
      rect[rx="2"]:hover { transform: scale(2); filter: brightness(1.4); z-index:10; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>
  <text x="20" y="28" fill="${P.text}" font-family="Arial,sans-serif" font-size="14" font-weight="bold">Contribution Activity</text>
  <text x="${W - 20}" y="28" fill="${P.green}" font-family="Arial,sans-serif" font-size="13" text-anchor="end" font-weight="bold">${fmt(cal.totalContributions)} contributions this year</text>
  <line x1="10" y1="38" x2="${W - 10}" y2="38" stroke="${P.border}" stroke-width="1"/>
    ${cells}
</svg>`;
}

// ─── streak.svg — Standalone streak card ─────
function generateStreakSvg(data) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const streak = calcStreak(cal.weeks);

  // Find best streak ever
  const allDays = [];
  for (const w of cal.weeks) {
    for (const d of w.contributionDays) allDays.push(d.contributionCount);
  }
  let bestStreak = 0, cur = 0;
  for (const c of allDays) {
    if (c > 0) { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  }

  const H = 160;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="${H}" viewBox="0 0 495 ${H}">
  <defs>
    <linearGradient id="sGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${P.accent}" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="${P.purple}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${P.accent}" stop-opacity="0.15"/>
    </linearGradient>
    <style>${ANIM}</style>
  </defs>
  <rect width="495" height="${H}" rx="16" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>
  <rect width="495" height="${H}" rx="16" fill="url(#sGrad)"/>

  <!-- Fire icon -->
  <text x="30" y="45" fill="${P.orange}" font-family="Arial,sans-serif" font-size="28">&#x1F525;</text>
  <text x="65" y="38" fill="${P.text}" font-family="Arial,sans-serif" font-size="18" font-weight="bold">Streak</text>
  <text x="65" y="56" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12">Keep the fire going!</text>

  <!-- Current streak — BIG -->
  <g class="row">
    <text x="170" y="35" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">CURRENT</text>
    <text x="170" y="75" fill="${P.accent}" font-family="Arial,sans-serif" font-size="42" font-weight="bold" text-anchor="middle" class="big-num">${streak}</text>
    <text x="170" y="95" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12" text-anchor="middle">days</text>
  </g>

  <!-- Divider -->
  <line x1="260" y1="20" x2="260" y2="${H - 20}" stroke="${P.border}" stroke-width="1"/>

  <!-- Best streak -->
  <g class="row">
    <text x="370" y="35" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">BEST STREAK</text>
    <text x="370" y="75" fill="${P.yellow}" font-family="Arial,sans-serif" font-size="32" font-weight="bold" text-anchor="middle" class="big-num">${bestStreak}</text>
    <text x="370" y="95" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12" text-anchor="middle">days</text>
  </g>

  <!-- Total contributions -->
  <g class="row">
    <text x="370" y="125" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">TOTAL</text>
    <text x="370" y="148" fill="${P.green}" font-family="Arial,sans-serif" font-size="20" font-weight="bold" text-anchor="middle">${fmt(cal.totalContributions)}</text>
  </g>
</svg>`;
}

// ─── Main ───────────────────────────────────
async function main() {
  console.log('Fetching GitHub data for', USERNAME, '...');
  const data = await fetchGitHubData();
  console.log('Data fetched!');
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  fs.writeFileSync(path.join(PROFILE_DIR, 'stats.svg'), generateStatsSvg(data));
  console.log('stats.svg done');
  fs.writeFileSync(path.join(PROFILE_DIR, 'top-langs.svg'), generateTopLangsSvg(data));
  console.log('top-langs.svg done');
  fs.writeFileSync(path.join(PROFILE_DIR, 'contributions.svg'), generateContribSvg(data));
  console.log('contributions.svg done');
  fs.writeFileSync(path.join(PROFILE_DIR, 'streak.svg'), generateStreakSvg(data));
  console.log('streak.svg done');
  console.log('All SVGs generated!');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
