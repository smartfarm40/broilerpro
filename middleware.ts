import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/icon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check for Supabase auth cookies
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some(
    (cookie) => cookie.name.includes("auth-token") || cookie.name.startsWith("sb-")
  );

  if (!hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon/).*)",
  ],
};
