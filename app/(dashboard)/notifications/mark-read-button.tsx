"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMarkRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications/mark-read", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleMarkRead} disabled={loading}>
      {loading ? "..." : "Tandai Semua Dibaca"}
    </Button>
  );
}
