"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/src/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Invitation state
  const [hasInvitation, setHasInvitation] = useState(false);
  const [invitationOrg, setInvitationOrg] = useState("");
  const [invitationRole, setInvitationRole] = useState("");
  const [checkingInvitation, setCheckingInvitation] = useState(false);

  // Check invitation when email changes (debounced)
  useEffect(() => {
    if (!email || !email.includes("@")) {
      setHasInvitation(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingInvitation(true);
      try {
        const res = await fetch(`/api/auth/check-invitation?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setHasInvitation(data.hasInvitation);
          setInvitationOrg(data.organizationName || "");
          setInvitationRole(data.role || "");
        }
      } catch {
        // ignore
      } finally {
        setCheckingInvitation(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Register user
      const result = await signUp({ email, password, name });

      if (result.error) {
        setError(result.error.message || "Registrasi gagal.");
        setLoading(false);
        return;
      }

      // Step 2: Accept invitation OR create organization
      if (hasInvitation) {
        const res = await fetch("/api/auth/accept-invitation", {
          method: "POST",
        });

        if (!res.ok) {
          setError("Gagal menerima undangan. Silakan hubungi admin.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        // Route based on role
        if (data.role === "operator") {
          router.push("/operator");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      } else {
        // Create new organization
        if (!orgName) {
          setError("Nama organisasi wajib diisi.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: orgName }),
        });

        if (!res.ok) {
          setError("Gagal membuat organisasi.");
          setLoading(false);
          return;
        }

        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary-diagonal px-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
            <img src="/icon/favicon.svg" alt="Broiler Monitor" className="h-14 w-14" />
          </div>
          <CardTitle className="text-2xl font-bold">Broiler Monitor</CardTitle>
          <CardDescription>
            {hasInvitation
              ? "Anda diundang bergabung ke organisasi"
              : "Daftar akun baru"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Invitation Banner */}
            {hasInvitation && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm font-medium text-green-800">
                  🎉 Anda diundang ke <strong>{invitationOrg}</strong>
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Sebagai <span className="capitalize font-medium">{invitationRole}</span> — Daftar untuk bergabung
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {checkingInvitation && (
                <p className="text-xs text-muted-foreground">Memeriksa undangan...</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

            {/* Only show org name field if no invitation */}
            {!hasInvitation && (
              <div className="space-y-2">
                <Label htmlFor="orgName">Nama Organisasi / Farm</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="PT. Ayam Jaya"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required={!hasInvitation}
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
              {loading
                ? "Memproses..."
                : hasInvitation
                  ? "Daftar & Gabung Organisasi"
                  : "Daftar & Buat Organisasi"
              }
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Masuk
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
