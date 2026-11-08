"use server";

import { cookies } from "next/headers";
import { sessionReviews } from "@/db/schema";
import { isIsoDate } from "@/lib/range";
import { istDateRangeToUtc } from "@/lib/time";
import { requireOwner } from "../auth/session";
import { db } from "../db";
import { listTrades } from "../trades";
import { chooseModel } from "./choose-model";
import { generateReview } from "./generate";
import { buildReviewInput } from "./review-input";
import type { Review } from "./review-schema";

export type ReviewState = { review: Review | null; model: string | null; error: string | null };

/** Test-only: in AI_MODE=mock, E2E tests pick a mock scenario with this cookie. Ignored in live mode. */
const MOCK_SCENARIO_COOKIE = "tl_ai_mock";

const MESSAGES = {
  invalid: "Couldn't generate a review. Try again.",
  api: "The AI service didn't respond properly. Try again in a minute.",
  timeout: "The AI service took too long to respond. Try again in a minute.",
  config: "AI reviews aren't configured on this server.",
  auth: "You must be logged in as the owner to generate reviews.",
  noTrades: "There are no trades on this day to review.",
} as const;

// Bound with the session date; useActionState passes the previous state next.
export async function generateSessionReview(date: string, prev: ReviewState): Promise<ReviewState> {
  // F7.4: a failure keeps whatever review was on screen; it never blanks it.
  const fail = (error: string): ReviewState => ({ review: prev.review, model: prev.model, error });

  try {
    await requireOwner(); // F7.7: checked on the server, same rule as F4.8
  } catch {
    return fail(MESSAGES.auth);
  }
  if (!isIsoDate(date)) return fail(MESSAGES.noTrades);

  const trades = await listTrades("owner", istDateRangeToUtc(date, date));
  if (trades.length === 0) return fail(MESSAGES.noTrades);

  const scenario = process.env.AI_MODE === "mock" ? (await cookies()).get(MOCK_SCENARIO_COOKIE)?.value : undefined;
  const choice = await chooseModel(process.env, scenario);
  if (!choice.ok) {
    console.error(`[ai] ${choice.detail}`);
    return fail(MESSAGES.config);
  }

  const result = await generateReview(choice.model, buildReviewInput(date, trades));
  if (!result.ok) {
    // Details go to the server log only; users get a short, safe message (F7.4 / F7.5).
    console.error(`[ai] review failed for ${date}: ${result.error} after ${result.attempts} attempt(s): ${result.detail}`);
    return fail(MESSAGES[result.error]);
  }

  // F7.6 / D12: saved only after it validated; replaces any earlier review for the same day.
  await db()
    .insert(sessionReviews)
    .values({ userId: "owner", sessionDate: date, review: result.review, model: choice.model.name })
    .onConflictDoUpdate({
      target: [sessionReviews.userId, sessionReviews.sessionDate],
      set: { review: result.review, model: choice.model.name, createdAt: new Date() },
    });

  return { review: result.review, model: choice.model.name, error: null };
}
