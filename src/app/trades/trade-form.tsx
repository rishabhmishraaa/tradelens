"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MISTAKE_TAGS } from "@/lib/mistake-tags";
import type { TradeFormValues } from "@/lib/trade-schema";
import type { TradeFormState } from "@/server/trade-actions";

type Props = {
  action: (prev: TradeFormState, formData: FormData) => Promise<TradeFormState>;
  initialValues: TradeFormValues;
  submitLabel: string;
};

const inputClass =
  "rounded border border-black/20 px-3 py-2 text-base font-normal aria-[invalid=true]:border-red-600 dark:border-white/25 dark:bg-transparent";

export function TradeForm({ action, initialValues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { values: null, errors: {}, formError: null });
  const v = state.values ?? initialValues;
  const e = state.errors;

  // Each field: label, input, and a message linked with aria-describedby.
  const field = (name: keyof TradeFormValues, label: string, input: React.ReactNode) => (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <label htmlFor={name}>{label}</label>
      {input}
      {e[name] && (
        <p id={`${name}-error`} className="font-normal text-red-700 dark:text-red-400">
          {e[name]}
        </p>
      )}
    </div>
  );
  const aria = (name: keyof TradeFormValues) => ({
    id: name,
    name,
    "aria-invalid": e[name] ? true : undefined,
    "aria-describedby": e[name] ? `${name}-error` : undefined,
    className: inputClass,
  });

  return (
    // key forces inputs to re-mount with the submitted values after a failed submit
    <form action={formAction} key={JSON.stringify(v)} className="grid gap-4 sm:grid-cols-2">
      {field("symbol", "Symbol", <input {...aria("symbol")} defaultValue={v.symbol} required maxLength={20} />)}
      {field(
        "side",
        "Side",
        <select {...aria("side")} defaultValue={v.side || "long"}>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>,
      )}
      {field("entryPrice", "Entry price", <input {...aria("entryPrice")} defaultValue={v.entryPrice} inputMode="decimal" required />)}
      {field("exitPrice", "Exit price", <input {...aria("exitPrice")} defaultValue={v.exitPrice} inputMode="decimal" required />)}
      {field("quantity", "Quantity", <input {...aria("quantity")} defaultValue={v.quantity} inputMode="decimal" required />)}
      {field("fees", "Fees", <input {...aria("fees")} defaultValue={v.fees} inputMode="decimal" />)}
      {field("currency", "Currency", <input {...aria("currency")} defaultValue={v.currency} maxLength={3} required />)}
      <div />
      {field("entryAt", "Entry time (IST)", <input {...aria("entryAt")} type="datetime-local" defaultValue={v.entryAt} required />)}
      {field("exitAt", "Exit time (IST)", <input {...aria("exitAt")} type="datetime-local" defaultValue={v.exitAt} required />)}

      <fieldset className="sm:col-span-2" aria-describedby={e.tags ? "tags-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Mistakes</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {MISTAKE_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="tags" value={tag} defaultChecked={v.tags.includes(tag)} className="size-4" />
              {tag}
            </label>
          ))}
        </div>
        {e.tags && (
          <p id="tags-error" className="mt-1 text-sm text-red-700 dark:text-red-400">
            {e.tags}
          </p>
        )}
      </fieldset>

      <div className="sm:col-span-2">
        {field("notes", "Notes", <textarea {...aria("notes")} defaultValue={v.notes} rows={3} maxLength={1000} />)}
      </div>

      {state.formError && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2 dark:text-red-400">
          {state.formError}
        </p>
      )}
      <div className="flex items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/trades" className="text-sm underline-offset-4 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
