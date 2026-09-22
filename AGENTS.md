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

## Backend setup (must be done on the Convex deployment, not here)

1. Deploy functions: `npx convex dev` (or `npx convex deploy`).
2. Seed the database (creates the superadmin + Busia schools):
   ```bash
   npx convex run seed:seedDatabase '{ "adminEmail": "admin@kuppetbusia.ke", "adminFullName": "Branch Secretariat Admin" }'
   ```
   Until this runs, `convex/lib/auth.ts#getCurrentUser` throws "Admin user not found. Database might be unseeded."

## Demo bypasses (intentional, in the source)

- `convex/lib/auth.ts#getCurrentUser` always returns `admin@kuppetbusia.ke` (hardcoded demo bypass).
- `src/app/(auth)/login/page.tsx` does a hardcoded client-side login (`admin@kuppetbusia.ke` / `bsa2026` → `/admin`, any email containing "admin" → `/admin`, else → `/dashboard`) — it does not call Convex auth.
- `src/middleware.ts` auth redirects are commented out.

## Verifying it works

- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`, title `KUPPET Busia Branch — Members & Administration Portal`.
- Live dev-server compilation in `docker compose logs` confirms source is served (not a prebuilt bundle).
