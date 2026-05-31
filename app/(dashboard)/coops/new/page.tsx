"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LatLng {
  lat: number;
  lng: number;
}

export default function NewCoopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState<LatLng | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Add Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    if (!(window as unknown as Record<string, unknown>).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  function initMap() {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = (window as unknown as Record<string, unknown>).L as {
      map: (el: HTMLElement, opts: Record<string, unknown>) => unknown;
      tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (map: unknown) => void };
      marker: (latlng: [number, number]) => { addTo: (map: unknown) => unknown; setLatLng: (latlng: [number, number]) => void; getLatLng: () => { lat: number; lng: number } };
      latLng: (lat: number, lng: number) => unknown;
    };

    // Default center: Indonesia
    const defaultCenter: [number, number] = [-6.2, 106.8];

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 10,
      zoomControl: true,
    }) as { on: (event: string, fn: (e: { latlng: { lat: number; lng: number } }) => void) => void; setView: (center: [number, number], zoom: number) => void };

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map as unknown);

    mapInstanceRef.current = map;

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 15);
        },
        () => {
          // Fallback to default
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    // Click to place pin
    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;
      setPin({ lat, lng });

      if (markerRef.current) {
        (markerRef.current as { setLatLng: (latlng: [number, number]) => void }).setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng]).addTo(map as unknown);
        markerRef.current = marker;
      }
    });

    setMapReady(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      capacity: parseInt(formData.get("capacity") as string),
      location: formData.get("location") as string,
      latitude: pin?.lat || null,
      longitude: pin?.lng || null,
    };

    try {
      const res = await fetch("/api/coops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Gagal menambah kandang");
      } else {
        router.push("/coops");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  function clearPin() {
    setPin(null);
    if (markerRef.current && mapInstanceRef.current) {
      (mapInstanceRef.current as { removeLayer: (layer: unknown) => void }).removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Kandang Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kandang</Label>
                <Input id="name" name="name" placeholder="Kandang A1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Kapasitas (ekor)</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  placeholder="5000"
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi (deskripsi)</Label>
              <Input id="location" name="location" placeholder="Blok A, Area Timur" />
            </div>

            {/* Map Pin Location */}
            <div className="space-y-2">
              <Label>📍 Pin Lokasi di Peta</Label>
              <p className="text-xs text-muted-foreground">
                Tap/klik pada peta untuk menandai lokasi kandang
              </p>
              <div
                ref={mapRef}
                className="w-full h-[300px] rounded-lg border overflow-hidden bg-muted"
                style={{ zIndex: 0 }}
              />
              {!mapReady && (
                <p className="text-xs text-muted-foreground">Memuat peta...</p>
              )}
              {pin && (
                <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-2.5">
                  <div className="text-xs text-green-800">
                    <span className="font-medium">📍 Lokasi dipilih:</span>{" "}
                    {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearPin}
                    className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    ✕ Hapus
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "💾 Simpan Kandang"}
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
