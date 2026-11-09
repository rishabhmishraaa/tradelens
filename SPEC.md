# TradeLens: SPEC

An AI trade journal. The owner logs closed trades; TradeLens computes P&L, win rate and drawdown in code, and the Claude API turns a trading day into a short structured review that groups mistakes by type. Visitors see a read-only demo account.

How to use this file: each feature has numbered acceptance criteria. Every criterion is pass/fail and tagged with how it is verified:
`[Unit]` Vitest, `[Int]` Vitest against the test database, `[E2E]` Playwright, `[Build]` build/lint/typecheck, `[Eval]` `npm run eval` (real API, manual), `[Manual]` checked by a person.
Test titles start with the criterion ID (e.g. `F4.3 rejects exit before entry`).
If a criterion looks wrong or conflicts with another, stop and ask. Do not reinterpret it.

## Decisions

| ID | Decision |
| --- | --- |
| D1 | **Closed trades only.** Every trade has entry and exit price and time. |
| D2 | **Gross P&L**: long = (exit − entry) × quantity; short = (entry − exit) × quantity. **Net P&L** = gross − fees. Fees are ≥ 0. |
| D3 | **Win** = net > 0, **loss** = net < 0, **breakeven** = net = 0. **Win rate** = wins / (wins + losses); breakeven trades count toward trade totals but not the win rate. With no wins and no losses, win rate is "n/a" (not 0%). |
| D4 | **Session** = one trading day = the calendar date of the trade's **exit time** in `Asia/Kolkata` (one constant, `APP_TIMEZONE`). Times are stored as UTC `timestamptz`. |
| D5 | **Max drawdown** = the largest fall from a running peak of cumulative net P&L, trades ordered by exit time (ties by id), peak starting at 0. Reported as a non-negative amount in the currency, not a percentage (no account size is stored). |
| D6 | **Currencies are never mixed.** Stats are computed per currency (ISO 4217 code, e.g. `INR`, `USD`); no FX conversion. A range with two currencies shows two sets of stats. |
| D7 | **Money**: prices, quantities and fees are stored as Postgres `numeric` (not float). Calculations use JS numbers; results are rounded to 2 decimals only when displayed. Unit tests compare with `toBeCloseTo`. |
| D8 | **Mistake tags** are a fixed list (one Zod enum, one source file): `fomo-entry`, `chased-price`, `no-stop`, `moved-stop`, `oversized`, `early-exit`, `held-loser`, `revenge-trade`, `broke-plan`, `overtraded`. A trade has 0..n tags plus optional free-text notes (≤ 1000 chars). |
| D9 | **The model never does arithmetic.** Stats are computed in code and passed to Claude as input; the AI explains and groups, it does not calculate. |
| D10 | **Auth**: one owner. Password stored only as a scrypt hash in `OWNER_PASSWORD_HASH`; session is an HMAC-SHA256-signed, httpOnly, SameSite=Lax cookie (Secure in production), 7-day expiry, signed with `SESSION_SECRET`. Node's built-in `crypto` only, no auth library. |
| D11 | **Users**: two rows in `users`: `owner` and `demo`. Visitors without a session read the demo user's data. Every write checks for an owner session **on the server**; hiding buttons is not protection. |
| D12 | **AI calls are on demand** (a button per session), and results are saved. Re-running replaces the saved summary only after the new one validates. |
| D13 | **Test database**: integration and E2E tests use a dedicated Neon branch (`TEST_DATABASE_URL`), reset and seeded before each run. Tests never touch the main branch. |
| D14 | **AI in tests**: `AI_MODE=mock` swaps the Claude client for a fake that returns fixtures. The app refuses to start with `AI_MODE=mock` when `VERCEL_ENV=production`. |
| D15 | The model name comes from `ANTHROPIC_MODEL`; no model ID is hard-coded in source. If it is unset in `live` mode, the review button shows a configuration error (same handling as F7.5). |
| D16 | No new runtime dependencies beyond AGENTS.md's planned list: no chart, date or auth libraries. Dates via `Intl`; the equity curve is a hand-written inline SVG. Allowed tooling that comes with the planned stack: `drizzle-kit`, the Neon serverless driver, and the dev dependency `@axe-core/playwright` (F6.6). Scripts are TypeScript run directly by Node 26 (no `tsx`). |
| D17 | **No paid API budget** (decided 2026-11-08: no free API credit was available). The demo's reviews are pre-written samples, labelled as such, that must pass the same schema and grounding checks as live AI output (F8.3). Live generation and evals (F9) work as soon as an owner sets `ANTHROPIC_API_KEY`; until then the app shows a "not configured" message and never crashes. |

## Environment variables

`DATABASE_URL`, `TEST_DATABASE_URL`, `OWNER_PASSWORD_HASH`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_MODE` (`live` | `mock`, default `live`). All listed in `.env.example` with no values.

## Build order (one PR each)

F1 test + CI setup → F2 database + seed → F3 auth → F4 trades CRUD → F5 stats → F6 dashboard + session pages → F7 AI session review → F8 demo mode → F9 evals → F10 deploy. Deploy (F10) may move earlier; once it exists, every later PR is also checked on the live URL.

---

## F1. Test and CI setup

Goal: tests exist and run on every PR before any feature code.

- F1.1 `npm test` runs Vitest; `npm run test:e2e` runs Playwright (Chromium) against a production build (`next build` + `next start`), not the dev server. [Build]
- F1.2 One placeholder unit test and one placeholder E2E test (home page returns 200) pass. [Unit] [E2E]
- F1.3 `.github/workflows/ci.yml` runs on every pull request and on push to `main`: install, lint, typecheck (`tsc --noEmit`), build, unit tests, E2E tests. [Manual: a PR shows the checks]
- F1.4 A deliberately failing test makes the CI run fail (shown once on a throwaway branch, then removed). [Manual]
- F1.5 Playwright retries are 0 locally; failures keep a trace. [Build]
- F1.6 CI reads `TEST_DATABASE_URL` from a GitHub Actions secret once F2 exists; secrets are never printed in logs. [Manual]

Out of scope: coverage thresholds, other browsers, parallel CI runs sharing the test branch (runs are serialized with a `concurrency` group).

## F2. Database and seed

Goal: the schema exists, migrations are reproducible, and demo data is realistic.

- F2.1 Drizzle schema in `src/db/schema.ts` with tables `users`, `trades`, `session_reviews`. `trades` has: id, user_id, symbol, side (`long`|`short`), entry_price, exit_price, quantity, fees, currency, entry_at, exit_at, tags (text[]), notes, created_at, updated_at. [Build]
- F2.2 Database constraints enforce: quantity > 0, prices > 0, fees ≥ 0, exit_at > entry_at, currency is 3 uppercase letters, side in the allowed set. An insert breaking any one is rejected by Postgres. [Int]
- F2.3 `session_reviews` has a unique key on (user_id, session_date) and stores the validated review JSON, the model name and created_at. [Int]
- F2.4 Migrations live in `drizzle/` and are committed; `npm run db:migrate` applies them to an empty database without errors. [Int]
- F2.5 `npm run db:seed` is idempotent (running twice gives the same rows). It creates the owner and demo users and ≥ 40 demo trades over ≥ 8 sessions in INR and USD, with wins, losses, at least one breakeven, and every mistake tag used at least once. [Int]
- F2.6 Seeded trades are fixed data in a file (not random), so stats in tests are predictable. [Build]

Out of scope: multi-user sign-up.

## F3. Owner authentication

- F3.1 `/login` has a password form. A correct password sets the session cookie and redirects to `/`; a wrong one shows "Incorrect password" and sets no cookie. [E2E]
- F3.2 The cookie is httpOnly, SameSite=Lax, has a 7-day expiry, and is Secure when served over HTTPS. [E2E]
- F3.3 A cookie with a tampered value or bad signature is treated as logged out. [Unit] [E2E]
- F3.4 An expired session is treated as logged out. [Unit]
- F3.5 The password check uses `crypto.scrypt` and `timingSafeEqual`; the plain password is never logged or stored. [Unit] [Manual: code review]
- F3.6 Logout clears the cookie and returns to the demo view. [E2E]
- F3.7 `scripts/hash-password.ts` prints a hash for a given password (used to set `OWNER_PASSWORD_HASH`). [Manual]

Out of scope: password reset, login rate limiting (use a long random password; noted in README).

## F4. Trades: create, list, edit, delete

- F4.1 `/trades/new` (owner only) has fields for every trade column in F2.1 except ids/timestamps; tags are checkboxes from D8. [E2E]
- F4.2 Input is validated by one Zod schema in the server action; the same rules as F2.2 plus notes ≤ 1000 chars and symbol 1–20 chars. Invalid input shows field-level messages and saves nothing. [Unit] [E2E]
- F4.3 Exit time before or equal to entry time is rejected with a message on the exit field. [Unit] [E2E]
- F4.4 Entry/exit times are entered in `Asia/Kolkata` and stored in UTC; the edit form shows the same local times that were entered. [Int] [E2E]
- F4.5 `/trades` lists trades newest exit first with net P&L per trade, coloured by win/loss/breakeven (colour is never the only signal: a +/− sign or label is shown too). [E2E]
- F4.6 `/trades` filters by date range (inclusive, by session date per D4); the filter is kept in the URL query string. [E2E]
- F4.7 Edit and delete work for the owner; delete asks for confirmation. [E2E]
- F4.8 Without an owner session, a direct POST to any trade action (create, update, delete) is rejected and changes nothing, even though the buttons are hidden. [Int] [E2E]

Out of scope: CSV import, open trades (D1), attachments.

## F5. Stats (pure functions)

Goal: all numbers come from small, tested functions in `src/lib/stats.ts`, with no database or framework imports.

- F5.1 `netPnl(trade)` follows D2 for long and short trades, including fees. [Unit]
- F5.2 `winRate(trades)` follows D3, including the breakeven and "n/a" cases. [Unit]
- F5.3 `maxDrawdown(trades)` follows D5. Tests cover: all wins (0), all losses (sum of losses), a peak then a deeper trough, ties in exit time. [Unit]
- F5.4 `summarize(trades)` returns per-currency totals (D6): trade count, wins, losses, breakevens, win rate, gross, fees, net, average win, average loss, largest win, largest loss, max drawdown. [Unit]
- F5.5 `byTag(trades)` returns, per mistake tag and currency: count, net P&L, win rate. Untagged trades are reported separately. [Unit]
- F5.6 `sessionDate(exitAt)` follows D4, including a trade exiting at 00:30 IST (19:00 UTC the previous day) landing on the IST date. [Unit]
- F5.7 Running `summarize` on the F2 seed data gives the exact values recorded in `src/lib/__fixtures__/seed-stats.json` (checked by hand once and committed). [Unit]
- F5.8 A mutation check is recorded in the PR: flipping the short-side formula or dropping fees makes at least one test fail. [Manual]

## F6. Dashboard and session pages

- F6.1 `/` shows `summarize` for a date range (default: the 30 days ending at the most recent trade's session date, or today if there are no trades; changed from "last 30 days" so older data such as the fixed demo stays visible) per currency, an inline-SVG equity curve of cumulative net P&L, the `byTag` table, and a list of sessions linking to `/sessions/[date]`. [E2E]
- F6.2 `/sessions/[date]` shows that day's trades, the day's stats, and the saved AI review if one exists. An invalid date returns 404; a valid date with no trades shows an empty state. [E2E]
- F6.3 Numbers shown in the UI match the stats functions for the seed data (checked against the F5.7 fixture). [E2E]
- F6.4 The equity curve has a text alternative stating start, end, peak and max drawdown. [E2E]
- F6.5 Pages are server-rendered: the stats are in the HTML the server sends, with no client-side data fetching. [E2E: the raw HTML response contains the stats] (Reworded: with Cache Components, request-time sections stream inside `<Suspense>` and a small inline script reveals them, so a browser with JavaScript fully disabled sees the loading text. Search crawlers get fully rendered HTML from Next.)
- F6.6 Basic accessibility: one `<h1>` per page, labelled form fields, visible focus, and no axe-detectable violations of serious or critical impact on `/`, `/trades`, `/sessions/[date]`, `/login`. [E2E]

Out of scope: chart libraries (D16), dark mode.

## F7. AI session review

Goal: one button turns a trading day into a short, grounded review. Output is structured, validated, and safe to fail.

Review schema (one Zod schema in `src/server/ai/review-schema.ts`):

```
{
  summary: string               // 1–600 chars
  wentWell: string[]            // 0–3 items, each ≤ 200 chars
  mistakes: {                   // 0–10 items
    tag: MistakeTag | "other"   // D8 enum or "other"
    tradeIds: string[]          // ≥ 1, ids from the input
    insight: string             // ≤ 300 chars
  }[]
  patterns: string[]            // 0–3 items, each ≤ 200 chars
  nextSessionFocus: string      // 1–200 chars
}
```

- F7.1 The prompt input is built by a pure function from the day's trades (id, symbol, side, times, net P&L, tags, notes) plus the output of `summarize` and `byTag` (D9). The prompt text tells the model not to calculate numbers. [Unit: snapshot of the built input for a seed day]
- F7.2 Claude is called only from `src/server/ai/`, with structured JSON output. The response is parsed with the schema above. [Unit] [Manual: code review]
- F7.3 Grounding checks after parsing: every `tradeId` exists in that day's input; every tag that appears on the day's trades appears in `mistakes` at least once; no trade id appears under a tag the trade doesn't have, except under `"other"`. A review failing any check counts as invalid. [Unit]
- F7.4 Invalid output (bad JSON, schema failure or grounding failure) triggers exactly one retry; if that also fails, the page shows "Couldn't generate a review. Try again." and nothing is saved. The previous saved review, if any, stays. [Unit] [E2E with mock]
- F7.5 API errors, timeouts (30 s) and a missing API key show a clear message and save nothing; the page never crashes. [Unit] [E2E with mock]
- F7.6 A valid review is saved in `session_reviews` with the model name, and shown on reload without calling the API again. [Int] [E2E with mock]
- F7.7 Only the owner can generate a review; a direct request without an owner session is rejected (same rule as F4.8). [Int] [E2E]
- F7.8 Tests never call the real API: with `AI_MODE=mock`, fixtures cover a valid review, invalid JSON, a schema failure, a grounding failure and an API error. A test asserts the real client is not constructed in mock mode. [Unit] [E2E]
- F7.9 The API key never reaches the browser: no client bundle contains `ANTHROPIC` or the key value. [Build: grep of `.next/static`]

Out of scope: streaming, chat, multi-day reviews (possible later feature).

## F8. Demo mode

- F8.1 Without a session, every page shows the demo user's data and a banner: "Demo account: read-only. Data is sample data." [E2E]
- F8.2 Demo visitors see no create/edit/delete/generate controls; F4.8 and F7.7 protect the server side. [E2E]
- F8.3 Every demo session in the seed has a pre-generated, schema-valid review stored by the seed script (from committed fixture files), so visitors see reviews with no API calls. Each passes the F7.3 grounding checks against its day's trades and is labelled "sample review, pre-generated" (D17). [Unit] [Int] [E2E]
- F8.4 Visiting the demo never calls the Claude API. [E2E: every request is recorded while browsing all demo pages; there are no POST/server-action requests, the only way a review can be generated] (Reworded from "the mock client counting calls": the mock runs inside the server process, while a browser-level check proves the same thing directly.)

## F9. Evals

Goal: evidence that the real model produces valid, grounded reviews. Run by hand because it costs money.

- F9.1 `npm run eval` runs the review pipeline with the real API on ≥ 5 fixed fixture days in `evals/fixtures.ts` (a TypeScript file rather than a folder, so fixtures can reuse the typed seed data; including: a day with no mistakes, an all-loss day, a revenge-trading day, a mixed-currency day, a day with long notes). [Eval]
- F9.2 For each fixture it reports pass/fail for: schema valid, grounding checks (F7.3), retry used, and latency, and prints a summary table. Exit code is non-zero if any fixture fails. [Eval]
- F9.3 Results of each run are appended to `EVALS.md` with the date, model and pass rate. [Manual]
- F9.4 Evals are not part of CI. [Build]
- F9.5 (added with D17) `npm run eval:dry` runs the same harness with the mock model, and `evals/run.test.ts` (in CI) proves the harness reports schema failures, grounding failures, retries and API errors. Until a live run exists, `EVALS.md` says plainly that the model has not been evaluated yet. [Unit] [Manual]

## F10. Deploy

- F10.1 The app is deployed on Vercel from `main` with the env vars set in Vercel; `AI_MODE` is unset (never `mock`) in production. Reworded: with no API budget (D17) there is no `ANTHROPIC_API_KEY` in production, so the owner's Generate shows the config error from F7.5, and the demo shows sample reviews. [Manual]
- F10.2 Production uses the Neon main branch with migrations applied and the demo seeded. [Manual]
- F10.3 The E2E suite has a read-only subset tagged `@prod` that passes against the live URL (`BASE_URL=... npm run test:e2e -- --grep @prod`). [E2E]
- F10.4 README shows the live URL, a screenshot, how to run locally, the env vars, and the testing approach. [Manual]
