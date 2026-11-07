"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { DeleteState } from "@/server/trade-actions";

type Props = { action: (prev: DeleteState, formData: FormData) => Promise<DeleteState> };

export function DeleteForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, { formError: null });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.formError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.formError}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="rounded bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-60">
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <Link href="/trades" className="text-sm underline-offset-4 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
