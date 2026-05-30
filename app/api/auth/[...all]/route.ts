import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Auth API routes - proxy ke Supabase Auth
 * Handles: sign-in, sign-up, sign-out, session
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.replace("/api/auth/", "").split("/");
  const action = pathSegments[0];

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    switch (action) {
      case "sign-in": {
        const { email, password } = await request.json();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return NextResponse.json({ error: error.message }, { status: 401 });
        
        const response = NextResponse.json({ user: data.user, session: data.session });
        // Set auth cookie for middleware
        if (data.session) {
          response.cookies.set("sb-auth-token", data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
          });
          response.cookies.set("sb-refresh-token", data.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
          });
        }
        return response;
      }

      case "sign-up": {
        const { email, password, name } = await request.json();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nama: name, name } },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ user: data.user, session: data.session });
      }

      case "sign-out": {
        const response = NextResponse.json({ success: true });
        response.cookies.delete("sb-auth-token");
        response.cookies.delete("sb-refresh-token");
        return response;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.replace("/api/auth/", "").split("/");
  const action = pathSegments[0];

  if (action === "session") {
    const accessToken = request.cookies.get("sb-auth-token")?.value;
    if (!accessToken) {
      return NextResponse.json({ user: null, session: null });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return NextResponse.json({ user: null, session: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.nama || user.user_metadata?.name || user.email,
      },
      session: { userId: user.id },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 404 });
}
