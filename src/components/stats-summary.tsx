import { formatMoney, formatPercent, formatSignedMoney } from "@/lib/format";
import type { CurrencySummary } from "@/lib/stats";

/** F6.1 / F6.2: one block of numbers per currency (currencies are never added together, D6). */
export function StatsSummary({ summaries }: { summaries: CurrencySummary[] }) {
  if (summaries.length === 0) return <p>No trades in this range.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {summaries.map((s) => {
        const money = (n: number | null) => (n === null ? "n/a" : formatSignedMoney(n, s.currency));
        const stats: [string, string][] = [
          ["Net P&L", formatSignedMoney(s.net, s.currency)],
          ["Win rate", formatPercent(s.winRate)],
          ["Trades", `${s.trades} (${s.wins} W / ${s.losses} L / ${s.breakevens} BE)`],
          ["Max drawdown", formatMoney(s.maxDrawdown, s.currency)],
          ["Gross P&L", formatSignedMoney(s.gross, s.currency)],
          ["Fees", formatMoney(s.fees, s.currency)],
          ["Average win", money(s.averageWin)],
          ["Average loss", money(s.averageLoss)],
          ["Largest win", money(s.largestWin)],
          ["Largest loss", money(s.largestLoss)],
        ];
        return (
          <section key={s.currency} aria-labelledby={`summary-${s.currency}`} data-testid={`summary-${s.currency}`} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h3 id={`summary-${s.currency}`} className="mb-3 font-semibold">{s.currency}</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {stats.map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <dt className="text-neutral-700 dark:text-neutral-300">{label}</dt>
                  <dd className="font-medium" data-stat={label}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
