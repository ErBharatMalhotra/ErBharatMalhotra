# 📊 Profile Stats

This folder contains auto-generated SVG files for the GitHub profile README.

## Files

| File | Description | How It's Generated |
|------|-------------|-------------------|
| `stats.svg` | GitHub statistics card | `.github/scripts/generate-stats.js` via GitHub GraphQL API |
| `top-langs.svg` | Most used languages | `.github/scripts/generate-stats.js` via GitHub GraphQL API |
| `github-contribution-grid-snake.svg` | Contribution snake animation | `platane/snk` GitHub Action |

## Auto-Update

These files are automatically updated **daily** via GitHub Actions:
`.github/workflows/generate-profile-stats.yml`

**No external API services needed** — all data comes directly from GitHub's GraphQL API using the built-in `GITHUB_TOKEN`.

## Manual Update

To manually trigger the workflow:
1. Go to **Actions** tab
2. Click **Generate Profile Stats**
3. Click **Run workflow**
