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
    following { totalCount }
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

const C = {
  bg: '#0d1117', border: '#30363d', text: '#e6edf3', muted: '#8b949e',
  green: '#39d353', purple: '#a855f7', blue: '#58a6ff',
  yellow: '#f0c040', orange: '#f9826c', cyan: '#39d5ff',
};

// Simple number formatting — NO toLocaleString
function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// Common CSS for interactivity
const ANIM_CSS = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
  @keyframes slideIn { from { width: 0; } }
  @keyframes countUp { from { opacity: 0; } to { opacity: 1; } }
  .stat-row { animation: fadeIn 0.6s ease-out both; }
  .stat-row:nth-child(1) { animation-delay: 0.1s; }
  .stat-row:nth-child(2) { animation-delay: 0.2s; }
  .stat-row:nth-child(3) { animation-delay: 0.3s; }
  .stat-row:nth-child(4) { animation-delay: 0.4s; }
  .stat-row:nth-child(5) { animation-delay: 0.5s; }
  .stat-row:nth-child(6) { animation-delay: 0.6s; }
  .bar-fill { animation: slideIn 1s ease-out both; }
  .lang-row:hover .bar-fill { filter: brightness(1.3); }
  .lang-row:hover .lang-name { fill: #ffffff; }
  .contrib-cell { animation: fadeIn 0.3s ease-out both; }
  .stat-val { animation: countUp 0.8s ease-out both; }
  .glow { filter: drop-shadow(0 0 3px rgba(57,211,83,0.4)); }
`;

// ─── stats.svg ──────────────────────────────
function generateStatsSvg(data) {
  const u = data.user;
  const cal = u.contributionsCollection.contributionCalendar;
  const repos = u.repositories;
  const stars = repos.nodes.reduce((s, r) => s + r.stargazerCount, 0);

  const rows = [
    { label: 'Stars',     val: stars,                     color: C.yellow },
    { label: 'Commits',   val: cal.totalContributions,    color: C.green },
    { label: 'PRs',       val: u.pullRequests.totalCount, color: C.purple },
    { label: 'Issues',    val: u.issues.totalCount,       color: C.blue },
    { label: 'Followers', val: u.followers.totalCount,    color: C.orange },
    { label: 'Following', val: u.following.totalCount,    color: C.muted },
  ];

  const H = 60 + rows.length * 36 + 40;

  const statLines = rows.map((r, i) => {
    const y = 100 + i * 36;
    return `<g class="stat-row">
      <text x="30" y="${y}" fill="${C.muted}" font-family="Arial,sans-serif" font-size="13">${r.label}</text>
      <text x="320" y="${y}" fill="${r.color}" font-family="Arial,sans-serif" font-size="16" font-weight="bold" text-anchor="end" class="stat-val">${fmt(r.val)}</text>
    </g>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${H}" viewBox="0 0 350 ${H}">
  <style>${ANIM_CSS}</style>
  <rect width="350" height="${H}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <text x="30" y="35" fill="${C.text}" font-family="Arial,sans-serif" font-size="18" font-weight="bold">GitHub Stats</text>
  <text x="30" y="55" fill="${C.muted}" font-family="Arial,sans-serif" font-size="12">@ErBharatMalhotra</text>
  <line x1="20" y1="72" x2="330" y2="72" stroke="${C.border}" stroke-width="1"/>
  <text x="30" y="88" fill="${C.muted}" font-family="Arial,sans-serif" font-size="11">${repos.totalCount} public repos</text>
    ${statLines}
  <line x1="20" y1="${H - 28}" x2="330" y2="${H - 28}" stroke="${C.border}" stroke-width="1"/>
  <text x="175" y="${H - 10}" fill="${C.muted}" font-family="Arial,sans-serif" font-size="9" text-anchor="middle">Updated ${new Date().toISOString().split('T')[0]}</text>
</svg>`;
}

// ─── top-langs.svg ──────────────────────────
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
  const barW = 250, barH = 14, barX = 40, startY = 130;

  const lines = sorted.map(([name, info], i) => {
    const y = startY + i * 30;
    const pct = (info.count / total) * 100;
    const w = Math.max((pct / 100) * barW, 8);
    return `<g class="lang-row" style="cursor:pointer">
      <text x="40" y="${y - 5}" fill="${C.muted}" font-family="Arial,sans-serif" font-size="12" class="lang-name">${name}</text>
      <rect x="${barX}" y="${y}" width="${barW}" height="${barH}" rx="7" fill="${C.border}"/>
      <rect x="${barX}" y="${y}" width="${w}" height="${barH}" rx="7" fill="${info.color}" class="bar-fill" style="animation-delay:${0.3 + i * 0.15}s"/>
      <text x="${barX + w + 8}" y="${y + 11}" fill="${C.muted}" font-family="Arial,sans-serif" font-size="11">${pct.toFixed(1)}%</text>
    </g>`;
  }).join('\n    ');

  const H = startY + sorted.length * 30 + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${H}" viewBox="0 0 350 ${H}">
  <style>${ANIM_CSS}
    .lang-row { transition: transform 0.2s; }
    .lang-row:hover { transform: translateX(4px); }
  </style>
  <rect width="350" height="${H}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <text x="40" y="40" fill="${C.text}" font-family="Arial,sans-serif" font-size="16" font-weight="bold">Most Used Languages</text>
  <text x="40" y="60" fill="${C.muted}" font-family="Arial,sans-serif" font-size="12">Based on public repositories</text>
  <line x1="30" y1="80" x2="320" y2="80" stroke="${C.border}" stroke-width="1"/>
  <text x="40" y="105" fill="${C.muted}" font-family="Arial,sans-serif" font-size="12">Languages (${sorted.length})</text>
  <text x="290" y="105" fill="${C.muted}" font-family="Arial,sans-serif" font-size="12" text-anchor="end">${repos.length} repos</text>
    ${lines}
</svg>`;
}

// ─── contributions.svg ──────────────────────
function generateContribSvg(data) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.slice(-20);
  const cell = 10, gap = 2, sx = 10, sy = 50;
  const W = sx + weeks.length * (cell + gap) + 30;
  const H = sy + 7 * (cell + gap) + 30;

  function green(c) {
    if (c === 0) return '#161b22';
    if (c <= 3) return '#0e4429';
    if (c <= 6) return '#006d32';
    if (c <= 9) return '#26a641';
    return '#39d353';
  }

  let idx = 0;
  const cells = weeks.map((w, wi) =>
    w.contributionDays.map((d, di) => {
      const x = sx + wi * (cell + gap);
      const y = sy + di * (cell + gap);
      const delay = (idx++ * 0.01).toFixed(2);
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${green(d.contributionCount)}" class="contrib-cell" style="animation-delay:${delay}s"><title>${d.date}: ${d.contributionCount} contributions</title></rect>`;
    }).join('\n    ')
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>${ANIM_CSS}
    .contrib-cell { transition: transform 0.15s, filter 0.15s; }
    .contrib-cell:hover { transform: scale(1.8); filter: brightness(1.4); }
  </style>
  <rect width="${W}" height="${H}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <text x="20" y="30" fill="${C.text}" font-family="Arial,sans-serif" font-size="14" font-weight="bold">Recent Contributions</text>
  <text x="${W - 20}" y="30" fill="${C.green}" font-family="Arial,sans-serif" font-size="13" text-anchor="end" class="glow">${fmt(cal.totalContributions)} total</text>
  <line x1="10" y1="40" x2="${W - 10}" y2="40" stroke="${C.border}" stroke-width="1"/>
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
  fs.writeFileSync(path.join(PROFILE_DIR, 'contributions.svg'), generateContribSvg(data));
  console.log('contributions.svg done');
  console.log('All SVGs generated!');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
