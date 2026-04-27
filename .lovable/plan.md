## Why your hosting attempts are failing

Querry Mittra is **not a static website**. It is a **TanStack Start v1 full‑stack app** with:

- Server-side rendering (SSR)
- Server routes (`/api/chat` calls Lovable AI from the server)
- Supabase auth with cookie/session handling
- A Cloudflare Worker build target (see `wrangler.jsonc`)

That is why the two hosts break:

- **Hostinger (shared hosting) → 403 Forbidden**
  Shared hosting serves static files from `public_html`. There is no Node/Worker runtime to execute the SSR entry, so requests hit a directory with no `index.html` at the root and Apache returns 403. Even if you upload `dist/`, Hostinger shared plans cannot run the server bundle this app produces.

- **Vercel → 404 Not Found**
  Vercel's default detection treats this repo as a Vite static site and serves the `dist/client` folder. There is no SPA fallback configured for that output, and the SSR Worker entry is never invoked — so every route except literally-existing files returns 404.

Neither platform is configured to run the TanStack Start server. The fix is to either deploy to a host that supports the Worker/Node SSR build, or stay on Lovable's hosting (which already works — your published URL `https://querry-kutch-ai.lovable.app` is live).

---

## Recommended path (easiest, zero config)

**Use Lovable's built-in publishing + a custom domain.**

1. The app is already published at `https://querry-kutch-ai.lovable.app`.
2. In Lovable: **Project Settings → Domains → Connect Domain**, enter your Hostinger-registered domain (e.g. `yourdomain.com`).
3. In Hostinger's DNS panel for that domain, add the records Lovable shows you:
   - `A` record `@` → `185.158.133.1`
   - `A` record `www` → `185.158.133.1`
   - `TXT` record `_lovable` → the verification value Lovable provides
4. Wait for DNS propagation (usually minutes, up to 72 hours). SSL is automatic.

You keep using Hostinger only as the **domain registrar**, while the app runs on Lovable's infrastructure that already supports SSR + server routes + Supabase auth.

---

## Alternative: deploy to Cloudflare Workers

The project is already configured for Cloudflare (`wrangler.jsonc`, `@cloudflare/vite-plugin`). This is the only "self-host" option that works without code changes.

Steps the user runs locally after exporting the repo to GitHub:
1. `npm install`
2. `npm run build`
3. `npx wrangler login`
4. `npx wrangler deploy`
5. Add Cloudflare-provided env vars in the Workers dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `LOVABLE_API_KEY` (if needed for the chat function)

A custom domain can be attached in the Cloudflare Workers → Domains tab.

---

## Why Vercel is not recommended

To make Vercel work you would need to:
- Replace the Cloudflare Workers SSR target with Vercel's Node/Edge runtime adapter
- Rewrite `wrangler.jsonc` and the SSR entry
- Re-test all server routes (`/api/chat`, auth middleware)

This is a multi-day refactor, fragile, and unnecessary given Lovable's hosting already runs the app correctly.

---

## What I will do once you approve

Pick one option:

**Option A — Use a custom domain on Lovable hosting (recommended)**
Nothing to change in code. I will guide you through DNS setup with screenshots/text and verify the connection in Lovable.

**Option B — Prepare the repo for Cloudflare Workers self-deploy**
I will:
- Add a `DEPLOY.md` with exact `wrangler` commands
- Confirm `wrangler.jsonc` has the right env var bindings
- Add a `.dev.vars.example` file listing required secrets
- Verify a clean production build locally

**Option C — Force Vercel/Hostinger anyway (not recommended)**
Tell me which one and I will explain the refactor scope before touching code.

Tell me which option you want and (for Option A) the domain name you bought.
