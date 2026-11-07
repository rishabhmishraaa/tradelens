"use server";

import { redirect } from "next/navigation";
import { verifyPassword } from "./password";
import { endSession, sessionSecret, startSession } from "./session";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const hash = process.env.OWNER_PASSWORD_HASH;
  const secret = sessionSecret();
  if (!hash || !secret) return { error: "Login is not configured on this server." };

  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0 || password.length > 200) {
    return { error: "Incorrect password" };
  }
  if (!(await verifyPassword(password, hash))) return { error: "Incorrect password" };

  await startSession(secret);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/");
}
