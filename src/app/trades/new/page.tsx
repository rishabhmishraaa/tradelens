import type { Metadata } from "next";
import { Suspense } from "react";
import { createTrade } from "@/server/trade-actions";
import { viewer } from "@/server/trades";
import { OwnerOnlyNotice } from "../owner-only-notice";
import { TradeForm } from "../trade-form";

export const metadata: Metadata = { title: "New trade · TradeLens" };

const empty = {
  symbol: "",
  side: "long",
  entryPrice: "",
  exitPrice: "",
  quantity: "",
  fees: "0",
  currency: "INR",
  entryAt: "",
  exitAt: "",
  tags: [],
  notes: "",
};

export default function NewTradePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New trade</h1>
      <Suspense fallback={<p className="opacity-60">Loading…</p>}>
        <OwnerForm />
      </Suspense>
    </div>
  );
}

async function OwnerForm() {
  const { canWrite } = await viewer();
  if (!canWrite) return <OwnerOnlyNotice />;
  return <TradeForm action={createTrade} initialValues={empty} submitLabel="Save trade" />;
}
