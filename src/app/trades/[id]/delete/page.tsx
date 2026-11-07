import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatDecimal } from "@/lib/format";
import { formatIst } from "@/lib/time";
import { deleteTrade } from "@/server/trade-actions";
import { getTrade, viewer } from "@/server/trades";
import { OwnerOnlyNotice } from "../../owner-only-notice";
import { DeleteForm } from "./delete-form";

export const metadata: Metadata = { title: "Delete trade · TradeLens" };

// F4.7: deleting needs an explicit confirmation step (no window.confirm()).
export default function DeleteTradePage({ params }: PageProps<"/trades/[id]/delete">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Delete trade?</h1>
      <Suspense fallback={<p className="opacity-60">Loading…</p>}>
        <Confirm params={params} />
      </Suspense>
    </div>
  );
}

async function Confirm({ params }: { params: PageProps<"/trades/[id]/delete">["params"] }) {
  const { id } = await params;
  const { canWrite, userId } = await viewer();
  if (!canWrite) return <OwnerOnlyNotice />;
  const trade = await getTrade(userId, id);
  if (!trade) notFound();

  return (
    <>
      <p>
        {trade.side === "long" ? "Long" : "Short"} {formatDecimal(trade.quantity)} {trade.symbol}, exited{" "}
        {formatIst(trade.exitAt)} IST. This can&apos;t be undone.
      </p>
      <DeleteForm action={deleteTrade.bind(null, trade.id)} />
    </>
  );
}
