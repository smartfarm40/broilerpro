import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("sb-auth-token")?.value;

  // Revoke session in Supabase (invalidate token server-side)
  if (accessToken) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      // Get user to find their session, then sign them out
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      if (user) {
        await supabase.auth.admin.signOut(accessToken);
      }
    } catch {
      // Continue even if revocation fails — cookies will still be cleared
    }
  }

  // Clear auth cookies
  const response = NextResponse.json({ success: true });
  response.cookies.set("sb-auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("sb-refresh-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
