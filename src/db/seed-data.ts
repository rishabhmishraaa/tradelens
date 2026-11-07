// F2.5 / F2.6: fixed demo trades (sample data, not real). Never random, so stats are predictable.
// Times are written in IST (Asia/Kolkata). An exit after midnight IST belongs to the next session (D4).
import type { MistakeTag } from "../lib/mistake-tags.ts";

type Row = [
  date: string, // entry date, IST
  symbol: string,
  side: "long" | "short",
  entry: string, // "HH:MM" IST
  exit: string, // "HH:MM" IST on the entry date, or "YYYY-MM-DD HH:MM" IST for a later date
  entryPrice: string,
  exitPrice: string,
  quantity: string,
  fees: string,
  currency: "INR" | "USD",
  tags: MistakeTag[],
  notes?: string,
];

const rows: Row[] = [
  ["2026-10-05", "RELIANCE", "long", "09:22", "10:05", "1412.50", "1421.80", "50", "42.10", "INR", [], "Opening range breakout, followed the plan."],
  ["2026-10-05", "HDFCBANK", "short", "10:40", "11:15", "1688.00", "1694.40", "40", "38.50", "INR", ["fomo-entry"], "Shorted into strength without confirmation."],
  ["2026-10-05", "INFY", "long", "13:05", "14:20", "1502.00", "1511.25", "60", "45.00", "INR", []],
  ["2026-10-05", "TCS", "long", "14:45", "15:12", "3105.00", "3098.50", "20", "35.20", "INR", ["no-stop"], "No stop placed; lucky it didn't fall further."],
  ["2026-10-06", "SBIN", "long", "09:30", "09:58", "812.40", "806.10", "150", "40.00", "INR", ["chased-price"], "Bought the third green candle."],
  ["2026-10-06", "SBIN", "long", "10:10", "10:35", "805.00", "799.20", "300", "55.00", "INR", ["revenge-trade", "oversized"], "Doubled size to win back the first loss."],
  ["2026-10-06", "ICICIBANK", "short", "11:20", "12:40", "1265.00", "1254.30", "80", "41.00", "INR", []],
  ["2026-10-06", "AXISBANK", "long", "14:00", "15:05", "1150.00", "1151.00", "30", "30.00", "INR", [], "Scratch trade: gross profit exactly covered fees."],
  ["2026-10-07", "AAPL", "long", "19:10", "20:30", "228.40", "231.10", "40", "2.00", "USD", []],
  ["2026-10-07", "NVDA", "long", "19:45", "21:15", "182.20", "179.90", "50", "2.00", "USD", ["moved-stop"], "Moved the stop down twice."],
  ["2026-10-07", "TSLA", "short", "22:30", "2026-10-08 00:30", "304.50", "298.20", "20", "2.00", "USD", [], "Exit after midnight IST, so this counts in the 8 Oct session."],
  ["2026-10-08", "RELIANCE", "short", "09:25", "10:10", "1430.00", "1424.60", "60", "44.00", "INR", []],
  ["2026-10-08", "HINDUNILVR", "long", "10:30", "13:30", "2420.00", "2398.00", "15", "33.00", "INR", ["held-loser"], "Kept hoping it would come back."],
  ["2026-10-08", "LT", "long", "13:45", "14:50", "3620.00", "3655.00", "10", "36.00", "INR", []],
  ["2026-10-08", "BHARTIARTL", "long", "14:55", "15:20", "1895.00", "1899.00", "25", "32.00", "INR", ["early-exit"], "Took profit at 4 points; target was 15."],
  ["2026-10-09", "TATAMOTORS", "long", "09:20", "09:40", "712.00", "704.50", "200", "48.00", "INR", ["fomo-entry", "chased-price"]],
  ["2026-10-09", "TATAMOTORS", "long", "09:50", "10:20", "703.00", "698.10", "400", "70.00", "INR", ["revenge-trade", "oversized", "broke-plan"], "Broke the daily loss limit."],
  ["2026-10-09", "ITC", "short", "11:00", "11:45", "412.30", "409.80", "300", "39.00", "INR", []],
  ["2026-10-09", "MARUTI", "long", "12:30", "14:40", "12650.00", "12590.00", "3", "40.00", "INR", ["held-loser"]],
  ["2026-10-09", "WIPRO", "long", "14:50", "15:15", "248.60", "247.90", "400", "34.00", "INR", ["overtraded"], "Fifth trade of the day, no setup."],
  ["2026-10-12", "MSFT", "long", "19:05", "20:40", "512.00", "518.40", "15", "2.00", "USD", []],
  ["2026-10-12", "AMD", "short", "20:00", "21:30", "158.40", "160.90", "60", "2.00", "USD", ["no-stop"]],
  ["2026-10-12", "SPY", "long", "21:00", "23:10", "652.10", "655.30", "20", "2.00", "USD", []],
  ["2026-10-12", "META", "long", "23:20", "23:55", "735.00", "731.20", "10", "2.00", "USD", ["overtraded", "broke-plan"], "Traded the last hour despite my rule."],
  ["2026-10-13", "HDFCBANK", "long", "09:35", "11:00", "1702.00", "1716.50", "50", "43.00", "INR", []],
  ["2026-10-13", "KOTAKBANK", "short", "11:30", "12:10", "2105.00", "2098.00", "30", "35.00", "INR", []],
  ["2026-10-13", "SUNPHARMA", "long", "13:15", "14:30", "1810.00", "1806.00", "40", "36.00", "INR", ["moved-stop"]],
  ["2026-10-13", "ASIANPAINT", "long", "14:40", "15:10", "2390.00", "2401.00", "20", "33.00", "INR", []],
  ["2026-10-14", "INFY", "short", "09:28", "09:55", "1520.00", "1528.40", "60", "41.00", "INR", ["fomo-entry"]],
  ["2026-10-14", "TCS", "long", "10:20", "12:00", "3120.00", "3141.00", "20", "37.00", "INR", []],
  ["2026-10-14", "NTPC", "long", "12:15", "13:40", "356.20", "353.10", "500", "46.00", "INR", ["oversized"], "Five times my normal size."],
  ["2026-10-14", "ONGC", "long", "14:10", "15:00", "242.00", "244.10", "400", "38.00", "INR", ["early-exit"]],
  ["2026-10-15", "AAPL", "short", "19:15", "20:05", "233.50", "231.40", "40", "2.00", "USD", []],
  ["2026-10-15", "NVDA", "long", "20:30", "22:45", "178.10", "184.60", "50", "2.00", "USD", []],
  ["2026-10-15", "TSLA", "long", "23:30", "2026-10-16 00:45", "296.00", "289.50", "25", "2.00", "USD", ["held-loser", "no-stop"]],
  ["2026-10-16", "RELIANCE", "long", "09:30", "10:40", "1418.00", "1431.20", "50", "42.00", "INR", []],
  ["2026-10-16", "BAJFINANCE", "short", "10:50", "11:30", "905.00", "911.60", "100", "40.00", "INR", ["chased-price"]],
  ["2026-10-16", "HCLTECH", "long", "12:00", "13:20", "1640.00", "1652.50", "30", "35.00", "INR", []],
  ["2026-10-16", "TITAN", "long", "13:30", "15:10", "3480.00", "3466.00", "10", "34.00", "INR", ["moved-stop", "held-loser"]],
  ["2026-10-16", "SBIN", "long", "15:12", "15:25", "818.00", "816.50", "200", "36.00", "INR", ["revenge-trade", "overtraded"]],
  ["2026-10-19", "ICICIBANK", "long", "09:40", "11:10", "1272.00", "1284.40", "60", "42.00", "INR", []],
  ["2026-10-19", "LT", "short", "11:30", "12:45", "3660.00", "3641.00", "10", "35.00", "INR", []],
  ["2026-10-19", "MSFT", "long", "19:20", "21:00", "520.00", "517.10", "15", "2.00", "USD", ["broke-plan"], "Entered before the 15-minute range formed."],
  ["2026-10-19", "GOOGL", "long", "21:15", "22:40", "248.30", "252.80", "40", "2.00", "USD", []],
];

const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);

/** Deterministic ids so re-seeding produces identical rows. */
export const demoTradeId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function demoTrades() {
  return rows.map(([date, symbol, side, entry, exit, entryPrice, exitPrice, quantity, fees, currency, tags, notes], i) => {
    const exitAt = exit.includes(" ") ? ist(exit.slice(0, 10), exit.slice(11)) : ist(date, exit);
    return {
      id: demoTradeId(i + 1),
      userId: "demo",
      symbol,
      side,
      entryPrice,
      exitPrice,
      quantity,
      fees,
      currency,
      entryAt: ist(date, entry),
      exitAt,
      tags,
      notes: notes ?? null,
      createdAt: exitAt,
      updatedAt: exitAt,
    };
  });
}
