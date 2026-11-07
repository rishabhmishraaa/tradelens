import Link from "next/link";

const inputClass = "rounded border border-black/20 px-2 py-1.5 font-normal dark:border-white/25 dark:bg-transparent";

/** F4.6 / F6.1: a plain GET form, so the range lives in the URL and works without JavaScript. */
export function DateRangeForm({ from, to, clearHref, fromLabel }: { from: string; to: string; clearHref?: string; fromLabel: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
      <label className="flex flex-col gap-1 font-medium">
        {fromLabel}
        <input type="date" name="from" defaultValue={from} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        To
        <input type="date" name="to" defaultValue={to} required className={inputClass} />
      </label>
      <button type="submit" className="rounded border border-black/20 px-3 py-1.5 dark:border-white/25">
        {clearHref ? "Filter" : "Show"}
      </button>
      {clearHref && (
        <Link href={clearHref} className="py-1.5 underline-offset-4 hover:underline">
          Clear
        </Link>
      )}
    </form>
  );
}
