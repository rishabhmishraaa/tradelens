// F7: the one schema for an AI session review, plus grounding checks the schema can't express.
// Pure (no server-only imports) so it is unit-tested directly.
import { z } from "zod";
import { MISTAKE_TAGS } from "@/lib/mistake-tags";

export const reviewSchema = z.object({
  summary: z.string().min(1).max(600),
  wentWell: z.array(z.string().max(200)).max(3),
  mistakes: z
    .array(
      z.object({
        tag: z.enum([...MISTAKE_TAGS, "other"]),
        tradeIds: z.array(z.string()).min(1),
        insight: z.string().max(300),
      }),
    )
    .max(10),
  patterns: z.array(z.string().max(200)).max(3),
  nextSessionFocus: z.string().min(1).max(200),
});

export type Review = z.infer<typeof reviewSchema>;

/** The parts of the day's trades the grounding checks need. */
export type GroundingTrade = { id: string; tags: string[] };

/**
 * F7.3: problems that make a schema-valid review untrustworthy. Empty array = grounded.
 * - every tradeId exists in that day's input
 * - every tag used on the day's trades appears in `mistakes` at least once
 * - a trade id appears under a tag only if that trade has the tag ("other" is free)
 */
export function groundingProblems(review: Review, trades: GroundingTrade[]): string[] {
  const problems: string[] = [];
  const byId = new Map(trades.map((t) => [t.id, t]));

  for (const m of review.mistakes) {
    for (const id of m.tradeIds) {
      const trade = byId.get(id);
      if (!trade) problems.push(`unknown trade id ${id}`);
      else if (m.tag !== "other" && !trade.tags.includes(m.tag)) problems.push(`trade ${id} is not tagged ${m.tag}`);
    }
  }

  const covered = new Set(review.mistakes.map((m) => m.tag));
  for (const tag of new Set(trades.flatMap((t) => t.tags))) {
    if (!covered.has(tag as Review["mistakes"][number]["tag"])) problems.push(`tag ${tag} is missing from mistakes`);
  }
  return problems;
}
