# unofficial-long-dark-maps

Unofficial **The Long Dark** map viewer (Vite + React). App code lives in **`fe/`** so a backend (e.g. `be/`) can be added at the repo root later.

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

Use `CI=true` so the Vite `base` matches GitHub Pages (`/unofficial_long_dark_maps/`).

## Production (GitHub Pages)

- Repository **Settings → Pages → Build and deployment: GitHub Actions**.
- Pushes to **`master`** run [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml) and deploy `fe/dist`.
- The site URL is **`https://<your-username>.github.io/unofficial_long_dark_maps/`** (path = repository name).

`fe/vite.config.ts` sets `base` to `/unofficial_long_dark_maps/` when `CI=true`. If the repository name differs, change `base` to `/<repo-name>/`.

