import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type Session = {
  user: { id: string; email: string; name: string };
  session: { userId: string };
};

/**
 * Auth object yang menyediakan API kompatibel dengan pola sebelumnya.
 * Semua API routes bisa tetap pakai: auth.api.getSession({ headers })
 */
export const auth = {
  api: {
    /**
     * Get session dari Supabase Auth menggunakan cookie.
     * Kompatibel dengan pola: auth.api.getSession({ headers: await headers() })
     */
    async getSession(_opts?: { headers?: Headers }): Promise<Session | null> {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get("sb-auth-token")?.value;

      if (!accessToken) return null;

      // Use service role key to verify the token
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (error || !user) return null;

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
