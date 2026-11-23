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

## Deploy on GitHub Pages

GitHub Pages cannot execute raw `.tsx` files directly from the repository root—it must serve the compiled `dist/` bundle. This repository includes a ready-to-use GitHub Actions workflow (`.github/workflows/deploy-pages.yml`):

1. Push the latest changes (including `.github/workflows/deploy-pages.yml` and `vite.config.ts`) to your `main` branch.
2. On GitHub, open your repository **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Wait ~1 minute for the **Deploy Life Statements to GitHub Pages** workflow in the **Actions** tab to finish, then open the published URL shown there.
