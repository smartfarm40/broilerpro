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

interface WeighEntry {
  id: number;
  sampleCount: number;
  weight: number;
}

export default function TimbangPage() {
  const router = useRouter();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlock, setSelectedFlock] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Weigh entries
  const [entries, setEntries] = useState<WeighEntry[]>([]);
  const [sampleInput, setSampleInput] = useState("10");
  const [sampleLocked, setSampleLocked] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [nextId, setNextId] = useState(1);

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

  const selectedFlockData = flocks.find((f) => f.id === selectedFlock);
  const dayNumber = selectedFlockData
    ? Math.floor((Date.now() - new Date(selectedFlockData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Calculations
  const totalSamples = entries.reduce((sum, e) => sum + e.sampleCount, 0);
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const avgWeight = totalSamples > 0 ? totalWeight / totalSamples : 0;

  function handleAdd() {
    const sample = parseInt(sampleInput);
    const weight = parseFloat(weightInput);
    if (!sample || sample <= 0) return;
    if (!weight || weight <= 0) return;

    setEntries([...entries, { id: nextId, sampleCount: sample, weight }]);
    setNextId(nextId + 1);
    setSampleLocked(true);
    setWeightInput("");
  }

  function handleRemove(id: number) {
    setEntries(entries.filter((e) => e.id !== id));
  }

  async function handleSubmit() {
    if (!selectedFlock) { setError("Pilih kandang"); return; }
    if (entries.length === 0) { setError("Tambahkan minimal 1 data timbang"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/operator/timbang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockId: selectedFlock,
          avgWeight: Math.round(avgWeight * 10) / 10,
          sampleCount: totalSamples,
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
        <p className="text-sm text-muted-foreground">
          Rata-rata: {avgWeight.toFixed(1)} g ({totalSamples} ekor)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/operator" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Input Timbang</h1>
          <p className="text-xs text-muted-foreground">Catat berat badan sampling</p>
        </div>
        {selectedFlockData && (
          <div className="rounded-xl border border-primary bg-primary/5 px-3 py-2 text-right">
            <p className="text-sm font-semibold">{selectedFlockData.coopName}</p>
            <p className="text-xs text-muted-foreground">{selectedFlockData.strain.replace("_", " ")}</p>
          </div>
        )}
      </div>

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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Info Umur & Tanggal */}
      {selectedFlock && (
        <div className="flex items-center gap-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
          <div>
            <p className="text-xs text-blue-600">Umur</p>
            <p className="text-lg font-bold text-blue-800">Hari ke-{dayNumber}</p>
          </div>
          <div className="h-8 w-px bg-blue-200" />
          <div>
            <p className="text-xs text-blue-600">Tanggal</p>
            <p className="text-sm font-semibold text-blue-800">
              {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      )}

      {/* Input Row: sekali timbang */}
      {selectedFlock && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sekali Timbang</Label>

          {/* Sample count - only editable before first entry */}
          {!sampleLocked ? (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Jumlah ekor per timbang</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                placeholder="10"
                className="h-12 text-lg text-center"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">Per timbang:</span>
              <span className="text-sm font-bold">{sampleInput} ekor</span>
              <button
                type="button"
                onClick={() => { setSampleLocked(false); setEntries([]); }}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Ubah
              </button>
            </div>
          )}

          {/* Weight input + Tambah button */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">Berat (gram)</span>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                min={0}
                max={50000}
                value={weightInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 50000)) {
                    setWeightInput(val);
                  }
                }}
                placeholder="8500"
                className="h-14 text-2xl text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/30 placeholder:font-normal"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              />
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              className="h-14 px-5 bg-gradient-primary hover:opacity-90"
              disabled={!sampleInput || !weightInput}
            >
              Tambah
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Masukkan total berat {sampleInput || "..."} ekor (gram), lalu tekan Tambah
          </p>
        </div>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">No</th>
                  <th className="px-3 py-2 text-right font-medium">Sample (ek)</th>
                  <th className="px-3 py-2 text-right font-medium">Berat (gr)</th>
                  <th className="px-3 py-2 text-right font-medium">Rata-rata (gr)</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...entries].reverse().map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">{entries.length - index}</td>
                    <td className="px-3 py-2 text-right">{entry.sampleCount}</td>
                    <td className="px-3 py-2 text-right">{entry.weight.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {(entry.weight / entry.sampleCount).toFixed(1)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        aria-label="Hapus"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Summary row - always visible */}
          <div className="border-t bg-emerald-50 px-3 py-2 flex items-center text-xs font-semibold">
            <span className="flex-1">Total: {entries.length} timbang</span>
            <span className="px-3">{totalSamples} ek</span>
            <span className="px-3">{totalWeight.toLocaleString("id-ID")} gr</span>
            <span className="px-3 text-emerald-700">{avgWeight.toFixed(1)} gr</span>
          </div>
        </div>
      )}

      {/* Review & Simpan */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {/* Review summary */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-xs text-emerald-600">Berat Rata-rata Keseluruhan</p>
            <p className="text-3xl font-bold text-emerald-800">{avgWeight.toFixed(1)} g</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dari {entries.length} kali timbang • {totalSamples} ekor total
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setEntries([])}
            >
              Reset
            </Button>
            <Button
              className="flex-1 h-12 text-base bg-gradient-primary hover:opacity-90"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
