# Backend PR Standards — Quick Reference

Consolidates `best_practices.md` + `pr_compliance_checklist.yaml` (at the repo root) into one file
to check **before writing code and before opening a PR**. Read the originals only if you need the
full rationale or a longer example — everything you need to comply day-to-day is here.

Every PR is scored against these 17 weighted rules. 0 violations → passing score; 4+ violations →
near-zero score. Treat every row below as a hard requirement, not a suggestion.

**Stack note:** the source docs' Database Patterns examples use Mongoose/MongoDB — this project
uses **Prisma + PostgreSQL** instead. The adapted equivalents are called out below; follow those,
not the Mongoose examples in the original files.

## The 17 Rules

| # | Rule | Weight | One-line requirement |
|---|---|---|---|
| 1 | Title & Description | 5% | Title says what it does; description covers **what/why/how** |
| 2 | Single Responsibility | 5% | One feature per PR |
| 3 | Readme Updated | 4% | New modules/services/DTOs/endpoints/env vars documented in `README.md` |
| 4 | Environment Variables | 5% | All config via `@nestjs/config` + `.env` — never hardcoded secrets/URLs |
| 5 | Module Architecture | 4% | Module → Controller → Service → Repository, wired via `@Injectable()`/DI |
| 6 | Shy Code | 5% | **Max 50 lines per function** (backend's ESLint-configured limit — note this differs from the frontend's 23-line limit) |
| 7 | SOLID | 5% | One service/controller/module = one feature; depend on abstractions, not concretions |
| 8 | DRY | 5% | No duplicated logic — extract a shared service, utility, or base class |
| 9 | Naming | 5% | Classes `PascalCase`, files `kebab-case`, vars `camelCase`, constants `UPPER_SNAKE_CASE` |
| 10 | Comments | 4% | **JSDoc** above every class/method/function (`@param`, `@returns`, `@throws`); `// TODO` for unfinished work |
| 11 | No Dead Code | 4% | No `console.log`, no commented-out code, no unused imports |
| 12 | Error Handling | 4% | Use NestJS exceptions (`NotFoundException`, etc.), not raw `Error`; global exception filter in place |
| 13 | DTOs & Validation | 5% | Every endpoint validated via a DTO + `class-validator` decorators; global `ValidationPipe` enabled |
| 14 | Guards & Interceptors | 5% | Auth/role checks via Guards (`@UseGuards`), cross-cutting concerns via Interceptors |
| 15 | Database Patterns | 5% | *(adapted, see below)* Prisma schema models validated, ownership/uniqueness enforced, DB errors handled |
| 16 | Security | 5% | Passwords hashed with bcrypt, no sensitive fields in responses, secrets only in env vars |
| 17 | Testing | 5% | Unit tests for services, integration tests for controllers, `*.spec.ts` naming |

## Do / Don't Cheat Sheet

- **Functions ≤ 50 lines.** Higher ceiling than the frontend, but the same instinct applies: split
  a service method into smaller private methods once it's doing more than one thing (validate →
  do the work → shape the response is a natural 3-way split).
- **Every class, method, and function gets a JSDoc comment** — what it does, its `@param`s, its
  `@returns`, and any `@throws`. This is stricter than the frontend's one-liner rule; don't skip it
  on services/controllers/DTOs.
- **No `any`.** DTOs are the only place request/response shapes should be defined — controllers
  should never accept `@Body() body: any`.
- **Validation is global and DTO-based.** `app.useGlobalPipes(new ValidationPipe({ whitelist: true,
  forbidNonWhitelisted: true, transform: true }))` in `main.ts`, and every `@Body()`/`@Query()`/
  `@Param()` typed to a DTO class decorated with `class-validator`.
- **Auth is a Guard, not inline logic.** `@UseGuards(AuthGuard('jwt'))` (or a custom Guard) on the
  controller/route — never a manual `if (!req.user)` check inside a handler.
- **Exceptions, not raw errors.** `throw new NotFoundException(...)` /
  `ForbiddenException(...)` / `ConflictException(...)`, never `throw new Error(...)` — and never
  let an unexpected error leak a stack trace or internal detail to the client (global exception
  filter should catch and generalize it).
- **Secrets only via `@nestjs/config` + `.env`.** Never hardcode a JWT secret, DB URL, or SMTP
  credential — and never commit a real `.env` (only `.env.example` with placeholders).
- **Passwords**: bcrypt-hashed (10+ salt rounds), never returned in any API response — strip them
  before sending a user object back, the same way `mockAuthApi`'s `toPublicUser` does on the
  frontend.
- **Database (Prisma, not Mongoose)**: model constraints (uniqueness, required fields) belong in
  `schema.prisma`, not ad-hoc checks scattered in services. Wrap Prisma calls that can violate a
  constraint (e.g. duplicate email) in try/catch and translate the Prisma error code into a proper
  NestJS exception (`ConflictException` for a unique-constraint violation, etc.) — this is the
  Prisma equivalent of the source doc's Mongoose pre-save-hook/duplicate-key examples.
- **Tests**: every new service gets a `*.spec.ts` with at least a happy-path and an error-path
  test; every new controller gets an integration test covering auth/validation.

## Before You Open a PR

1. `npm run lint` and `npm run build` both pass with zero errors.
2. Grep your diff for `console.log`, commented-out code, and unused imports — remove all of them.
3. Skim every new/changed function — none exceed 50 lines.
4. Every new endpoint has a DTO with `class-validator` decorators; no `@Body() body: any`.
5. Every protected route has a Guard; nothing checks auth manually inline.
6. Every thrown error is a NestJS exception with a real message, not a raw `Error`.
7. New env vars are in `.env.example`, read via `@nestjs/config`, never hardcoded.
8. No password/token field is ever returned in a response body.
9. New services/controllers have matching `*.spec.ts` tests.
10. New modules/endpoints/env vars are mentioned in `README.md`.
11. PR touches **one feature**. If it grew into two, split it.
12. PR title + description cover what/why/how (see `best_practices.md` §1 for the template).
13. Every response returns through `ResponseInterceptor`/`AllExceptionsFilter` — don't hand-roll a
    response shape in a controller (see "Project-Specific Conventions" below).
14. Every new `@@relation` foreign-key column in `schema.prisma` has an `@@index` — Postgres does
    not auto-index these.
15. Any DTO/service accepting an email does its lookup/comparison through `UsersService`
    (case-normalized), never a raw `where: { email }` elsewhere.
16. Magic numbers/durations used more than once (TTLs, salt rounds, limits) live in a
    `*.constants.ts` file, not inline in the service.
17. Every `MailService`/other best-effort external call is wrapped in try/catch at its call site,
    even if the callee also catches internally.
18. HTML emails render from a `.hbs` file under `mail/templates/`, never an inline template
    literal.
19. All routes are versioned under `/api/v1` (`app.setGlobalPrefix('api/v1')` in `main.ts`) — never
    add a route outside the versioned prefix.

## Project-Specific Conventions (from senior-engineer PR review)

These came out of a real review of this repo's first PR (see
[BACKEND_DEVELOPMENT_PLAN.md §9.1](BACKEND_DEVELOPMENT_PLAN.md) for the full changelog) and are
now hard requirements, not suggestions.

**Unified response envelope.** Every controller returns its plain resource/DTO — `ResponseInterceptor`
(registered globally in `main.ts`) wraps it before it reaches the client:
```json
// success
{ "success": true, "data": { "...": "..." }, "message": "..." }
// error (thrown by AllExceptionsFilter)
{ "success": false, "message": "..." }
```
A controller method returning `{ message, ...rest }` gets `message` hoisted to the envelope's own
`message` field automatically — don't nest a `message` field inside `data` yourself. A `204 No
Content` response (e.g. `DELETE`) is left bodyless; the interceptor detects this and skips wrapping.

**Prisma foreign-key indexes.** Postgres does not automatically index a foreign-key column the way
some other databases do. Every scalar field used in a `@relation(fields: [...])` needs an explicit
`@@index([thatField])` on the model, e.g.:
```prisma
model Todo {
  ownerId Int
  owner   User @relation(fields: [ownerId], references: [id])

  @@index([ownerId])
}
```

**Case-insensitive emails.** Postgres `TEXT`/`VARCHAR` equality is case-sensitive, so `User@x.com`
and `user@x.com` would otherwise slip past a `@unique` constraint as two different rows. Every
email read or write goes through `UsersService`, which normalizes (`.trim().toLowerCase()`) before
touching Prisma — never query `prisma.user` by email directly from another service.

**Constants live in their own file.** A value reused more than once in a service (token TTLs,
bcrypt salt rounds, pagination limits, etc.) belongs in a co-located `*.constants.ts` file
(e.g. `auth.constants.ts`), imported where needed — not a `const` declared at the top of the
service file.

**Defense-in-depth on email sends.** `MailService` already catches its own send failures and logs
instead of throwing (so a broken SMTP server never fails the calling request). Callers (e.g.
`AuthService`) must *also* wrap each send call in their own try/catch — never assume the callee's
contract will hold forever.

**HTML emails use Handlebars templates.** Compile `.hbs` files from `mail/templates/` (see
`MailService.compile`/`.render`) instead of building HTML with template literals inline. New
templates must be added to `nest-cli.json`'s `compilerOptions.assets` glob so they're copied into
`dist/` on build.

**API versioning.** The global prefix is `api/v1`, set once in `main.ts`
(`app.setGlobalPrefix('api/v1')`). Any breaking change to a response shape or route should bump
this to `v2` rather than silently changing `v1`'s contract.
