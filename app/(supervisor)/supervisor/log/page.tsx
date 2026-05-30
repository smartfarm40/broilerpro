import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import Link from "next/link";

export default async function LogPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const logsList = logs || [];

  // Get user names
  const userIds = [...new Set(logsList.map((l) => l.user_id))];
  const userMap = new Map<string, string>();
  for (const uid of userIds) {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .limit(1)
      .single();
    if (user) userMap.set(uid, user.name);
  }

  const actionIcons: Record<string, string> = {
    create: "🟢",
    edit: "🟡",
    delete: "🔴",
  };

  const entityLabels: Record<string, string> = {
    deplesi: "Deplesi",
    pakan: "Pakan",
    feed_stock: "Stok Pakan",
    timbang: "Timbang",
    jadwal: "Jadwal",
    panen: "Panen",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/supervisor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Log Aktivitas</h1>
      </div>

      {logsList.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logsList.map((log) => (
            <div key={log.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-sm">{actionIcons[log.action] || "⚪"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">{log.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {userMap.get(log.user_id) || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground">
                      {entityLabels[log.entity] || log.entity}
                    </span>
                    {log.created_at && (
                      <>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
