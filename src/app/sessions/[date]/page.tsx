import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReviewView } from "@/components/review-view";
import { StatsSummary } from "@/components/stats-summary";
import { TradeTable } from "@/components/trade-table";
import { formatSessionDate } from "@/lib/format";
import { isIsoDate } from "@/lib/range";
import { summarize } from "@/lib/stats";
import { istDateRangeToUtc } from "@/lib/time";
import { generateSessionReview } from "@/server/ai/actions";
import { reviewSchema } from "@/server/ai/review-schema";
import { getSessionReview, listTrades, viewer } from "@/server/trades";
import { ReviewPanel } from "./review-panel";

export const metadata: Metadata = { title: "Session · TradeLens" };

export default function SessionPage({ params }: PageProps<"/sessions/[date]">) {
  return (
    <Suspense fallback={<p>Loading session…</p>}>
      <Session params={params} />
    </Suspense>
  );
}

async function Session({ params }: { params: PageProps<"/sessions/[date]">["params"] }) {
  const { date } = await params;
  if (!isIsoDate(date)) notFound(); // backstop; src/proxy.ts returns the real 404 first (F6.2)
  const { userId, canWrite } = await viewer();
  const [rows, savedRow] = await Promise.all([listTrades(userId, istDateRangeToUtc(date, date)), getSessionReview(userId, date)]);

  // Saved JSON is re-validated before display; anything malformed is treated as "no review".
  const parsed = savedRow ? reviewSchema.safeParse(savedRow.review) : null;
  const saved = savedRow && parsed?.success ? { review: parsed.data, model: savedRow.model } : null;
  const symbols = Object.fromEntries(rows.map((t) => [t.id, t.symbol]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-sm underline-offset-4 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Session: {formatSessionDate(date)}</h1>
      </div>

      {rows.length === 0 ? (
        <p data-testid="empty-session">No trades on this day.</p>
      ) : (
        <>
          <section aria-labelledby="day-stats" className="flex flex-col gap-3">
            <h2 id="day-stats" className="text-xl font-semibold">Day stats</h2>
            <StatsSummary summaries={summarize(rows)} />
          </section>
          <section aria-labelledby="day-trades" className="flex flex-col gap-3">
            <h2 id="day-trades" className="text-xl font-semibold">Trades</h2>
            <TradeTable rows={rows} canWrite={canWrite} caption={`Trades on ${date}, newest exit first`} />
          </section>
        </>
      )}

      <section aria-labelledby="ai-review" className="flex flex-col gap-3">
        <h2 id="ai-review" className="text-xl font-semibold">AI review</h2>
        {canWrite && rows.length > 0 ? (
          <ReviewPanel action={generateSessionReview.bind(null, date)} saved={saved} symbols={symbols} />
        ) : saved ? (
          <ReviewView review={saved.review} model={saved.model} symbols={symbols} />
        ) : (
          <p>No AI review for this day yet.</p>
        )}
      </section>
    </div>
  );
}
