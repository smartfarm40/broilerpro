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

export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [coops, setCoops] = useState<Coop[]>([]);
  const [selectedCoops, setSelectedCoops] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

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

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Gagal mengundang anggota");
      } else {
        setMessage(`Undangan berhasil dikirim ke ${email}`);
        setEmail("");
        setSelectedCoops([]);
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const showCoopAssignment = role === "operator" || role === "supervisor";

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

          {/* Coop Assignment - shown for operator/supervisor */}
          {showCoopAssignment && coops.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Penempatan Kandang
                <span className="text-muted-foreground font-normal ml-1">(pilih kandang yang menjadi tanggung jawab)</span>
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

          <Button type="submit" disabled={loading}>
            {loading ? "Mengirim..." : "Undang"}
          </Button>
        </form>
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
