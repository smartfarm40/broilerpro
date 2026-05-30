import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CoopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const { data: coop } = await supabase
    .from("coops")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (!coop) notFound();

  const { data: coopFlocks } = await supabase
    .from("flocks")
    .select("*")
    .eq("coop_id", id)
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  const flocksList = coopFlocks || [];

  const activeFlock = flocksList.find((f) => f.status === "active");

  // Get latest record for active flock
  let latestRecord = null;
  if (activeFlock) {
    const { data } = await supabase
      .from("daily_records")
      .select("*")
      .eq("flock_id", activeFlock.id)
      .order("date", { ascending: false })
      .limit(1)
      .single();
    latestRecord = data;
  }

  const statusLabels: Record<string, string> = {
    active: "Aktif",
    empty: "Kosong",
    harvest: "Panen",
    inactive: "Nonaktif",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{coop.name}</h1>
          <p className="text-muted-foreground">
            📍 {coop.location || "Lokasi belum diatur"} • Kapasitas: {coop.capacity.toLocaleString("id-ID")} ekor
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {statusLabels[coop.status || "empty"]}
        </Badge>
      </div>

      {/* Active Flock Info */}
      {activeFlock ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Flock Aktif</CardTitle>
              <Link href={`/recording/new?flockId=${activeFlock.id}`}>
                <Button size="sm">+ Input Recording</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Strain</p>
                <p className="font-medium capitalize">{activeFlock.strain.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DOC Masuk</p>
                <p className="font-medium">{activeFlock.doc_count.toLocaleString("id-ID")} ekor</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Masuk</p>
                <p className="font-medium">{new Date(activeFlock.start_date).toLocaleDateString("id-ID")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Umur</p>
                <p className="font-medium">
                  {Math.floor((Date.now() - new Date(activeFlock.start_date).getTime()) / (1000 * 60 * 60 * 24))} hari
                </p>
              </div>
            </div>

            {latestRecord && (
              <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Populasi Sisa</p>
                  <p className="text-xl font-bold">{latestRecord.remaining_population.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Berat Rata-rata</p>
                  <p className="text-xl font-bold">{latestRecord.avg_weight?.toFixed(0) || "-"} g</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">FCR</p>
                  <p className="text-xl font-bold">{latestRecord.fcr?.toFixed(3) || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Score</p>
                  <p className="text-xl font-bold">{latestRecord.ip_score?.toFixed(1) || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">Belum ada flock aktif di kandang ini.</p>
            {(org.role === "owner" || org.role === "manager") && (
              <Link href={`/coops/${id}/new-flock`}>
                <Button>Mulai Flock Baru</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flock History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Riwayat Flock</CardTitle>
            {(org.role === "owner" || org.role === "manager") && !activeFlock && (
              <Link href={`/coops/${id}/new-flock`}>
                <Button size="sm" variant="outline">+ Flock Baru</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {flocksList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat flock.</p>
          ) : (
            <div className="space-y-2">
              {flocksList.map((flock) => (
                <div
                  key={flock.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {flock.strain.replace("_", " ")} — {flock.doc_count.toLocaleString("id-ID")} DOC
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mulai: {new Date(flock.start_date).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <Badge variant={flock.status === "active" ? "default" : "secondary"} className="capitalize">
                    {flock.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
