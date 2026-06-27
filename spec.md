# CLAUDE.md — Task Manager

Project instructions for Claude Code. Read this fully before generating any code.
Build **phase by phase, in order**. Do not skip ahead. After each phase, stop and
confirm the "Done when" criteria are met before starting the next.

---

## 1. Goal

A full-stack task-management web app. Users sign up / log in, create projects,
add tasks under them, track each task's status and priority, see a per-project
progress tracker, and manage tasks inline (edit, delete, toggle status).

---

## 2. Tech Stack (locked)

| Layer | Choice |
|---|---|
| Framework | **Next.js 14+ (App Router)** — single app, no separate backend |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Backend | Next.js **Route Handlers** under `src/app/api/**` (Node runtime) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT stored in an **httpOnly cookie** |
| Hashing | bcryptjs |
| Validation | Zod (shared schemas, used on server; reused on client) |
| Testing | Jest |
| Icons | **Lucide React only** (no emoji in UI) |

> Express/Node from the original brief is **not** used — Next.js Route Handlers
> fill that role inside the same app.

---

## 3. Conventions

- **Variables / functions:** `camelCase`
- **React components / types / enums:** `PascalCase`
- **Filenames:** `kebab-case` (e.g. `task-card.tsx`, `auth-schema.ts`)
  - **Exception:** Next.js reserved files keep their required names —
    `page.tsx`, `route.ts`, `layout.tsx`, `not-found.tsx`, `error.tsx`,
    `loading.tsx`, `middleware.ts`.
- TypeScript **strict**, no `any`. Prefer explicit return types on exported fns.
- **Server Components by default.** Use `"use client"` only where interactivity
  is required (forms, filter buttons, status toggle).
- Never return `passwordHash` to the client. Strip it in every response.
- Validate **every** endpoint input with Zod before touching the DB.
- Enforce auth + ownership **server-side** on every protected route. Never trust
  the client.

---

## 4. Folder Structure

```
task-manager/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── projects/[id]/page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts            # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts        # GET one, PATCH, DELETE
│   │   │   │       └── tasks/route.ts  # GET list, POST create
│   │   │   └── tasks/
│   │   │       └── [id]/route.ts       # PATCH, DELETE
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # primitives: button, input, badge, progress-bar
│   │   ├── auth/              # login-form, register-form
│   │   ├── projects/          # project-card, project-form
│   │   └── tasks/             # task-card, task-form, status-toggle, priority-badge
│   ├── lib/
│   │   ├── prisma.ts          # PrismaClient singleton
│   │   ├── auth.ts            # JWT sign/verify + cookie helpers
│   │   ├── password.ts        # bcrypt hash/compare
│   │   ├── session.ts         # getCurrentUser() from cookie
│   │   └── api.ts             # response/error helpers
│   ├── schemas/
│   │   ├── auth-schema.ts
│   │   ├── project-schema.ts
│   │   └── task-schema.ts
│   ├── types/
│   │   └── index.ts
│   ├── hooks/
│   └── middleware.ts          # route protection
├── __tests__/                 # mirrors src/ structure
├── .env
├── .env.example
├── jest.config.ts
├── jest.setup.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Prisma Schema

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  createdAt    DateTime  @default(now())
  projects     Project[]
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#3b82f6")
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  tasks       Task[]
  createdAt   DateTime @default(now())

  @@index([ownerId])
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([projectId])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

- Deleting a **User** cascades to their projects → which cascades to tasks.
- Deleting a **Project** cascades to its tasks (satisfies `DELETE /projects/:id`).
- FK indexes added for query performance.

---

## 6. Auth Strategy

**Flow:** bcryptjs hashes the password → on register/login a JWT (`{ userId }`)
is signed and set as an httpOnly cookie. Protected routes read + verify the
cookie server-side.

**Cookie config:**
```ts
{
  name: "token",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
}
```

**`getCurrentUser()`** (`lib/session.ts`): read cookie → verify JWT → fetch user
by `userId` → return user **without** `passwordHash`, or `null`.

**`middleware.ts`:** guards `/dashboard`, `/projects/:path*`, and the protected
API namespaces. If unauthenticated:
- Page route → redirect to `/login`.
- API route → return `401` JSON.

```ts
export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/api/projects/:path*", "/api/tasks/:path*"],
};
```

> `/api/auth/me` verifies the cookie inside its own handler (not via matcher).

---

## 7. API Endpoints

All requests/responses are JSON. Auth = requires a valid `token` cookie.

| Method | Endpoint | Route file | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/register` | `auth/register/route.ts` | – | Create user, set cookie, return user |
| POST | `/api/auth/login` | `auth/login/route.ts` | – | Verify creds, set cookie, return user |
| POST | `/api/auth/logout` | `auth/logout/route.ts` | ✓ | Clear cookie |
| GET | `/api/auth/me` | `auth/me/route.ts` | ✓ | Return current user |
| GET | `/api/projects` | `projects/route.ts` | ✓ | List current user's projects (+ task count, progress) |
| POST | `/api/projects` | `projects/route.ts` | ✓ | Create project |
| GET | `/api/projects/:id` | `projects/[id]/route.ts` | ✓ | Get one project (+ task count) |
| PATCH | `/api/projects/:id` | `projects/[id]/route.ts` | ✓ | Update project |
| DELETE | `/api/projects/:id` | `projects/[id]/route.ts` | ✓ | Delete project (cascades to tasks) |
| GET | `/api/projects/:id/tasks` | `projects/[id]/tasks/route.ts` | ✓ | List tasks (filter: `status`, `priority`) |
| POST | `/api/projects/:id/tasks` | `projects/[id]/tasks/route.ts` | ✓ | Create task |
| PATCH | `/api/tasks/:id` | `tasks/[id]/route.ts` | ✓ | Update task |
| DELETE | `/api/tasks/:id` | `tasks/[id]/route.ts` | ✓ | Delete task |

### Request bodies (Zod-validated)

- **register:** `{ email, password (min 8), name }`
- **login:** `{ email, password }`
- **project create:** `{ name, description?, color? }`
- **project update:** partial of create
- **task create:** `{ title, description?, status?, priority?, dueDate? }`
- **task update:** partial of create

### Filters

`GET /api/projects/:id/tasks?status=TODO&priority=HIGH` — both optional, both
validated against their enums. Omit a param to skip that filter.

### Response shapes

- **Success:** the resource (or array), `200`/`201`. User objects never include
  `passwordHash`.
- **Error:** `{ error: { message: string, code?: string } }`.

| Status | When |
|---|---|
| 400 | Zod validation failed (include field issues) |
| 401 | Missing / invalid token |
| 404 | Resource not found **or not owned by current user** |
| 409 | Email already registered |
| 500 | Unhandled server error |

---

## 8. Authorization (Ownership) Rules — Critical

- Every project query is scoped by `ownerId === currentUser.id`.
- Task operations resolve `task → project → ownerId` and verify it equals
  `currentUser.id`.
- On ownership mismatch, return **404 (not 403)** so resource existence isn't
  leaked.

**Pattern to follow:**
```ts
const task = await prisma.task.findFirst({
  where: { id: taskId, project: { ownerId: currentUser.id } },
});
if (!task) return notFound(); // 404
```

---

## 9. Progress Tracker

Per-project completion percentage:

```ts
const progress = totalTasks === 0
  ? 0
  : Math.round((doneTasks / totalTasks) * 100);
```

- `doneTasks` = tasks with `status === "DONE"`.
- Computed efficiently with Prisma `groupBy` on `status` (or two counts).
- Returned on `GET /api/projects` (list) and `GET /api/projects/:id`.
- Rendered as a progress bar + `%` on dashboard cards and the project header.

---

## 10. Frontend Pages

**Login / Register** (`(auth)/login`, `(auth)/register`)
- Two separate forms. Client-side Zod validation mirrors server schema.
- On success → redirect to `/dashboard`. Show inline field + form-level errors.

**Dashboard** (`(app)/dashboard`)
- Grid of the user's projects: name, color accent, description, task count,
  progress bar + `%`. "New project" action. Empty state when no projects.

**Project view** (`(app)/projects/[id]`)
- Header: project name + progress.
- Filter buttons: **status** (All / Todo / In Progress / Done) and **priority**
  (All / Low / Medium / High). Filters drive the task query.
- Task list: each row shows title, **priority badge**, **due date** (overdue
  styling when past and not DONE), and an **inline status toggle**
  (TODO → IN_PROGRESS → DONE cycle, or a small select).
- Create / edit / delete task. Empty + loading states.

**404 / Error**
- `not-found.tsx` for unknown routes / missing resources.
- `error.tsx` error boundary with a retry action.

---

## 11. Design Standards

- **Lucide React icons only** — no emoji anywhere in the UI.
- Defined **type scale** and an 8px spacing rhythm. No arbitrary one-off sizes.
- **No generic shadow-card dumps** — use intentional layout, clear hierarchy,
  restrained borders/dividers over heavy shadows.
- Token-driven colors in `tailwind.config.ts`.

**Suggested tokens:**
```
priority:  LOW → slate    MEDIUM → amber    HIGH → red
status:    TODO → slate   IN_PROGRESS → blue   DONE → green
```

---

## 12. Testing (Jest)

Use Next.js's `next/jest` config. Node environment for API/lib tests, jsdom for
component tests. Mock `PrismaClient` with **jest-mock-extended** for unit tests;
optionally run integration tests against a `DATABASE_URL_TEST` database.

**Coverage targets:**
- `lib/password.ts` — hash ≠ plaintext; compare returns true/false correctly.
- `lib/auth.ts` — sign/verify round-trip; reject expired + tampered tokens.
- `schemas/*` — valid and invalid cases for auth, project, task.
- API handlers:
  - register: success + `409` on duplicate email.
  - login: success + `401` on wrong password.
  - projects: CRUD; **ownership enforced** (user A cannot read/update/delete
    user B's project → `404`); task count + progress correct.
  - tasks: CRUD; status/priority filters; ownership via project chain.

Scripts: `npm test`, `npm run test:watch`.

---

## 13. Environment Variables

`.env.example`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/task_manager?schema=public"
DATABASE_URL_TEST="postgresql://user:password@localhost:5432/task_manager_test?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
```

---

## 14. Key Patterns to Reuse

**Prisma singleton** (`lib/prisma.ts`):
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**API helpers** (`lib/api.ts`): `ok(data, status?)`, `fail(message, status, code?)`,
and a `withAuth(handler)` wrapper that injects `currentUser` or short-circuits 401.

---

## 15. Build Order & Acceptance Criteria

Work strictly top to bottom.

**Phase 0 — Scaffold**
Next.js 14 (App Router, TS, Tailwind, `src/`), install deps (prisma, @prisma/client,
bcryptjs, jsonwebtoken, zod, lucide-react, jest + next/jest + jest-mock-extended),
set up `.env`, jest config.
*Done when:* app boots, `npm test` runs an empty suite green.

**Phase 1 — Prisma schema**
Add schema, run first migration, generate client, add Prisma singleton.
*Done when:* migration applied, `prisma studio` shows the three tables.

**Phase 2 — Auth**
`password.ts`, `auth.ts`, `session.ts`, `auth-schema.ts`, the four auth routes,
`middleware.ts`. Tests for password/auth/schemas + register/login handlers.
*Done when:* register + login set the cookie, `/api/auth/me` returns the user,
protected routes reject unauthenticated requests, auth tests pass.

**Phase 3 — Projects**
`project-schema.ts`, projects routes (list with count + progress, create, get,
update, delete), ownership helper. Tests including the ownership-isolation cases.
*Done when:* full project CRUD works, cross-user access returns 404, tests pass.

**Phase 4 — Tasks**
`task-schema.ts`, tasks routes (list with status/priority filters, create, update,
delete), progress calculation wired in. Tests for filters + ownership chain.
*Done when:* task CRUD + filters work, progress updates correctly, tests pass.

**Phase 5 — Frontend**
UI primitives → auth pages → dashboard → project view (filters, priority badges,
due dates, inline status toggle) → `not-found.tsx` / `error.tsx`. Wire to the API.
*Done when:* a user can sign up, create a project, add/edit/toggle/delete tasks,
and see progress update live.

**Phase 6 — Polish**
Loading / empty / error states, overdue styling, responsiveness, final full test
pass and a lint check.
*Done when:* all states handled, suite green, no TypeScript or lint errors.

---

## 16. Guardrails (apply throughout)

1. Validate input with Zod before any DB call.
2. Auth + ownership checked server-side on every protected route.
3. Never serialize `passwordHash` to the client.
4. Ownership mismatch → `404`, never `403`.
5. Prisma client is a singleton.
6. Server Components by default; `"use client"` only for interactivity.
7. `camelCase` vars, `kebab-case` files (Next reserved files exempt), strict TS.
8. Lucide icons only; follow the design standards in §11.