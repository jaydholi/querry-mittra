# Deploying to Hostinger (Node.js hosting)

This is a **TanStack Start SSR app** — it requires a Node.js runtime, NOT static
shared hosting. The 403/404 errors you saw came from uploading the app to
shared web hosting, which only serves static files.

## Requirements

You need a Hostinger plan that supports **Node.js applications** (Cloud Hosting,
VPS, or any plan with the "Node.js" app type in hPanel). Pure shared hosting
(`public_html` only) cannot run this app.

## 1. Build for Node

Locally:

```bash
npm install
npm run build
```

This produces a Node-compatible SSR bundle in `.output/`.

## 2. Files to upload

Upload these to your Hostinger Node app directory:

- `.output/` (the entire folder)
- `package.json`
- `package-lock.json` or `bun.lockb`

You do **not** need to upload `src/`, `node_modules/`, or build tooling.

## 3. Hostinger Node app settings (hPanel → Advanced → Node.js)

| Setting              | Value                          |
| -------------------- | ------------------------------ |
| Node.js version      | **20.x or newer**              |
| Application root     | folder where you uploaded files |
| Application URL      | your domain                    |
| Application startup file | `.output/server/index.mjs` |
| Run npm install      | Yes                            |

Then set the start command (or "npm start" equivalent) to:

```bash
npm start
```

## 4. Environment variables

In hPanel → Node.js → Environment variables, add the same variables your app
uses at runtime (e.g. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` if used by server functions, etc.).

`VITE_*` variables are baked in at build time and don't need to be set on the
server.

## 5. Start the app

Click **Restart** in the hPanel Node.js panel. Visit your domain — you should
see the app render server-side, with no 403/404.

## Common issues

- **403 Forbidden** → you uploaded to `public_html` (static hosting). Move the
  app to a Node.js application and set the startup file.
- **404 on every route** → startup file isn't pointing at
  `.output/server/index.mjs`, or the Node app isn't running.
- **"Cannot find module"** → `npm install` wasn't run on the server, or the
  `.output/` folder wasn't fully uploaded.

## Easier alternative

Lovable hosting already runs this exact build with no setup. You can keep your
Hostinger-purchased domain and just point its DNS at Lovable:

- A record `@` → `185.158.133.1`
- A record `www` → `185.158.133.1`
- TXT record `_lovable` → (value shown in Lovable → Settings → Domains)
