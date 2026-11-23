# Life Statements

A calm, local-first personal ledger that maps your life to three financial statements—**Balance Sheet**, **Income Statement**, and **Time & Energy Cash Flow**—with transparent 0–100 scoring, monthly/quarterly rollups, offline improvement suggestions, and CSV/PDF/JSON export.

All data stays locally in your browser (`localStorage`) with no accounts and no cloud required.

## Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Run Scoring Engine Tests

```bash
npx tsx --test src/domain/scoring.test.ts
```

## Deploy Live

### Option 1: GitHub Pages (via GitHub Web UI)

Because GitHub blocks external OAuth apps from pushing files inside `.github/workflows/`, add the workflow file directly in your repository on GitHub.com:

1. In your GitHub repo, click **Add file → Create new file**.
2. Name the file `.github/workflows/deploy-pages.yml` and paste:

```yaml
name: Deploy Life Statements to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. Commit the new file on GitHub.com.
4. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
5. Wait ~1 minute for the **Actions** tab run to finish, then open the published URL.

### Option 2: Vercel or Netlify (No Workflow Needed)

Import your GitHub repository in Vercel or Netlify with:
- **Build command**: `npm run build`
- **Output directory**: `dist`
