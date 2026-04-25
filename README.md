# unofficial_long_dark_map

Minimal Vite + React “Hello, world” app. Frontend code lives in **`fe/`** so a backend (e.g. `be/`) can be added at the repo root later.

## Local (development)

```bash
cd fe
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173/`).

**Production build locally (same as GitHub Pages):**

```bash
cd fe
CI=true npm run build
npm run preview
```

(Without `CI=true`, `npm run build` uses base `/` for a quick local `dist` check. For a preview that matches GitHub Pages, use `CI=true`.)

## Production (GitHub Pages)

- Repository **Settings → Pages → Build and deployment: GitHub Actions**.
- Pushes to `main` run [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml) and deploy the `fe/dist` output.
- The site is served from `/unofficial_long_dark_map/`; `fe/vite.config.ts` sets `base` when `CI=true`.

## Repo name

If the GitHub repo is not named `unofficial_long_dark_map`, change the `base` value in `fe/vite.config.ts` to `/<your-repo-name>/`.
