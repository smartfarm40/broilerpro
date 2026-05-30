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

interface Schedule {
  id: string;
  name: string;
  dosage: string | null;
  method: string | null;
  notes: string | null;
  dayNumber: number;
}

interface Execution {
  id: string;
  scheduleId: string | null;
  name: string;
  amount: string | null;
}

export default function JadwalPage() {
  const router = useRouter();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlock, setSelectedFlock] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [dayNumber, setDayNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selected schedule to execute
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

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

  // Load schedules when flock selected
  useEffect(() => {
    if (!selectedFlock) return;
    async function loadSchedule() {
      setLoading(true);
      const res = await fetch(`/api/operator/jadwal?flockId=${selectedFlock}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
        setExecutions(data.executions || []);
        setDayNumber(data.dayNumber || 0);
      }
      setLoading(false);
    }
    loadSchedule();
  }, [selectedFlock, successMsg]);

  const selectedFlockData = flocks.find((f) => f.id === selectedFlock);

  // Build display items: scheduled items + default "Air Biasa" if no schedule
  const displayItems: { id: string; name: string; dosage: string | null; method: string | null; isDefault: boolean; executed: boolean }[] = [];

  if (schedules.length > 0) {
    for (const s of schedules) {
      const executed = executions.some((e) => e.scheduleId === s.id);
      displayItems.push({ id: s.id, name: s.name, dosage: s.dosage, method: s.method, isDefault: false, executed });
    }
  } else {
    // Default: Air Biasa
    const executed = executions.some((e) => e.name === "Air Biasa");
    displayItems.push({ id: "default-air", name: "Air Biasa", dosage: null, method: "Air minum", isDefault: true, executed });
  }

  async function handleExecute() {
    if (!activeSchedule || !selectedFlock) return;
    setSaving(true);

    try {
      const res = await fetch("/api/operator/jadwal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockId: selectedFlock,
          scheduleId: activeSchedule.id.startsWith("default-") ? null : activeSchedule.id,
          name: activeSchedule.name,
          amount: amountInput || null,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`✅ ${activeSchedule.name} tercatat!`);
        setActiveSchedule(null);
        setAmountInput("");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-lg font-bold">Jadwal & Kesehatan</h1>
          <p className="text-xs text-muted-foreground">Pelaksanaan obat/vaksin hari ini</p>
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

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center font-medium">
          {successMsg}
        </div>
      )}

      {/* Day info */}
      {selectedFlock && (
        <div className="flex items-center gap-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
          <div>
            <p className="text-xs text-blue-600">Hari ke</p>
            <p className="text-lg font-bold text-blue-800">{dayNumber}</p>
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

      {/* Schedule Items */}
      {selectedFlock && !loading && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Jadwal Hari Ini</Label>
          <div className="space-y-2">
            {displayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.executed}
                onClick={() => {
                  if (!item.executed) {
                    setActiveSchedule({ id: item.id, name: item.name, dosage: item.dosage, method: item.method, notes: null, dayNumber });
                  }
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  item.executed
                    ? "border-green-200 bg-green-50 opacity-70"
                    : activeSchedule?.id === item.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30 active:scale-[0.98]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.dosage && <span className="text-xs text-muted-foreground">💊 {item.dosage}</span>}
                      {item.method && <span className="text-xs text-muted-foreground">• {item.method}</span>}
                      {item.isDefault && <span className="text-xs text-muted-foreground">Tidak ada jadwal khusus</span>}
                    </div>
                  </div>
                  {item.executed ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  ) : (
                    <span className="text-xs text-primary font-medium">Klik untuk isi →</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && selectedFlock && (
        <p className="text-sm text-muted-foreground text-center py-8">Memuat jadwal...</p>
      )}

      {/* Input amount modal (inline) */}
      {activeSchedule && (
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-bold">{activeSchedule.name}</p>
            {activeSchedule.dosage && (
              <p className="text-xs text-muted-foreground">Dosis: {activeSchedule.dosage}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jumlah yang diberikan</Label>
            <Input
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="Contoh: 2 liter, 1 botol, 50ml..."
              className="h-12 text-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExecute}
              className="flex-1 h-11 bg-gradient-primary hover:opacity-90"
              disabled={saving}
            >
              {saving ? "..." : "Simpan"}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => { setActiveSchedule(null); setAmountInput(""); }}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Today's executions log */}
      {executions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">✅ Sudah Dilaksanakan</Label>
          <div className="space-y-1">
            {executions.map((exec) => (
              <div key={exec.id} className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs font-medium text-green-800">{exec.name}</span>
                {exec.amount && <span className="text-xs text-green-600">— {exec.amount}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
