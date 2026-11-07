import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DateRangeForm } from "@/components/date-range-form";
import { TradeTable } from "@/components/trade-table";
import { istDateRangeToUtc } from "@/lib/time";
import { listTrades, viewer } from "@/server/trades";

export const metadata: Metadata = { title: "Trades · TradeLens" };

export default function TradesPage({ searchParams }: PageProps<"/trades">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Trades</h1>
      {/* searchParams and the session are request-time data (Cache Components), so stream them in. */}
      <Suspense fallback={<p>Loading trades…</p>}>
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
        <DateRangeForm from={from} to={to} fromLabel="From (session date)" clearHref={from || to ? "/trades" : undefined} />
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
        <TradeTable rows={rows} canWrite={canWrite} caption="Trades, newest exit first" />
      )}
    </>
  );
}
