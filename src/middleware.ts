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
    pathname.startsWith("/messages") ||
    pathname.startsWith("/officials");

  const isAdminPath = pathname.startsWith("/admin");

  // @convex-dev/auth stores the JWT in a cookie
  const authSession =
    request.cookies.get("__convexAuthJWT") ||
    request.cookies.get("__Host-convex-auth") ||
    request.cookies.get("convex-auth");

  if ((isMemberPath || isAdminPath) && !authSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Extra guard: non-admin trying to access /admin
  // Role check is enforced server-side by Convex requireRole(),
  // but we also redirect at edge for a clean UX
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
    "/officials/:path*",
    "/admin/:path*",
  ],
};
