# AI review evals

Evidence that the real model produces valid, grounded session reviews (SPEC F9).

## How it works

`npm run eval` runs the same review pipeline the app uses (`src/server/ai/generate.ts`) on 5 fixed days in `evals/fixtures.ts`, and grades each result with code:

| Fixture | What it tests |
| --- | --- |
| no-mistakes | a clean day with no mistake tags (USD) |
| revenge-day | a revenge-trading chain: 7 tags across 5 trades |
| mixed-currency | INR and USD trades on the same day |
| all-loss | every trade lost |
| long-notes | long free-text notes, including a mistake that has no tag |

Each fixture is checked for: valid JSON matching the review schema, the grounding rules (every trade id real, every tag covered, no trade under a tag it doesn't have), whether the one retry was needed, and latency. Any failure makes the run exit non-zero. Each live run appends its results below.

- `npm run eval` needs `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in `.env.local`. It costs a few cents and is never run in CI.
- `npm run eval:dry` runs the same harness with the mock model. That proves the harness works, **not** that the model is good: the mock is built to pass.
- `evals/run.test.ts` (part of `npm test` and CI) proves the harness reports failures correctly: schema failures, grounding failures, retries and API errors.

## Status

**No live run yet.** This project has no paid API budget (SPEC D17), so the evals have only been dry-run with the mock model (5/5, harness check only). The first live run with a key will be recorded below.

# Results
