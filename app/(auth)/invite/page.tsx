"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type InviteState = "loading" | "form" | "success" | "error";

const ROLE_LABELS: Record<string, string> = {
  owner: "Pemilik",
  manager: "Manager",
  supervisor: "Supervisor",
  ts: "Technical Service (TS)",
  operator: "Operator",
  staff: "Staff",
  viewer: "Viewer",
};

function InviteConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<InviteState>("loading");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    verifyInvitation();
  }, []);

  async function verifyInvitation() {
    // Get token from URL params
    const token = searchParams.get("token");

    if (!token) {
      setState("error");
      setError("Link undangan tidak valid. Pastikan Anda membuka link yang benar.");
      return;
    }

    try {
      // Verify token via API
      const res = await fetch(`/api/auth/check-invitation?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setState("error");
        setError(data.error || "Link undangan tidak valid atau sudah kadaluarsa.");
        return;
      }

      setEmail(data.email || "");
      setRole(data.role || "operator");
      setOrgName(data.organizationName || "");
      setState("form");
    } catch {
      setState("error");
      setError("Gagal memverifikasi undangan. Coba lagi nanti.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama lengkap wajib diisi");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);

    try {
      const token = searchParams.get("token");

      // Register via API (sign-up with invitation)
      const res = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal menyelesaikan pendaftaran");
        setLoading(false);
        return;
      }

      setState("success");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function goToApp() {
    if (role === "operator") {
      router.push("/operator");
    } else if (role === "supervisor") {
      router.push("/supervisor");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary-diagonal px-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        {/* Loading */}
        {state === "loading" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
                <img src="/icon/favicon.svg" alt="Broiler Monitor" className="h-14 w-14" />
              </div>
              <CardTitle className="text-xl">Memverifikasi Undangan...</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground mt-4">Mohon tunggu sebentar</p>
            </CardContent>
          </>
        )}

        {/* Form */}
        {state === "form" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
                <img src="/icon/favicon.svg" alt="Broiler Monitor" className="h-14 w-14" />
              </div>
              <CardTitle className="text-xl">Selamat Datang!</CardTitle>
              <CardDescription>
                Lengkapi profil Anda untuk bergabung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Org & Role info */}
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 mb-4">
                <p className="text-sm font-medium text-green-800">
                  🎉 Anda diundang ke <strong>{orgName}</strong>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600">Role:</span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {ROLE_LABELS[role] || role}
                  </Badge>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nama lengkap Anda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Buat Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "✓ Selesaikan Pendaftaran"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* Success */}
        {state === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 text-4xl">🎉</div>
              <CardTitle className="text-xl">Akun Siap Digunakan!</CardTitle>
              <CardDescription>
                Selamat datang, {name}! Akun Anda sudah siap.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                onClick={goToApp}
              >
                🚀 Buka Aplikasi
              </Button>
            </CardContent>
          </>
        )}

        {/* Error */}
        {state === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 text-4xl">🔗</div>
              <CardTitle className="text-xl text-destructive">Link Tidak Valid</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  ← Kembali ke Halaman Masuk
                </Button>
              </Link>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function InviteConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-primary-diagonal px-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Memuat...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <InviteConfirmContent />
    </Suspense>
  );
}