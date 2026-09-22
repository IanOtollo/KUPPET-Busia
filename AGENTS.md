# AGENTS.md — KUPPET Busia Portal

## Architecture (non-obvious)

- **Frontend**: Next.js 16 (App Router, Turbopack) in `src/`. This is the only process that runs in the sandbox.
- **Backend/DB**: [Convex](https://convex.dev) — a **managed cloud service**. It does NOT run in Docker. All `convex/*.ts` functions are deployed to the user's Convex deployment and are reached over the network via `NEXT_PUBLIC_CONVEX_URL`.
- There is **no local database**. Running the app without a valid Convex deployment boots the UI but every `useQuery`/`useMutation` will stay in a loading/empty state.

## Running in this sandbox

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- Single service `web` (`node:22-slim`), repo bind-mounted at `/app`, deps installed with `npm install` on start (no lockfile in repo — npm is used, not pnpm despite the README).
- Dev server: `next dev -H 0.0.0.0 -p 3000` (Turbopack, live reload).
- `node_modules` and `.next` are anonymous volumes so the bind mount doesn't shadow them.

### Preview-specific changes
- `next.config.ts` sets `X-Frame-Options: DENY`, which would block the preview iframe. The security-header block is now skipped when `NODE_ENV=development`; production headers are unchanged.
- `allowedDevOrigins` is set from `BASE44_PUBLIC_HOST_SUFFIX` so Next allows the preview origin's dev assets/HMR.

## Environment / secrets

Required for the app to actually function (external service credentials, delivered via `/run/base44/app.env`):

| Key | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (public, inlined into the client) |
| `CONVEX_DEPLOYMENT` | Convex deployment name (CLI) |
| `CONVEX_DEPLOY_KEY` | Convex deploy key (CLI). The one supplied is **deploy-only** — it cannot read function specs or data. |
| `AUTH_SECRET` | `@convex-dev/auth` token signing — set on the **Convex deployment**, not in this container |
| `RESEND_API_KEY` | Resend email — set on the **Convex deployment**, not in this container |

Placeholders live in `.env.base44-defaults` (listed FIRST in `env_file`); `/run/base44/app.env` is LAST so real values win.

## Auth model (no hardcoded credentials anywhere)

- **Teachers** sign in at `/login` with **TSC number + password**. The client resolves
  TSC -> email via `users.getEmailByTsc`, then calls `signIn("password", { flow: "signIn" })`.
- **Admin / officials** sign in at `/admin-login` with **email + password** (no TSC needed).
  Linked from the bottom of the teacher login.
- Registration (`/register`) calls the `users.registerMember` **action**, which enforces
  uniqueness of National ID, TSC number, phone and email server-side and then creates the
  Convex auth credentials + user record. The client signs in afterwards.
- New teachers are created `status: "active"` so they can sign in immediately (there is no
  working email-verification step — RESEND is not configured).

### `@convex-dev/auth` gotchas (learned the hard way)

- The Password provider calls `profile` **synchronously**; an `async` profile callback
  returns a Promise and fails with "Promise {} is not a supported Convex type".
- The credentials provider runs in an **action** context — there is no `ctx.db`, use
  `ctx.runQuery`. This is why account creation goes through `users.registerMember`.
- The Convex auth client stores its tokens in **localStorage, not cookies**, so
  `src/middleware.ts` cannot read the session. Route protection lives in the member/admin
  layouts (client-side redirect) and, authoritatively, in `requireUser`/`requireRole`.

## Backend setup (on the Convex deployment, not here)

1. Deploy functions: `npx convex deploy` (the sandbox deploy key works; target is a dev deployment).

   > **After ANY edit under `convex/`, re-run the deploy** — otherwise the deployment keeps
   > serving the previous functions and the UI fails with server-side errors such as
   > "Promise {} is not a supported Convex type" or "Cannot read properties of undefined
   > (reading 'query')" from stale `auth.ts`. From the sandbox:
   > `docker compose -f docker-compose.base44.yml exec -T web npx convex deploy`
2. Seed reference data (schools + officials):
   ```bash
   npx convex run seed:seedDatabase
   ```
3. Create the first superadmin — there are **no default credentials**, you must pass them:
   ```bash
   npx convex run adminSetup:createSuperAdmin '{"email":"you@example.com","password":"<your password>","fullName":"Your Name"}'
   ```

## Verifying it works

- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`, title `KUPPET Busia Branch — Members & Administration Portal`.
- Live dev-server compilation in `docker compose logs` confirms source is served (not a prebuilt bundle).
