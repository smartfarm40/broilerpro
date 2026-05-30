import { redirect } from "next/navigation";
import { getSession, getUserOrganization } from "@/src/lib/session";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const org = await getUserOrganization(session.user.id);

  if (!org) {
    redirect("/setup");
  }

  // Route operators to their dedicated mobile panel
  if (org.role === "operator") {
    redirect("/operator");
  }

  // Route supervisors to their dedicated mobile panel
  if (org.role === "supervisor") {
    redirect("/supervisor");
  }

  redirect("/dashboard");
}
