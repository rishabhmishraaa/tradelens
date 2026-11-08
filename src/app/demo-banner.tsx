import Link from "next/link";
import { isOwner } from "@/server/auth/session";

/** F8.1: shown on every page to visitors without an owner session. */
export async function DemoBanner() {
  if (await isOwner()) return null;
  return (
    <div role="note" data-testid="demo-banner" className="border-b border-amber-300 bg-amber-50 px-6 py-2 text-sm text-amber-950">
      Demo account: read-only. Data is sample data.{" "}
      <Link href="/login" className="underline underline-offset-4">
        Owner login
      </Link>
    </div>
  );
}
