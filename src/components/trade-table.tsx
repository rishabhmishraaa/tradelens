import Link from "next/link";
import { formatDecimal, formatSignedMoney, OUTCOME_CLASS, OUTCOME_LABEL } from "@/lib/format";
import { netPnl, outcome } from "@/lib/stats";
import { formatIst } from "@/lib/time";
import type { Trade } from "@/server/trades";

/** F4.5: trades with signed net P&L and a text result label (colour is never the only signal). */
export function TradeTable({ rows, canWrite, caption }: { rows: Trade[]; canWrite: boolean; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-black/10 dark:border-white/15">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">Exit (IST)</th>
            <th scope="col" className="py-2 pr-3 font-medium">Symbol</th>
            <th scope="col" className="py-2 pr-3 font-medium">Side</th>
            <th scope="col" className="py-2 pr-3 font-medium">Qty</th>
            <th scope="col" className="py-2 pr-3 font-medium">Entry → Exit</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">Net P&amp;L</th>
            <th scope="col" className="py-2 pr-3 font-medium">Result</th>
            <th scope="col" className="py-2 pr-3 font-medium">Mistakes</th>
            {canWrite && (
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const net = netPnl(t);
            const result = outcome(net);
            return (
              <tr key={t.id} data-testid="trade-row" data-trade-id={t.id} className="border-b border-black/5 dark:border-white/10">
                <td className="py-2 pr-3 whitespace-nowrap">{formatIst(t.exitAt)}</td>
                <td className="py-2 pr-3 font-medium">{t.symbol}</td>
                <td className="py-2 pr-3 capitalize">{t.side}</td>
                <td className="py-2 pr-3">{formatDecimal(t.quantity)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatDecimal(t.entryPrice)} → {formatDecimal(t.exitPrice)} {t.currency}
                </td>
                <td className={`py-2 pr-3 text-right font-medium whitespace-nowrap ${OUTCOME_CLASS[result]}`} data-testid="net-pnl">
                  {formatSignedMoney(net, t.currency)}
                </td>
                <td className="py-2 pr-3" data-testid="outcome">{OUTCOME_LABEL[result]}</td>
                <td className="py-2 pr-3">{t.tags.join(", ")}</td>
                {canWrite && (
                  <td className="py-2 whitespace-nowrap">
                    <Link href={`/trades/${t.id}/edit`} className="underline-offset-4 hover:underline">
                      Edit<span className="sr-only"> {t.symbol} trade</span>
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
