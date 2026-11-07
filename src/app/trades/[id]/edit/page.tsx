import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { utcToIstInput } from "@/lib/time";
import { formatDecimal } from "@/lib/format";
import { updateTrade } from "@/server/trade-actions";
import { getTrade, viewer } from "@/server/trades";
import { OwnerOnlyNotice } from "../../owner-only-notice";
import { TradeForm } from "../../trade-form";

export const metadata: Metadata = { title: "Edit trade · TradeLens" };

export default function EditTradePage({ params }: PageProps<"/trades/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit trade</h1>
      {/* params are runtime data without generateStaticParams, so read them inside Suspense. */}
      <Suspense fallback={<p className="opacity-60">Loading…</p>}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: { params: PageProps<"/trades/[id]/edit">["params"] }) {
  const { id } = await params;
  const { canWrite, userId } = await viewer();
  if (!canWrite) return <OwnerOnlyNotice />;
  const trade = await getTrade(userId, id);
  if (!trade) notFound();

  const values = {
    symbol: trade.symbol,
    side: trade.side,
    entryPrice: formatDecimal(trade.entryPrice),
    exitPrice: formatDecimal(trade.exitPrice),
    quantity: formatDecimal(trade.quantity),
    fees: formatDecimal(trade.fees),
    currency: trade.currency,
    entryAt: utcToIstInput(trade.entryAt), // F4.4: show the IST time that was entered
    exitAt: utcToIstInput(trade.exitAt),
    tags: trade.tags,
    notes: trade.notes ?? "",
  };

  return (
    <>
      <TradeForm action={updateTrade.bind(null, trade.id)} initialValues={values} submitLabel="Save changes" />
      <Link href={`/trades/${trade.id}/delete`} className="self-start text-sm text-red-700 underline-offset-4 hover:underline dark:text-red-400">
        Delete this trade
      </Link>
    </>
  );
}
