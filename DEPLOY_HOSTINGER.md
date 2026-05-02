# Deploying to Hostinger via GitHub

This is a **TanStack Start SSR app**. It needs a Hostinger plan with the
**Node.js application** type (Cloud Hosting, VPS, or Premium with Node.js
support). Plain shared hosting (`public_html` only) cannot run it and will
return 403/404.

## 1. Push this repo to GitHub

Connect the project to GitHub from Lovable (top-right → GitHub → Connect).
Hostinger will pull from that repository.

## 2. Create the Node.js app in hPanel

hPanel → **Advanced → Node.js → Create application**:

| Setting                  | Value                          |
| ------------------------ | ------------------------------ |
| Node.js version          | **20.x or newer**              |
| Application mode         | Production                     |
| Application root         | e.g. `domains/yourdomain/app`  |
| Application URL          | your domain                    |
| Application startup file | `.output/server/index.mjs`     |

## 3. Connect GitHub (Git deployment)

hPanel → **Advanced → Git** → Create new repository:

- Repository address: your GitHub repo URL (HTTPS)
- Branch: `main`
- Install path: **same path** as the Node.js application root above
- Enable **Auto-Deployment** (uses a webhook so each `git push` redeploys)

After cloning, go back to **Node.js** and click **Run NPM Install**.
That triggers `npm install`, which automatically runs `npm run build`
(via the `postinstall` script in `package.json`) and produces `.output/`.

## 4. Environment variables

hPanel → Node.js → **Environment variables**. Add anything your server
functions read at runtime, e.g.:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (if used)
- any other secrets

`VITE_*` variables are baked into the client bundle at build time. If you
change them you must trigger a rebuild (re-run NPM Install or push a new
commit).

## 5. Start

In the Node.js panel click **Restart**. Hostinger runs `npm start`, which
executes `node .output/server/index.mjs`. Visit your domain — SSR pages
should render with no 403/404.

## Updating the site

`git push` to the connected branch → Hostinger auto-pulls → click
**Run NPM Install** (or enable auto-install) → **Restart**. The
`postinstall` hook rebuilds `.output/` only when needed.

To force a rebuild after dependency changes, delete `.output/` on the server
and re-run NPM Install.

To skip the auto-build (e.g. you uploaded a prebuilt `.output/` yourself),
set the env var `SKIP_BUILD=1`.

## Troubleshooting

- **403 Forbidden** → app is being served by static hosting, not the Node.js
  app. Make sure the domain is attached to the Node.js application, not just
  pointing to `public_html`.
- **404 on every route** → startup file isn't `.output/server/index.mjs`, or
  `.output/` doesn't exist (build didn't run). Re-run NPM Install.
- **"Cannot find module"** → `npm install` didn't complete on the server.
  Check the Node.js panel build logs.
- **Old content after deploy** → click **Restart** in the Node.js panel; the
  running process needs to reload.
