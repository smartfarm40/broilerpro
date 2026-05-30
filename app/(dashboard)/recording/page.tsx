import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function RecordingPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  // Get active flocks
  const { data: activeFlocks } = await supabase
    .from("flocks")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "active");

  const flocksList = activeFlocks || [];

  // Get recent records
  const { data: recentRecords } = await supabase
    .from("daily_records")
    .select("*")
    .eq("organization_id", org.id)
    .order("date", { ascending: false })
    .limit(20);

  const recordsList = recentRecords || [];

  // Get coops for display
  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  const coopsList = allCoops || [];

  const healthColors: Record<string, string> = {
    normal: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recording Harian</h1>
          <p className="text-muted-foreground">Input dan lihat data recording harian</p>
        </div>
      </div>

      {/* Quick Input Cards */}
      {flocksList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Input Recording Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {flocksList.map((flock) => {
                const coop = coopsList.find((c) => c.id === flock.coop_id);
                const dayNumber = Math.floor(
                  (Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <Link key={flock.id} href={`/recording/new?flockId=${flock.id}`}>
                    <div className="rounded-md border p-3 transition-colors hover:bg-muted cursor-pointer">
                      <p className="font-medium">{coop?.name || "Kandang"}</p>
                      <p className="text-sm text-muted-foreground">
                        Hari ke-{dayNumber} • {flock.strain.replace("_", " ")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Records */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Recording</CardTitle>
        </CardHeader>
        <CardContent>
          {recordsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada recording.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Tanggal</th>
                    <th className="pb-2 font-medium">Hari</th>
                    <th className="pb-2 font-medium">Populasi</th>
                    <th className="pb-2 font-medium">Mati</th>
                    <th className="pb-2 font-medium">Berat (g)</th>
                    <th className="pb-2 font-medium">Pakan (kg)</th>
                    <th className="pb-2 font-medium">FCR</th>
                    <th className="pb-2 font-medium">Kondisi</th>
                  </tr>
                </thead>
                <tbody>
                  {recordsList.map((record) => (
                    <tr key={record.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(record.date).toLocaleDateString("id-ID")}</td>
                      <td className="py-2">{record.day_number}</td>
                      <td className="py-2">{record.remaining_population.toLocaleString("id-ID")}</td>
                      <td className="py-2">{record.dead_count || 0}</td>
                      <td className="py-2">{record.avg_weight?.toFixed(0) || "-"}</td>
                      <td className="py-2">{record.feed_consumed?.toFixed(1) || "-"}</td>
                      <td className="py-2">{record.fcr?.toFixed(3) || "-"}</td>
                      <td className="py-2">
                        <Badge className={healthColors[record.health_condition || "normal"]} variant="secondary">
                          {record.health_condition || "normal"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
