# KUPPET BUSIA BRANCH — MEMBERS & ADMINISTRATION PORTAL

Production web portal for Kenya Union of Post Primary Education Teachers (KUPPET) Busia County Branch.

---

## Technical Architecture

- **Frontend**: Next.js 15 (App Router, React 19, TypeScript strict mode, `src/` directory)
- **Backend & Database**: Convex (`convex/schema.ts`, `@convex-dev/auth`, file storage, atomic counters)
- **Styling**: Tailwind CSS v4 + Institutional Design System custom tokens (`globals.css`)
- **Typography**: Source Serif 4 (Headings), Inter (Body), IBM Plex Mono (Reference codes & currency)
- **Form Management**: `react-hook-form` + `zod` + `@hookform/resolvers`
- **Timezone & Locale**: Africa/Nairobi, KES currency formatting

---

## Local Development Setup

### 1. Prerequisites
- Node.js v20+ or v24
- pnpm 9+

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

### 4. Run Convex & Next.js Development Servers
```bash
# Terminal 1: Start Convex Backend Engine
npx convex dev

# Terminal 2: Start Next.js Frontend Server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Initializing Database & Seed

To seed the initial Busia County secondary schools, official positions, portfolio mandates, and superadmin account:

1. Open the Convex Dashboard or execute the seed mutation:
```bash
npx convex run seed:seedDatabase '{ "adminEmail": "admin@kuppetbusia.ke", "adminFullName": "Branch Secretariat Admin" }'
```

---

## Security & Access Control (RBAC)

Enforced server-side in Convex (`convex/lib/auth.ts`):
- `member`: Access to Members Portal only (`/dashboard`, `/bereavement`, `/harassment`, `/bus`, `/reports`, `/officials`, `/profile`, `/notifications`).
- `official`: Access to Members Portal + Read access to delegated admin modules (`/admin/*`).
- `admin`: Full administrative access to queues, approvals, bus calendar, financial reports, and officials CRUD.
- `superadmin`: Full admin access + role assignment, audit logs, and settings.

### Section 15 Harassment Confidentiality
- Harassment report views are audited on every single view (`harassment.view`).
- Anonymous reports strip identity fields from database records entirely.
- List views redact reporter names and narrative text.

---

## Production Build Verification

```bash
pnpm build
```
Generates clean production bundle with zero TypeScript errors and zero ESLint errors.
