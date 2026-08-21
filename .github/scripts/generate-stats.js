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

// ─── Calculate ALL streaks from contribution data ───
function calcStreaks(weeks) {
  const allDays = [];
  for (const w of weeks) {
    for (const d of w.contributionDays) {
      allDays.push({ date: d.date, count: d.contributionCount });
    }
  }

  // Current streak: count backwards from most recent day with contributions
  const reversed = [...allDays].reverse();
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < reversed.length; i++) {
    const d = reversed[i];
    if (d.count > 0) {
      currentStreak++;
    } else {
      // Skip today if no contributions yet (day not over)
      if (d.date === today) continue;
      break;
    }
  }

  // Best streak ever: longest consecutive days with contributions
  let bestStreak = 0, cur = 0;
  for (const d of allDays) {
    if (d.count > 0) {
      cur++;
      if (cur > bestStreak) bestStreak = cur;
    } else {
      cur = 0;
    }
  }

  return { current: currentStreak, best: bestStreak };
}

// ─── Premium Color Palette ───
const P = {
  bg:     '#0d1117',
  card:   '#161b22',
  border: '#30363d',
  text:   '#e6edf3',
  muted:  '#8b949e',
  cyan:   '#58a6ff',
  green:  '#39d353',
  purple: '#a855f7',
  yellow: '#f0c040',
  orange: '#f9826c',
  pink:   '#f778ba',
};

// ─── stats.svg — Clean, strong stats only ───
function generateStatsSvg(data) {
  const u = data.user;
  const cal = u.contributionsCollection.contributionCalendar;
  const repos = u.repositories;
  const stars = repos.nodes.reduce((s, r) => s + r.stargazerCount, 0);
  const streaks = calcStreaks(cal.weeks);

  // Only strong stats — no weak numbers
  const rows = [
    { label: 'Total Commits',  val: fmt(cal.totalContributions), color: P.green, big: true },
    { label: 'Current Streak', val: streaks.current + ' days',   color: P.cyan,  big: true },
    { label: 'Best Streak',    val: streaks.best + ' days',      color: P.yellow, big: true },
    { label: 'Stars Earned',   val: fmt(stars),                  color: P.orange },
    { label: 'Public Repos',   val: String(repos.totalCount),    color: P.purple },
  ];

  const H = 70 + rows.length * 44 + 20;

  const lines = rows.map((r, i) => {
    const y = 80 + i * 44;
    const fs = r.big ? 24 : 16;
    const fw = r.big ? 'bold' : 'normal';
    return `<g class="row" style="animation-delay:${i * 0.08}s">
      <text x="30" y="${y}" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12">${r.label}</text>
      <text x="320" y="${y}" fill="${r.color}" font-family="Arial,sans-serif" font-size="${fs}" font-weight="${fw}" text-anchor="end">${r.val}</text>
    </g>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${H}" viewBox="0 0 350 ${H}">
  <style>
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .row { animation: fadeUp 0.5s ease both; }
    g:hover text { fill: #ffffff !important; }
  </style>
  <rect width="350" height="${H}" rx="12" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>
  <text x="30" y="35" fill="${P.text}" font-family="Arial,sans-serif" font-size="18" font-weight="bold">GitHub Stats</text>
  <text x="30" y="55" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12">@ErBharatMalhotra</text>
  <line x1="20" y1="68" x2="330" y2="68" stroke="${P.border}" stroke-width="1"/>
    ${lines}
</svg>`;
}

// ─── top-langs.svg — Clean bars ─────────────
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
  const barW = 230, barH = 12, barX = 40, startY = 90;

  const lines = sorted.map(([name, info], i) => {
    const y = startY + i * 30;
    const pct = (info.count / total) * 100;
    const w = Math.max((pct / 100) * barW, 8);
    return `<g class="row" style="animation-delay:${i * 0.08}s">
      <text x="40" y="${y}" fill="${P.text}" font-family="Arial,sans-serif" font-size="12">${name}</text>
      <text x="310" y="${y}" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="end">${pct.toFixed(1)}%</text>
      <rect x="${barX}" y="${y + 4}" width="${barW}" height="${barH}" rx="6" fill="${P.border}"/>
      <rect x="${barX}" y="${y + 4}" width="${w}" height="${barH}" rx="6" fill="${info.color}"/>
    </g>`;
  }).join('\n    ');

  const H = startY + sorted.length * 30 + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${H}" viewBox="0 0 350 ${H}">
  <style>
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .row { animation: fadeUp 0.5s ease both; }
    g:hover text { fill: #ffffff !important; }
    g:hover rect[rx="6"] { filter: brightness(1.3); }
  </style>
  <rect width="350" height="${H}" rx="12" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>
  <text x="40" y="35" fill="${P.text}" font-family="Arial,sans-serif" font-size="16" font-weight="bold">Top Languages</text>
  <text x="40" y="55" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12">${repos.length} repos</text>
  <line x1="30" y1="68" x2="320" y2="68" stroke="${P.border}" stroke-width="1"/>
    ${lines}
</svg>`;
}

// ─── streak.svg — Hero card ─────────────────
function generateStreakSvg(data) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const streaks = calcStreaks(cal.weeks);

  const H = 140;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="${H}" viewBox="0 0 495 ${H}">
  <style>
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes glow { 0%,100%{ opacity:1; } 50%{ opacity:0.7; } }
    .row { animation: fadeUp 0.5s ease both; }
    .hero { animation: glow 2s ease infinite; }
  </style>
  <rect width="495" height="${H}" rx="12" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>

  <!-- Left: Current Streak -->
  <text x="120" y="30" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">CURRENT STREAK</text>
  <text x="120" y="75" fill="${P.cyan}" font-family="Arial,sans-serif" font-size="40" font-weight="bold" text-anchor="middle" class="hero">${streaks.current}</text>
  <text x="120" y="95" fill="${P.muted}" font-family="Arial,sans-serif" font-size="13" text-anchor="middle">days</text>

  <!-- Divider -->
  <line x1="248" y1="15" x2="248" y2="${H - 15}" stroke="${P.border}" stroke-width="1"/>

  <!-- Right top: Best Streak -->
  <text x="370" y="30" fill="${P.muted}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle">BEST STREAK</text>
  <text x="370" y="70" fill="${P.yellow}" font-family="Arial,sans-serif" font-size="30" font-weight="bold" text-anchor="middle" class="row">${streaks.best}</text>
  <text x="370" y="90" fill="${P.muted}" font-family="Arial,sans-serif" font-size="12" text-anchor="middle">days</text>

  <!-- Right bottom: Total -->
  <text x="370" y="115" fill="${P.muted}" font-family="Arial,sans-serif" font-size="10" text-anchor="middle">TOTAL CONTRIBUTIONS</text>
  <text x="370" y="135" fill="${P.green}" font-family="Arial,sans-serif" font-size="16" font-weight="bold" text-anchor="middle">${fmt(data.user.contributionsCollection.contributionCalendar.totalContributions)}</text>
</svg>`;
}

// ─── contributions.svg — Heatmap ────────────
function generateContribSvg(data) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.slice(-24);
  const cell = 10, gap = 2, sx = 10, sy = 48;
  const W = sx + weeks.length * (cell + gap) + 30;
  const H = sy + 7 * (cell + gap) + 30;

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
      const delay = (idx++ * 0.005).toFixed(3);
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${g(d.contributionCount)}" class="row" style="animation-delay:${delay}s"><title>${d.date}: ${d.contributionCount} contributions</title></rect>`;
    }).join('\n    ')
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    @keyframes fadeUp { from { opacity:0; } to { opacity:1; } }
    .row { animation: fadeUp 0.3s ease both; }
    rect[rx="2"]:hover { transform: scale(2); filter: brightness(1.5); }
  </style>
  <rect width="${W}" height="${H}" rx="12" fill="${P.card}" stroke="${P.border}" stroke-width="1"/>
  <text x="20" y="28" fill="${P.text}" font-family="Arial,sans-serif" font-size="13" font-weight="bold">Contributions</text>
  <text x="${W - 20}" y="28" fill="${P.green}" font-family="Arial,sans-serif" font-size="12" text-anchor="end">${fmt(cal.totalContributions)} this year</text>
  <line x1="10" y1="38" x2="${W - 10}" y2="38" stroke="${P.border}" stroke-width="1"/>
    ${cells}
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
  fs.writeFileSync(path.join(PROFILE_DIR, 'streak.svg'), generateStreakSvg(data));
  console.log('streak.svg done');
  fs.writeFileSync(path.join(PROFILE_DIR, 'contributions.svg'), generateContribSvg(data));
  console.log('contributions.svg done');
  console.log('All done!');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
