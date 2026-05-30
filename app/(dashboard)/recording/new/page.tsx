"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewRecordingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flockId = searchParams.get("flockId") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedType, setFeedType] = useState("starter");
  const [healthCondition, setHealthCondition] = useState("normal");

  // Auto-calculate feed consumed
  const [feedIn, setFeedIn] = useState("");
  const [feedRemaining, setFeedRemaining] = useState("");
  const feedConsumed = (parseFloat(feedIn) || 0) - (parseFloat(feedRemaining) || 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      flockId,
      date: formData.get("date") as string,
      deadCount: parseInt(formData.get("deadCount") as string) || 0,
      cullCount: parseInt(formData.get("cullCount") as string) || 0,
      avgWeight: parseFloat(formData.get("avgWeight") as string) || null,
      sampleCount: parseInt(formData.get("sampleCount") as string) || null,
      feedType,
      feedIn: parseFloat(feedIn) || 0,
      feedRemaining: parseFloat(feedRemaining) || 0,
      healthCondition,
      medication: formData.get("medication") as string,
      symptoms: formData.get("symptoms") as string,
      tempMorning: parseFloat(formData.get("tempMorning") as string) || null,
      tempAfternoon: parseFloat(formData.get("tempAfternoon") as string) || null,
      tempEvening: parseFloat(formData.get("tempEvening") as string) || null,
      humidity: parseFloat(formData.get("humidity") as string) || null,
      notes: formData.get("notes") as string,
    };

    try {
      const res = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Gagal menyimpan recording");
      } else {
        router.push("/recording");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Input Recording Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Tanggal */}
            <div className="space-y-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Kematian & Populasi */}
            <div>
              <h3 className="mb-3 font-semibold">💀 Kematian & Populasi</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deadCount">Jumlah Mati</Label>
                  <Input id="deadCount" name="deadCount" type="number" min={0} defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cullCount">Jumlah Afkir</Label>
                  <Input id="cullCount" name="cullCount" type="number" min={0} defaultValue="0" />
                </div>
              </div>
            </div>

            {/* Berat Badan */}
            <div>
              <h3 className="mb-3 font-semibold">⚖️ Berat Badan</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="avgWeight">Berat Rata-rata (gram)</Label>
                  <Input id="avgWeight" name="avgWeight" type="number" step="0.1" min={0} placeholder="850" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sampleCount">Jumlah Sampel Timbang</Label>
                  <Input id="sampleCount" name="sampleCount" type="number" min={1} placeholder="50" />
                </div>
              </div>
            </div>

            {/* Pakan */}
            <div>
              <h3 className="mb-3 font-semibold">🌾 Konsumsi Pakan</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Jenis Pakan</Label>
                  <Select value={feedType} onValueChange={setFeedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="grower">Grower</SelectItem>
                      <SelectItem value="finisher">Finisher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedIn">Pakan Masuk (kg)</Label>
                  <Input
                    id="feedIn"
                    type="number"
                    step="0.1"
                    min={0}
                    value={feedIn}
                    onChange={(e) => setFeedIn(e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedRemaining">Pakan Sisa (kg)</Label>
                  <Input
                    id="feedRemaining"
                    type="number"
                    step="0.1"
                    min={0}
                    value={feedRemaining}
                    onChange={(e) => setFeedRemaining(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>
              {feedConsumed > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Konsumsi: <span className="font-medium text-foreground">{feedConsumed.toFixed(1)} kg</span>
                </p>
              )}
            </div>

            {/* Kesehatan */}
            <div>
              <h3 className="mb-3 font-semibold">💊 Kesehatan</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kondisi Umum</Label>
                  <Select value={healthCondition} onValueChange={setHealthCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="warning">Perhatian</SelectItem>
                      <SelectItem value="critical">Kritis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medication">Obat/Vaksin</Label>
                  <Input id="medication" name="medication" placeholder="Nama obat/vaksin..." />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="symptoms">Gejala/Catatan Kesehatan</Label>
                <Input id="symptoms" name="symptoms" placeholder="Deskripsi gejala..." />
              </div>
            </div>

            {/* Lingkungan */}
            <div>
              <h3 className="mb-3 font-semibold">🌡️ Lingkungan</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="tempMorning">Suhu Pagi (°C)</Label>
                  <Input id="tempMorning" name="tempMorning" type="number" step="0.1" placeholder="28" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempAfternoon">Suhu Siang (°C)</Label>
                  <Input id="tempAfternoon" name="tempAfternoon" type="number" step="0.1" placeholder="32" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempEvening">Suhu Malam (°C)</Label>
                  <Input id="tempEvening" name="tempEvening" type="number" step="0.1" placeholder="26" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="humidity">Kelembaban (%)</Label>
                  <Input id="humidity" name="humidity" type="number" step="0.1" min={0} max={100} placeholder="65" />
                </div>
              </div>
            </div>

            {/* Catatan */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Harian</Label>
              <Input id="notes" name="notes" placeholder="Catatan tambahan..." />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Recording"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
