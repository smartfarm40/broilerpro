import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type Session = {
  user: { id: string; email: string; name: string };
  session: { userId: string };
};

export const auth = {
  api: {
    async getSession(opts?: { headers?: Headers }): Promise<Session | null> {
      let accessToken: string | undefined;
      let refreshToken: string | undefined;

      // Read cookies
      try {
        const cookieStore = await cookies();
        accessToken = cookieStore.get("sb-auth-token")?.value;
        refreshToken = cookieStore.get("sb-refresh-token")?.value;
      } catch {
        // Fallback: parse from Cookie header
        if (opts?.headers) {
          const cookieHeader = opts.headers.get("cookie") || "";
          const accessMatch = cookieHeader.match(/sb-auth-token=([^;]+)/);
          const refreshMatch = cookieHeader.match(/sb-refresh-token=([^;]+)/);
          if (accessMatch) accessToken = accessMatch[1];
          if (refreshMatch) refreshToken = refreshMatch[1];
        }
      }

      if (!accessToken && !refreshToken) return null;

      // Try access token first
      if (accessToken) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (!error && user) {
          return {
            user: {
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.nama || user.user_metadata?.name || user.email || "",
            },
            session: { userId: user.id },
          };
        }
      }

      // Access token invalid — try refresh
      if (refreshToken) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

        if (!error && data.session && data.user) {
          // Set new cookies
          try {
            const cookieStore = await cookies();
            cookieStore.set("sb-auth-token", data.session.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60, // 1 hour
              path: "/",
            });
            cookieStore.set("sb-refresh-token", data.session.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: "/",
            });
          } catch {
            // Can't set cookies in some contexts (e.g. during render)
          }

          return {
            user: {
              id: data.user.id,
              email: data.user.email || "",
              name: data.user.user_metadata?.nama || data.user.user_metadata?.name || data.user.email || "",
            },
            session: { userId: data.user.id },
          };
        }
      }

      // Both tokens invalid — clear stale cookies
      try {
        const cookieStore = await cookies();
        cookieStore.delete("sb-auth-token");
        cookieStore.delete("sb-refresh-token");
      } catch {
        // ignore
      }

      return null;
    },
  },
};
