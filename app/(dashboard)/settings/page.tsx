import { requireSession, requireOrganization, checkRole } from "@/src/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgSettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const hasAccess = await checkRole(session.user.id, org.id, ["owner"]);
  if (!hasAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Organisasi</h1>
        <p className="text-muted-foreground">Kelola informasi organisasi Anda</p>
      </div>

      <OrgSettingsForm
        orgId={org.id}
        initialName={org.name}
        initialSlug={org.slug}
      />
    </div>
  );
}
