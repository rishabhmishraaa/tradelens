import { formatPercent, formatSignedMoney } from "@/lib/format";
import type { TagRow } from "@/lib/stats";

/** F6.1: what each mistake cost, per currency, worst first. */
export function TagTable({ rows }: { rows: TagRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm" data-testid="tag-table">
        <caption className="sr-only">Net P&amp;L by mistake tag and currency, worst first</caption>
        <thead className="border-b border-black/10 dark:border-white/15">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">Mistake</th>
            <th scope="col" className="py-2 pr-3 font-medium">Currency</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">Trades</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">Net P&amp;L</th>
            <th scope="col" className="py-2 text-right font-medium">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.currency}-${r.tag ?? "none"}`} className="border-b border-black/5 dark:border-white/10">
              <td className="py-2 pr-3">{r.tag ?? "No mistake tagged"}</td>
              <td className="py-2 pr-3">{r.currency}</td>
              <td className="py-2 pr-3 text-right">{r.count}</td>
              <td className="py-2 pr-3 text-right font-medium">{formatSignedMoney(r.net, r.currency)}</td>
              <td className="py-2 text-right">{formatPercent(r.winRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
