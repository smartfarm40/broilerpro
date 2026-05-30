import { requireSession, requireOrganization } from "@/src/lib/session";
import { redirect } from "next/navigation";
import { OperatorShell } from "./components/operator-shell";

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  // Only operator role can access this layout
  if (org.role !== "operator") {
    redirect("/dashboard");
  }

  return (
    <OperatorShell user={session.user} organization={org}>
      {children}
    </OperatorShell>
  );
}
