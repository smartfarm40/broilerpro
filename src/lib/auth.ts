import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type Session = {
  user: { id: string; email: string; name: string };
  session: { userId: string };
};

/**
 * Auth object yang menyediakan API kompatibel dengan pola sebelumnya.
 * Semua API routes bisa tetap pakai: auth.api.getSession({ headers: await headers() })
 */
export const auth = {
  api: {
    /**
     * Get session dari Supabase Auth menggunakan cookie.
     */
    async getSession(opts?: { headers?: Headers }): Promise<Session | null> {
      let accessToken: string | undefined;

      // Try reading from cookies() first (works in server components & route handlers)
      try {
        const cookieStore = await cookies();
        accessToken = cookieStore.get("sb-auth-token")?.value;
      } catch {
        // cookies() might fail in some contexts
      }

      // Fallback: parse from Cookie header if passed
      if (!accessToken && opts?.headers) {
        const cookieHeader = opts.headers.get("cookie") || "";
        const match = cookieHeader.match(/sb-auth-token=([^;]+)/);
        if (match) {
          accessToken = match[1];
        }
      }

      if (!accessToken) return null;

      // Verify token with Supabase
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (error || !user) {
        // Clear stale cookie
        try {
          const cookieStore = await cookies();
          cookieStore.delete("sb-auth-token");
        } catch {
          // Can't delete in some contexts
        }
        return null;
      }

      return {
        user: {
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.nama || user.user_metadata?.name || user.email || "",
        },
        session: { userId: user.id },
      };
    },
  },
};
