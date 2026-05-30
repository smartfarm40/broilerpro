import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  // Get latest records for active flocks
  const latestRecords = [];
  for (const flock of activeFlocks || []) {
    const { data: record } = await supabase
      .from("daily_records")
      .select("*")
      .eq("flock_id", flock.id)
      .eq("organization_id", org.id)
      .order("date", { ascending: false })
      .limit(1)
      .single();
    if (record) {
      latestRecords.push({ flock, record });
    }
  }

  const totalPopulation = latestRecords.reduce(
    (sum, { record }) => sum + (record.remaining_population || 0),
    0
  );

  const activeCoopsCount = (allCoops || []).filter((c) => c.status === "active").length;

  const avgFcr = latestRecords.length > 0
    ? latestRecords.reduce((sum, { record }) => sum + (record.fcr || 0), 0) / latestRecords.length
    : 0;

  const avgIp = latestRecords.length > 0
    ? latestRecords.reduce((sum, { record }) => sum + (record.ip_score || 0), 0) / latestRecords.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gradient-primary">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {session.user.name}. Berikut ringkasan farm Anda.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kandang Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCoopsCount}</div>
            <p className="text-xs text-muted-foreground">dari {(allCoops || []).length} total kandang</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Populasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPopulation.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">ekor ayam hidup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata FCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgFcr.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">semua flock aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata IP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgIp.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Index Performa</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flock Aktif</CardTitle>
        </CardHeader>
        <CardContent>
          {(activeFlocks || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada flock aktif. Buat kandang dan mulai periode pemeliharaan baru.</p>
          ) : (
            <div className="overflow-x-auto">
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
                        <td className="py-2">{record.remaining_population?.toLocaleString("id-ID")}</td>
                        <td className="py-2">{dayNumber} hari</td>
                        <td className="py-2">{record.fcr?.toFixed(3) || "-"}</td>
                        <td className="py-2">{record.ip_score?.toFixed(1) || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
