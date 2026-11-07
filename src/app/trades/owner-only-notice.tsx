import Link from "next/link";

export function OwnerOnlyNotice() {
  return (
    <p>
      Only the owner can change trades.{" "}
      <Link href="/login" className="underline underline-offset-4">
        Log in
      </Link>{" "}
      or{" "}
      <Link href="/trades" className="underline underline-offset-4">
        browse the demo trades
      </Link>
      .
    </p>
  );
}
