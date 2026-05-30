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
  docCount: number;
  coopName: string;
  lastPopulation?: number;
}

export default function DeplesiPage() {
  const router = useRouter();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlock, setSelectedFlock] = useState("");
  const [deadCount, setDeadCount] = useState("");
  const [cullCount, setCullCount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  // Get current population for selected flock
  const selectedFlockData = flocks.find((f) => f.id === selectedFlock);
  const currentPopulation = selectedFlockData?.lastPopulation || selectedFlockData?.docCount || 0;
  const totalDeplesi = (parseInt(deadCount) || 0) + (parseInt(cullCount) || 0);
  const sisaAyam = currentPopulation - totalDeplesi;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlock) { setError("Pilih kandang"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/operator/deplesi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockId: selectedFlock,
          deadCount: parseInt(deadCount) || 0,
          cullCount: parseInt(cullCount) || 0,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Gagal menyimpan");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/operator"), 1500);
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-green-700">Data Tersimpan!</p>
        <p className="text-sm text-muted-foreground">Mengalihkan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Kandang Selector */}
      <div className="flex items-center gap-3">
        <Link href="/operator" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Input Deplesi</h1>
          <p className="text-xs text-muted-foreground">Catat kematian & afkir hari ini</p>
        </div>
        {/* Kandang badge */}
        {selectedFlockData && (
          <div className="rounded-xl border border-primary bg-primary/5 px-3 py-2 text-right">
            <p className="text-sm font-semibold">{selectedFlockData.coopName}</p>
            <p className="text-xs text-muted-foreground">{selectedFlockData.strain.replace("_", " ")}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Pilih Kandang - only show if multiple flocks */}
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

        {/* Populasi saat ini */}
        {selectedFlock && currentPopulation > 0 && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-600">Populasi Saat Ini</p>
            <p className="text-xl font-bold text-blue-800">{currentPopulation.toLocaleString("id-ID")} ekor</p>
          </div>
        )}

        {/* Jumlah Mati */}
        <div className="space-y-2">
          <Label htmlFor="deadCount" className="text-sm font-medium">Jumlah Mati (ekor)</Label>
          <Input
            id="deadCount"
            type="number"
            inputMode="numeric"
            min={0}
            value={deadCount}
            onChange={(e) => setDeadCount(e.target.value)}
            placeholder="0"
            className="h-12 text-lg"
          />
        </div>

        {/* Jumlah Afkir */}
        <div className="space-y-2">
          <Label htmlFor="cullCount" className="text-sm font-medium">Jumlah Afkir (ekor)</Label>
          <Input
            id="cullCount"
            type="number"
            inputMode="numeric"
            min={0}
            value={cullCount}
            onChange={(e) => setCullCount(e.target.value)}
            placeholder="0"
            className="h-12 text-lg"
          />
        </div>

        {/* Sisa Ayam - Auto Kalkulasi */}
        {selectedFlock && totalDeplesi > 0 && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600">Sisa Ayam Setelah Deplesi</p>
                <p className="text-2xl font-bold text-emerald-800">{sisaAyam.toLocaleString("id-ID")} ekor</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-500">-{totalDeplesi} ekor</p>
                <p className="text-xs text-muted-foreground">
                  ({((totalDeplesi / currentPopulation) * 100).toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Catatan */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">Catatan (opsional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Keterangan tambahan..."
            className="h-12"
          />
        </div>

        <Button type="submit" className="w-full h-12 text-base bg-gradient-primary hover:opacity-90" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Data Deplesi"}
        </Button>
      </form>
    </div>
  );
}
