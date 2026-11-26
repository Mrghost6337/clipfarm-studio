# Deploying the website and Worker

The live origin is configurable. Today it is `https://clipfarm.freebuff.site`
(the primary domain). The old preview domain
`https://fractional-hr-34cett.freebuff.site` redirects GETs there (307) and
refuses POSTs with 409 "Use the primary site domain.". The desktop app follows
such a move by itself (`desktop/src/main/site.ts`): only over https and only
within the same registrable domain.

- The website and Worker deploy as one unit (`dist/client` + `dist/clipfarm_studio/index.js`).
- The local pipeline reads the site origin from `CLIPFARM_SITE_ORIGIN`
  (default: the origin above) and only accepts browser calls from it, the
  desktop app (`app://clipfarm`) and the Vite dev server. Extra origins:
  `PIPELINE_ALLOWED_ORIGINS=https://a.example,https://b.example`.
- The browser Studio needs no origin setting: it calls its own `/api/*` and
  finds the pipeline on `127.0.0.1:8787–8791`.

## Database changes are automatic

D1 columns are added on the first request after a deploy (`ensureSchema` in
`src/worker/auth.ts` and `src/worker/clips.ts`). No migration command is
needed. This release adds `users.plan_verified_at`, `users.payment_provider`
and `users.payment_ref`. Existing rows get `NULL`, which means "not paid".

## Option 1: freebuff Publish button

1. Merge the branch into the branch freebuff builds from.
2. Press **Publish**. It runs `bun run build`; `scripts/postbuild.mjs` strips
   files the uploader refuses; `deploy.json` points at `dist/`.
3. Open `/api/health`, expect `{"ok":true}`.
4. Log in as the admin account and open `/dashboard`. The **Studio overview**
   card now lists **Plans picked without payment**: the accounts that chose a
   paid plan before checkout existed, with their list-price value. These are
   the accounts you asked to review. They are treated as Free.

I could not check how freebuff gets the code (it is not in this repository).
If it does not build from GitHub, upload the same `dist/` it uses today.

## Option 2: wrangler

Needs a Cloudflare account with the D1 database `clipfarm-auth`.

```bash
bunx wrangler login
```

```bash
bunx wrangler d1 list
```

Put the real `database_id` of `clipfarm-auth` in `wrangler.jsonc` (it is all
zeros in the repository). Then:

```bash
bun install && bun run build
```

```bash
bunx wrangler deploy --config dist/clipfarm_studio/wrangler.json
```

List accounts that picked a paid plan, before or after deploying:

```bash
bunx wrangler d1 execute clipfarm-auth --remote --command "SELECT name, email, plan_id, billing, plan_started_at, plan_verified_at FROM users WHERE plan_id IS NOT NULL ORDER BY plan_started_at"
```

Never commit a Cloudflare API token. Use `wrangler login` or a
`CLOUDFLARE_API_TOKEN` environment variable on your machine or in CI secrets.

## After deploying: what changes for users

- Nobody can switch to a paid plan. Accounts with an unpaid plan pick are on
  Free (3 clips a month) and see a note explaining it on `/plans` and in
  Settings.
- The browser Studio and `/local` need a pipeline started from this version
  (`pipeline/` in this branch). An older pipeline is found but cannot pair
  (it has no `/pair` routes), so the page shows an error on "Connect this
  browser". Existing local users update their pipeline and pair once.
