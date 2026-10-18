import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast gate: bounce requests without a session cookie away from admin pages.
 * The session itself is verified against the database in the admin layout and in
 * every server action / route handler, so a forged cookie gets nothing.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("bms_session")) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/media/:path*"] };
