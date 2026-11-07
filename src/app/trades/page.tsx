import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatDecimal, formatSignedMoney, OUTCOME_CLASS, OUTCOME_LABEL } from "@/lib/format";
import { netPnl, outcome } from "@/lib/stats";
import { formatIst, istDateRangeToUtc } from "@/lib/time";
import { listTrades, viewer } from "@/server/trades";

export const metadata: Metadata = { title: "Trades · TradeLens" };

export default function TradesPage({ searchParams }: PageProps<"/trades">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Trades</h1>
      {/* searchParams and the session are request-time data (Cache Components), so stream them in. */}
      <Suspense fallback={<p className="opacity-60">Loading trades…</p>}>
        <TradesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

async function TradesList({ searchParams }: { searchParams: PageProps<"/trades">["searchParams"] }) {
  const params = await searchParams;
  const from = one(params.from);
  const to = one(params.to);
  const range = from && to ? istDateRangeToUtc(from, to) : null;
  const { userId, canWrite } = await viewer();
  const rows = await listTrades(userId, range);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* F4.6: a plain GET form keeps the filter in the URL, so it can be bookmarked and shared. */}
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1 font-medium">
            From (session date)
            <input type="date" name="from" defaultValue={from} required className="rounded border border-black/20 px-2 py-1.5 font-normal dark:border-white/25 dark:bg-transparent" />
          </label>
          <label className="flex flex-col gap-1 font-medium">
            To
            <input type="date" name="to" defaultValue={to} required className="rounded border border-black/20 px-2 py-1.5 font-normal dark:border-white/25 dark:bg-transparent" />
          </label>
          <button type="submit" className="rounded border border-black/20 px-3 py-1.5 dark:border-white/25">
            Filter
          </button>
          {(from || to) && (
            <Link href="/trades" className="py-1.5 underline-offset-4 hover:underline">
              Clear
            </Link>
          )}
        </form>
        {canWrite && (
          <Link href="/trades/new" className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background">
            New trade
          </Link>
        )}
      </div>

      {(from || to) && !range && <p role="status">That date range isn&apos;t valid, so all trades are shown.</p>}

      {rows.length === 0 ? (
        <p>No trades {range ? "in this date range" : "yet"}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Trades, newest exit first</caption>
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
                {canWrite && <th scope="col" className="py-2 font-medium"><span className="sr-only">Actions</span></th>}
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
      )}
    </>
  );
}
