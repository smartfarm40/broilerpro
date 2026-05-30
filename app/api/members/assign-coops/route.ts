import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization, checkRole } from "@/src/lib/session";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const hasAccess = await checkRole(session.user.id, org.id, ["owner", "manager"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, coopIds } = body;

  if (!userId) {
    return NextResponse.json({ error: "User ID wajib" }, { status: 400 });
  }

  // Delete existing assignments for this user in this org
  await supabase
    .from("coop_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", org.id);

  // Create new assignments
  if (coopIds && coopIds.length > 0) {
    const assignments = coopIds.map((coopId: string) => ({
      id: nanoid(),
      user_id: userId,
      coop_id: coopId,
      organization_id: org.id,
    }));
    await supabase.from("coop_assignments").insert(assignments);
  }

  return NextResponse.json({ success: true, assigned: coopIds?.length || 0 });
}
