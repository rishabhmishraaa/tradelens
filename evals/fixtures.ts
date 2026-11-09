// F9.1: fixed eval days. Three are real demo sessions; two are made up to cover harder cases.
import { demoTrades } from "@/db/seed-data";
import { sessionDate } from "@/lib/time";
import type { ReviewTrade } from "@/server/ai/review-input";

export type EvalFixture = { name: string; covers: string; date: string; trades: ReviewTrade[] };

const seedDay = (date: string): ReviewTrade[] => demoTrades().filter((t) => sessionDate(t.exitAt) === date);

const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);

function trade(id: string, symbol: string, date: string, entry: string, exit: string, prices: [string, string], qty: string, tags: string[], notes: string | null = null): ReviewTrade {
  return {
    id,
    symbol,
    side: "long",
    entryPrice: prices[0],
    exitPrice: prices[1],
    quantity: qty,
    fees: "20",
    currency: "INR",
    entryAt: ist(date, entry),
    exitAt: ist(date, exit),
    tags,
    notes,
  };
}

const LONG_NOTE_1 =
  "Woke up late after a bad night's sleep and skipped my usual pre-market routine. I didn't mark levels on the chart, didn't check the news, and went straight in. " +
  "The first fifteen minutes were choppy and I told myself I would wait, but after seeing two green candles I bought anyway. Price stalled almost immediately. " +
  "I kept staring at the screen hoping for a bounce, and when it finally dipped below the morning low I sold in a hurry. Looking back, I was tired and impatient, " +
  "and none of this matched the plan I wrote last weekend: only trade the opening range breakout after 09:30, with a stop below the range and a target at 2R.";
const LONG_NOTE_2 =
  "Second trade of the day. Still tired, and annoyed about the first loss. This time I did wait for the range, and the setup was actually valid: a clean breakout " +
  "above the 15-minute high with volume. I sized normally and placed the stop correctly. It went my way and I took profit at the target without fiddling with it. " +
  "The difference between the two trades is obvious when I write it down: the second one followed the plan, the first one followed my mood. I should not trade " +
  "on days when I haven't done the routine, or at least wait until the first hour is over before touching anything.";

export const evalFixtures: EvalFixture[] = [
  { name: "no-mistakes", covers: "a clean day with no mistake tags (USD)", date: "2026-10-15", trades: seedDay("2026-10-15") },
  { name: "revenge-day", covers: "a revenge-trading chain with 7 tags across 5 trades", date: "2026-10-09", trades: seedDay("2026-10-09") },
  { name: "mixed-currency", covers: "INR and USD trades on the same day", date: "2026-10-19", trades: seedDay("2026-10-19") },
  {
    name: "all-loss",
    covers: "every trade lost (made up)",
    date: "2026-11-03",
    trades: [
      trade("eval-allloss-1", "INFY", "2026-11-03", "09:30", "10:10", ["1500", "1488"], "40", ["moved-stop"]),
      trade("eval-allloss-2", "TCS", "2026-11-03", "11:00", "13:30", ["3100", "3062"], "15", ["held-loser"]),
      trade("eval-allloss-3", "SBIN", "2026-11-03", "14:00", "14:45", ["820", "811"], "100", ["no-stop"]),
    ],
  },
  {
    name: "long-notes",
    covers: "long free-text notes, including a mistake that has no tag (made up)",
    date: "2026-11-04",
    trades: [
      trade("eval-notes-1", "RELIANCE", "2026-11-04", "09:20", "09:50", ["1420", "1412"], "50", [], LONG_NOTE_1),
      trade("eval-notes-2", "HDFCBANK", "2026-11-04", "10:15", "11:20", ["1700", "1718"], "40", [], LONG_NOTE_2),
    ],
  },
];
