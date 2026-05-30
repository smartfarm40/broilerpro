"use client";

/**
 * Sign in with email and password via API route (sets httpOnly cookie)
 */
export async function signIn({ email, password }: { email: string; password: string }) {
  try {
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: { message: data.error || "Login gagal" } };
    }

    return { data, error: null };
  } catch {
    return { error: { message: "Gagal terhubung ke server" } };
  }
}

/**
 * Sign up with email and password via API route
 */
export async function signUp({ email, password, name }: { email: string; password: string; name: string }) {
  try {
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: { message: data.error || "Registrasi gagal" } };
    }

    return { data, error: null };
  } catch {
    return { error: { message: "Gagal terhubung ke server" } };
  }
}

/**
 * Sign out - clears cookie via API route
 */
export async function signOut() {
  await fetch("/api/auth/sign-out", { method: "POST" });
  window.location.href = "/login";
}
