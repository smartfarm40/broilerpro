import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkReadButton } from "./mark-read-button";

export default async function NotificationsPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const { data: userNotifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notificationsList = userNotifications || [];

  const unreadCount = notificationsList.filter((n) => !n.is_read).length;

  const typeColors: Record<string, string> = {
    info: "bg-blue-100 text-blue-800",
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800",
  };

  const typeIcons: Record<string, string> = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Semua notifikasi sudah dibaca"}
          </p>
        </div>
        {unreadCount > 0 && <MarkReadButton />}
      </div>

      <Card>
        <CardContent className="p-0">
          {notificationsList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Belum ada notifikasi.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificationsList.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 ${!notif.is_read ? "bg-muted/50" : ""}`}
                >
                  <span className="text-lg">{typeIcons[notif.type]}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{notif.title}</p>
                      <Badge className={typeColors[notif.type]} variant="secondary">
                        {notif.type}
                      </Badge>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                    {notif.created_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(notif.created_at).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
