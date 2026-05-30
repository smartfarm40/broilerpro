"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AssignCoopButtonProps {
  userId: string;
  currentCoopIds: string[];
  allCoops: { id: string; name: string }[];
}

export function AssignCoopButton({ userId, currentCoopIds, allCoops }: AssignCoopButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(currentCoopIds);
  const [loading, setLoading] = useState(false);

  function toggleCoop(coopId: string) {
    setSelected((prev) =>
      prev.includes(coopId)
        ? prev.filter((id) => id !== coopId)
        : [...prev, coopId]
    );
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/members/assign-coops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, coopIds: selected }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2"
        onClick={() => setOpen(true)}
      >
        ✏️ Ubah
      </Button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-medium">Pilih kandang:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allCoops.map((coop) => (
          <button
            key={coop.id}
            type="button"
            onClick={() => toggleCoop(coop.id)}
            className={`rounded-lg border p-2 text-left text-xs transition-all ${
              selected.includes(coop.id)
                ? "border-primary bg-primary/10 font-medium"
                : "border-border hover:border-primary/30"
            }`}
          >
            {coop.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={loading}>
          {loading ? "..." : "Simpan"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}
