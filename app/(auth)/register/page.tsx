"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary-diagonal px-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
            <img src="/icon/favicon.svg" alt="Broiler Monitor" className="h-14 w-14" />
          </div>
          <CardTitle className="text-2xl font-bold">Pendaftaran Akun</CardTitle>
          <CardDescription>
            Pendaftaran akun hanya dapat dilakukan oleh Administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
              ℹ️ Cara mendapatkan akun:
            </p>
            <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
              <li>Hubungi Administrator BroilerTrack</li>
              <li>Sampaikan nama lengkap dan jabatan Anda</li>
              <li>Administrator akan mengirimkan link undangan</li>
              <li>Buka link undangan untuk membuat password</li>
            </ol>
          </div>

          {/* Kontak Admin */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Hubungi Administrator:</p>

            {/* Email */}
            <a
              href="mailto:barotech26@gmail.com?subject=Permintaan Akun BroilerTrack&body=Nama:%0ANomor HP:%0AJabatan:%0ANama Peternakan:"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-lg">📧</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Email Administrator</p>
                <p className="text-xs text-muted-foreground">barotech26@gmail.com</p>
              </div>
              <span className="text-muted-foreground text-sm">↗</span>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/62?text=Halo%20Admin%20BroilerTrack%2C%20saya%20ingin%20mendaftar%20akun.%0ANama%3A%20%0AJabatan%3A%20"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <span className="text-lg">💬</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Kirim pesan ke Admin</p>
              </div>
              <span className="text-muted-foreground text-sm">↗</span>
            </a>
          </div>

          {/* Back to login */}
          <Link href="/login">
            <Button variant="outline" className="w-full mt-2">
              ← Kembali ke Halaman Masuk
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
