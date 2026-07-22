# Backend Development Plan — Task Manager API

**Status:** **Part 1 (Auth + Todo APIs & database) is complete** and integrated end-to-end with
the frontend — see §3 for full verification details and §2.7 for the frontend-integration status.
Part 2 (Collaboration, §6) and Part 3 (Deadlines & Notifications, §7) are planned but not started.

**How to use this document:** This is meant to be a **self-sufficient brief** — everything an
engineer or AI agent needs to build this backend correctly, without access to any prior chat
history. It contains the full frontend contract this API must satisfy, the tech stack decisions
already made, the database design across all three phases, and the exact endpoints to build. Read
this alongside [PR_STANDARDS.md](PR_STANDARDS.md) (the code-quality rules every PR is graded
against) before writing any code.

---

## 1. Project Context

This is a company training exercise: a 5-day plan covering React/TypeScript/Redux (Days 1–4) and
Express.js/NestJS (Day 5). The end goal is a full-stack **Task Manager** app, built in two
repos:

- **Frontend** — `faizan-ali-brainx/web-training-todo-app` (branch `frontend`), a React 19 + Vite +
  TypeScript + Redux Toolkit app. **Built and now integrated with the real backend** for both auth
  and todos (Part 1) — no more mock API for either feature. See §2 below for everything about it.
- **Backend** (this repo) — `faizan-ali-brainx/web-training-task-manager-backend`, a NestJS API.
  **Part 1 implemented and verified**; Parts 2-3 are planned but not started.

The backend work is split into **three parts**, to be built and PR'd in order:

1. **Part 1** — Auth + Todo APIs and database, replacing the frontend's mock API exactly.
2. **Part 2** — Collaboration: inviting other users onto a todo/task.
3. **Part 3** — Deadlines + notifications: per-task deadlines, email reminders, real-time in-app
   notifications via WebSockets.

Each part should ship as one or more PRs (see §7, "Single Responsibility" in PR_STANDARDS.md — a
whole Part is usually too big for one PR; break it down by module, e.g. "Prisma schema + Auth
module" as one PR, "Todos module" as another).

---

## 2. Frontend Context (read this before writing any endpoint)

The frontend was built first and its mock API layer defines the **exact contract** this backend
must implement. This section is the complete reference — you should not need to open the frontend
repo to build Part 1.

### 2.1 Tech stack

React 19 + TypeScript + Vite, React Router DOM v6, Redux Toolkit (`createSlice`/`createAsyncThunk`),
React Hook Form + Zod, Axios.

### 2.2 How the frontend talks to an API

Every feature's data layer goes through exactly one file per feature — `authApi.ts` and
`todosApi.ts` — each switched independently via its own flag (split this way so Auth could go live
before Todos was ready; both are now `false`, i.e. both live against this backend):

```typescript
// src/api/config.ts (frontend)
export const USE_MOCK_AUTH_API = import.meta.env.VITE_USE_MOCK_AUTH_API !== 'false';
export const USE_MOCK_TODOS_API = import.meta.env.VITE_USE_MOCK_TODOS_API !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
export const ACCESS_TOKEN_STORAGE_KEY = 'react-sample-app:accessToken';
```

```typescript
// src/api/client.ts (frontend) — the axios instance the real backend is called through
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    const status = error.response?.status ?? 500;
    return Promise.reject(new ApiError(status, extractMessage(error.response?.data)));
  }
);
```

`ApiError` normalizes any backend error response (including NestJS's `class-validator` array-of-
strings `message` field) into the same `{status, message}` shape the frontend's original mock API
already used — so every page's `catch (err) { setFormError((err as Error).message) }` handles both
identically, with no special-casing needed.

**Implications for the backend:**
- Default expected base URL: `http://localhost:3000/api` in dev — so this API must set a global
  prefix of `api` and listen on port `3000` by default.
- Every authenticated request arrives as `Authorization: Bearer <token>`.
- A `401` response is meaningful to the frontend (it clears the stored token) — return `401`
  specifically for "not authenticated / invalid token," not for authorization failures (use `403`
  for "authenticated but not allowed," e.g. not the owner of a todo).
- **CORS**: the frontend dev server runs on `http://localhost:5173`. The API must call
  `app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true })` with
  `FRONTEND_URL=http://localhost:5173` in dev.

### 2.3 Shared TypeScript types (frontend `src/types/index.ts`)

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  createdAt: string; // ISO string
}

export interface AuthSession {
  user: User;
  accessToken: string;
}
```

Every endpoint's JSON response is shaped to match these exactly (after axios unwraps `res.data`) —
`authApi.ts`/`todosApi.ts`'s real branches are now implemented against exactly this backend (see
§2.7), so any future endpoint changes should preserve these shapes to avoid frontend rework.

### 2.4 Frontend form validation schemas (what the client already validates before sending)

```typescript
// features/auth/schemas.ts
loginSchema:          { email: string (email), password: string (min 1) }
signupSchema:         { name: string (min 1), email: string (email), password: string (min 8), confirmPassword: string }
forgotPasswordSchema: { email: string (email) }
resetPasswordSchema:  { password: string (min 8), confirmPassword: string }

// features/todos/schemas.ts
todoFormSchema:       { title: string (min 1, max 200) }
```

The backend must still validate all of this again server-side (never trust the client) — via DTOs
+ `class-validator`, per PR_STANDARDS.md rule 13.

### 2.5 The mock API being replaced (`src/api/mock/` in the frontend repo)

This is the **exact behavioral contract** to replicate. The frontend was built and manually
verified against this mock, so matching it closely means minimal frontend rework later.

**`mockAuthApi`** (all mock methods are effectively what the real `/api/auth/*` endpoints must do):
- `signup({name, email, password})` — rejects `409` if email already registered; otherwise creates
  an unverified user and a verification token, returns `{ verificationToken }`.
- `verifyEmail(token)` — `400` if token invalid/expired; otherwise marks the user's email verified
  and consumes the token.
- `login({email, password})` — `401` if credentials wrong; `403` if `emailVerified` is false;
  otherwise returns `{ user, accessToken }`.
- `logout(token)` — invalidates the session token.
- `getCurrentUser(token)` — `401` if token invalid; otherwise returns the `User`. Used by the
  frontend on every app load to restore a session from a stored token.
- `forgotPassword(email)` — `404` if no account with that email; otherwise generates a reset token,
  returns `{ resetToken }`.
- `resetPassword(token, newPassword)` — `400` if token invalid/expired; otherwise updates the
  password and consumes the token.

**`mockTodosApi`** (every method takes the access token first, then scopes by the resolved user id):
- `getAll(token)` — returns only todos owned by the current user.
- `create(token, {title})` — creates a todo owned by the current user, `completed: false`.
- `update(token, id, {title?, completed?})` — `404` if the todo doesn't exist, **`403` if it
  belongs to a different user**. Partial update (only provided fields change).
- `remove(token, id)` — same `404`/`403` ownership check, then deletes.

**Important nuance already solved on the frontend**: the mock's tokens were the frontend's
in-browser fake session; email verification/password reset links were shown directly on screen
(`AuthCheckEmailNotice` component) instead of emailed, since there was no real backend yet. Part 1
changed this — see §5.1's dev/prod split — and `AuthCheckEmailNotice`'s `linkTo` prop is now
optional so the on-screen shortcut only appears when the backend actually includes a token (i.e.
outside production), never in production where the emailed link is the only path.

### 2.6 Frontend folder structure (for context — nothing here needs to change for Part 1)

```
src/
├── app/            # Redux store + typed hooks
├── api/            # Shared axios client, config, mock backend (to be phased out)
├── features/
│   ├── auth/       # Login, Signup, Verify Email, Forgot/Reset Password + authSlice
│   └── todos/      # Todo list, form, item, CRUD state + todosSlice
├── routes/         # AppRouter, ProtectedRoute, PublicOnlyRoute, NotFoundPage
├── components/     # Shared UI (Button, TextField, FormError, Spinner)
└── types/          # Shared cross-feature types (User, Todo, AuthSession)
```

### 2.7 Frontend integration status

**Done, for Part 1:**
1. Real branches implemented in `authApi.ts`/`todosApi.ts`, calling `apiClient` against the
   endpoints in §5.3.
2. `.env` set to `VITE_USE_MOCK_AUTH_API=false`, `VITE_USE_MOCK_TODOS_API=false`,
   `VITE_API_BASE_URL=http://localhost:3000/api`.
3. `SignupPage`/`ForgotPasswordPage`/`AuthCheckEmailNotice` updated for the optional
   `verificationToken`/`resetToken` fields (§5.1's dev/prod split) — the on-screen shortcut link
   only renders when a token is actually present in the response.

**Bug found and fixed during this integration**: `SignupPage` was sending the raw React Hook Form
object (including `confirmPassword`) straight to `POST /auth/signup`. The mock API never minded,
but the real backend's `forbidNonWhitelisted` validation correctly rejected it with a 400. Fixed by
building a clean `{ name, email, password }` payload before dispatching. Worth remembering as a
general pattern: **any form field that exists only for client-side validation (confirm-password,
terms-checkbox, etc.) must be stripped before it reaches a DTO with `forbidNonWhitelisted: true`.**

Verified end-to-end in the browser against the real backend: signup → verify-email (dev-mode
on-screen link) → login → session persists across a page reload (`/auth/me` rehydration) → add /
toggle / rename / delete a todo, with the completed-toggle **surviving a full page reload**
(proof it's really in Postgres) → logout → forgot-password → reset-password → login with the new
password. Zero console errors throughout.

**Still pending (Part 2/3 frontend work, not covered by this backend plan):**
- Collaboration UI: invite button, collaborator list, permission-aware editing (hide title-edit/
  delete for non-owners) — needed once §6 ships.
- Notifications UI: bell icon, notification list, real-time updates via `socket.io-client`,
  deadline picker on the todo form — needed once §7 ships.

---

## 3. Backend Tech Stack (already decided)

| Concern | Choice |
|---|---|
| Framework | NestJS 11 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) |
| Language | TypeScript, strict, no `any` |
| Database | PostgreSQL |
| ORM | **Prisma** (`@prisma/client`, `prisma`) — not TypeORM |
| DB driver adapter | `@prisma/adapter-pg` + `pg` — **required** by Prisma 7's client runtime, even with the classic `prisma-client-js` generator (see note below) |
| Auth | JWT via `@nestjs/jwt` + Passport (`@nestjs/passport`, `passport`, `passport-jwt`) |
| Password hashing | `bcrypt` |
| Validation | DTOs + `class-validator` + `class-transformer`, global `ValidationPipe` |
| Config | `@nestjs/config` (`.env` — never hardcode secrets/URLs) |
| Email | `nodemailer` (Part 1 for verify/reset, Part 3 for deadline reminders) |
| Scheduled jobs | `@nestjs/schedule` (Part 3 only) |
| Real-time | `@nestjs/websockets` + `@nestjs/platform-socket.io` (Part 3 only) |
| API docs | `@nestjs/swagger` — required complete per submission requirements |
| Testing | Jest (already scaffolded) — unit tests per service, integration tests per controller |

All of the above are **already installed** in this repo's `package.json`. Nothing needs
`npm install`ing to start Part 1 except running `npx prisma init` to scaffold the Prisma project,
and `npm install @prisma/adapter-pg pg` (+ `-D @types/pg`) for the driver adapter below.

> **Prisma 7 breaking change**: unlike Prisma 5/6, `PrismaClient` in v7 always requires an explicit
> driver adapter — `new PrismaClient()` with just a `DATABASE_URL` throws
> `PrismaClientInitializationError` at startup, even with `generator client { provider =
> "prisma-client-js" }` (the classic generator). `PrismaService` must construct it as:
> ```typescript
> import { PrismaPg } from '@prisma/adapter-pg';
> super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
> ```
> This is unrelated to which generator you pick — both the classic `prisma-client-js` and the newer
> ESM-only `prisma-client` generator need an adapter in v7. (The `prisma-client` generator is also
> ESM-only — its output uses `import.meta.url`, which breaks under this project's CommonJS/nodenext
> TS config. Stick with `prisma-client-js`.)

### Local development database

This project's dev Postgres does **not** use the machine's default `postgresql@15` Homebrew
service — that had a stale, unrelated data directory on the machine this was first built on. A
dedicated instance was set up instead, isolated from any other Postgres data:

```bash
brew install postgresql@15   # if not already installed
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# One-time setup: fresh, project-only data directory + role
initdb -D /opt/homebrew/var/task-manager-postgres-data -U postgres --locale=en_US.UTF-8 -E UTF8

# Start it (port 5433, to avoid colliding with any other local Postgres on 5432)
export LC_ALL="en_US.UTF-8" OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES  # works around a macOS-only
  # "postmaster became multithreaded during startup" failure
pg_ctl -D /opt/homebrew/var/task-manager-postgres-data -o "-p 5433" -l /opt/homebrew/var/task-manager-postgres-data/server.log start

createdb -p 5433 -U postgres task_manager_dev
```

`DATABASE_URL` in `.env` accordingly: `postgresql://postgres@localhost:5433/task_manager_dev?schema=public`.

To stop it later: `pg_ctl -D /opt/homebrew/var/task-manager-postgres-data stop`. This does not
start automatically on login/reboot (started manually via `pg_ctl`, not `brew services`) — rerun
the `pg_ctl ... start` command above after a reboot.

### Current repo state

```
backend/
├── src/
│   ├── main.ts             # global prefix 'api', ValidationPipe, CORS, Swagger, exception filter
│   ├── app.module.ts        # ConfigModule + PrismaModule + UsersModule + MailModule + AuthModule
│   ├── prisma/               # PrismaModule/PrismaService (driver-adapter wired, see above)
│   ├── users/                # UsersService + user.mapper (toPublicUser)
│   ├── mail/                 # MailService (Nodemailer, catches send failures)
│   ├── auth/                 # AuthModule — DTOs, JwtStrategy, JwtAuthGuard, CurrentUser, service, controller
│   ├── todos/                 # TodosModule — DTOs, todo.mapper (ownerId -> userId), service, controller
│   └── common/filters/       # AllExceptionsFilter
├── prisma/schema.prisma      # Part 1 schema applied via one migration (`init`)
├── docs/
│   ├── PR_STANDARDS.md       # code-quality rules — read before every PR
│   └── BACKEND_DEVELOPMENT_PLAN.md  # this file
├── best_practices.md, pr_compliance_checklist.yaml, .pr_agent.toml, .github/  # PR-review tooling
└── .env.example              # NODE_ENV, PORT, FRONTEND_URL, DATABASE_URL, JWT_*, SMTP_*
```

**Part 1 status: complete.** Prisma schema, Auth module, and Todos module are all built and
manually verified against the real Postgres database via curl: signup → duplicate 409 →
unverified-login 403 → verify-email → login 200 → `/me` 200/401 → forgot/reset password → login
with new password → todos CRUD (create 201, list/update 200, delete 204) → cross-user 403 on
someone else's todo → 404 on a missing todo → DTO validation (400) — all confirmed. The frontend
is also fully integrated and verified end-to-end in the browser against this backend — see §2.7
for the integration details, including one real bug it surfaced and fixed.

**Next up: PRs for both repos (frontend + backend), then Part 2 — Collaboration** (see §6).

---

## 4. Module & Folder Structure Plan

Feature-first, one module per bounded concern — mirrors the frontend's `features/` convention:

```
src/
├── main.ts                    # bootstrap: global prefix 'api', ValidationPipe, CORS, Swagger
├── app.module.ts               # root module, imports every feature module below
│
├── prisma/
│   ├── prisma.module.ts       # global module exporting PrismaService
│   └── prisma.service.ts      # extends PrismaClient, connects/disconnects with Nest lifecycle
│
├── auth/                       # Part 1
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts       # thin wrapper: AuthGuard('jwt')
│   ├── current-user.decorator.ts  # @CurrentUser() param decorator reading req.user
│   └── dto/
│       ├── signup.dto.ts
│       ├── login.dto.ts
│       ├── verify-email.dto.ts
│       ├── forgot-password.dto.ts
│       └── reset-password.dto.ts
│
├── users/                       # Part 1 — user lookups shared by auth + collaboration
│   ├── users.module.ts
│   └── users.service.ts        # findByEmail, findById, create, markVerified, updatePassword
│
├── todos/                       # Part 1 (extended in Part 2 + Part 3)
│   ├── todos.module.ts
│   ├── todos.controller.ts
│   ├── todos.service.ts
│   ├── collaborators.controller.ts   # Part 2 — POST/GET/DELETE .../collaborators
│   ├── collaborators.service.ts      # Part 2
│   └── dto/
│       ├── create-todo.dto.ts
│       ├── update-todo.dto.ts        # Part 3 adds `deadline` here
│       └── invite-collaborator.dto.ts  # Part 2
│
├── mail/                        # Part 1 (extended in Part 3)
│   ├── mail.module.ts
│   └── mail.service.ts          # sendVerificationEmail, sendPasswordResetEmail,
│                                  # sendDeadlineReminder (Part 3), sendCollaboratorInvite (Part 2)
│
├── notifications/                # Part 3
│   ├── notifications.module.ts
│   ├── notifications.controller.ts   # GET /notifications, PATCH /notifications/:id/read
│   ├── notifications.service.ts
│   ├── notifications.gateway.ts      # Socket.io Gateway, per-user rooms
│   └── deadline-reminder.service.ts  # @Cron job scanning for upcoming deadlines
│
└── common/
    ├── filters/all-exceptions.filter.ts   # global exception filter, logs + sanitizes 500s
    └── decorators/roles.decorator.ts       # if role-based checks are needed beyond ownership
```

---

## 5. Part 1 — Auth + Todo APIs & Database

### 5.1 Design decisions for this part

- **Global prefix**: `app.setGlobalPrefix('api')` in `main.ts`, so all routes below are served
  under `/api/...`, matching the frontend's `API_BASE_URL`.
- **JWT payload**: `{ sub: userId, email }` (standard `sub` claim for the subject). Signed with
  `JWT_SECRET`, expiring per `JWT_EXPIRES_IN` (e.g. `1h`).
- **Verification/reset tokens**: random opaque strings (e.g. `crypto.randomBytes(32).toString('hex')`),
  stored with an expiry (e.g. 1 hour), single-use (deleted once consumed) — same semantics as the
  frontend mock's `verificationTokens`/`resetTokens` maps, now persisted in Postgres.
- **Dev vs. prod response shape for signup/forgot-password**: to preserve the frontend's current
  "click here to verify" on-screen UX during local development (no real mailbox needed) while never
  leaking a sensitive token in production:
  - `NODE_ENV !== 'production'`: response includes the raw token (`verificationToken`/`resetToken`)
    **and** a real email is still sent (via a dev SMTP catcher like Mailtrap/Ethereal), so both
    paths are testable.
  - `NODE_ENV === 'production'`: response omits the token entirely; the emailed link is the only
    way to verify/reset.
- **Logout**: JWTs are stateless, so there's no server-side session to destroy. Implement
  `POST /api/auth/logout` as a JWT-guarded endpoint that simply returns `200` — a placeholder for
  future token-blocklist/refresh-token revocation. Document this as an intentional simplification.
- **Passwords**: bcrypt, 10+ salt rounds. Never include `passwordHash` in any response — sanitize
  via a `toPublicUser()`-style mapper (mirrors the frontend mock's own `toPublicUser` function).

### 5.2 Prisma schema (Part 1 slice)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                        Int                    @id @default(autoincrement())
  name                      String
  email                     String                 @unique
  passwordHash              String
  emailVerified             Boolean                @default(false)
  createdAt                 DateTime               @default(now())
  updatedAt                 DateTime               @updatedAt

  todos                     Todo[]                 @relation("OwnedTodos")
  verificationTokens        EmailVerificationToken[]
  resetTokens               PasswordResetToken[]
}

model EmailVerificationToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Todo {
  id          Int      @id @default(autoincrement())
  title       String
  completed   Boolean  @default(false)
  ownerId     Int
  owner       User     @relation("OwnedTodos", fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Note: the frontend's `Todo.userId` field maps to `ownerId` here — call it `ownerId` in the database
since Part 2 introduces non-owner collaborators and "owner" needs to be unambiguous. The
`TodosService` response mapper should expose it back to the frontend as `userId` to match the
existing `Todo` type in §2.3 without a frontend change (or the frontend's `Todo` type gets a small
rename during integration — either is fine, document whichever is chosen).

### 5.3 API Endpoints — Part 1

All under `/api`. Endpoints marked 🔒 require `@UseGuards(AuthGuard('jwt'))`.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| POST | `/auth/signup` | `{ name, email, password }` | 201 `{ message, verificationToken? }` | 409 if email taken |
| POST | `/auth/verify-email` | `{ token }` | 200 `{ message }` | 400 if invalid/expired |
| POST | `/auth/login` | `{ email, password }` | 200 `{ user, accessToken }` | 401 bad creds, 403 unverified |
| 🔒 POST | `/auth/logout` | — | 200 `{ message }` | No-op placeholder, see §5.1 |
| 🔒 GET | `/auth/me` | — | 200 `User` | Used by frontend's session-rehydrate on app load |
| POST | `/auth/forgot-password` | `{ email }` | 200 `{ message, resetToken? }` | 404 if no account |
| POST | `/auth/reset-password` | `{ token, newPassword }` | 200 `{ message }` | 400 if invalid/expired |
| 🔒 GET | `/todos` | — | 200 `Todo[]` | Owned by `req.user` only in Part 1 |
| 🔒 POST | `/todos` | `{ title }` | 201 `Todo` | |
| 🔒 PATCH | `/todos/:id` | `{ title?, completed? }` | 200 `Todo` | 404 missing, 403 not owner |
| 🔒 DELETE | `/todos/:id` | — | 204 | 404 missing, 403 not owner |

### 5.4 Definition of Done — Part 1

- [x] `npx prisma init`, schema above written, `npx prisma migrate dev --name init` run
- [x] `PrismaModule`/`PrismaService` (global module, connects on `onModuleInit`, driver-adapter wired)
- [x] `UsersModule` with lookup/create/update helpers used by `AuthModule`
- [x] `AuthModule`: signup, verify-email, login, logout, me, forgot-password, reset-password — all
      DTO-validated, all errors as NestJS exceptions, `JwtStrategy` + `AuthGuard('jwt')` wired
- [x] `MailModule`/`MailService`: `sendVerificationEmail`, `sendPasswordResetEmail` via Nodemailer
      (send failures are logged, not thrown — see §5.1)
- [x] `TodosModule`: full CRUD, ownership-enforced, all routes JWT-guarded
- [x] Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), global exception
      filter, `app.enableCors(...)`, `app.setGlobalPrefix('api')`
- [x] Swagger wired at `/api-docs`, every auth + todos endpoint documented (`@ApiTags`,
      `@ApiOperation`, `@ApiBearerAuth`)
- [x] Unit tests for `AuthService`/`TodosService`, integration tests for `AuthController`/
      `TodosController` (18 passing)
- [x] `.env.example` added; `README.md` updated with the full endpoints list
- [x] Every function ≤ 50 lines, JSDoc above every class/method, no `console.log`, no `any`
- [x] Manually verified end-to-end with curl against the real Postgres database: signup → 409 on
      duplicate → 403 on unverified login → verify-email → login 200 → `/me` 200/401 →
      forgot/reset-password → login with new password → DTO validation (400) and
      `forbidNonWhitelisted` (400) → todos create/list/update/delete (201/200/200/204) →
      cross-user 403 → missing-todo 404 → empty-title 400. Also verified end-to-end in the
      browser against the integrated frontend (see §2.7 — that integration is now done).

---

## 6. Part 2 — Collaboration

### 6.1 Scope (from the training plan's Final Task)

- Invite another user onto a todo (frontend collects **email**, not a separate username field, so
  invite-by-email is the identifier used — see note below).
- Collaborators can view the todo and update its `completed` status.
- Only the **owner** can edit the title, delete the todo, or manage collaborators.

> **Scope decision**: the training doc says "by email or username." The frontend's signup form
> only collects `name` + `email` — there is no username field. This plan treats **email** as the
> sole invite identifier. If a real username system is wanted later, that's a frontend signup-form
> change plus a `User.username` column, not something this backend should invent unilaterally.

> **Scope decision**: no pending/accept-invite flow — inviting a user adds them as a collaborator
> immediately (MVP). Add an invite-acceptance step later only if explicitly asked for.

### 6.2 Prisma schema additions

```prisma
model User {
  // ...existing Part 1 fields...
  collaboratingOn TodoCollaborator[] // required back-reference for the relation below
}

model Todo {
  // ...existing Part 1 fields...
  collaborators TodoCollaborator[]
}

model TodoCollaborator {
  id        Int      @id @default(autoincrement())
  todoId    Int
  todo      Todo     @relation(fields: [todoId], references: [id], onDelete: Cascade)
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  invitedBy Int
  createdAt DateTime @default(now())

  @@unique([todoId, userId]) // a user can't be invited to the same todo twice
}
```

> Prisma requires both sides of a relation declared — `User` needs the `collaboratingOn` back-reference
> added above, or `npx prisma generate` will fail with a missing-opposite-relation-field error.

### 6.3 Access rule (replaces Part 1's simple ownership check)

A request may act on a todo if the requesting user is the **owner** OR a **collaborator** — but
only the owner may: change `title`, `delete` the todo, or add/remove collaborators. Implement this
as a service-layer check (`assertCanView`, `assertIsOwner`) rather than a single blanket Guard,
since the allowed action depends on *which* fields are being changed.

### 6.4 API Endpoints — Part 2 additions

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| 🔒 GET | `/todos` | — | 200 `Todo[]` | Now returns owned **and** collaborated-on todos |
| 🔒 PATCH | `/todos/:id` | `{ completed? }` | 200 `Todo` | Owner or collaborator; `title` in body → 403 for non-owners |
| 🔒 POST | `/todos/:id/collaborators` | `{ email }` | 201 `TodoCollaborator` | Owner only; 404 if no user with that email, 409 if already a collaborator |
| 🔒 GET | `/todos/:id/collaborators` | — | 200 `User[]` | Owner or collaborator |
| 🔒 DELETE | `/todos/:id/collaborators/:userId` | — | 204 | Owner only |

### 6.5 Definition of Done — Part 2

- [ ] `TodoCollaborator` model + migration
- [ ] `CollaboratorsController`/`CollaboratorsService`: invite/list/remove, all DTO-validated
- [ ] `TodosService` updated: `findAllForUser` includes collaborated todos; `update` splits
      owner-only fields (`title`) from shared fields (`completed`)
- [ ] `MailService.sendCollaboratorInvite` — notify the invited user by email
- [ ] Swagger updated for new endpoints
- [ ] Tests: owner can invite/remove, collaborator cannot; collaborator can toggle `completed` but
      not rename/delete; duplicate invite returns 409
- [ ] README + `.env.example` updated if anything new was added
- [ ] Frontend follow-up flagged (not built here): invite UI, collaborator list, permission-aware
      editing

---

## 7. Part 3 — Deadlines & Notifications

### 7.1 Scope (from the training plan's Final Task)

- Set a deadline per task.
- Email notification before the deadline (Nodemailer).
- Real-time in-app notification via Socket.io.

### 7.2 Prisma schema additions

```prisma
model User {
  // ...existing fields...
  notifications Notification[] // required back-reference for the relation below
}

model Todo {
  // ...existing fields...
  deadline        DateTime?
  reminderSentAt  DateTime?  // set once the pre-deadline reminder has fired, to avoid duplicates
  notifications   Notification[]
}

enum NotificationType {
  DEADLINE_REMINDER
  COLLABORATOR_INVITED
  TASK_UPDATED
}

model Notification {
  id        Int               @id @default(autoincrement())
  userId    Int                // recipient
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  todoId    Int?
  todo      Todo?              @relation(fields: [todoId], references: [id], onDelete: Cascade)
  type      NotificationType
  message   String
  read      Boolean            @default(false)
  createdAt DateTime           @default(now())
}
```

> Same rule as §6.2 — `User` needs the `notifications` back-reference above for Prisma to generate.

### 7.3 Cron job — deadline reminders

`DeadlineReminderService`, `@Cron(CronExpression.EVERY_HOUR)` (configurable via
`DEADLINE_REMINDER_WINDOW_HOURS`, default 24):
1. Query todos where `deadline` is within the next N hours, `reminderSentAt IS NULL`.
2. For each: email the owner and all collaborators (`MailService.sendDeadlineReminder`), create a
   `Notification` row per recipient, push a real-time event via `NotificationsGateway`, then set
   `reminderSentAt = now()`.

### 7.4 WebSocket Gateway

`NotificationsGateway` (`@WebSocketGateway`): on `handleConnection`, read the JWT from
`client.handshake.auth.token`, verify it manually (Guards don't apply to sockets — see
PR_STANDARDS.md's Guards rule, this is the one place auth must be done by hand), and `client.join`
a room named `user:{userId}`. Expose `notifyUser(userId, payload)` which does
`this.server.to('user:' + userId).emit('notification', payload)` — called by the cron job above and
by `CollaboratorsService` when someone is invited.

### 7.5 API Endpoints — Part 3 additions

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| 🔒 PATCH | `/todos/:id` | `{ deadline? }` (ISO string) | 200 `Todo` | Must be a future date; owner only, same as `title` |
| 🔒 GET | `/notifications` | — | 200 `Notification[]` | Current user's notifications, newest first |
| 🔒 PATCH | `/notifications/:id/read` | — | 200 `Notification` | Marks read; 403 if not the recipient |

### 7.6 Definition of Done — Part 3

- [ ] `deadline`/`reminderSentAt` columns + `Notification` model + migration
- [ ] `NotificationsModule`: controller, service, gateway
- [ ] `DeadlineReminderService` cron job, deduped via `reminderSentAt`
- [ ] `MailService.sendDeadlineReminder`
- [ ] Gateway manually verifies JWT on connection (documented exception to Guard-based auth)
- [ ] Tests: cron job only reminds once per todo; notification list scoped to the recipient;
      marking another user's notification as read returns 403
- [ ] README + `.env.example` updated (`DEADLINE_REMINDER_WINDOW_HOURS`, etc.)
- [ ] Frontend follow-up flagged (not built here): notifications UI, `socket.io-client` wiring,
      deadline picker on the todo form

---

## 8. Environment Variables (cumulative across all 3 parts)

```
# .env.example
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://user:password@localhost:5432/task_manager

JWT_SECRET=
JWT_EXPIRES_IN=1h

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Part 3 only
DEADLINE_REMINDER_WINDOW_HOURS=24
```

Load via `@nestjs/config`'s `ConfigModule.forRoot({ isGlobal: true })` — never `process.env`
directly in feature code (inject `ConfigService` instead), per PR_STANDARDS.md rule 4.

---

## 9. PR Standards Reminder

Every PR against this repo is graded against [PR_STANDARDS.md](PR_STANDARDS.md). The rules most
likely to bite during this build:
- **Max 50 lines per function** — split a service method into private helpers once it validates,
  does the work, and shapes the response.
- **DTOs everywhere** — no `@Body() body: any`, ever.
- **NestJS exceptions, not raw `Error`** — `NotFoundException`, `ForbiddenException`,
  `ConflictException`, `UnauthorizedException`.
- **JSDoc above every class/method** — stricter than the frontend's one-liner rule.
- **Tests required** — a service without a `*.spec.ts` is an incomplete PR.
- **One feature per PR** — ship Part 1 as several small PRs (e.g. Prisma+Auth, then Todos, then
  Swagger/docs polish) rather than one giant PR.
