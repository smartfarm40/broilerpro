import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import Link from "next/link";
import { STRAIN_STANDARDS } from "@/src/lib/types";

export default async function SupervisorHomePage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  // Get assigned coops
  const { data: assignments } = await supabase
    .from("coop_assignments")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("organization_id", org.id);

  const assignmentsList = assignments || [];
  const assignedCoopIds = assignmentsList.map((a) => a.coop_id);

  // Get active flocks
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
  const today = new Date().toISOString().split("T")[0];

  // Build flock details
  const flockDetails = await Promise.all(
    flocksList.map(async (flock) => {
      const coop = coopsList.find((c) => c.id === flock.coop_id);
      const dayNumber = Math.floor(
        (Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysLeft = flock.target_days - dayNumber;

      // Latest record
      const { data: lastRecord } = await supabase
        .from("daily_records")
        .select("*")
        .eq("flock_id", flock.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      // Today's record
      const { data: todayRecord } = await supabase
        .from("daily_records")
        .select("*")
        .eq("flock_id", flock.id)
        .eq("date", today)
        .limit(1)
        .single();

      // Standard weight for comparison
      const standards = STRAIN_STANDARDS[flock.strain] || [];
      const targetWeight = standards[dayNumber] || flock.target_weight;
      const actualWeight = lastRecord?.avg_weight || 0;
      const weightPercent = targetWeight > 0 ? (actualWeight / targetWeight) * 100 : 0;

      // Pending schedules
      const { data: schedules } = await supabase
        .from("medication_schedules")
        .select("*")
        .eq("flock_id", flock.id)
        .eq("day_number", dayNumber);

      const schedulesList = schedules || [];

      const { data: executions } = await supabase
        .from("medication_executions")
        .select("*")
        .eq("flock_id", flock.id)
        .eq("date", today);

      const executionsList = executions || [];

      const pendingMeds = schedulesList.filter(
        (s) => !executionsList.some((e) => e.schedule_id === s.id)
      );

      return {
        flock,
        coop,
        dayNumber,
        daysLeft,
        lastRecord,
        todayRecord,
        targetWeight,
        actualWeight,
        weightPercent,
        pendingMeds,
      };
    })
  );

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold">Halo, {session.user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white border p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">{flocksList.length}</p>
          <p className="text-[10px] text-muted-foreground">Kandang Aktif</p>
        </div>
        <div className="rounded-xl bg-white border p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">
            {flockDetails.filter((d) => d.todayRecord).length}
          </p>
          <p className="text-[10px] text-muted-foreground">Sudah Record</p>
        </div>
        <div className="rounded-xl bg-white border p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-600">
            {flockDetails.reduce((sum, d) => sum + d.pendingMeds.length, 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">Jadwal Pending</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/supervisor/checkin">
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-b from-blue-100 to-blue-50 p-3 text-center shadow-[0_4px_0_0_rgba(37,99,235,0.25)] active:shadow-[0_1px_0_0_rgba(37,99,235,0.25)] active:translate-y-[3px] transition-all">
            <p className="text-lg">📍</p>
            <p className="text-xs font-semibold text-blue-900">Check-in</p>
          </div>
        </Link>
        <Link href="/supervisor/jadwal">
          <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-b from-purple-100 to-purple-50 p-3 text-center shadow-[0_4px_0_0_rgba(126,34,206,0.25)] active:shadow-[0_1px_0_0_rgba(126,34,206,0.25)] active:translate-y-[3px] transition-all">
            <p className="text-lg">📋</p>
            <p className="text-xs font-semibold text-purple-900">Atur Jadwal</p>
          </div>
        </Link>
        <Link href="/supervisor/performa">
          <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-100 to-emerald-50 p-3 text-center shadow-[0_4px_0_0_rgba(5,150,105,0.25)] active:shadow-[0_1px_0_0_rgba(5,150,105,0.25)] active:translate-y-[3px] transition-all">
            <p className="text-lg">📈</p>
            <p className="text-xs font-semibold text-emerald-900">Performa</p>
          </div>
        </Link>
        <Link href="/supervisor/log">
          <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-b from-amber-100 to-amber-50 p-3 text-center shadow-[0_4px_0_0_rgba(217,119,6,0.25)] active:shadow-[0_1px_0_0_rgba(217,119,6,0.25)] active:translate-y-[3px] transition-all">
            <p className="text-lg">🕐</p>
            <p className="text-xs font-semibold text-amber-900">Log Aktivitas</p>
          </div>
        </Link>
      </div>

      {/* Flock Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Detail Kandang</h2>
        {flockDetails.map(({ flock, coop, dayNumber, daysLeft, lastRecord, todayRecord, targetWeight, actualWeight, weightPercent, pendingMeds }) => (
          <div key={flock.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{coop?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {flock.strain.replace("_", " ")} • Hari ke-{dayNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Sisa</p>
                <p className={`text-sm font-bold ${daysLeft <= 5 ? "text-red-600" : daysLeft <= 10 ? "text-amber-600" : "text-emerald-600"}`}>
                  {daysLeft > 0 ? `${daysLeft} hari` : "Siap panen"}
                </p>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Populasi</p>
                <p className="text-sm font-bold">{(lastRecord?.remaining_population || flock.doc_count).toLocaleString("id-ID")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Berat</p>
                <p className="text-sm font-bold">{actualWeight ? `${actualWeight.toFixed(0)}g` : "-"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">FCR</p>
                <p className="text-sm font-bold">{lastRecord?.fcr?.toFixed(3) || "-"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">IP</p>
                <p className="text-sm font-bold">{lastRecord?.ip_score?.toFixed(0) || "-"}</p>
              </div>
            </div>

            {/* Weight Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Berat vs Target</span>
                <span className={`font-medium ${weightPercent >= 95 ? "text-emerald-600" : weightPercent >= 90 ? "text-amber-600" : "text-red-600"}`}>
                  {weightPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${weightPercent >= 95 ? "bg-emerald-500" : weightPercent >= 90 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, weightPercent)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Aktual: {actualWeight.toFixed(0)}g / Target: {targetWeight.toFixed(0)}g
              </p>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-2 flex-wrap">
              {todayRecord ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  ✅ Recorded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  ⚠️ Belum record
                </span>
              )}
              {pendingMeds.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  💊 {pendingMeds.map((m) => m.name).join(", ")}
                </span>
              )}
              {lastRecord?.health_condition === "warning" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  ⚠️ Perhatian
                </span>
              )}
              {lastRecord?.health_condition === "critical" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-700">
                  🚨 Kritis
                </span>
              )}
            </div>
          </div>
        ))}

        {flocksList.length === 0 && (
          <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Tidak ada kandang aktif saat ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
