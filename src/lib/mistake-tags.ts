/** D8: the fixed list of mistake tags. The only place this list is defined. */
export const MISTAKE_TAGS = [
  "fomo-entry",
  "chased-price",
  "no-stop",
  "moved-stop",
  "oversized",
  "early-exit",
  "held-loser",
  "revenge-trade",
  "broke-plan",
  "overtraded",
] as const;

export type MistakeTag = (typeof MISTAKE_TAGS)[number];
