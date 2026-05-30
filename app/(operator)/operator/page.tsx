import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import Link from "next/link";

export default async function OperatorHomePage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  // Get assigned coops for this operator
  const { data: assignments } = await supabase
    .from("coop_assignments")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("organization_id", org.id);

  const assignmentsList = assignments || [];
  const assignedCoopIds = assignmentsList.map((a) => a.coop_id);

  // Get active flocks (filtered by assignment)
  let flocksList: any[] = [];
  if (assignedCoopIds.length > 0) {
    const { data: activeFlocks } = await supabase
      .from("flocks")
      .select("*")
      .eq("organization_id", org.id)
      .eq("status", "active")
      .in("coop_id", assignedCoopIds);
    flocksList = activeFlocks || [];
  }

  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  const coopsList = allCoops || [];

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Check which flocks already have today's record
  const todayRecords = await Promise.all(
    flocksList.map(async (flock) => {
      const { data: record } = await supabase
        .from("daily_records")
        .select("*")
        .eq("flock_id", flock.id)
        .eq("date", today)
        .limit(1)
        .single();
      return { flock, hasRecord: !!record };
    })
  );

  const pendingCount = todayRecords.filter((r) => !r.hasRecord).length;

  // Check today's medication schedules (pending = not yet executed)
  let pendingScheduleCount = 0;
  let scheduleNames: string[] = [];
  for (const flock of flocksList) {
    const dayNum = Math.floor(
      (Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const { data: schedules } = await supabase
      .from("medication_schedules")
      .select("*")
      .eq("flock_id", flock.id)
      .eq("organization_id", org.id)
      .eq("day_number", dayNum);

    const schedulesList = schedules || [];

    // Check which are not yet executed today
    const { data: executions } = await supabase
      .from("medication_executions")
      .select("*")
      .eq("flock_id", flock.id)
      .eq("organization_id", org.id)
      .eq("date", today);

    const executionsList = executions || [];

    for (const s of schedulesList) {
      const executed = executionsList.some((e) => e.schedule_id === s.id);
      if (!executed) {
        pendingScheduleCount++;
        if (!scheduleNames.includes(s.name)) scheduleNames.push(s.name);
      }
    }
  }

  const actions = [
    {
      title: "Deplesi",
      description: "Catat kematian & afkir hari ini",
      href: "/operator/deplesi",
      color: "from-red-500 to-rose-600",
      badge: 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      title: "Pakan",
      description: "Input konsumsi pakan harian",
      href: "/operator/pakan",
      color: "from-amber-500 to-orange-600",
      badge: 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h20" />
          <path d="M6 12v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" />
          <path d="m4 8 2 4" />
          <path d="m20 8-2 4" />
          <path d="M12 4v8" />
        </svg>
      ),
    },
    {
      title: "Jadwal",
      description: pendingScheduleCount > 0
        ? scheduleNames.slice(0, 2).join(", ")
        : "Vaksin & obat hari ini",
      href: "/operator/jadwal",
      color: "from-blue-500 to-indigo-600",
      badge: pendingScheduleCount > 0 ? pendingScheduleCount : 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Timbang",
      description: "Input berat badan sampling",
      href: "/operator/timbang",
      color: "from-emerald-500 to-green-600",
      badge: 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v17" />
          <path d="M5 10h14" />
          <path d="m5 10 3 7" />
          <path d="m19 10-3 7" />
          <circle cx="8" cy="17" r="2" />
          <circle cx="16" cy="17" r="2" />
        </svg>
      ),
    },
    {
      title: "Panen",
      description: "Laporan & data panen",
      href: "/operator/panen",
      color: "from-purple-500 to-violet-600",
      badge: 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5Z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold">Halo, {session.user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Status Banner */}
      {pendingCount > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">{pendingCount} kandang belum direcord</p>
              <p className="text-xs text-amber-700">Segera input data hari ini</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all active:scale-95 hover:shadow-md">
              {/* Notification badge */}
              {action.badge > 0 && (
                <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                  {action.badge}
                </span>
              )}
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm`}>
                {action.icon}
              </div>
              <h3 className="text-sm font-bold text-foreground">{action.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground leading-tight">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Flocks Quick Info */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Kandang Aktif</h2>
        <div className="space-y-2">
          {flocksList.map((flock) => {
            const coop = coopsList.find((c) => c.id === flock.coop_id);
            const dayNumber = Math.floor(
              (Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            const todayData = todayRecords.find((r) => r.flock.id === flock.id);
            return (
              <div key={flock.id} className="flex items-center justify-between rounded-xl border bg-white p-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold">{coop?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Hari ke-{dayNumber} • {flock.strain.replace("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {todayData?.hasRecord ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" x2="12" y1="8" y2="12" />
                        <line x1="12" x2="12.01" y1="16" y2="16" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {flocksList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada kandang aktif saat ini.</p>
          )}
        </div>
      </div>
    </div>
  );
}
