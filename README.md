<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

See [docs/BACKEND_DEVELOPMENT_PLAN.md](docs/BACKEND_DEVELOPMENT_PLAN.md) for the full development plan — frontend contract, tech stack, database schema, and endpoint spec across all 3 build phases (Auth+Todos, Collaboration, Deadlines+Notifications).

Before writing code or opening a PR, check [docs/PR_STANDARDS.md](docs/PR_STANDARDS.md) — a condensed, one-file reference for this repo's code standards and PR review checklist.

## Environment Variables

Copy `.env.example` to `.env` and fill in real values locally (never commit `.env`):

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` locally — gates whether `/auth/signup` and `/auth/forgot-password` include the raw token in their response (see docs plan §5.1) |
| `PORT` | HTTP port (default `3000`) |
| `FRONTEND_URL` | Allowed CORS origin, e.g. `http://localhost:5173` |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT signing secret and access-token lifetime |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Nodemailer SMTP config — leave blank locally to skip real email sending (send failures are logged, not thrown) |

See [docs/BACKEND_DEVELOPMENT_PLAN.md](docs/BACKEND_DEVELOPMENT_PLAN.md) (§3, "Local development database") for how to set up a local Postgres instance from scratch.

## API Endpoints

All routes are served under `/api/v1`. Interactive docs (Swagger, with a "Authorize" button for
Bearer tokens) are available at `/api-docs` once the server is running.

Every response is wrapped in a consistent envelope: `{ success: true, data, message }` on success
(a 204 No Content response is left bodyless, as required by the HTTP spec), or
`{ success: false, message }` on error. The tables below show the shape of `data` on success.

**Auth** (`/api/auth`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/signup` | — | 409 if email taken |
| POST | `/verify-email` | — | 400 if token invalid/expired |
| POST | `/login` | — | 401 bad credentials, 403 unverified email |
| POST | `/logout` | 🔒 | No-op placeholder (JWTs are stateless) |
| GET | `/me` | 🔒 | Current user's profile |
| POST | `/forgot-password` | — | 404 if no account with that email |
| POST | `/reset-password` | — | 400 if token invalid/expired |

**Todos** (`/api/todos`) — all routes 🔒, scoped to the authenticated user

| Method | Path | Notes |
|---|---|---|
| GET | `/` | List the current user's todos |
| POST | `/` | Create a todo (`{ title }`) |
| PATCH | `/:id` | Partial update (`{ title?, completed? }`) — 404 missing, 403 not owner |
| DELETE | `/:id` | 204 on success — 404 missing, 403 not owner |

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
