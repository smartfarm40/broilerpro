"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Coop {
  id: string;
  name: string;
  status: string;
}

interface InviteResult {
  inviteLink: string;
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  supervisor: "Supervisor",
  operator: "Operator",
  viewer: "Viewer",
};

export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [coops, setCoops] = useState<Coop[]>([]);
  const [selectedCoops, setSelectedCoops] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCoops() {
      const res = await fetch("/api/coops");
      if (res.ok) {
        const data = await res.json();
        setCoops(data);
      }
    }
    loadCoops();
  }, []);

  function toggleCoop(coopId: string) {
    setSelectedCoops((prev) =>
      prev.includes(coopId)
        ? prev.filter((id) => id !== coopId)
        : [...prev, coopId]
    );
  }

  function getFullInviteLink(path: string) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}${path}`;
  }

  function getWhatsAppMessage(result: InviteResult) {
    const fullLink = getFullInviteLink(result.inviteLink);
    const expDate = new Date(result.expiresAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `🐔 *Undangan Broiler Monitor*

Halo! Anda diundang untuk bergabung ke *${result.organizationName}* sebagai *${ROLE_LABELS[result.role] || result.role}* di aplikasi Broiler Monitor.

📋 *Detail Undangan:*
• Organisasi: ${result.organizationName}
• Role: ${ROLE_LABELS[result.role] || result.role}
• Email: ${result.email}
• Berlaku hingga: ${expDate}

🔗 *Klik link berikut untuk mendaftar:*
${fullLink}

📌 *Langkah-langkah:*
1. Buka link di atas
2. Isi nama lengkap Anda
3. Buat password baru
4. Selesai! Anda bisa langsung menggunakan aplikasi

_Link ini hanya berlaku 48 jam dan hanya bisa digunakan 1 kali._

---
Broiler Monitor — Sistem Monitoring Farm Broiler
${typeof window !== "undefined" ? window.location.origin : ""}`;
  }

  function getInviteTextForCopy(result: InviteResult) {
    const fullLink = getFullInviteLink(result.inviteLink);
    const expDate = new Date(result.expiresAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `🐔 Undangan Broiler Monitor

Halo! Anda diundang untuk bergabung ke "${result.organizationName}" sebagai ${ROLE_LABELS[result.role] || result.role} di aplikasi Broiler Monitor.

Detail Undangan:
• Organisasi: ${result.organizationName}
• Role: ${ROLE_LABELS[result.role] || result.role}
• Email: ${result.email}
• Berlaku hingga: ${expDate}

Link Pendaftaran:
${fullLink}

Langkah-langkah:
1. Buka link di atas
2. Isi nama lengkap Anda
3. Buat password baru
4. Selesai!

Link ini berlaku 48 jam dan hanya bisa digunakan 1 kali.`;
  }

  async function handleCopyLink() {
    if (!inviteResult) return;
    const text = getInviteTextForCopy(inviteResult);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  function handleShareWhatsApp() {
    if (!inviteResult) return;
    const message = getWhatsAppMessage(inviteResult);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInviteResult(null);

    try {
      const res = await fetch("/api/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          coopIds: selectedCoops.length > 0 ? selectedCoops : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengundang anggota");
      } else if (data.inviteLink) {
        // New user — invitation created
        setInviteResult({
          inviteLink: data.inviteLink,
          email: data.email,
          role: data.role,
          organizationName: data.organizationName,
          expiresAt: data.expiresAt,
        });
      } else {
        // Existing user — added directly
        setInviteResult(null);
        setEmail("");
        setSelectedCoops([]);
        setError("");
        alert("✅ " + data.message);
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInviteResult(null);
    setEmail("");
    setSelectedCoops([]);
    setCopied(false);
  }

  const showCoopAssignment = role === "operator" || role === "supervisor";

  // Show invite result with share options
  if (inviteResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-green-600">✓</span> Undangan Berhasil Dibuat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-1">
            <p className="text-sm font-medium text-green-800">
              Undangan untuk <strong>{inviteResult.email}</strong>
            </p>
            <p className="text-xs text-green-700">
              Role: {ROLE_LABELS[inviteResult.role] || inviteResult.role} • Berlaku 48 jam
            </p>
          </div>

          {/* Link preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Link Undangan</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={getFullInviteLink(inviteResult.inviteLink)}
                className="text-xs bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? "✓ Tersalin" : "📋 Copy"}
              </Button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={handleCopyLink}
              variant="outline"
              className="w-full"
            >
              <span className="mr-2">📋</span>
              {copied ? "Tersalin!" : "Copy Pesan Lengkap"}
            </Button>
            <Button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#1da851] text-white"
            >
              <span className="mr-2">💬</span>
              Kirim via WhatsApp
            </Button>
          </div>

          {/* Preview */}
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              👁 Preview pesan yang akan dikirim
            </summary>
            <pre className="mt-2 rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
              {getInviteTextForCopy(inviteResult)}
            </pre>
          </details>

          {/* New invite button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="w-full text-muted-foreground"
          >
            + Undang anggota lain
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Undang Anggota Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="anggota@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Coop Assignment */}
          {showCoopAssignment && coops.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Penempatan Kandang
                <span className="text-muted-foreground font-normal ml-1">(opsional)</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {coops.map((coop) => (
                  <button
                    key={coop.id}
                    type="button"
                    onClick={() => toggleCoop(coop.id)}
                    className={`rounded-lg border p-2.5 text-left text-sm transition-all ${
                      selectedCoops.includes(coop.id)
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="font-medium">{coop.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{coop.status}</p>
                  </button>
                ))}
              </div>
              {selectedCoops.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedCoops.length} kandang dipilih
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Mengirim..." : "📨 Buat Undangan"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
