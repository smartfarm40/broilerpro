import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;

  // Find pending invitation for this email
  const { data: invitation } = await supabase
    .from("invitations")
    .select("*")
    .eq("email", email)
    .eq("status", "pending")
    .limit(1)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Tidak ada undangan" }, { status: 404 });
  }

  // Check expiry
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return NextResponse.json({ error: "Undangan sudah kadaluarsa" }, { status: 400 });
  }

  // Add user to organization
  await supabase.from("organization_members").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: invitation.organization_id,
    role: invitation.role,
  });

  // Create coop assignments if specified in invitation
  if (invitation.assigned_coop_ids) {
    try {
      const coopIds = JSON.parse(invitation.assigned_coop_ids) as string[];
      const assignments = coopIds.map((coopId) => ({
        id: nanoid(),
        user_id: session.user.id,
        coop_id: coopId,
        organization_id: invitation.organization_id,
      }));
      await supabase.from("coop_assignments").insert(assignments);
    } catch {
      // ignore parse errors
    }
  }

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  return NextResponse.json({ success: true, role: invitation.role });
}
