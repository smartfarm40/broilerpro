import { requireSession, requireOrganization, checkRole } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { InviteMemberForm } from "./invite-form";
import { AssignCoopButton } from "./assign-coop-button";

export default async function MembersPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  // Only owner and manager can access
  const hasAccess = await checkRole(session.user.id, org.id, ["owner", "manager"]);
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const { data: members } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", org.id);

  const membersList = members || [];

  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  const coopsList = allCoops || [];

  // Get user details and coop assignments for each member
  const membersWithDetails = await Promise.all(
    membersList.map(async (member) => {
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", member.user_id)
        .limit(1)
        .single();

      const { data: assignments } = await supabase
        .from("coop_assignments")
        .select("*")
        .eq("user_id", member.user_id)
        .eq("organization_id", org.id);

      const assignmentsList = assignments || [];
      const assignedCoopNames = assignmentsList
        .map((a) => coopsList.find((c) => c.id === a.coop_id)?.name)
        .filter(Boolean);
      return { ...member, user, assignedCoopNames, assignedCoopIds: assignmentsList.map((a) => a.coop_id) };
    })
  );

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800",
    manager: "bg-blue-100 text-blue-800",
    supervisor: "bg-green-100 text-green-800",
    operator: "bg-yellow-100 text-yellow-800",
    viewer: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Anggota</h1>
        <p className="text-muted-foreground">Kelola anggota tim organisasi Anda</p>
      </div>

      {/* Invite Form */}
      {(org.role === "owner" || org.role === "manager") && <InviteMemberForm />}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Anggota ({membersWithDetails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {membersWithDetails.map((member) => (
              <div
                key={member.id}
                className="rounded-md border p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{member.user?.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={roleColors[member.role]} variant="secondary">
                      {member.role}
                    </Badge>
                  </div>
                </div>

                {/* Show coop assignments for operator/supervisor */}
                {(member.role === "operator" || member.role === "supervisor") && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {member.assignedCoopNames.length > 0 ? (
                      <>
                        <span className="text-xs text-muted-foreground">Penempatan:</span>
                        {member.assignedCoopNames.map((name: string) => (
                          <Badge key={name} variant="outline" className="text-xs">
                            🏠 {name}
                          </Badge>
                        ))}
                      </>
                    ) : (
                      <span className="text-xs text-amber-600">⚠️ Belum ditempatkan ke kandang</span>
                    )}
                    <AssignCoopButton
                      userId={member.user_id}
                      currentCoopIds={member.assignedCoopIds}
                      allCoops={coopsList.map((c) => ({ id: c.id, name: c.name }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
