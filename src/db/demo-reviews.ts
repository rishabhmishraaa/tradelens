// F8.3: pre-generated reviews for every demo session, so visitors see reviews with no API calls.
// Written for the fixed seed trades and checked by demo-reviews.test.ts with the SAME schema and
// grounding checks the live AI output must pass. Shown with a "sample review" label (not live AI).
import type { Review } from "../server/ai/review-schema.ts";
import { demoTradeId as t } from "./seed-data.ts";

export const DEMO_REVIEW_MODEL = "sample (pre-generated)";

export const demoReviews: Record<string, Review> = {
  "2026-10-05": {
    summary:
      "A decent day: two clean longs (RELIANCE, INFY) carried it, while the HDFCBANK short and the TCS long without a stop gave some back. Net positive in INR, but both losers came from skipping your own rules.",
    wentWell: ["The RELIANCE opening-range breakout followed the plan from entry to exit.", "INFY was patient: held for over an hour, with no mistake tags."],
    mistakes: [
      { tag: "fomo-entry", tradeIds: [t(2)], insight: "Shorting HDFCBANK into strength without confirmation turned a calm morning into a loss." },
      { tag: "no-stop", tradeIds: [t(4)], insight: "TCS had no stop. The loss was small this time only by luck; the notes say so too." },
    ],
    patterns: ["Planned trades won; unplanned ones lost."],
    nextSessionFocus: "Place the stop with the entry order on every trade, no exceptions.",
  },
  "2026-10-06": {
    summary:
      "A costly day driven by one sequence: a chased SBIN entry lost, and the next trade doubled size on the same stock to win it back. The ICICIBANK short was the only clean trade, and AXISBANK was a scratch.",
    wentWell: ["The ICICIBANK short was the day's only winner and had no mistake tags.", "AXISBANK was closed at breakeven instead of being hoped on."],
    mistakes: [
      { tag: "chased-price", tradeIds: [t(5)], insight: "Buying the third green candle on SBIN left no room; the entry was late by design." },
      { tag: "revenge-trade", tradeIds: [t(6)], insight: "Re-entering SBIN minutes after a loss, to win it back, is the textbook revenge trade." },
      { tag: "oversized", tradeIds: [t(6)], insight: "Doubling size on the revenge trade made it the day's largest loss." },
    ],
    patterns: ["After a loss, the next trade came fast and bigger."],
    nextSessionFocus: "After any loss, take a 15-minute break before the next order.",
  },
  "2026-10-07": {
    summary:
      "A short US evening: AAPL worked as planned, NVDA did not, and the stop was moved down twice before the exit. The USD session closed slightly negative because of that one trade.",
    wentWell: ["The AAPL long had no mistake tags and closed in profit."],
    mistakes: [
      { tag: "moved-stop", tradeIds: [t(10)], insight: "Moving the NVDA stop down twice turned a planned small loss into a bigger one." },
    ],
    patterns: [],
    nextSessionFocus: "Once a stop is placed, only move it in the direction of the trade.",
  },
  "2026-10-08": {
    summary:
      "A strong session in INR with three winners (RELIANCE short, LT, BHARTIARTL), plus the TSLA short from the night before closing in profit. HINDUNILVR was held as a loser for three hours.",
    wentWell: ["The RELIANCE short and LT long were both clean, planned trades.", "The TSLA short, entered the evening before, was held past midnight IST and closed in profit."],
    mistakes: [
      { tag: "held-loser", tradeIds: [t(13)], insight: "HINDUNILVR was held for three hours hoping for a recovery; the notes admit it." },
      { tag: "early-exit", tradeIds: [t(15)], insight: "BHARTIARTL was closed at 4 points against a 15-point target, leaving most of the move." },
    ],
    patterns: ["Winners were cut early while a loser was given hours."],
    nextSessionFocus: "Let winners reach the planned target and cut losers at the planned stop.",
  },
  "2026-10-09": {
    summary:
      "The worst day in the journal. A FOMO, chased TATAMOTORS entry lost, the revenge trade on the same stock at double size broke the daily loss limit, and two more unplanned trades followed. Only the ITC short worked.",
    wentWell: ["The ITC short was the one planned trade, and it won."],
    mistakes: [
      { tag: "fomo-entry", tradeIds: [t(16)], insight: "The first TATAMOTORS trade was entered out of fear of missing the move." },
      { tag: "chased-price", tradeIds: [t(16)], insight: "It was also chased after the move had started, so the risk was poor from the start." },
      { tag: "revenge-trade", tradeIds: [t(17)], insight: "Re-entering TATAMOTORS right after the loss was revenge, and the day's biggest loss." },
      { tag: "oversized", tradeIds: [t(17)], insight: "The revenge trade used double the size of the first one." },
      { tag: "broke-plan", tradeIds: [t(17)], insight: "This trade broke the daily loss limit; trading should have stopped before it." },
      { tag: "held-loser", tradeIds: [t(19)], insight: "MARUTI was held for over two hours while it moved against you." },
      { tag: "overtraded", tradeIds: [t(20)], insight: "WIPRO was the fifth trade of the day with no setup." },
    ],
    patterns: ["One emotional loss set off a chain: revenge, oversizing, then overtrading.", "Every losing trade carried at least one mistake tag."],
    nextSessionFocus: "Stop trading for the day the moment the daily loss limit is hit.",
  },
  "2026-10-12": {
    summary:
      "A mixed US session. MSFT and SPY were planned and worked; the AMD short had no stop and lost, and META was traded in the last hour against your own rule. The session ended slightly negative overall.",
    wentWell: ["MSFT and SPY were both clean, planned longs."],
    mistakes: [
      { tag: "no-stop", tradeIds: [t(22)], insight: "The AMD short ran against you with no stop to limit it; this was the session's biggest loss." },
      { tag: "overtraded", tradeIds: [t(24)], insight: "META was an extra, unplanned trade late in the session." },
      { tag: "broke-plan", tradeIds: [t(24)], insight: "It was also taken in the last hour, which your rule forbids." },
    ],
    patterns: ["Late-session trades are where the rules get broken."],
    nextSessionFocus: "Stop opening new trades in the last hour, as your rule says.",
  },
  "2026-10-13": {
    summary:
      "A good, calm INR session: three of four trades won (HDFCBANK, KOTAKBANK short, ASIANPAINT). The only loss was SUNPHARMA, where the stop was moved instead of honoured.",
    wentWell: ["HDFCBANK was held patiently for 85 minutes and was the day's best trade.", "No trade was tagged as oversized."],
    mistakes: [
      { tag: "moved-stop", tradeIds: [t(27)], insight: "Moving the SUNPHARMA stop turned a small, planned loss into a larger one." },
    ],
    patterns: ["The only loss came from the only rule that was broken."],
    nextSessionFocus: "Write the stop in the journal before entry, and treat it as fixed.",
  },
  "2026-10-14": {
    summary:
      "Two good trades (TCS, ONGC) and two expensive mistakes. The INFY short was a FOMO entry, and NTPC at five times normal size produced a large loss. Together those two losses turned the day negative.",
    wentWell: ["TCS was held for 100 minutes with no mistake tags, and won."],
    mistakes: [
      { tag: "fomo-entry", tradeIds: [t(29)], insight: "The INFY short was entered at the open without waiting for confirmation." },
      { tag: "oversized", tradeIds: [t(31)], insight: "NTPC at five times normal size turned an ordinary loss into the day's biggest." },
      { tag: "early-exit", tradeIds: [t(32)], insight: "ONGC was closed early; it still won, but left part of the move." },
    ],
    patterns: ["Oversizing turns normal losses into big ones."],
    nextSessionFocus: "Use a fixed position size; never more than your normal size per trade.",
  },
  "2026-10-15": {
    summary: "A clean US evening: the AAPL short and the NVDA long both followed the plan and both won. No mistakes were tagged.",
    wentWell: ["Both trades won with no mistake tags.", "Only two trades were taken all evening."],
    mistakes: [],
    patterns: ["Two trades, both untagged, made a clean session."],
    nextSessionFocus: "Repeat this: two planned trades, normal size, stops respected.",
  },
  "2026-10-16": {
    summary:
      "A busy, mixed day. RELIANCE and HCLTECH won, but TSLA was held overnight with no stop, BAJFINANCE was chased, TITAN's stop was moved, and the final SBIN trade was revenge and overtrading.",
    wentWell: ["RELIANCE and HCLTECH were both clean, planned longs."],
    mistakes: [
      { tag: "held-loser", tradeIds: [t(35), t(39)], insight: "TSLA and TITAN were both held while losing instead of being cut." },
      { tag: "no-stop", tradeIds: [t(35)], insight: "TSLA was held past midnight IST with no stop in place." },
      { tag: "chased-price", tradeIds: [t(37)], insight: "The BAJFINANCE short was entered after the move had already happened." },
      { tag: "moved-stop", tradeIds: [t(39)], insight: "TITAN's stop was moved, making the loss larger." },
      { tag: "revenge-trade", tradeIds: [t(40)], insight: "SBIN at 15:12 was a last-minute attempt to win back the day's losses." },
      { tag: "overtraded", tradeIds: [t(40)], insight: "It was also an extra trade in the final minutes with no setup." },
    ],
    patterns: ["Moved stops and held losers appear together (TITAN had both).", "The day's last trade was its least planned one."],
    nextSessionFocus: "No new trades after 15:00 IST.",
  },
  "2026-10-19": {
    summary:
      "A solid session. ICICIBANK, the LT short and GOOGL all won. The one loss was MSFT, entered before the 15-minute opening range had formed, against your own rule.",
    wentWell: ["ICICIBANK and GOOGL were patient, planned trades.", "The LT short was well timed."],
    mistakes: [
      { tag: "broke-plan", tradeIds: [t(43)], insight: "Entering MSFT before the 15-minute range formed broke your entry rule." },
    ],
    patterns: [],
    nextSessionFocus: "Wait for the 15-minute opening range before any US entry.",
  },
};
