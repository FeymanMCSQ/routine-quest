# Prisma Postgres Setup

This project was moved onto Prisma Postgres using the current Prisma ORM v7 setup pattern. The database connection itself lives only in `.env`, which is ignored by git.

## What Changed

- Installed Prisma runtime and development dependencies:
  - Runtime: `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`
  - Development: `prisma`, `tsx`, `@types/node`, `@types/pg`
- Linked the existing Prisma Postgres database so Prisma could write `DATABASE_URL` into `.env`.
- Kept `.env` in `.gitignore` so database credentials stay local.
- Updated `prisma/schema.prisma` to use the Prisma v7 `prisma-client` generator:
  - Client output is `generated/prisma`
  - The datasource provider is PostgreSQL
  - The connection URL is handled by `prisma.config.ts`, not inside the schema
- Added `prisma.config.ts` to define:
  - Schema path
  - Migration path
  - Seed command
  - `DATABASE_URL` loading from `.env`
- Preserved the app's existing models:
  - `Profile`
  - `Quest`
  - `LogEntry`
- Created and applied the initial migration in `prisma/migrations`.
- Generated the Prisma Client into `generated/prisma`.
- Added `lib/prisma.ts` as the server-side Prisma singleton.
- Added `prisma/seed.ts` with starter profile, quests, and log rows.
- Added `scripts/verify-prisma.ts` to run one read and print `✅ Connected`.
- Updated the app server from the old `@prisma/client` import path to the generated Prisma v7 client through `lib/prisma.ts`.
- Added package scripts for generate, migrate, seed, studio, and verification.

## Why It Mattered

Prisma 7 no longer uses the old default `prisma-client-js` flow as the preferred setup. The generated client now needs an explicit output path, and the application should import from that generated client instead of assuming Prisma lives behind the old `@prisma/client` runtime shape.

The `PrismaPg` adapter is important because Prisma 7 expects a driver adapter for PostgreSQL connections in this setup. `lib/prisma.ts` centralizes that adapter wiring so server code can reuse one safe Prisma instance instead of creating clients throughout the app.

Putting `DATABASE_URL` in `.env` and keeping `.env` ignored prevents database credentials from being committed. `prisma.config.ts` lets Prisma CLI commands read the same local environment without putting secrets into `schema.prisma`.

The migration gives the database a reproducible schema history. The seed script gives a fresh database usable starter data. The verify script gives a quick health check that confirms the generated client, adapter, environment loading, and database connection all work together.

## Useful Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:verify
npm run db:studio
```

Use Prisma only from server-side code or scripts. Do not import `lib/prisma.ts` or the generated Prisma Client into browser/client-side code.
