import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { WelcomeMessage } from "./welcome-message";

export default async function DashboardPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  const { data: activeFlocks } = await supabase
    .from("flocks")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "active");

  const { data: members } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", org.id);

  // Get latest records for active flocks (single batched query)
  let latestRecords: { flock: typeof activeFlocks extends (infer T)[] | null ? T : never; record: Record<string, unknown> }[] = [];
  
  if (activeFlocks && activeFlocks.length > 0) {
    const flockIds = activeFlocks.map((f) => f.id);
    
    // Get latest record per flock using a single query
    const { data: allRecords } = await supabase
      .from("daily_records")
      .select("*")
      .in("flock_id", flockIds)
      .eq("organization_id", org.id)
      .order("date", { ascending: false });

    // Group by flock_id and take the first (latest) record per flock
    const latestByFlock = new Map<string, Record<string, unknown>>();
    for (const record of allRecords || []) {
      if (!latestByFlock.has(record.flock_id)) {
        latestByFlock.set(record.flock_id, record);
      }
    }

    latestRecords = activeFlocks
      .filter((flock) => latestByFlock.has(flock.id))
      .map((flock) => ({ flock, record: latestByFlock.get(flock.id)! }));
  }

  const totalPopulation = latestRecords.reduce(
    (sum, { record }) => sum + (Number(record.remaining_population) || 0),
    0
  );

  const activeCoopsCount = (allCoops || []).filter((c) => c.status === "active").length;

  const avgFcr = latestRecords.length > 0
    ? latestRecords.reduce((sum, { record }) => sum + (Number(record.fcr) || 0), 0) / latestRecords.length
    : 0;

  const avgIp = latestRecords.length > 0
    ? latestRecords.reduce((sum, { record }) => sum + (Number(record.ip_score) || 0), 0) / latestRecords.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gradient-primary">Dashboard</h1>
        <WelcomeMessage name={session.user.name} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Kandang Aktif</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-2xl md:text-3xl font-bold">{activeCoopsCount}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground">dari {(allCoops || []).length} total kandang</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Populasi</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-2xl md:text-3xl font-bold">{totalPopulation.toLocaleString("id-ID")}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground">ekor ayam hidup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Rata-rata FCR</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-2xl md:text-3xl font-bold">{avgFcr.toFixed(3)}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground">semua flock aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Rata-rata IP</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-2xl md:text-3xl font-bold">{avgIp.toFixed(1)}</div>
            <p className="text-[11px] md:text-xs text-muted-foreground">Index Performa</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6">
          <CardTitle className="text-sm md:text-base">Flock Aktif</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
          {(activeFlocks || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada flock aktif. Buat kandang dan mulai periode pemeliharaan baru.</p>
          ) : (
            <>
              {/* Mobile: Card view */}
              <div className="space-y-3 md:hidden">
                {latestRecords.map(({ flock, record }) => {
                  const coop = (allCoops || []).find((c) => c.id === flock.coop_id);
                  const startDate = new Date(flock.start_date);
                  const today = new Date();
                  const dayNumber = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link key={flock.id} href={`/coops/${flock.coop_id}`} className="block">
                      <div className="rounded-xl border bg-white p-3 space-y-2 active:scale-[0.98] transition-transform">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{coop?.name || "-"}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{flock.strain.replace("_", " ")}</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Umur</p>
                            <p className="text-sm font-bold">{dayNumber}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Populasi</p>
                            <p className="text-sm font-bold">{Number(record.remaining_population)?.toLocaleString("id-ID") || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">FCR</p>
                            <p className="text-sm font-bold">{Number(record.fcr)?.toFixed(2) || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">IP</p>
                            <p className="text-sm font-bold">{Number(record.ip_score)?.toFixed(0) || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Kandang</th>
                      <th className="pb-2 font-medium">Strain</th>
                      <th className="pb-2 font-medium">Populasi</th>
                      <th className="pb-2 font-medium">Umur</th>
                      <th className="pb-2 font-medium">FCR</th>
                      <th className="pb-2 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestRecords.map(({ flock, record }) => {
                      const coop = (allCoops || []).find((c) => c.id === flock.coop_id);
                      const startDate = new Date(flock.start_date);
                      const today = new Date();
                      const dayNumber = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={flock.id} className="border-b last:border-0">
                          <td className="py-2">{coop?.name || "-"}</td>
                          <td className="py-2">
                            <Badge variant="outline" className="capitalize">{flock.strain.replace("_", " ")}</Badge>
                          </td>
                          <td className="py-2">{Number(record.remaining_population)?.toLocaleString("id-ID") || "-"}</td>
                          <td className="py-2">{dayNumber} hari</td>
                          <td className="py-2">{Number(record.fcr)?.toFixed(3) || "-"}</td>
                          <td className="py-2">{Number(record.ip_score)?.toFixed(1) || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {org.role === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Tim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(members || []).length} anggota terdaftar di organisasi ini.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
