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

## Auth model — TSC number + password everywhere, no email logins

- **Everyone** (teachers, officials, admins, superadmins) signs in at the single
  **`/login`** page with **TSC number + password**. There is no email-based login and no
  separate admin sign-in route — `/admin-login` was retired and now 301-redirects to
  `/login` (see `next.config.ts`). The client resolves TSC -> internal account email via
  `users.getEmailByTsc`, then calls `signIn("password", { flow: "signIn" })` — the email
  is only an internal Convex Auth account identifier and is never shown to the user.
- After sign-in, `/login` reads the fresh profile and routes by role: `member` ->
  `/dashboard`, anything else (`official`/`admin`/`superadmin`) -> `/admin`. This is the
  entire RBAC gate for where you land; the same TSC+password credential works for every
  role, so promoting a member via `assignRole` needs no separate account or login path.
- Registration (`/register`) calls the `users.registerMember` **action**, which enforces
  uniqueness of National ID, TSC number, phone and email server-side and then creates the
  Convex auth credentials + user record with `status: "pending_approval"`. A new teacher
  **cannot sign in until a branch admin approves them** in Members Management
  (`users.approveMember`) — attempting to sign in before approval succeeds at the auth
  layer but is immediately signed back out by the member layout guard, which redirects to
  `/login?blocked=pending_approval` with an explanatory message (also handles `suspended`
  and `rejected`).
- The default bootstrap superadmin (see below) has TSC `000000`.

### `@convex-dev/auth` gotchas (learned the hard way)

- The Password provider calls `profile` **synchronously**; an `async` profile callback
  returns a Promise and fails with "Promise {} is not a supported Convex type".
- The credentials provider runs in an **action** context — there is no `ctx.db`, use
  `ctx.runQuery`. This is why account creation goes through `users.registerMember` /
  `adminSetup.createDefaultAdmin`.
- The Convex auth client stores its tokens in **localStorage, not cookies**, so
  `src/middleware.ts` cannot read the session. Route protection lives in the member/admin
  layouts (client-side redirect) and, authoritatively, in `requireUser`/`requireRole`.
- **Race on first render after sign-in:** `useQuery(api.users.getMyProfile)` can
  transiently evaluate under the old (unauthenticated) token for one render right after
  `signIn()` resolves, before the Convex client finishes attaching the new token. Gate any
  "am I logged in" redirect on `useConvexAuth().isLoading` being `false` first — treating a
  transient `profile === null` as "not logged in" causes a bounce-back-to-login loop that
  only "works" on retry once the token is warm. Both `(admin)/admin/layout.tsx` and
  `(member)/layout.tsx` do this correctly now; keep the pattern in any new protected layout.

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
3. Create the first superadmin — idempotent, no arguments needed. Signs in with
   **TSC `000000`** and the branch-issued default password set in `convex/adminSetup.ts`:
   ```bash
   npx convex run adminSetup:createDefaultAdmin '{}'
   ```

## Verifying it works

- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`, title `KUPPET Busia Branch — Members & Administration Portal`.
- Live dev-server compilation in `docker compose logs` confirms source is served (not a prebuilt bundle).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
