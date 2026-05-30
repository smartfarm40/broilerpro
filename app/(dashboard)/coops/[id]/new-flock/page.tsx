"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewFlockPage() {
  const router = useRouter();
  const params = useParams();
  const coopId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [strain, setStrain] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      coopId,
      startDate: formData.get("startDate") as string,
      docCount: parseInt(formData.get("docCount") as string),
      strain,
      targetWeight: parseInt(formData.get("targetWeight") as string),
      targetDays: parseInt(formData.get("targetDays") as string),
      notes: formData.get("notes") as string,
    };

    try {
      const res = await fetch("/api/flocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Gagal membuat flock");
      } else {
        router.push(`/coops/${coopId}`);
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Mulai Flock Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal DOC Masuk</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docCount">Jumlah DOC</Label>
              <Input
                id="docCount"
                name="docCount"
                type="number"
                placeholder="5000"
                min={1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Strain Ayam</Label>
              <Select value={strain} onValueChange={setStrain} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih strain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ross_308">Ross 308</SelectItem>
                  <SelectItem value="cobb_500">Cobb 500</SelectItem>
                  <SelectItem value="arbor_acres">Arbor Acres</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Target Berat Panen (gram)</Label>
              <Input
                id="targetWeight"
                name="targetWeight"
                type="number"
                placeholder="2000"
                min={500}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDays">Target Hari Panen</Label>
              <Input
                id="targetDays"
                name="targetDays"
                type="number"
                placeholder="35"
                min={20}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Input id="notes" name="notes" placeholder="Catatan tambahan..." />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Mulai Flock"}
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
