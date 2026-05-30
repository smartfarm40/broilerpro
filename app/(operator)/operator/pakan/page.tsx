"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Flock {
  id: string;
  coopId: string;
  strain: string;
  startDate: string;
  coopName: string;
}

interface FeedLog {
  date: string;
  incoming: number;
  used: number;
  remainingKg: number;
  entries: { id: string; type: string; amountKg: number; bags: number | null }[];
}

export default function PakanPage() {
  const router = useRouter();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlock, setSelectedFlock] = useState("");
  const [feedName, setFeedName] = useState("");
  const [feedMorning, setFeedMorning] = useState("");
  const [feedAfternoon, setFeedAfternoon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Pakan datang
  const [incomingBags, setIncomingBags] = useState("");
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [incomingSuccess, setIncomingSuccess] = useState(false);

  // Feed log history
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);

  const totalUsed = (parseFloat(feedMorning) || 0) + (parseFloat(feedAfternoon) || 0);

  useEffect(() => {
    async function loadFlocks() {
      const res = await fetch("/api/operator/active-flocks");
      if (res.ok) {
        const data = await res.json();
        setFlocks(data);
        if (data.length === 1) setSelectedFlock(data[0].id);
      }
    }
    loadFlocks();
  }, []);

  // Load feed logs when flock is selected
  useEffect(() => {
    if (!selectedFlock) return;
    async function loadLogs() {
      const res = await fetch(`/api/operator/pakan/logs?flockId=${selectedFlock}`);
      if (res.ok) {
        const data = await res.json();
        setFeedLogs(data);
      }
    }
    loadLogs();
  }, [selectedFlock, success, incomingSuccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlock) { setError("Pilih kandang"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/operator/pakan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockId: selectedFlock,
          feedName,
          feedMorning: parseFloat(feedMorning) || 0,
          feedAfternoon: parseFloat(feedAfternoon) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Gagal menyimpan");
      } else {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setFeedMorning("");
          setFeedAfternoon("");
        }, 2000);
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleIncoming(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlock || !incomingBags) return;
    setLoadingIncoming(true);

    try {
      const res = await fetch("/api/operator/pakan/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockId: selectedFlock,
          bags: parseInt(incomingBags) || 0,
        }),
      });

      if (res.ok) {
        setIncomingSuccess(true);
        setIncomingBags("");
        setTimeout(() => setIncomingSuccess(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setLoadingIncoming(false);
    }
  }

  const selectedFlockData = flocks.find((f) => f.id === selectedFlock);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/operator" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Input Pakan</h1>
          <p className="text-xs text-muted-foreground">Catat konsumsi pakan harian</p>
        </div>
        {selectedFlockData && (
          <div className="rounded-xl border border-primary bg-primary/5 px-3 py-2 text-right">
            <p className="text-sm font-semibold">{selectedFlockData.coopName}</p>
            <p className="text-xs text-muted-foreground">{selectedFlockData.strain.replace("_", " ")}</p>
          </div>
        )}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center font-medium">
            ✅ Data pakan tersimpan!
          </div>
        )}

        {/* Pilih Kandang - only show if multiple */}
        {flocks.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pilih Kandang</Label>
            <div className="grid grid-cols-2 gap-2">
              {flocks.map((flock) => (
                <button
                  key={flock.id}
                  type="button"
                  onClick={() => setSelectedFlock(flock.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selectedFlock === flock.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <p className="text-sm font-semibold">{flock.coopName}</p>
                  <p className="text-xs text-muted-foreground">{flock.strain.replace("_", " ")}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nama Pakan */}
        <div className="space-y-2">
          <Label htmlFor="feedName" className="text-sm font-medium">Nama Pakan</Label>
          <Input
            id="feedName"
            value={feedName}
            onChange={(e) => setFeedName(e.target.value)}
            placeholder="Contoh: BR-1 Japfa, 511 Charoen..."
            className="h-12"
          />
        </div>

        {/* Pakan Pagi */}
        <div className="space-y-2">
          <Label htmlFor="feedMorning" className="text-sm font-medium">Pakan Pagi (kg)</Label>
          <Input
            id="feedMorning"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={feedMorning}
            onChange={(e) => setFeedMorning(e.target.value)}
            placeholder="0"
            className="h-12 text-lg"
          />
        </div>

        {/* Pakan Siang */}
        <div className="space-y-2">
          <Label htmlFor="feedAfternoon" className="text-sm font-medium">Pakan Siang (kg)</Label>
          <Input
            id="feedAfternoon"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={feedAfternoon}
            onChange={(e) => setFeedAfternoon(e.target.value)}
            placeholder="0"
            className="h-12 text-lg"
          />
        </div>

        {/* Total Pakai - Auto Kalkulasi */}
        {totalUsed > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
            <p className="text-xs text-amber-700">Total Pakan Hari Ini</p>
            <p className="text-2xl font-bold text-amber-800">{totalUsed.toFixed(1)} kg</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pagi: {parseFloat(feedMorning) || 0} kg + Siang: {parseFloat(feedAfternoon) || 0} kg
            </p>
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base bg-gradient-primary hover:opacity-90" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Data Pakan"}
        </Button>
      </form>

      {/* Pakan Datang Section */}
      <div className="border-t pt-4">
        <h2 className="text-sm font-bold mb-3">📦 Pakan Datang</h2>
        <form onSubmit={handleIncoming} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="incomingBags" className="text-xs text-muted-foreground">Jumlah (karung)</Label>
            <Input
              id="incomingBags"
              type="number"
              inputMode="numeric"
              min={1}
              value={incomingBags}
              onChange={(e) => setIncomingBags(e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 px-5" disabled={loadingIncoming || !selectedFlock}>
            {loadingIncoming ? "..." : "Simpan"}
          </Button>
        </form>
        {incomingSuccess && (
          <p className="text-xs text-green-600 mt-2">✅ Pakan datang tercatat!</p>
        )}
      </div>

      {/* Tabel Riwayat Pakan */}
      {feedLogs.length > 0 && (
        <div className="border-t pt-4">
          <h2 className="text-sm font-bold mb-3">📋 Riwayat Pakan</h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tanggal</th>
                  <th className="px-3 py-2 text-right font-medium">Datang</th>
                  <th className="px-3 py-2 text-right font-medium">Pakai</th>
                  <th className="px-3 py-2 text-right font-medium">Sisa</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {feedLogs.map((log, i) => {
                  const sisaSak = Math.floor(log.remainingKg / 50);
                  const sisaKg = Math.round((log.remainingKg % 50) * 10) / 10;
                  return (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-3 py-2">{new Date(log.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td>
                      <td className="px-3 py-2 text-right text-green-700 font-medium">
                        {log.incoming > 0 ? `+${log.incoming} sak` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 font-medium">
                        {log.used > 0 ? `${log.used.toFixed(1)} kg` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {log.remainingKg > 0
                          ? sisaKg > 0
                            ? `${sisaSak} sak + ${sisaKg} kg`
                            : `${sisaSak} sak`
                          : "0"
                        }
                      </td>
                      <td className="px-2 py-2">
                        <EditButton log={log} onEdited={() => { setSuccess(true); setTimeout(() => setSuccess(false), 100); }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// Edit Button Component
function EditButton({ log, onEdited }: { log: FeedLog; onEdited: () => void }) {
  const [open, setOpen] = useState(false);
  const [editBags, setEditBags] = useState("");
  const [editUsed, setEditUsed] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setEditBags(log.incoming > 0 ? String(log.incoming) : "");
          setEditUsed(log.used > 0 ? String(log.used) : "");
        }}
        className="text-muted-foreground hover:text-primary p-1"
        aria-label="Edit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Edit each entry
      for (const entry of log.entries) {
        if (entry.type === "incoming" && editBags) {
          await fetch("/api/operator/pakan/edit", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: entry.id, bags: parseInt(editBags) }),
          });
        } else if (entry.type === "used" && editUsed) {
          await fetch("/api/operator/pakan/edit", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: entry.id, amountKg: parseFloat(editUsed) }),
          });
        }
      }
      setOpen(false);
      onEdited();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold">Edit Data — {new Date(log.date).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}</h3>

        {log.incoming > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Pakan Datang (sak)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={editBags}
              onChange={(e) => setEditBags(e.target.value)}
              className="h-11"
            />
          </div>
        )}

        {log.used > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Pakan Pakai (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={editUsed}
              onChange={(e) => setEditUsed(e.target.value)}
              className="h-11"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1 h-10 bg-gradient-primary hover:opacity-90" disabled={saving}>
            {saving ? "..." : "Simpan"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} className="h-10">
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
