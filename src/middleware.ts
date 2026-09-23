import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isMemberPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/bereavement") ||
    pathname.startsWith("/harassment") ||
    pathname.startsWith("/bus") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/messages");

  const isAdminPath = pathname.startsWith("/admin");

  // NOTE: the Convex auth client stores its tokens in the browser (localStorage),
  // not in a cookie, so this edge middleware cannot read the session.
  // Route protection is enforced by the client-side guards in the member/admin
  // layouts and, authoritatively, by requireUser()/requireRole() in Convex.
  void isMemberPath;
  void isAdminPath;

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bereavement/:path*",
    "/harassment/:path*",
    "/bus/:path*",
    "/reports/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/messages/:path*",
    "/admin/:path*",
  ],
};
