import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected paths
  const isMemberPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/bereavement") ||
    pathname.startsWith("/harassment") ||
    pathname.startsWith("/bus") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications");

  const isAdminPath = pathname.startsWith("/admin");

  // In Next.js, check session cookie from Convex Auth or standard session
  // For local development and production, check auth token presence
  const authSession =
    request.cookies.get("__convexAuthJWT") ||
    request.cookies.get("convexAuthToken") ||
    request.cookies.get("auth_session");

  // We allow passthrough in local preview if needed or redirect unauthenticated
  // When deploying, authSession is populated by @convex-dev/auth
  if ((isMemberPath || isAdminPath) && !authSession) {
    // In production with strict auth:
    // const loginUrl = new URL("/login", request.url);
    // loginUrl.searchParams.set("next", pathname);
    // return NextResponse.redirect(loginUrl);
  }

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
    "/admin/:path*",
  ],
};
