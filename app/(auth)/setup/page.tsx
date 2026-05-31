"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/src/lib/auth-client";

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary-diagonal px-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-5xl">⏳</div>
          <CardTitle className="text-xl font-bold">Menunggu Akses</CardTitle>
          <CardDescription className="mt-2">
            Akun Anda belum terhubung ke organisasi manapun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800">
              Untuk menggunakan aplikasi, Anda harus diundang oleh Owner/Manager organisasi. 
              Hubungi admin yang mendaftarkan Anda untuk mendapatkan akses.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Kemungkinan penyebab:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Undangan belum diterima/diproses</li>
              <li>Owner belum menambahkan Anda ke organisasi</li>
              <li>Akun dibuat langsung di Supabase tanpa link undangan</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut()}
          >
            Keluar & Ganti Akun
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
