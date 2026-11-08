// F7.1: what the model sees. Built by a pure function from the day's trades plus stats computed
// in code (D9: the model never does arithmetic).
import { byTag, netPnl, outcome, summarize, type StatsTrade } from "@/lib/stats";
import { utcToIstInput } from "@/lib/time";

export type ReviewTrade = StatsTrade & { symbol: string; entryAt: Date; notes: string | null };

const r2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

export function buildReviewInput(date: string, trades: ReviewTrade[]) {
  return {
    sessionDate: date,
    timezone: "Asia/Kolkata",
    trades: [...trades]
      .sort((a, b) => a.exitAt.getTime() - b.exitAt.getTime())
      .map((t) => {
        const net = netPnl(t);
        return {
          id: t.id,
          symbol: t.symbol,
          side: t.side,
          entryTimeIst: utcToIstInput(t.entryAt),
          exitTimeIst: utcToIstInput(t.exitAt),
          currency: t.currency,
          netPnl: r2(net),
          result: outcome(net),
          mistakeTags: t.tags,
          notes: t.notes,
        };
      }),
    stats: summarize(trades).map((s) => ({
      currency: s.currency,
      trades: s.trades,
      wins: s.wins,
      losses: s.losses,
      breakevens: s.breakevens,
      winRatePercent: s.winRate === null ? null : r2(s.winRate * 100),
      netPnl: r2(s.net),
      fees: r2(s.fees),
      maxDrawdown: r2(s.maxDrawdown),
    })),
    byMistake: byTag(trades).map((t) => ({
      tag: t.tag ?? "untagged",
      currency: t.currency,
      trades: t.count,
      netPnl: r2(t.net),
    })),
  };
}

export type ReviewInput = ReturnType<typeof buildReviewInput>;

export const SYSTEM_PROMPT = `You are a trading coach reviewing one trading day from a trader's journal.

Rules:
- Use only the data in <session>. Do not invent trades, prices, or events.
- Do not calculate any numbers. All figures (P&L, win rate, drawdown) are already computed in "stats" and "byMistake"; quote them if useful.
- Group mistakes by their tag. Every mistake tag that appears on any trade must appear in "mistakes" at least once, listing the ids of the trades that carry that tag.
- Put a trade id under a tag only if that trade has that tag. Use the tag "other" for a problem you notice in the notes that has no tag.
- Use the exact trade ids from the input.
- Be specific and brief: summary up to 600 characters, each list item up to 200 characters, each insight up to 300 characters, at most 3 items in wentWell and patterns.
- "nextSessionFocus" is one concrete thing to do differently next session.`;

export function userMessage(input: ReviewInput): string {
  return `<session>\n${JSON.stringify(input, null, 2)}\n</session>\n\nWrite the review for this session.`;
}
