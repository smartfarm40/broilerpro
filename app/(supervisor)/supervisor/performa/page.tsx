import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { STRAIN_STANDARDS } from "@/src/lib/types";

export default async function PerformaPage() {
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

  // Get last 7 days records for each flock
  const flockData = await Promise.all(
    flocksList.map(async (flock) => {
      const coop = coopsList.find((c) => c.id === flock.coop_id);
      const { data: records } = await supabase
        .from("daily_records")
        .select("*")
        .eq("flock_id", flock.id)
        .order("date", { ascending: false })
        .limit(7);

      const recordsList = records || [];
      const latest = recordsList[0];
      const dayNumber = Math.floor((Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24));
      return { flock, coop, records: recordsList.reverse(), latest, dayNumber };
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/supervisor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Performa Kandang</h1>
      </div>

      {flockData.map(({ flock, coop, records, latest, dayNumber }) => (
        <div key={flock.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{coop?.name}</p>
            <p className="text-xs text-muted-foreground">Hari ke-{dayNumber}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xs text-blue-600">FCR</p>
              <p className="text-xl font-bold text-blue-800">{latest?.fcr?.toFixed(3) || "-"}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-center">
              <p className="text-xs text-emerald-600">IP Score</p>
              <p className="text-xl font-bold text-emerald-800">{latest?.ip_score?.toFixed(0) || "-"}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-xs text-purple-600">ADG</p>
              <p className="text-xl font-bold text-purple-800">{latest?.adg?.toFixed(1) || "-"} g</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-xs text-red-600">Deplesi</p>
              <p className="text-xl font-bold text-red-800">{latest?.depletion?.toFixed(2) || "0"}%</p>
            </div>
          </div>

          {/* 7-day weight trend (simple text) */}
          {records.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Trend Berat 7 Hari Terakhir</p>
              <div className="flex items-end gap-1 h-16">
                {records.map((r, i) => {
                  const maxW = Math.max(...records.map((rec) => rec.avg_weight || 0));
                  const h = maxW > 0 ? ((r.avg_weight || 0) / maxW) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-purple-400 min-h-[4px]"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground">{r.day_number}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                <span>{records[0]?.avg_weight?.toFixed(0) || 0}g</span>
                <span>{records[records.length - 1]?.avg_weight?.toFixed(0) || 0}g</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
