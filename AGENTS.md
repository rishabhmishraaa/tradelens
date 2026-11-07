# AGENTS.md

TradeLens is an AI trade journal. Users log trades (symbol, side, entry/exit price and time, quantity, fees, currency, notes, mistake tags). The Claude API summarizes sessions, groups mistakes by type, and surfaces win-rate and drawdown patterns. The owner logs in to write; visitors get a read-only demo account with seeded data and pre-generated summaries.

## Stack

Installed (from `package.json` / `node_modules`):

- Next.js 16.4.5 (App Router, Turbopack), React / React DOM 19.3.0
- Tailwind CSS v4 (4.3.4) via `@tailwindcss/turbopack`
- TypeScript 5 (5.9.3, `strict`, alias `@/*` -> `src/*`)
- ESLint 9 (9.39.5, flat config in `eslint.config.mjs`, `eslint-config-next`)
- Node 26 (26.13.0)

Planned (NOT installed; do not import until added in a feature PR):

- Postgres on Neon via Drizzle ORM
- Zod
- `@anthropic-ai/sdk`
- Vitest, Playwright
- GitHub Actions CI, Vercel hosting

## Next.js 16 warning

This version differs from older Next.js: Turbopack is the default bundler, and `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts`. Before using caching, routing, middleware/proxy, or data-fetching APIs, read the installed docs in `node_modules/next/dist/docs/` (App Router: `01-app/`). Do not copy patterns from Next 13-15 from memory.

## Commands

| Command | Status |
| --- | --- |
| `npm run dev` | available |
| `npm run build` | available |
| `npm run start` | available |
| `npm run lint` | available |
| `npm test` (Vitest) | planned |
| `npm run test:e2e` (Playwright) | planned |
| `npm run db:*` (Drizzle) | planned |

## File layout

Existing: `src/app/` (routes, layout, `globals.css`). Create the rest when first needed:

- `src/app/` - routes and UI. Server components by default.
- `src/lib/` - pure functions (P&L, stats, formatting) with colocated `*.test.ts`.
- `src/db/` - Drizzle schema and client (server-only).
- `src/server/` - other server-only code (actions, queries, auth).
- `src/server/ai/` - all Claude calls, prompts, and their Zod output schemas.
- `e2e/` - Playwright tests.
- Unit tests sit next to the code they test.

Server-only modules start with `import "server-only"`. In Next 16 this needs no install: the package is optional (see `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, "Preventing environment poisoning"). Do not add it as a dependency.

## Conventions

- Server components by default; add `"use client"` only when state, effects, or browser APIs require it.
- Validate all input with Zod at the server boundary (server actions, route handlers).
- P&L and stats are pure functions in `src/lib` with unit tests.

## AI rules

- Claude is called only from server code (`src/server/ai/`).
- The API key never reaches the client or git.
- AI output is JSON validated with a Zod schema; invalid output is handled gracefully (no crash, user-visible fallback).
- Tests NEVER call the real API; mock it.

## Secrets

- Secrets live in `.env.local` only.
- `.env.example` is committed: names only, no values. Update it whenever a variable is added or removed.

## Boundaries

- Add no dependencies beyond the planned list without asking.
- Ask before deleting files, running migrations against a remote DB, or pushing to `main`.
- Write files with file tools, not shell redirects.
- One branch + PR per feature.

## Definition of done

- The feature's `SPEC.md` criteria pass.
- Tests, `npm run lint` and `npm run build` pass (lint does not type-check; the build does).
- The PR body maps each criterion to a test and says how it was verified.

## Git

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:` ...).
- Squash merge.
- Create PRs with `gh pr create --body-file <file>`.
