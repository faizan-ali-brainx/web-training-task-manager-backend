# Task Manager API (NestJS)

The backend for the Task Manager training project — a NestJS + Prisma + PostgreSQL REST API with
JWT auth, real-time notifications, and a deadline-reminder cron. It's the server the
[`frontend/`](../frontend) React app talks to.

Feature coverage:

- **Auth** — signup, email verification, login/logout, `GET /me` session rehydration, forgot/reset
  password. JWT (Passport) + bcrypt.
- **Todos** — full CRUD, ownership-enforced, all routes JWT-guarded.
- **Collaboration** — invite/list/remove collaborators on a todo by email; owner-only mutations,
  owner-or-collaborator reads/completed-toggles.
- **Deadlines & notifications** — per-todo deadline, an hourly cron that emails + notifies before a
  deadline, and a Socket.io gateway that pushes notifications in real time.

For the full design (schema, endpoint spec, decisions across all three parts) see
[docs/BACKEND_DEVELOPMENT_PLAN.md](docs/BACKEND_DEVELOPMENT_PLAN.md). Before opening a PR, check
[docs/PR_STANDARDS.md](docs/PR_STANDARDS.md).

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript (strict, no `any`) |
| Database | PostgreSQL + Prisma 7 (with `@prisma/adapter-pg`) |
| Auth | JWT (`@nestjs/jwt` + Passport `passport-jwt`), bcrypt |
| Validation | DTOs + `class-validator`, global `ValidationPipe` |
| Email | Nodemailer (verification/reset/invite/deadline emails) |
| Real-time | `@nestjs/websockets` + Socket.io |
| Scheduling | `@nestjs/schedule` (deadline-reminder cron) |
| Docs | `@nestjs/swagger` at `/api-docs` |

## Prerequisites

- **Node.js 20+** (`node -v`).
- **PostgreSQL 15+** running locally. This project expects a dedicated instance on **port 5433** —
  see [docs/BACKEND_DEVELOPMENT_PLAN.md §3 "Local development database"](docs/BACKEND_DEVELOPMENT_PLAN.md)
  for the exact one-time `initdb`/`pg_ctl`/`createdb` steps. In short:

  ```bash
  export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
  pg_ctl -D /opt/homebrew/var/task-manager-postgres-data -o "-p 5433" \
    -l /opt/homebrew/var/task-manager-postgres-data/server.log start
  ```

- An SMTP inbox for outgoing mail. A sandbox like [Mailtrap](https://mailtrap.io) is ideal — email
  sends are best-effort (failures are logged, not thrown), and in development the API also returns
  verification/reset tokens in the response, so email isn't strictly required to test auth.

## Local Setup

```bash
npm install                 # install dependencies
cp .env.example .env         # then fill in the values below
npx prisma migrate dev       # apply migrations (also generates the Prisma client)
npm run start:dev            # start the API on http://localhost:3000 (watch mode)
```

Once running:

- REST API: `http://localhost:3000/api/v1/...`
- Swagger UI: `http://localhost:3000/api-docs` (click **Authorize** and paste a token from
  `POST /auth/login` to call protected routes)

> **If `start:dev` compiles "0 errors" but crashes with `Cannot find module dist/main`:** a stale
> build cache emitted no JS. Clear it and restart: `rm -f *.tsbuildinfo && rm -rf dist`.

## Environment Variables

Copy `.env.example` to `.env` and fill in real values locally (never commit `.env`):

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` locally — gates whether `/auth/signup` and `/auth/forgot-password` include the raw token in their response (see docs plan §5.1) |
| `PORT` | HTTP port (default `3000`) |
| `FRONTEND_URL` | Allowed CORS origin (HTTP + WebSocket), e.g. `http://localhost:5173` |
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://postgres@localhost:5433/task_manager_dev?schema=public` |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT signing secret and access-token lifetime (e.g. `1h`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Nodemailer SMTP config — leave blank locally to skip real email sending (send failures are logged, not thrown) |
| `DEADLINE_REMINDER_WINDOW_HOURS` | How many hours ahead the deadline-reminder cron looks for due tasks (default `24`) |

## API Endpoints

All routes are served under `/api/v1`. Interactive docs (Swagger, with an **Authorize** button for
Bearer tokens) are at `/api-docs` once the server is running.

Every response is wrapped in a consistent envelope: `{ success: true, data, message }` on success
(a 204 No Content response is left bodyless, as required by the HTTP spec), or
`{ success: false, message }` on error. The tables below show the shape of `data` on success.

**Auth** (`/api/v1/auth`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/signup` | — | 409 if email taken |
| POST | `/verify-email` | — | 400 if token invalid/expired |
| POST | `/login` | — | 401 bad credentials, 403 unverified email |
| POST | `/logout` | 🔒 | No-op placeholder (JWTs are stateless) |
| GET | `/me` | 🔒 | Current user's profile |
| POST | `/forgot-password` | — | 404 if no account with that email |
| POST | `/reset-password` | — | 400 if token invalid/expired |

**Todos** (`/api/v1/todos`) — all routes 🔒, scoped to the authenticated user (owned + collaborated-on)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Lists todos owned by, or shared with, the current user |
| POST | `/` | Create a todo (`{ title }`) |
| PATCH | `/:id` | Partial update (`{ title?, completed?, deadline? }`) — `title`/`deadline` are owner-only (403 otherwise); `completed` is owner-or-collaborator; `deadline` is a future ISO date-time (or `null` to clear) and changing it re-arms the reminder; 404 if missing |
| DELETE | `/:id` | 204 on success — 404 missing, 403 not owner |

**Collaborators** (`/api/v1/todos/:todoId/collaborators`) — all routes 🔒

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Invite a user by email (`{ email }`) — owner only; 404 no such user, 409 already a collaborator, 403 not owner. Also raises a real-time `COLLABORATOR_INVITED` notification for the invitee |
| GET | `/` | List collaborators — owner or collaborator; 403 no access |
| DELETE | `/:userId` | Remove a collaborator — owner only; 404 not a collaborator, 403 not owner |

**Notifications** (`/api/v1/notifications`) — all routes 🔒, scoped to the authenticated recipient

| Method | Path | Notes |
|---|---|---|
| GET | `/` | List the current user's notifications, newest first |
| PATCH | `/:id/read` | Mark a notification read — 404 if missing, 403 if it belongs to someone else |

**Real-time notifications (WebSocket).** A Socket.io server runs on the same origin/port as the
API. The client connects with `io(API_ORIGIN, { auth: { token } })` (the JWT access token) — the
gateway verifies it on connection and joins the socket to a private `user:<id>` room, then emits a
`notification` event (payload = the same shape as `GET /notifications` rows) whenever a
notification is raised for that user. A deadline-reminder cron (`DEADLINE_REMINDER_WINDOW_HOURS`,
default 24h) also emails + notifies the owner and collaborators of any task due within the window,
once per task.

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start in watch mode (development) |
| `npm run start:prod` | Run the compiled build (`dist/main.js`) |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint (with `--fix`) |
| `npm test` | Unit + integration tests (Jest) |
| `npm run test:e2e` | End-to-end tests |
| `npx prisma migrate dev` | Apply/create migrations and regenerate the client |
| `npx prisma studio` | Browse the database in a GUI |

## Testing

Unit tests live beside their services/controllers as `*.spec.ts`; run them with `npm test`. See
[docs/PR_STANDARDS.md](docs/PR_STANDARDS.md) for the testing bar every PR is held to.
