import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase instance (singleton)
let client: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const supabaseAuth = getSupabaseClient();

/**
 * Sign in with email and password
 */
export async function signIn({ email, password }: { email: string; password: string }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: { message: error.message } };
  return { data, error: null };
}

/**
 * Sign up with email and password
 */
export async function signUp({ email, password, name }: { email: string; password: string; name: string }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { nama: name, name },
    },
  });
  if (error) return { error: { message: error.message } };
  return { data, error: null };
}

/**
 * Sign out
 */
export async function signOut() {
  const sb = getSupabaseClient();
  await sb.auth.signOut();
  window.location.href = "/login";
}

/**
 * Get current session (client-side)
 */
export async function getSession() {
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

/**
 * Hook-like function to use session reactively (for components)
 */
export function useSession() {
  // This is a simplified version - for real reactivity, 
  // use supabaseAuth.auth.onAuthStateChange in a useEffect
  return { data: null };
}
