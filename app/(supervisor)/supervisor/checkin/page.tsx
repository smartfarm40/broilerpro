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
  coopName: string;
}

interface Checkin {
  id: string;
  coopId: string;
  checkInTime: string;
  checkOutTime: string | null;
  condition: string;
  notes: string | null;
}

export default function CheckinPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [selectedCoop, setSelectedCoop] = useState("");
  const [condition, setCondition] = useState("baik");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      const [flocksRes, checkinsRes] = await Promise.all([
        fetch("/api/operator/active-flocks"),
        fetch("/api/supervisor/checkin"),
      ]);
      if (flocksRes.ok) {
        const data = await flocksRes.json();
        setFlocks(data);
      }
      if (checkinsRes.ok) {
        setCheckins(await checkinsRes.json());
      }
    }
    load();
  }, [refreshKey]);

  // Get unique coops from flocks
  const coopList = flocks.reduce((acc, f) => {
    if (!acc.find((c) => c.id === f.coopId)) {
      acc.push({ id: f.coopId, name: f.coopName });
    }
    return acc;
  }, [] as { id: string; name: string }[]);

  // Check which coops already have active checkin (no checkout yet)
  const activeCheckin = checkins.find((c) => !c.checkOutTime);

  async function handleCheckIn() {
    if (!selectedCoop) return;
    setLoading(true);

    const res = await fetch("/api/supervisor/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coopId: selectedCoop, condition, notes }),
    });

    if (res.ok) {
      setMessage("✅ Check-in berhasil!");
      setNotes("");
      setSelectedCoop("");
      setRefreshKey((k) => k + 1);
      setTimeout(() => setMessage(""), 3000);
    }
    setLoading(false);
  }

  async function handleCheckOut(checkinId: string) {
    setLoading(true);

    const res = await fetch("/api/supervisor/checkin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkinId }),
    });

    if (res.ok) {
      setMessage("✅ Check-out berhasil!");
      setRefreshKey((k) => k + 1);
      setTimeout(() => setMessage(""), 3000);
    }
    setLoading(false);
  }

  const conditionOptions = [
    { value: "baik", label: "Baik", color: "border-green-300 bg-green-50 text-green-800", icon: "✅" },
    { value: "perhatian", label: "Perhatian", color: "border-amber-300 bg-amber-50 text-amber-800", icon: "⚠️" },
    { value: "bermasalah", label: "Bermasalah", color: "border-red-300 bg-red-50 text-red-800", icon: "🚨" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/supervisor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Check-in Kunjungan</h1>
          <p className="text-xs text-muted-foreground">Bukti visit ke kandang</p>
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center font-medium">
          {message}
        </div>
      )}

      {/* Active Check-in Banner */}
      {activeCheckin && (
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">🟢 Sedang di Kandang</p>
              <p className="text-sm font-bold text-blue-900">
                {coopList.find((c) => c.id === activeCheckin.coopId)?.name || "Kandang"}
              </p>
              <p className="text-xs text-blue-700">Masuk: {activeCheckin.checkInTime}</p>
            </div>
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
              onClick={() => handleCheckOut(activeCheckin.id)}
              disabled={loading}
            >
              Check-out
            </Button>
          </div>
        </div>
      )}

      {/* Check-in Form (only if no active checkin) */}
      {!activeCheckin && (
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          <p className="text-sm font-semibold">Check-in ke Kandang</p>

          {/* Pilih Kandang */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Pilih Kandang</Label>
            <div className="grid grid-cols-2 gap-2">
              {coopList.map((coop) => {
                const alreadyVisited = checkins.some((c) => c.coopId === coop.id);
                return (
                  <button
                    key={coop.id}
                    type="button"
                    onClick={() => setSelectedCoop(coop.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selectedCoop === coop.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="text-sm font-semibold">{coop.name}</p>
                    {alreadyVisited && (
                      <p className="text-[10px] text-green-600">✓ Sudah visit hari ini</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kondisi */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Kondisi Kandang</Label>
            <div className="grid grid-cols-3 gap-2">
              {conditionOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCondition(opt.value)}
                  className={`rounded-xl border py-2.5 text-center text-xs font-medium transition-all ${
                    condition === opt.value
                      ? `${opt.color} ring-2 ring-primary/20`
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Catatan (opsional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kondisi litter, ventilasi, dll..."
              className="h-11"
            />
          </div>

          <Button
            onClick={handleCheckIn}
            className="w-full h-12 text-base bg-gradient-primary hover:opacity-90"
            disabled={loading || !selectedCoop}
          >
            {loading ? "..." : "📍 Check-in Sekarang"}
          </Button>
        </div>
      )}

      {/* Today's Visit History */}
      {checkins.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Riwayat Hari Ini</p>
          {checkins.map((checkin) => {
            const coopName = coopList.find((c) => c.id === checkin.coopId)?.name || "Kandang";
            const condOpt = conditionOptions.find((o) => o.value === checkin.condition);
            return (
              <div key={checkin.id} className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{coopName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        🕐 {checkin.checkInTime}
                        {checkin.checkOutTime ? ` → ${checkin.checkOutTime}` : " (aktif)"}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${condOpt?.color || ""}`}>
                    {condOpt?.icon} {condOpt?.label}
                  </span>
                </div>
                {checkin.notes && (
                  <p className="text-xs text-muted-foreground mt-1 border-t pt-1">{checkin.notes}</p>
                )}
                {checkin.checkInTime && checkin.checkOutTime && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Durasi: {calculateDuration(checkin.checkInTime, checkin.checkOutTime)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function calculateDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin < 60) return `${diffMin} menit`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours} jam ${mins > 0 ? `${mins} menit` : ""}`.trim();
}
