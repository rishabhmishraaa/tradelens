import { NextResponse, type NextRequest } from "next/server";
import { isIsoDate } from "@/lib/range";

// F6.2: /sessions/<not a real date> must return a real 404 status. The page itself streams
// (Cache Components), and once streaming has started Next can no longer change the 200 status,
// so the check happens here, before rendering. The page keeps its own notFound() as a backstop.
export function proxy(request: NextRequest) {
  const date = request.nextUrl.pathname.slice("/sessions/".length);
  if (!isIsoDate(date)) {
    return NextResponse.rewrite(new URL("/_not-found-session", request.url)); // unmatched route → 404
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/sessions/:date",
};
