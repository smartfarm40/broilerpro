"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Flock {
  id: string;
  coopId: string;
  strain: string;
  startDate: string;
  coopName?: string;
}

interface Schedule {
  id: string;
  dayNumber: number;
  name: string;
  dosage: string | null;
  method: string | null;
}

interface ConditionRecord {
  id: string;
  date: string;
  condition: string;
  symptoms: string;
  notes: string;
  coopName: string;
}

export default function JadwalSupervisorPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlock, setSelectedFlock] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Schedule form
  const [dayNumber, setDayNumber] = useState("");
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [method, setMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Condition form
  const [conditionTab, setConditionTab] = useState<"jadwal" | "kondisi">("jadwal");
  const [flockCondition, setFlockCondition] = useState("normal");
  const [symptoms, setSymptoms] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [savingCondition, setSavingCondition] = useState(false);
  const [conditionHistory, setConditionHistory] = useState<ConditionRecord[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/operator/active-flocks");
      if (res.ok) {
        const data = await res.json();
        setFlocks(data);
        if (data.length === 1) setSelectedFlock(data[0].id);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedFlock) return;
    async function loadData() {
      const [schedRes, condRes] = await Promise.all([
        fetch(`/api/schedules?flockId=${selectedFlock}`),
        fetch(`/api/supervisor/condition?flockId=${selectedFlock}`),
      ]);
      if (schedRes.ok) setSchedules(await schedRes.json());
      if (condRes.ok) setConditionHistory(await condRes.json());
    }
    loadData();
  }, [selectedFlock, message]);

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlock || !dayNumber || !name) return;
    setSaving(true);

    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flockId: selectedFlock,
        dayNumber: parseInt(dayNumber),
        name,
        dosage: dosage || null,
        method: method || null,
      }),
    });

    if (res.ok) {
      setMessage(`✅ Jadwal H-${dayNumber} ditambahkan`);
      setDayNumber("");
      setName("");
      setDosage("");
      setMethod("");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }

  async function handleSaveCondition() {
    if (!selectedFlock) return;
    setSavingCondition(true);

    const res = await fetch("/api/supervisor/condition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flockId: selectedFlock,
        condition: flockCondition,
        symptoms,
        notes: conditionNotes,
      }),
    });

    if (res.ok) {
      setMessage("✅ Kondisi ayam tercatat!");
      setSymptoms("");
      setConditionNotes("");
      setFlockCondition("normal");
      setTimeout(() => setMessage(""), 3000);
    }
    setSavingCondition(false);
  }

  const sorted = [...schedules].sort((a, b) => a.dayNumber - b.dayNumber);
  const selectedFlockData = flocks.find((f) => f.id === selectedFlock);

  const conditionOptions = [
    { value: "normal", label: "Normal", icon: "✅", color: "border-green-300 bg-green-50 text-green-800" },
    { value: "warning", label: "Perhatian", icon: "⚠️", color: "border-amber-300 bg-amber-50 text-amber-800" },
    { value: "critical", label: "Kritis", icon: "🚨", color: "border-red-300 bg-red-50 text-red-800" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/supervisor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Jadwal & Kondisi</h1>
          <p className="text-xs text-muted-foreground">Obat/vaksin & kondisi ayam</p>
        </div>
        {selectedFlockData && (
          <div className="rounded-xl border border-primary bg-primary/5 px-3 py-2 text-right">
            <p className="text-sm font-semibold">{selectedFlockData.coopName}</p>
          </div>
        )}
      </div>

      {/* Flock selector */}
      {flocks.length > 1 && (
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
      )}

      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center">{message}</div>
      )}

      {/* Tab Switcher */}
      {selectedFlock && (
        <div className="flex rounded-xl border bg-muted/30 p-1 gap-1">
          <button
            onClick={() => setConditionTab("jadwal")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              conditionTab === "jadwal" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            📋 Jadwal Obat
          </button>
          <button
            onClick={() => setConditionTab("kondisi")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              conditionTab === "kondisi" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            🐔 Kondisi Ayam
          </button>
        </div>
      )}

      {/* === TAB: Jadwal Obat === */}
      {conditionTab === "jadwal" && selectedFlock && (
        <>
          {/* Add Form */}
          <form onSubmit={handleAddSchedule} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold">Tambah Jadwal</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Hari ke-</Label>
                <Input
                  type="number"
                  min={1}
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  placeholder="7"
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Obat/Vaksin</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ND Vaksin"
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dosis</Label>
                <Input
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="1ml/liter"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cara</Label>
                <Input
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="Air minum"
                  className="h-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-10 bg-gradient-primary hover:opacity-90" disabled={saving}>
              {saving ? "..." : "Tambah Jadwal"}
            </Button>
          </form>

          {/* Schedule List */}
          {sorted.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Daftar Jadwal ({sorted.length})</p>
              {sorted.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
                  <span className="flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    H-{s.dayNumber}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[s.dosage, s.method].filter(Boolean).join(" • ") || "Tanpa detail"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === TAB: Kondisi Ayam === */}
      {conditionTab === "kondisi" && selectedFlock && (
        <>
          {/* Condition Form */}
          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
            <p className="text-sm font-semibold">Catat Kondisi Ayam</p>

            {/* Condition selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Kondisi Umum</Label>
              <div className="grid grid-cols-3 gap-2">
                {conditionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFlockCondition(opt.value)}
                    className={`rounded-xl border py-3 text-center text-xs font-medium transition-all ${
                      flockCondition === opt.value
                        ? `${opt.color} ring-2 ring-primary/20`
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Gejala yang Terlihat</Label>
              <Input
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Contoh: ngorok, lesu, diare, bulu kusam..."
                className="h-11"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Catatan Tambahan</Label>
              <Input
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Tindakan yang sudah dilakukan..."
                className="h-11"
              />
            </div>

            <Button
              onClick={handleSaveCondition}
              className="w-full h-11 bg-gradient-primary hover:opacity-90"
              disabled={savingCondition}
            >
              {savingCondition ? "..." : "Simpan Kondisi"}
            </Button>
          </div>

          {/* Condition History */}
          {conditionHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Riwayat Kondisi</p>
              {conditionHistory.map((rec) => {
                const opt = conditionOptions.find((o) => o.value === rec.condition);
                return (
                  <div key={rec.id} className="rounded-xl border bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(rec.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${opt?.color || ""}`}>
                        {opt?.icon} {opt?.label}
                      </span>
                    </div>
                    {rec.symptoms && (
                      <p className="text-xs mt-1"><span className="text-muted-foreground">Gejala:</span> {rec.symptoms}</p>
                    )}
                    {rec.notes && (
                      <p className="text-xs mt-0.5"><span className="text-muted-foreground">Catatan:</span> {rec.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
