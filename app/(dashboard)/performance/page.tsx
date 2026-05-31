import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PerformancePage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const { data: activeFlocks } = await supabase
    .from("flocks")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "active");

  const flocksList = activeFlocks || [];

  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  const coopsList = allCoops || [];

  // Get latest records for each flock
  const performanceData = await Promise.all(
    flocksList.map(async (flock) => {
      const { data: record } = await supabase
        .from("daily_records")
        .select("*")
        .eq("flock_id", flock.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();
      const coop = coopsList.find((c) => c.id === flock.coop_id);
      return { flock, record, coop };
    })
  );

  // Sort by IP Score descending
  const sorted = performanceData
    .filter((d) => d.record)
    .sort((a, b) => (b.record?.ip_score || 0) - (a.record?.ip_score || 0));

  function getPerformanceBadge(ipScore: number) {
    if (ipScore >= 400) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (ipScore >= 350) return { label: "Baik", color: "bg-blue-100 text-blue-800" };
    if (ipScore >= 300) return { label: "Cukup", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Perlu Perhatian", color: "bg-red-100 text-red-800" };
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Performa Kandang</h1>
        <p className="text-sm text-muted-foreground">Perbandingan performa semua flock aktif</p>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Belum ada data performa. Mulai input recording harian untuk melihat performa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Card-based ranking */}
          <div className="space-y-3 md:hidden">
            {sorted.map(({ flock, record, coop }, index) => {
              const badge = getPerformanceBadge(record?.ip_score || 0);
              const startDate = new Date(flock.start_date);
              const today = new Date();
              const dayNumber = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Card key={flock.id} className="overflow-hidden">
                  <div className="flex items-stretch">
                    {/* Rank number */}
                    <div className="flex items-center justify-center w-10 bg-gradient-primary text-white font-bold text-lg shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 p-3 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{coop?.name || "-"}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {flock.strain.replace("_", " ")} • {dayNumber} hari
                          </p>
                        </div>
                        <Badge className={badge.color} variant="secondary">
                          {badge.label}
                        </Badge>
                      </div>
                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-[10px] text-muted-foreground">Berat</p>
                          <p className="text-xs font-bold">{record?.avg_weight?.toFixed(0) || "-"}g</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-[10px] text-muted-foreground">FCR</p>
                          <p className="text-xs font-bold">{record?.fcr?.toFixed(2) || "-"}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-[10px] text-muted-foreground">ADG</p>
                          <p className="text-xs font-bold">{record?.adg?.toFixed(1) || "-"}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-[10px] text-muted-foreground">IP</p>
                          <p className="text-xs font-bold">{record?.ip_score?.toFixed(0) || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop: Table view */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>Ranking Performa (IP Score)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Kandang</th>
                      <th className="pb-2 font-medium">Strain</th>
                      <th className="pb-2 font-medium">Umur</th>
                      <th className="pb-2 font-medium">Berat (g)</th>
                      <th className="pb-2 font-medium">FCR</th>
                      <th className="pb-2 font-medium">ADG (g)</th>
                      <th className="pb-2 font-medium">Deplesi (%)</th>
                      <th className="pb-2 font-medium">IP Score</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(({ flock, record, coop }, index) => {
                      const badge = getPerformanceBadge(record?.ip_score || 0);
                      return (
                        <tr key={flock.id} className="border-b last:border-0">
                          <td className="py-2 font-bold">{index + 1}</td>
                          <td className="py-2">{coop?.name || "-"}</td>
                          <td className="py-2 capitalize">{flock.strain.replace("_", " ")}</td>
                          <td className="py-2">{record?.day_number} hari</td>
                          <td className="py-2">{record?.avg_weight?.toFixed(0) || "-"}</td>
                          <td className="py-2">{record?.fcr?.toFixed(3) || "-"}</td>
                          <td className="py-2">{record?.adg?.toFixed(1) || "-"}</td>
                          <td className="py-2">{record?.depletion?.toFixed(2) || "-"}%</td>
                          <td className="py-2 font-bold">{record?.ip_score?.toFixed(1) || "-"}</td>
                          <td className="py-2">
                            <Badge className={badge.color} variant="secondary">
                              {badge.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary cards - both mobile & desktop */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map(({ flock, record, coop }) => (
              <Card key={flock.id}>
                <CardContent className="p-3 md:p-4">
                  <p className="font-semibold text-xs md:text-sm truncate">{coop?.name}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">FCR</span>
                      <span className="font-bold">{record?.fcr?.toFixed(2) || "-"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">IP</span>
                      <span className="font-bold">{record?.ip_score?.toFixed(0) || "-"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Deplesi</span>
                      <span className="font-bold">{record?.depletion?.toFixed(1) || "-"}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
