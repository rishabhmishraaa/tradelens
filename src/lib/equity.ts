// F6.1 / F6.4: geometry and text summary for the hand-drawn equity curve (no chart library, D16).

/** Start (0, before the first trade), end, peak (≥ 0) and max drawdown of a cumulative series. */
export function curveFacts(cumulative: number[]) {
  let peak = 0;
  let maxDrawdown = 0;
  for (const value of cumulative) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, peak - value);
  }
  return { start: 0, end: cumulative.at(-1) ?? 0, peak, maxDrawdown };
}

/**
 * SVG polyline points for the series, starting from 0, scaled into width × height with padding.
 * Also returns the y of the zero line. Higher P&L is drawn higher (SVG y grows downwards).
 */
export function curveGeometry(cumulative: number[], width: number, height: number, pad = 8) {
  const values = [0, ...cumulative];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (width - 2 * pad)) / Math.max(values.length - 1, 1);
  const y = (v: number) => pad + ((max - v) * (height - 2 * pad)) / span;
  return {
    points: values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "),
    zeroY: Number(y(0).toFixed(1)),
  };
}
