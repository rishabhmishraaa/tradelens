import { curveFacts, curveGeometry } from "@/lib/equity";
import { formatMoney, formatSignedMoney } from "@/lib/format";

const W = 600;
const H = 160;

/** F6.1 / F6.4: cumulative net P&L for ONE currency, drawn as inline SVG with a text alternative. */
export function EquityCurve({ currency, cumulative }: { currency: string; cumulative: number[] }) {
  const { points, zeroY } = curveGeometry(cumulative, W, H);
  const facts = curveFacts(cumulative);
  const description =
    `Equity curve, ${currency}, ${cumulative.length} trades: starts at ${formatMoney(facts.start, currency)}, ` +
    `ends at ${formatSignedMoney(facts.end, currency)}, peak ${formatSignedMoney(facts.peak, currency)}, ` +
    `max drawdown ${formatMoney(facts.maxDrawdown, currency)}.`;
  const id = `equity-${currency}`;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-desc`} className="h-40 w-full" preserveAspectRatio="none">
        <line x1="0" x2={W} y1={zeroY} y2={zeroY} className="stroke-black/25 dark:stroke-white/30" strokeDasharray="4 4" />
        <polyline points={points} fill="none" className="stroke-foreground" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption id={`${id}-desc`} className="text-sm" data-testid={`equity-caption-${currency}`}>
        {description}
      </figcaption>
    </figure>
  );
}
