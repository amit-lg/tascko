# TaskCo

A personal task manager where you sign up, create projects, and add tasks under each project. Tasks have a status (todo / in progress / done) and a priority (low / medium / high). Each project shows a live progress bar based on how many of its tasks are marked done.

That's the scope. There's no team collaboration, no shared projects, no notifications, and no real-time sync. Every project and task belongs to exactly one user.

---

## Tech Stack

| Layer | What's used | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^14.2.35 |
| Language | TypeScript | ^5 |
| Database ORM | Prisma | ^5.22.0 |
| Database | PostgreSQL | — |
| Auth | JWT in httpOnly cookie | jsonwebtoken ^9.0.2 |
| Password hashing | bcryptjs | ^2.4.3 |
| Validation | Zod | ^3.23.8 |
| Styling | Tailwind CSS | ^3.4.14 |
| Client state | Redux Toolkit | ^2.12.0 |
| Server state | TanStack Query | ^5.101.2 |
| Forms | React Hook Form + Zod resolver | ^7.80.0 / ^5.4.0 |
| HTTP client | Axios (withCredentials: true) | ^1.18.1 |
| Icons | Lucide React | ^0.447.0 |
| Tests | Jest + @swc/jest | ^29.7.0 / ^0.2.39 |
| Component tests | Testing Library | ^16.0.1 |

---

## Prerequisites

- **Node.js** — no `.nvmrc` or `engines` field in `package.json`. The project was built and tested on Node 24. Node 20 LTS or later is recommended.
- **npm** — the repo has a `package-lock.json`, so use npm. Do not use pnpm or yarn.
- **PostgreSQL** — a running Postgres instance. The connection string goes in `DATABASE_URL`. Neon, Supabase, Railway, or a local install all work.

---

## Setup

```bash
# 1. Clone
git clone <repo-url>
cd task-manager

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
```

Open `.env` and fill in every variable:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/task_manager?schema=public"
DATABASE_URL_TEST="postgresql://user:password@localhost:5432/task_manager_test?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
```

- `DATABASE_URL` — connection string for your main database.
- `DATABASE_URL_TEST` — separate database used by the API test suite. Must exist before running tests.
- `JWT_SECRET` — used to sign and verify session tokens. Generate a real random value: `openssl rand -base64 48`. **Do not leave the placeholder in place.**
- `JWT_EXPIRES_IN` — how long a session token is valid. `7d` is the default.
- `NODE_ENV` — controls whether the session cookie has `Secure: true`. Set to `production` on any deployed instance.

```bash
# 4. Run the Prisma migration and generate the client
npx prisma migrate dev --name init
npx prisma generate

# 5. Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`. The root `/` redirects to `/dashboard`, which redirects to `/login` if you are not authenticated.

There is no seed script.

---

## API Endpoints

All routes that require auth read the JWT from the `token` httpOnly cookie. For direct API calls (curl, tests), a `Bearer <token>` Authorization header is also accepted as a fallback.

Error responses always have the shape `{ error: { message: string, code?: string } }`. Validation errors include a `issues` object with per-field messages.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create a new account. Body: `{ email, password, name }`. Sets the session cookie and returns `{ user, token }`. |
| `POST` | `/api/auth/login` | No | Log in. Body: `{ email, password }`. Sets the session cookie and returns `{ user, token }`. |
| `POST` | `/api/auth/logout` | No | Clears the session cookie by setting it to empty with `maxAge: 0`. |
| `GET` | `/api/auth/me` | Yes | Returns `{ user }` for the authenticated user. Used on app load to restore session. |

### Projects

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | Yes | List all projects owned by the current user, with computed `totalTasks`, `completedTasks`, and `progress` (0–100). Accepts query params: `status=completed\|incomplete`, `sortBy=priority\|newest\|oldest`. |
| `POST` | `/api/projects` | Yes | Create a project. Body: `{ name, description?, color? }`. `color` must be a valid 6-digit hex code. |
| `GET` | `/api/projects/:id` | Yes | Get a single project with its full task list and progress stats. Returns 404 if the project doesn't belong to the current user. |
| `PATCH` | `/api/projects/:id` | Yes | Update a project's `name`, `description`, or `color`. At least one field required. |
| `DELETE` | `/api/projects/:id` | Yes | Delete a project and all its tasks (cascades in the database). |

### Tasks

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/:id/tasks` | Yes | List tasks for a project. Accepts query params: `status=TODO\|IN_PROGRESS\|DONE`, `priority=LOW\|MEDIUM\|HIGH`. Verifies project ownership before returning tasks. |
| `POST` | `/api/projects/:id/tasks` | Yes | Create a task under a project. Body: `{ title, description?, status?, priority?, dueDate? }`. `dueDate` must be ISO 8601. Defaults: `status=TODO`, `priority=MEDIUM`. |
| `PATCH` | `/api/tasks/:id` | Yes | Update any field on a task. Ownership is checked via the parent project. At least one field required. |
| `DELETE` | `/api/tasks/:id` | Yes | Delete a task. Ownership checked via the parent project. |

### Other

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Returns `{ message: "hello world" }`. Liveness check only. |

---

## Project Structure

```
task-manager/
├── prisma/
│   └── schema.prisma          # Data models: User, Project, Task
│
├── src/
│   ├── app/
│   │   ├── (auth)/            # Route group — login and register pages
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/             # Route group — authenticated pages
│   │   │   ├── dashboard/page.tsx          # Project grid
│   │   │   └── projects/[id]/page.tsx      # Task list for one project
│   │   ├── api/               # Next.js Route Handlers
│   │   │   ├── auth/          # register, login, logout, me
│   │   │   ├── projects/      # CRUD for projects
│   │   │   │   └── [id]/tasks/  # Task list + create under a project
│   │   │   ├── tasks/[id]/    # Update and delete a single task
│   │   │   └── health/        # Liveness endpoint
│   │   ├── layout.tsx         # Root layout — mounts AppProviders
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── layout/navbar.tsx
│   │   ├── projects/          # ProjectCard, CreateProjectModal
│   │   ├── tasks/             # TaskCard, CreateTaskModal
│   │   └── ui/                # Button, Input, Select, Modal, Badge,
│   │                          #   Card, Spinner, ProgressBar
│   │
│   ├── lib/
│   │   ├── auth.ts            # signToken / verifyToken (jsonwebtoken)
│   │   ├── password.ts        # hashPassword / comparePassword (bcryptjs)
│   │   ├── prisma.ts          # PrismaClient singleton
│   │   ├── verify-user.ts     # verifyUser HOF — auth middleware for route handlers
│   │   └── axios-client.ts    # Axios instance (baseURL=/api, withCredentials)
│   │
│   ├── schemas/
│   │   ├── project-schema.ts  # Zod schemas for project create/update/query
│   │   └── task-schema.ts     # Zod schemas for task create/update/query
│   │
│   ├── services/              # Client-side API wrappers (axios)
│   │   ├── auth-service.ts
│   │   ├── project-service.ts
│   │   └── task-service.ts
│   │
│   ├── store/                 # Redux store
│   │   ├── auth-slice.ts      # Auth state: user, token, isInitialised
│   │   ├── hooks.ts
│   │   └── index.ts
│   │
│   ├── providers/
│   │   └── app-providers.tsx  # Redux + TanStack Query + AuthInitialiser
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── project.ts
│   │   └── task.ts
│   │
│   └── middleware.ts          # Edge middleware — redirects unauthenticated requests
│
└── __tests__/
    ├── lib/                   # Unit tests: auth, password, verify-user
    ├── api/                   # Integration tests: all route handlers (mocked Prisma)
    └── components/            # Component tests: pages, components, UI primitives
```

---

## Running Tests

Jest is configured with two projects — one for Node (API and lib tests) and one for jsdom (component tests).

```bash
# Run everything
npm test

# Watch mode
npm run test:watch

# Run a specific file
npx jest __tests__/api/auth/register.test.ts

# Run only component tests
npx jest --testPathPattern="__tests__/components"

# Run with coverage
npx jest --coverage
```

The API tests mock Prisma with `jest-mock-extended` and never hit a real database. The `DATABASE_URL_TEST` variable is only needed if you add integration tests that use a real connection.

---

## Not Implemented

These are out of scope and not in the codebase:

- **OAuth / social login** — email + password only.
- **Email verification** — accounts are active immediately after registration.
- **Password reset** — no forgot-password flow exists.
- **Team collaboration** — projects and tasks are strictly per-user. There is no sharing, invites, or roles.
- **Real-time updates** — no WebSockets or server-sent events. Data refreshes on navigation and after mutations via TanStack Query invalidation.
- **File attachments** — tasks have text fields only.
- **CI/CD pipeline** — no GitHub Actions, Dockerfile, or deployment config is included.
- **Admin interface** — no Prisma Studio integration or admin-only routes beyond what Prisma Studio provides independently.

---

## Known Issues

The following gaps were identified during a security review and have not been fixed yet:

- **Account enumeration on registration** — `POST /api/auth/register` returns `{ error: { message: "Email already registered", code: "EMAIL_TAKEN" } }` with a 409 when a duplicate email is submitted. This tells an attacker which email addresses have accounts. The login endpoint correctly uses a generic message for both wrong email and wrong password; registration does not follow the same pattern yet.

- **JWT secret is not guarded at startup** — `src/lib/auth.ts` reads `process.env.JWT_SECRET` with a TypeScript non-null assertion (`!`). If the variable is missing, the process will not crash on boot; it will crash on the first authentication request with an unclear error.

- **No rate limiting on auth endpoints** — `/api/auth/login` and `/api/auth/register` have no brute-force or rate-limit protection.

- **Bearer header fallback in production** — `src/lib/verify-user.ts` accepts a `Bearer` Authorization header as a fallback to the cookie. This was kept for test convenience but weakens the `sameSite: lax` CSRF protection that cookie-only auth would provide if shipped as-is to production.

- **`next@14.2.35` has known CVEs** — `npm audit` reports 1 high-severity and 13 moderate-severity advisories against the installed Next.js version, including HTTP request smuggling, DoS via image optimizer, and cache poisoning. These require upgrading to Next.js 15 to resolve.
