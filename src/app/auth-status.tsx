import Link from "next/link";
import { logout } from "@/server/auth/actions";
import { isOwner } from "@/server/auth/session";

export async function AuthStatus() {
  if (!(await isOwner())) {
    return (
      <Link href="/login" className="rounded px-3 py-2 text-sm underline-offset-4 hover:underline">
        Log in
      </Link>
    );
  }
  return (
    <form action={logout}>
      <button type="submit" className="rounded px-3 py-2 text-sm underline-offset-4 hover:underline">
        Log out
      </button>
    </form>
  );
}
