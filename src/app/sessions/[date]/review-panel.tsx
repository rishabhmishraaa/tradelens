"use client";

import { useActionState } from "react";
import { ReviewView } from "@/components/review-view";
import type { ReviewState } from "@/server/ai/actions";
import type { Review } from "@/server/ai/review-schema";

type Props = {
  action: (prev: ReviewState) => Promise<ReviewState>;
  saved: { review: Review; model: string } | null;
  symbols: Record<string, string>;
};

/** F7: owner-only panel. Shows the saved review and a button to (re)generate it. */
export function ReviewPanel({ action, saved, symbols }: Props) {
  // Start from the saved review, so a failed attempt keeps showing it (F7.4).
  const [state, formAction, pending] = useActionState(action, {
    review: saved?.review ?? null,
    model: saved?.model ?? null,
    error: null,
  });
  const shown = state.review && state.model ? { review: state.review, model: state.model } : null;

  return (
    <div className="flex flex-col gap-3">
      {shown ? <ReviewView review={shown.review} model={shown.model} symbols={symbols} /> : <p>No AI review for this day yet.</p>}
      {state.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      <form action={formAction}>
        <button type="submit" disabled={pending} className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60">
          {pending ? "Reviewing…" : shown ? "Regenerate review" : "Generate AI review"}
        </button>
      </form>
    </div>
  );
}
