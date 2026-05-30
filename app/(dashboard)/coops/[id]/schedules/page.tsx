"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Schedule {
  id: string;
  dayNumber: number;
  name: string;
  dosage: string | null;
  method: string | null;
  notes: string | null;
}

interface Flock {
  id: string;
  strain: string;
  startDate: string;
  status: string;
}

export default function SchedulesPage() {
  const params = useParams();
  const coopId = params.id as string;
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFlock, setSelectedFlock] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Form
  const [dayNumber, setDayNumber] = useState("");
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [method, setMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/coops");
      if (res.ok) {
        const coops = await res.json();
        // Get flocks for this coop - use the flocks from active-flocks or a dedicated endpoint
      }
      // Load flocks via a simple fetch
      const flocksRes = await fetch(`/api/flocks?coopId=${coopId}`);
      if (flocksRes.ok) {
        const data = await flocksRes.json();
        setFlocks(data);
        const active = data.find((f: Flock) => f.status === "active");
        if (active) setSelectedFlock(active.id);
      }
    }
    load();
  }, [coopId]);

  useEffect(() => {
    if (!selectedFlock) return;
    async function loadSchedules() {
      setLoading(true);
      const res = await fetch(`/api/schedules?flockId=${selectedFlock}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
      setLoading(false);
    }
    loadSchedules();
  }, [selectedFlock, message]);

  async function handleAdd(e: React.FormEvent) {
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
      setMessage(`✅ Jadwal hari ke-${dayNumber} ditambahkan`);
      setDayNumber("");
      setName("");
      setDosage("");
      setMethod("");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }

  const sortedSchedules = [...schedules].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/coops/${coopId}`}>
          <Button variant="outline" size="sm">← Kembali</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Jadwal Obat & Vaksin</h1>
          <p className="text-sm text-muted-foreground">Atur jadwal per hari untuk operator</p>
        </div>
      </div>

      {/* Add Schedule Form */}
      <Card>
        <CardHeader>
          <CardTitle>Tambah Jadwal</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-3 rounded-lg bg-green-50 border border-green-200 p-2 text-sm text-green-700">{message}</div>
          )}
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Hari ke-</Label>
              <Input
                type="number"
                min={1}
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                placeholder="7"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nama Obat/Vaksin</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ND Vaksin"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dosis</Label>
              <Input
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="1ml/liter"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cara Pemberian</Label>
              <Input
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Air minum"
              />
            </div>
            <div className="col-span-2">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "..." : "Tambah Jadwal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Jadwal ({schedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada jadwal. Tambahkan jadwal obat/vaksin untuk operator.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                        H-{s.dayNumber}
                      </span>
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                      {s.dosage && <span>💊 {s.dosage}</span>}
                      {s.method && <span>• {s.method}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
