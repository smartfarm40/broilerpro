import { requireSession, requireOrganization } from "@/src/lib/session";
import { redirect } from "next/navigation";
import { SupervisorShell } from "./components/supervisor-shell";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  // Only supervisor role can access this layout
  if (org.role !== "supervisor") {
    redirect("/dashboard");
  }

  return (
    <SupervisorShell user={session.user} organization={org}>
      {children}
    </SupervisorShell>
  );
}
