"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { trades } from "@/db/schema";
import {
  fieldErrors,
  formDataToValues,
  tradeInputSchema,
  type FieldErrors,
  type TradeFormValues,
} from "@/lib/trade-schema";
import { requireOwner } from "./auth/session";
import { db } from "./db";

export type TradeFormState = {
  values: TradeFormValues | null;
  errors: FieldErrors;
  formError: string | null;
};

const NOT_AUTHORIZED = "You must be logged in as the owner to change trades.";

async function ownerOnly(): Promise<boolean> {
  try {
    await requireOwner(); // D11 / F4.8: checked on the server for every write
    return true;
  } catch {
    return false;
  }
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function parse(formData: FormData) {
  const values = formDataToValues(formData);
  const result = tradeInputSchema.safeParse(values);
  return { values, result };
}

export async function createTrade(_prev: TradeFormState, formData: FormData): Promise<TradeFormState> {
  const { values, result } = parse(formData);
  if (!(await ownerOnly())) return { values, errors: {}, formError: NOT_AUTHORIZED };
  if (!result.success) return { values, errors: fieldErrors(result.error), formError: null };

  await db().insert(trades).values({ ...result.data, userId: "owner" });
  redirect("/trades");
}

export async function updateTrade(id: string, _prev: TradeFormState, formData: FormData): Promise<TradeFormState> {
  const { values, result } = parse(formData);
  if (!(await ownerOnly())) return { values, errors: {}, formError: NOT_AUTHORIZED };
  if (!result.success) return { values, errors: fieldErrors(result.error), formError: null };
  if (!isUuid(id)) return { values, errors: {}, formError: "Trade not found." };

  const updated = await db()
    .update(trades)
    .set(result.data)
    .where(and(eq(trades.id, id), eq(trades.userId, "owner")))
    .returning({ id: trades.id });
  if (updated.length === 0) return { values, errors: {}, formError: "Trade not found." };
  redirect("/trades");
}

export type DeleteState = { formError: string | null };

// Bound with the id; useActionState's (prevState, formData) arguments aren't needed here.
export async function deleteTrade(id: string): Promise<DeleteState> {
  if (!(await ownerOnly())) return { formError: NOT_AUTHORIZED };
  if (!isUuid(id)) return { formError: "Trade not found." };
  await db()
    .delete(trades)
    .where(and(eq(trades.id, id), eq(trades.userId, "owner")));
  redirect("/trades");
}
