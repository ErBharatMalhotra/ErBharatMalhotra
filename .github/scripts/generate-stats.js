const fs = require('fs');
const path = require('path');

const USERNAME = 'ErBharatMalhotra';
const TOKEN = process.env.GITHUB_TOKEN;
const PROFILE_DIR = path.join(__dirname, '../../profile');

// ─────────────────────────────────────────────
// GraphQL Query
// ─────────────────────────────────────────────
const QUERY = `
query($username: String!) {
  user(login: $username) {
    name
    login
    avatarUrl
    repositories(ownerAffiliations: OWNER, first: 100) {
      totalCount
      nodes {
        name
        description
        stargazerCount
        forkCount
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
}
`;

// ─────────────────────────────────────────────
// GitHub API Call
// ─────────────────────────────────────────────
async function fetchGitHubData() {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: QUERY, variables: { username: USERNAME } }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:', json.errors);
    throw new Error('Failed to fetch GitHub data');
  }
  return json.data;
}

// ─────────────────────────────────────────────
// SVG Helpers
// ─────────────────────────────────────────────
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const COLORS = {
  bg: '#0d1117',
  border: '#30363d',
  text: '#e6edf3',
  textSecondary: '#8b949e',
  green: '#39d353',
  purple: '#a855f7',
  blue: '#58a6ff',
  yellow: '#f0c040',
};

// ─────────────────────────────────────────────
// Generate stats.svg — pure text, no <image> tag
// ─────────────────────────────────────────────
function generateStatsSvg(data) {
  const user = data.user;
  const cal = user.contributionsCollection.contributionCalendar;
  const repos = user.repositories;
  const totalStars = repos.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);

  const stats = [
    { label: '★ Total Stars', value: totalStars, color: COLORS.yellow },
    { label: ' нель Total Commits', value: cal.totalContributions, color: COLORS.green },
    { label: '⊞ Total PRs', value: user.pullRequests.totalCount, color: COLORS.purple },
    { label: '◯ Total Issues', value: user.issues.totalCount, color: COLORS.blue },
    { label: '♦ Followers', value: user.followers.totalCount, color: COLORS.textSecondary },
    { label: '♦ Following', value: user.following.totalCount, color: COLORS.textSecondary },
  ];

  const statRows = stats.map((s, i) => {
    const y = 115 + i * 38;
    return `
    <text x="30" y="${y}" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="13">${s.label}</text>
    <text x="320" y="${y}" fill="${s.color}" font-family="'Segoe UI',Arial,sans-serif" font-size="16" font-weight="bold" text-anchor="end">${s.value.toLocaleString()}</text>`;
  }).join('');

  const height = 130 + stats.length * 38 + 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${height}" viewBox="0 0 350 ${height}">
  <rect width="350" height="${height}" rx="10" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1"/>

  <text x="30" y="35" fill="${COLORS.text}" font-family="'Segoe UI',Arial,sans-serif" font-size="18" font-weight="bold">GitHub Stats</text>
  <text x="30" y="55" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="12">@${escapeXml(user.login)}</text>

  <line x1="20" y1="75" x2="330" y2="75" stroke="${COLORS.border}" stroke-width="1"/>

  <text x="30" y="95" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="11">${repos.totalCount} public repos</text>

  ${statRows}

  <line x1="20" y1="${height - 25}" x2="330" y2="${height - 25}" stroke="${COLORS.border}" stroke-width="1"/>
  <text x="175" y="${height - 8}" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="9" text-anchor="middle">Updated ${new Date().toISOString().split('T')[0]}</text>
</svg>`;
}

// ─────────────────────────────────────────────
// Generate top-langs.svg
// ─────────────────────────────────────────────
function generateTopLangsSvg(data) {
  const repos = data.user.repositories.nodes.filter(r => !r.isPrivate);
  const langMap = {};

  repos.forEach(r => {
    if (r.primaryLanguage) {
      const lang = r.primaryLanguage.name;
      if (!langMap[lang]) langMap[lang] = { color: r.primaryLanguage.color || '#8b949e', count: 0 };
      langMap[lang].count++;
    }
  });

  const sorted = Object.entries(langMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const total = sorted.reduce((sum, [, v]) => sum + v.count, 0);
  const barWidth = 250;
  const barHeight = 14;
  const barX = 40;
  const barStartY = 130;

  const langRows = sorted.map(([name, info], i) => {
    const y = barStartY + i * 30;
    const pct = (info.count / total) * 100;
    const w = Math.max((pct / 100) * barWidth, 8);

    return `
    <text x="40" y="${y - 5}" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="12">${escapeXml(name)}</text>
    <rect x="${barX}" y="${y}" width="${barWidth}" height="${barHeight}" rx="7" fill="${COLORS.border}"/>
    <rect x="${barX}" y="${y}" width="${w}" height="${barHeight}" rx="7" fill="${info.color}"/>
    <text x="${barX + w + 8}" y="${y + 11}" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="11">${pct.toFixed(1)}%</text>`;
  }).join('');

  const height = barStartY + sorted.length * 30 + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="${height}" viewBox="0 0 350 ${height}">
  <rect width="350" height="${height}" rx="10" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1"/>

  <text x="40" y="40" fill="${COLORS.text}" font-family="'Segoe UI',Arial,sans-serif" font-size="16" font-weight="bold">Most Used Languages</text>
  <text x="40" y="60" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="12">Based on public repositories</text>

  <line x1="30" y1="80" x2="320" y2="80" stroke="${COLORS.border}" stroke-width="1"/>
  <text x="40" y="105" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="12">Languages (${sorted.length})</text>
  <text x="290" y="105" fill="${COLORS.textSecondary}" font-family="'Segoe UI',Arial,sans-serif" font-size="12" text-anchor="end">${repos.length} repos</text>

  ${langRows}
</svg>`;
}

// ─────────────────────────────────────────────
// Contribution Calendar SVG
// ─────────────────────────────────────────────
function generateContribSvg(data) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks;
  const totalDays = weeks.reduce((sum, w) => sum + w.contributionDays.length, 0);

  const cellSize = 10;
  const cellGap = 2;
  const startX = 10;
  const startY = 50;
  const width = startX + weeks.length * (cellSize + cellGap) + 10;
  const height = startY + 7 * (cellSize + cellGap) + 50;

  function getGreen(count) {
    if (count === 0) return '#161b22';
    if (count <= 3) return '#0e4429';
    if (count <= 6) return '#006d32';
    if (count <= 9) return '#26a641';
    return '#39d353';
  }

  const cells = weeks.map((w, wi) =>
    w.contributionDays.map((d, di) => {
      const x = startX + wi * (cellSize + cellGap);
      const y = startY + di * (cellSize + cellGap);
      return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${getGreen(d.contributionCount)}"/>`;
    }).join('\n    ')
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="10" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1"/>

  <text x="20" y="30" fill="${COLORS.text}" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="bold">Contributions</text>
  <text x="${width - 20}" y="30" fill="${COLORS.green}" font-family="'Segoe UI',Arial,sans-serif" font-size="14" text-anchor="end">${cal.totalContributions.toLocaleString()} contributions</text>

  <line x1="10" y1="40" x2="${width - 10}" y2="40" stroke="${COLORS.border}" stroke-width="1"/>

    ${cells}
</svg>`;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('📊 Fetching GitHub data for', USERNAME, '...');
  const data = await fetchGitHubData();
  console.log('✅ Data fetched!');

  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const statsSvg = generateStatsSvg(data);
  fs.writeFileSync(path.join(PROFILE_DIR, 'stats.svg'), statsSvg);
  console.log('✅ stats.svg generated');

  const langsSvg = generateTopLangsSvg(data);
  fs.writeFileSync(path.join(PROFILE_DIR, 'top-langs.svg'), langsSvg);
  console.log('✅ top-langs.svg generated');

  const contribSvg = generateContribSvg(data);
  fs.writeFileSync(path.join(PROFILE_DIR, 'contributions.svg'), contribSvg);
  console.log('✅ contributions.svg generated');

  console.log('🎉 All SVGs generated successfully!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
