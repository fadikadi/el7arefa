# Deploy Mini Football (Neon + Render, free tier–friendly)

Single **HTTPS URL** serves the React UI and `/api` Express routes from one Node process: the API copies the Vite build into `artifacts/api-server/dist/public` during `pnpm --filter @workspace/api-server run build`.

## 1. Postgres on Neon (free tier)

1. Sign up at [neon.tech](https://neon.tech).
2. Create a project and database.
3. Copy the **connection string** (use the **pooled** URI if offered; include `sslmode=require` if Neon shows it).
4. Keep it secret — you will paste it into Render as `DATABASE_URL`.

## 2. Render — Web Service

1. Sign up at [render.com](https://render.com).
2. **New → Blueprint** (if `render.yaml` is in your repo) **or** **New → Web Service** and connect the same Git repository.
3. **Root directory**
   - If the repo root is `mini-football-app/` with a `workspace/` folder: set **Root Directory** to `workspace` (matches `render.yaml` `rootDir`).
   - If the repo *is* only `workspace/`: leave Root Directory empty and delete `rootDir` from `render.yaml`, or move `render.yaml` next to `package.json`.

### Build command

```bash
npm install -g pnpm@10 && pnpm install && pnpm --filter @workspace/mini-football run build && pnpm --filter @workspace/api-server run build
```

### Start command

```bash
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Render injects **`PORT`** — do not set it manually.

### Environment variables

| Key             | Value |
|-----------------|--------|
| `NODE_ENV`      | `production` |
| `DATABASE_URL`  | Your Neon connection string (secret) |

Optional health check path: `/api/healthz`.

## 3. Database schema and seed (once per database)

From your laptop (with `pnpm` and repo cloned), point at Neon:

```bash
cd workspace   # pnpm monorepo root

export DATABASE_URL="postgresql://...@...neon.tech/neondb?sslmode=require"   # example

pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
```

Default admin after seed: **`admin`** / **`football`** — change the password after login if you expose the site publicly.

## 4. What changed in code for hosting

- Production **`Secure`** admin session cookies when `NODE_ENV=production` (HTTPS on Render).
- **`trust proxy`** enabled in production so Express sees correct client IPs / HTTPS.
- **`express.static`** + SPA fallback so the same origin serves `/` and `/api`.
- **`vite.config.ts`**: `vite build` no longer requires `PORT` / `BASE_PATH` (defaults for CI).

## 5. Free-tier caveats

- **Render free** Web Services **sleep** after idle traffic — first request can take tens of seconds.
- **Neon** free tier has **storage / compute** limits; dashboards show usage.
- Free tiers and limits change — confirm current terms on Neon and Render.

## 6. Troubleshooting

- **`ERR_PNPM_NO_PKG_MANIFEST` / No package.json in `/opt/render/project/...`:** Render is building in the **wrong folder**. In the service **Settings → Root Directory**, set **`workspace`** exactly (where `pnpm-workspace.yaml` and `package.json` live). Leave it **empty** only if the repo root *is* the monorepo root with `package.json` at the top level — this repo is not structured that way. If you created a **Web Service** manually, set Root Directory yourself; **Blueprint** from `render.yaml` should apply **`rootDir: workspace`** automatically when that file is at the repo root.
- **`DATABASE_URL`**: wrong host or missing `sslmode` → connection errors in Render logs.
- **Blank UI**: ensure the build ran **mini-football** before **api-server** (copy step packs UI into `dist/public`).
- **502 after deploy**: check Logs → crash on startup (often DB URL). Hit `/api/healthz` after wake-up.

## 7. Push code to GitHub (required before Render)

**Shortcut:** from the repo root (folder with `render.yaml`), run:

```powershell
powershell -ExecutionPolicy Bypass -File .\publish-github.ps1
```

(Log in when the browser opens; the script creates **`el7arefa`** and pushes **`main`**.)

Or do it manually:

Repo root is the folder that contains **`render.yaml`** (your path may differ).

1. Open PowerShell there:

```powershell
cd "e:\Other Projects\mini-football-app"
```

2. Log in to GitHub once (browser or token — follow prompts):

```powershell
& "$env:ProgramFiles\GitHub CLI\gh.exe" auth login
```

3. Create the remote repo **`el7arefa`** and push **`main`**:

```powershell
& "$env:ProgramFiles\GitHub CLI\gh.exe" repo create el7arefa --public --source=. --remote=origin --push
```

If **`origin` already exists**, use `git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git` then `git push -u origin main`.

4. **Render** → **New** → **Blueprint** → select this repo → **Root Directory** = **`workspace`** → set **`DATABASE_URL`** → deploy.
