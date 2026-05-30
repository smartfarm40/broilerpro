import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function RecordingPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const { data: assignments } = await supabase
    .from("coop_assignments")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("organization_id", org.id);

  const assignmentsList = assignments || [];
  const assignedCoopIds = assignmentsList.map((a) => a.coop_id);

  let flocksList: any[] = [];
  if (assignedCoopIds.length > 0) {
    const { data } = await supabase
      .from("flocks")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "active")
      .in("coop_id", assignedCoopIds);
    flocksList = data || [];
  } else {
    const { data } = await supabase
      .from("flocks")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "active");
    flocksList = data || [];
  }

  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  const coopsList = allCoops || [];

  // Get recent records for all assigned flocks
  const recentRecords = await Promise.all(
    flocksList.map(async (flock) => {
      const { data: records } = await supabase
        .from("daily_records")
        .select("*")
        .eq("flock_id", flock.id)
        .order("date", { ascending: false })
        .limit(7);
      const coop = coopsList.find((c) => c.id === flock.coop_id);
      return { flock, coop, records: records || [] };
    })
  );

  const healthColors: Record<string, string> = {
    normal: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    critical: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/supervisor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Recording Harian</h1>
      </div>

      {recentRecords.map(({ flock, coop, records }) => (
        <div key={flock.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-sm font-bold">{coop?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{flock.strain.replace("_", " ")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Tgl</th>
                  <th className="px-2 py-1.5 text-right font-medium">Hari</th>
                  <th className="px-2 py-1.5 text-right font-medium">Mati</th>
                  <th className="px-2 py-1.5 text-right font-medium">Pop</th>
                  <th className="px-2 py-1.5 text-right font-medium">Berat</th>
                  <th className="px-2 py-1.5 text-right font-medium">Pakan</th>
                  <th className="px-2 py-1.5 text-center font-medium">Kes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-2 py-1.5">{new Date(r.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td>
                    <td className="px-2 py-1.5 text-right">{r.day_number}</td>
                    <td className="px-2 py-1.5 text-right text-red-600">{(r.dead_count || 0) + (r.cull_count || 0)}</td>
                    <td className="px-2 py-1.5 text-right">{r.remaining_population.toLocaleString("id-ID")}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{r.avg_weight?.toFixed(0) || "-"}</td>
                    <td className="px-2 py-1.5 text-right">{r.feed_consumed?.toFixed(0) || "-"}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`inline-block h-2 w-2 rounded-full ${r.health_condition === "normal" ? "bg-green-500" : r.health_condition === "warning" ? "bg-amber-500" : "bg-red-500"}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <p className="px-4 py-4 text-xs text-muted-foreground text-center">Belum ada recording</p>
          )}
        </div>
      ))}
    </div>
  );
}
