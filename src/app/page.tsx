import Link from "next/link";
import { Suspense } from "react";
import { DateRangeForm } from "@/components/date-range-form";
import { EquityCurve } from "@/components/equity-curve";
import { StatsSummary } from "@/components/stats-summary";
import { TagTable } from "@/components/tag-table";
import { formatSessionDate, formatSignedMoney } from "@/lib/format";
import { defaultRange, isIsoDate } from "@/lib/range";
import { byTag, equityCurve, groupByCurrency, netPnl, summarize } from "@/lib/stats";
import { istDateRangeToUtc, sessionDate } from "@/lib/time";
import { latestExit, listTrades, viewer, type Trade } from "@/server/trades";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="max-w-prose text-neutral-700 dark:text-neutral-300">
          Win rate, drawdown and what each mistake cost, per currency. Click a day for its trades and AI review.
        </p>
      </div>
      {/* The session and searchParams are request-time data (Cache Components): stream them in. */}
      <Suspense fallback={<p>Loading dashboard…</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const { userId } = await viewer(); // marks the render as request-time before Date.now() below
  const latest = await latestExit(userId);
  const fallback = defaultRange(latest ? sessionDate(latest) : null, sessionDate(new Date()));
  const requested = { from: one(params.from), to: one(params.to) };
  const valid = isIsoDate(requested.from) && isIsoDate(requested.to) && requested.from <= requested.to;
  const { from, to } = valid ? requested : fallback;
  const rows = await listTrades(userId, istDateRangeToUtc(from, to));

  return (
    <>
      <div className="flex flex-col gap-2">
        <DateRangeForm from={from} to={to} fromLabel="From (session date)" />
        <p className="text-sm" data-testid="range-label">
          Showing sessions {formatSessionDate(from)} to {formatSessionDate(to)}
          {!valid && (requested.from || requested.to) ? " (the requested range wasn't valid)" : ""}.
        </p>
      </div>

      <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
        <h2 id="summary-heading" className="text-xl font-semibold">Summary</h2>
        <StatsSummary summaries={summarize(rows)} />
      </section>

      {rows.length > 0 && (
        <>
          <section aria-labelledby="equity-heading" className="flex flex-col gap-3">
            <h2 id="equity-heading" className="text-xl font-semibold">Equity curve</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {[...groupByCurrency(rows)].map(([currency, group]) => (
                <EquityCurve key={currency} currency={currency} cumulative={equityCurve(group).map((p) => p.cumulative)} />
              ))}
            </div>
          </section>

          <section aria-labelledby="mistakes-heading" className="flex flex-col gap-3">
            <h2 id="mistakes-heading" className="text-xl font-semibold">Mistakes</h2>
            <TagTable rows={byTag(rows)} />
          </section>

          <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
            <h2 id="sessions-heading" className="text-xl font-semibold">Sessions</h2>
            <SessionList rows={rows} />
          </section>
        </>
      )}
    </>
  );
}

/** One line per trading day (D4), newest first, with net per currency. */
function SessionList({ rows }: { rows: Trade[] }) {
  const days = new Map<string, Trade[]>();
  for (const t of rows) {
    const day = sessionDate(t.exitAt);
    days.set(day, [...(days.get(day) ?? []), t]);
  }
  return (
    <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10" data-testid="session-list">
      {[...days.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([day, trades]) => (
          <li key={day} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <Link href={`/sessions/${day}`} className="font-medium underline-offset-4 hover:underline">
              {formatSessionDate(day)}
            </Link>
            <span className="text-sm">
              {trades.length} {trades.length === 1 ? "trade" : "trades"} ·{" "}
              {[...groupByCurrency(trades)]
                .map(([currency, g]) => formatSignedMoney(g.reduce((s, t) => s + netPnl(t), 0), currency))
                .join(" · ")}
            </span>
          </li>
        ))}
    </ul>
  );
}
