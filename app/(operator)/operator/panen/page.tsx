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
  docCount: number;
  targetWeight: number;
  targetDays: number;
}

interface HarvestEntry {
  id: number;
  birds: number;
  weight: number; // kg
}

export default function PanenPage() {
  const router = useRouter();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlock, setSelectedFlock] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Harvest entries
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [birdsInput, setBirdsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [nextId, setNextId] = useState(1);

  // Customer info for invoice
  const [customerName, setCustomerName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);

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

  // Calculations from entries
  const totalBirds = entries.reduce((sum, e) => sum + e.birds, 0);
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const avgWeightKg = totalBirds > 0 ? totalWeight / totalBirds : 0;

  function handleAdd() {
    const birds = parseInt(birdsInput);
    const weight = parseFloat(weightInput);
    if (!birds || birds <= 0) return;
    if (!weight || weight <= 0) return;

    setEntries([...entries, { id: nextId, birds, weight }]);
    setNextId(nextId + 1);
    setBirdsInput("");
    setWeightInput("");
  }

  function handleRemove(id: number) {
    setEntries(entries.filter((e) => e.id !== id));
  }

  async function handleSubmit() {
    if (!selectedFlock) { setError("Pilih kandang"); return; }
    if (entries.length === 0) { setError("Tambahkan minimal 1 data timbangan panen"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/operator/panen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockId: selectedFlock,
          totalWeight,
          totalBirds,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Gagal menyimpan");
      } else {
        setSuccess(true);
        setShowInvoice(true);
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  if (success && showInvoice) {
    const now = new Date();
    return (
      <div className="min-h-screen -m-4 bg-white">
        {/* Invoice - designed to fit in one mobile screen for screenshot */}
        <div id="invoice" className="px-4 py-3 max-w-md mx-auto text-xs">
          {/* Header */}
          <div className="text-center border-b border-dashed pb-2 mb-2">
            <p className="text-sm font-bold">{selectedFlockData?.coopName || "Farm"}</p>
            <p className="text-[10px] text-muted-foreground">FAKTUR TIMBANGAN PANEN</p>
            <p className="text-[10px] text-muted-foreground">
              {now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} • {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mb-2 text-[11px]">
            <span className="text-muted-foreground">Pelanggan</span>
            <span className="font-medium">{customerName || "-"}</span>
            <span className="text-muted-foreground">No. Kendaraan</span>
            <span className="font-medium">{vehicleNo || "-"}</span>
            <span className="text-muted-foreground">Sopir</span>
            <span className="font-medium">{driverName || "-"}</span>
          </div>

          {/* Table */}
          <table className="w-full text-[10px] border-collapse mb-2">
            <thead>
              <tr className="border-y border-dashed">
                <th className="py-1 text-left font-medium">No</th>
                <th className="py-1 text-right font-medium">Ekor</th>
                <th className="py-1 text-right font-medium">Berat (kg)</th>
                <th className="py-1 text-right font-medium">Rata² (kg)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} className="border-b border-dotted border-muted">
                  <td className="py-0.5">{i + 1}</td>
                  <td className="py-0.5 text-right">{entry.birds.toLocaleString("id-ID")}</td>
                  <td className="py-0.5 text-right">{entry.weight.toLocaleString("id-ID", { minimumFractionDigits: 1 })}</td>
                  <td className="py-0.5 text-right">{(entry.weight / entry.birds).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-dashed font-bold">
                <td className="py-1">Total</td>
                <td className="py-1 text-right">{totalBirds.toLocaleString("id-ID")}</td>
                <td className="py-1 text-right">{totalWeight.toLocaleString("id-ID", { minimumFractionDigits: 1 })}</td>
                <td className="py-1 text-right">{avgWeightKg.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Summary */}
          <div className="rounded-lg bg-gray-50 p-2 mb-2 text-center">
            <div className="grid grid-cols-3 gap-1">
              <div>
                <p className="text-[9px] text-muted-foreground">Total Ekor</p>
                <p className="text-sm font-bold">{totalBirds.toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Total Berat</p>
                <p className="text-sm font-bold">{totalWeight.toLocaleString("id-ID", { minimumFractionDigits: 1 })} kg</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Rata-rata</p>
                <p className="text-sm font-bold">{avgWeightKg.toFixed(2)} kg</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <p className="text-[10px] text-muted-foreground mb-2">Catatan: {notes}</p>
          )}

          {/* Footer */}
          <div className="flex justify-between items-end border-t border-dashed pt-2 text-[10px]">
            <div>
              <p className="text-muted-foreground">Penimbang:</p>
              <p className="font-medium mt-4 border-t border-dotted pt-0.5 min-w-[100px]">(..................)</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Penerima:</p>
              <p className="font-medium mt-4 border-t border-dotted pt-0.5 min-w-[100px]">(..................)</p>
            </div>
          </div>
        </div>

        {/* Action buttons - outside invoice area */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 max-w-md mx-auto">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={() => router.push("/operator")}
          >
            Kembali
          </Button>
          <Button
            className="flex-1 h-10 bg-gradient-primary hover:opacity-90"
            onClick={() => {
              // Trigger native share/screenshot hint
              if (navigator.share) {
                navigator.share({ title: "Faktur Panen", text: `Panen: ${totalBirds} ekor, ${totalWeight} kg` });
              } else {
                alert("Screenshot halaman ini untuk menyimpan faktur");
              }
            }}
          >
            📤 Bagikan
          </Button>
        </div>
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
          <h1 className="text-lg font-bold">Data Panen</h1>
          <p className="text-xs text-muted-foreground">Catat data panen / pengiriman</p>
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
            {flocks.map((flock) => {
              const d = Math.floor(
                (Date.now() - new Date(flock.startDate).getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
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
                  <p className="text-xs text-muted-foreground">Hari ke-{d}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Info Umur & Target */}
      {selectedFlock && selectedFlockData && (
        <div className="flex items-center gap-4 rounded-xl bg-purple-50 border border-purple-200 px-4 py-3">
          <div>
            <p className="text-xs text-purple-600">Umur</p>
            <p className="text-lg font-bold text-purple-800">Hari ke-{dayNumber}</p>
          </div>
          <div className="h-8 w-px bg-purple-200" />
          <div>
            <p className="text-xs text-purple-600">Target Berat</p>
            <p className="text-sm font-semibold text-purple-800">{selectedFlockData.targetWeight} g</p>
          </div>
          <div className="h-8 w-px bg-purple-200" />
          <div>
            <p className="text-xs text-purple-600">Target Hari</p>
            <p className="text-sm font-semibold text-purple-800">{selectedFlockData.targetDays} hari</p>
          </div>
        </div>
      )}

      {/* Input Row */}
      {selectedFlock && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timbangan Panen</Label>
          <div className="flex items-end gap-2">
            <div className="w-20 space-y-1">
              <span className="text-xs text-muted-foreground">Ekor</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={99999}
                value={birdsInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 99999)) {
                    setBirdsInput(val);
                  }
                }}
                placeholder="500"
                className="h-12 text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/30 placeholder:font-normal"
              />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">Berat (kg)</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={99999}
                value={weightInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 99999)) {
                    setWeightInput(val);
                  }
                }}
                placeholder="950"
                className="h-12 text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/30 placeholder:font-normal"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              />
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              className="h-12 px-4 bg-gradient-primary hover:opacity-90"
              disabled={!birdsInput || !weightInput}
            >
              Tambah
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Input jumlah ekor + total berat (kg) per angkutan/timbangan
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
                  <th className="px-3 py-2 text-right font-medium">Ekor</th>
                  <th className="px-3 py-2 text-right font-medium">Berat (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Rata-rata (kg)</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...entries].reverse().map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">{entries.length - index}</td>
                    <td className="px-3 py-2 text-right">{entry.birds.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">{entry.weight.toLocaleString("id-ID", { minimumFractionDigits: 1 })}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {(entry.weight / entry.birds).toFixed(2)}
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
            <span className="px-3">{totalBirds.toLocaleString("id-ID")} ek</span>
            <span className="px-3">{totalWeight.toLocaleString("id-ID", { minimumFractionDigits: 1 })} kg</span>
            <span className="px-3 text-emerald-700">{avgWeightKg.toFixed(2)} kg</span>
          </div>
        </div>
      )}

      {/* Review & Simpan */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {/* Review summary */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-emerald-600">Total Ekor</p>
                <p className="text-xl font-bold text-emerald-800">{totalBirds.toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Total Berat</p>
                <p className="text-xl font-bold text-emerald-800">{totalWeight.toLocaleString("id-ID", { minimumFractionDigits: 1 })} kg</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Rata-rata</p>
                <p className="text-xl font-bold text-emerald-800">{avgWeightKg.toFixed(2)} kg</p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Info Pengiriman</p>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama pelanggan"
              className="h-10 text-sm"
            />
            <div className="flex gap-2">
              <Input
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="No. kendaraan"
                className="h-10 text-sm flex-1"
              />
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Nama sopir"
                className="h-10 text-sm flex-1"
              />
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Catatan (opsional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan panen..."
              className="h-11"
            />
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
              {loading ? "Menyimpan..." : "Simpan Data Panen"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
