import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const publicPaths = ["/login", "/register", "/invite", "/api/auth/sign-in", "/api/auth/sign-up", "/api/auth/sign-out", "/api/auth/check-invitation", "/api/auth/accept-invitation"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/icon") || pathname.startsWith("/sw.js") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("sb-auth-token")?.value;
  const refreshToken = request.cookies.get("sb-refresh-token")?.value;

  // No tokens at all → redirect to login
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify access token
  if (accessToken) {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!error && user) {
      // Token valid — proceed
      return NextResponse.next();
    }
  }

  // Access token invalid/expired — try refresh
  if (refreshToken) {
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (!error && data.session) {
      // Refresh successful — set new cookies and proceed
      const response = NextResponse.next();
      response.cookies.set("sb-auth-token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour (match actual JWT expiry)
        path: "/",
      });
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      return response;
    }
  }

  // Both tokens invalid — clear cookies and redirect to login
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set("sb-auth-token", "", { maxAge: 0, path: "/" });
  response.cookies.set("sb-refresh-token", "", { maxAge: 0, path: "/" });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon/|sw.js).*)"],
};
