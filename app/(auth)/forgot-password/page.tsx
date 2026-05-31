"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan");
      } else {
        setSent(true);
      }
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary-diagonal px-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center">
            <img src="/icon/favicon.svg" alt="Broiler Monitor" className="h-20 w-20" />
          </div>
          <CardTitle className="text-xl font-bold">Lupa Password</CardTitle>
          <CardDescription>
            {sent
              ? "Cek email Anda untuk link reset password"
              : "Masukkan email untuk reset password"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-3xl mb-2">📧</p>
                <p className="text-sm text-green-800 font-medium">Email terkirim!</p>
                <p className="text-xs text-green-700 mt-1">
                  Cek inbox <strong>{email}</strong> untuk link reset password. 
                  Jika tidak ada, cek folder spam.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSent(false); setEmail(""); }}
              >
                Kirim ulang ke email lain
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-sm">
                  ← Kembali ke Login
                </Button>
              </Link>
            </div>
          ) : (
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
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-sm">
                  ← Kembali ke Login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
