import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { requireOrganization } from "@/src/lib/session";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);

  // Get assigned coops for this user
  const { data: assignments } = await supabase
    .from("coop_assignments")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("organization_id", org.id);

  const assignedCoopIds = (assignments || []).map((a) => a.coop_id);

  // If user has no assignments, show nothing
  if (assignedCoopIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: activeFlocks } = await supabase
    .from("flocks")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "active")
    .in("coop_id", assignedCoopIds);

  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  // Get last population for each flock
  const result = await Promise.all(
    (activeFlocks || []).map(async (flock) => {
      const coop = (allCoops || []).find((c) => c.id === flock.coop_id);
      const { data: lastRecord } = await supabase
        .from("daily_records")
        .select("*")
        .eq("flock_id", flock.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();
      return {
        ...flock,
        coopName: coop?.name || "Kandang",
        lastPopulation: lastRecord?.remaining_population || flock.doc_count,
      };
    })
  );

  return NextResponse.json(result);
}
