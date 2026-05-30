import { requireSession, requireOrganization } from "@/src/lib/session";
import { redirect } from "next/navigation";
import { DashboardShell } from "./components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  // Operator must use their dedicated panel
  if (org.role === "operator") {
    redirect("/operator");
  }

  // Supervisor must use their dedicated panel
  if (org.role === "supervisor") {
    redirect("/supervisor");
  }

  return (
    <DashboardShell user={session.user} organization={org} role={org.role}>
      {children}
    </DashboardShell>
  );
}
