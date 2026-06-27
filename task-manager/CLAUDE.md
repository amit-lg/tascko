# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server on http://localhost:3000
npm run build        # production build
npm test             # run all tests (node + jsdom projects)
npm run test:watch   # watch mode
npx jest __tests__/lib/auth.test.ts   # run a single test file
npm run lint         # ESLint via next lint
npx prisma migrate dev --name <name>  # create and apply a migration
npx prisma generate                   # regenerate Prisma client after schema change
npx prisma studio                     # open DB GUI
```

> **Important:** `next.config` must be `.js` (not `.ts`) — Next.js 14 does not support TypeScript config files.

## Architecture

This is a **Next.js 14 App Router** monolith — no separate Express server. All backend logic lives in Route Handlers under `src/app/api/`.

### Request lifecycle for protected routes

```
Request → middleware.ts (JWT cookie check)
        → Route Handler (Zod validation → getCurrentUser() → DB query)
        → NextResponse JSON
```

`middleware.ts` guards page and API routes via the `matcher` config. Inside each handler, `getCurrentUser()` (`lib/session.ts`) re-reads and verifies the cookie, then returns a user without `passwordHash`.

### Key lib files (not yet created — stubs expected here)

| File | Role |
|---|---|
| `src/lib/prisma.ts` | PrismaClient singleton (one instance across hot-reloads) |
| `src/lib/auth.ts` | JWT sign / verify using `jsonwebtoken` |
| `src/lib/password.ts` | bcryptjs hash / compare |
| `src/lib/session.ts` | `getCurrentUser()` — reads cookie, verifies JWT, fetches user |
| `src/lib/api.ts` | `ok()`, `fail()`, `withAuth()` response helpers |

### Auth flow

1. `POST /api/auth/register` or `/login` → bcrypt verify → sign JWT `{ userId }` → set `httpOnly` cookie named `token` (7-day `maxAge`, `sameSite: lax`).
2. Every protected handler calls `getCurrentUser()` or uses the `withAuth()` wrapper.
3. Cookie config lives in `lib/auth.ts` — **never** return `passwordHash` to the client.

### Ownership enforcement

All project queries filter by `ownerId === currentUser.id`. Task queries join through the project: `where: { id, project: { ownerId: currentUser.id } }`. Ownership mismatches return **404**, not 403.

### Zod schemas

Shared schemas in `src/schemas/` are the single source of truth for validation — used on the server in Route Handlers and re-used on the client for form validation. Never touch the DB before parsing with Zod.

### Testing layout

Jest is configured with **two projects** (in `jest.config.ts`):
- `node` environment → `__tests__/lib/` and `__tests__/api/`
- `jsdom` environment → `__tests__/components/`

Mock `PrismaClient` with `jest-mock-extended` for unit tests. The `@/*` path alias resolves to `src/` in both environments.

### Database

PostgreSQL via Neon (connection string in `.env`). Schema has three models: `User → Project → Task` with cascade deletes. Run `prisma migrate dev` for schema changes, then `prisma generate` to update the client.

### Naming conventions

- Files: `kebab-case` (e.g. `task-card.tsx`, `auth-schema.ts`)
- Next.js reserved files keep their exact names: `page.tsx`, `route.ts`, `layout.tsx`, `middleware.ts`, `not-found.tsx`, `error.tsx`, `loading.tsx`
- Variables/functions: `camelCase` — Components/Types/Enums: `PascalCase`

### UI rules

- Icons: **Lucide React only** — no emoji in UI
- Tailwind color tokens for priority (`slate/amber/red`) and status (`slate/blue/green`) are defined as CSS variables in `globals.css` and mapped in `tailwind.config.ts`
- `"use client"` only on files that need interactivity (forms, toggles, filter buttons) — everything else is a Server Component
