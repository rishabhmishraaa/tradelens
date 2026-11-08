# AGENTS.md

TradeLens is an AI trade journal. Users log trades (symbol, side, entry/exit price and time, quantity, fees, currency, notes, mistake tags). The Claude API summarizes sessions, groups mistakes by type, and surfaces win-rate and drawdown patterns. The owner logs in to write; visitors get a read-only demo account with seeded data and pre-generated summaries.

## Stack

Installed (from `package.json` / `node_modules`):

- Next.js 16.4.5 (App Router, Turbopack), React / React DOM 19.3.0
- Tailwind CSS v4 (4.3.4) via `@tailwindcss/turbopack`
- TypeScript 5 (5.9.3, `strict`, alias `@/*` -> `src/*`)
- ESLint 9 (9.39.5, flat config in `eslint.config.mjs`, `eslint-config-next`)
- Node 26 (26.13.0), `@types/node` 26
- Vitest 5 (unit/integration), Playwright 1.65 (E2E, Chromium)
- GitHub Actions CI (`.github/workflows/ci.yml`: lint, typecheck, build, unit, E2E)
- Postgres on Neon via Drizzle ORM 0.45 (`drizzle-orm/neon-http`, `@neondatabase/serverless` 1.2), drizzle-kit 0.31
- Zod 4 (`src/lib/trade-schema.ts`)
- `@anthropic-ai/sdk` 1.6 (`src/server/ai/live-model.ts` only)

Planned (NOT installed; do not import until added in a feature PR):

- Vercel hosting

## Next.js 16 warning

This version differs from older Next.js: Turbopack is the default bundler, and `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts`. Before using caching, routing, middleware/proxy, or data-fetching APIs, read the installed docs in `node_modules/next/dist/docs/` (App Router: `01-app/`). Do not copy patterns from Next 13-15 from memory.

## Commands

| Command | Status |
| --- | --- |
| `npm run dev` | available |
| `npm run build` | available |
| `npm run start` | available |
| `npm run lint` | available |
| `npm run typecheck` (`next typegen && tsc --noEmit`; Next's route types such as `LayoutProps` are generated into `.next/`, so plain `tsc` fails on a clean checkout) | available |
| `npm test` (Vitest: `unit` project = `src/**/*.test.ts`; `int` project = `src/**/*.int.test.ts`, which wipes, migrates and seeds the Neon TEST branch first) | available |
| `npm run test:e2e` (`next build && playwright test`; the server gets test secrets, the build never does, same as CI/Vercel; `BASE_URL=...` tests a running site) | available |
| `npm run db:generate` (SQL migration from `src/db/schema.ts` into `drizzle/`; commit it) | available |
| `npm run db:migrate` / `npm run db:seed` (main branch; ask first) - add `-- --test` for the test branch | available |
| `npm run db:reset:test` (wipe + migrate + seed the test branch only) | available |
| `npm run hash-password -- "<password>"` (prints `OWNER_PASSWORD_HASH`) | available |

## File layout

Existing: `src/app/` (routes, layout, `globals.css`). Create the rest when first needed:

- `src/app/` - routes and UI. Server components by default.
- `src/lib/` - pure functions (P&L, stats, formatting) with colocated `*.test.ts`.
- `src/db/` - Drizzle schema, client, seed. Files here are also run directly by Node (`scripts/db.ts`), so they import each other with relative `.ts` paths, never `@/`.
- `scripts/` - command-line scripts run by Node 26 directly (no `tsx`).
- `drizzle/` - generated SQL migrations (committed; never edit by hand).
- `src/server/` - other server-only code (actions, queries, auth).
- `src/server/ai/` - all Claude calls, prompts, and their Zod output schemas.
- `e2e/` - Playwright tests.
- Unit tests sit next to the code they test.

Server-only modules start with `import "server-only"`. In Next 16 this needs no install: the package is optional (see `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, "Preventing environment poisoning"). Do not add it as a dependency.

## Auth (F3)

- `src/server/auth/`: `password.ts` and `token.ts` are pure and unit-tested; `session.ts` (server-only) reads/writes the cookie; `actions.ts` holds the login/logout server actions.
- Every server action or route that writes data calls `requireOwner()` first (D11).
- Anything that calls `isOwner()` reads cookies, so render it inside `<Suspense>`; never await it at the top of a layout (Cache Components; see `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`).
- Request-dependent helpers call `await connection()` (or read cookies) BEFORE any early return that depends on env vars. Otherwise, when the env var is missing at build time, Next prerenders the early-return result for everyone (this happened in F3: "logged out" was baked into the static shell in CI).
- E2E tests use the test-only credentials in `e2e/test-env.ts`, injected by `playwright.config.ts`.

## Data access and pages (F4)

- `src/server/db.ts` creates the client lazily from `DATABASE_URL` (never at build time). `src/server/trades.ts` holds queries; every query is scoped by user id. `viewer()` returns owner (read/write) or demo (read-only).
- Server actions live in `src/server/*-actions.ts`: check the owner first, then validate with Zod, then write.
- Pages read `params`, `searchParams` and the session inside a `<Suspense>` child component (runtime data under Cache Components).
- Times: forms use IST via `src/lib/time.ts` (fixed +05:30). Never `new Date("YYYY-MM-DDTHH:MM")`: it uses the machine's zone. All tests run with `TZ=UTC` (like Vercel) so this bug can't hide on an IST laptop; `src/lib/tz-guard.test.ts` checks the setting.
- Status codes: once a page starts streaming, `notFound()` can no longer change the 200 status. Validate URL params that must 404 in `src/proxy.ts` (Next 16's name for middleware), before rendering; keep `notFound()` in the page as a backstop.
- After a client-side navigation Next 16 keeps the previous page in the DOM, hidden. In Playwright, role queries skip hidden elements but `getByTestId` doesn't: use `.filter({ visible: true })`.
- Shared UI lives in `src/components/` (trade table, stats summary, tag table, equity curve, date range form).
- Dates shown to users go through `src/lib/format.ts` (built from en-US parts, so output doesn't change with locale/ICU rules).
- E2E: `e2e/global-setup.ts` resets and seeds the TEST branch; the test server's `DATABASE_URL` is the TEST branch; tests run one at a time (`workers: 1`) because they share the database. Use `e2e/db.ts` to assert what was really saved.

## Conventions

- Server components by default; add `"use client"` only when state, effects, or browser APIs require it.
- Validate all input with Zod at the server boundary (server actions, route handlers).
- P&L and stats are pure functions in `src/lib/stats.ts` with unit tests. `src/lib/__fixtures__/seed-stats.json` holds the expected stats for the seed data (F5.7); if you change the seed or a formula, regenerate it deliberately, re-check by hand, and explain the change in the PR. `src/db/stats.int.test.ts` cross-checks the JS against SQL.
- A test for an ordering rule must use data where a different order gives a different answer.

## AI rules

- Claude is called only from server code (`src/server/ai/`).
- The API key never reaches the client or git.
- AI output is JSON validated with a Zod schema; invalid output is handled gracefully (no crash, user-visible fallback).
- Tests NEVER call the real API; mock it.
- Layout (F7): `review-schema.ts` (Zod schema + `groundingProblems`), `review-input.ts` (pure prompt input + system prompt; stats come from `src/lib/stats.ts`, the model never calculates), `generate.ts` (validate → grounding → one retry on invalid output, timeouts; no DB/Next imports), `mock-model.ts` (scenarios), `live-model.ts` (`server-only`, real SDK with structured outputs via `output_config.format`), `choose-model.ts` (env → model; mock refused in production), `actions.ts` (owner check, save only after validation).
- `live-model.ts` is imported lazily, only in live mode. Vitest maps `server-only` to `src/test/server-only-stub.ts`.
- E2E runs with `AI_MODE=mock`; tests choose a mock scenario with the `tl_ai_mock` cookie (ignored in live mode).
- `npm run check:bundle` (after a build; part of `test:e2e` and CI) fails if the client bundle mentions the API key or the Anthropic API host.
- A failed generate must keep the review already on screen: actions return the previous state on failure.

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
