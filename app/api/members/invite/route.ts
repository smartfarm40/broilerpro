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
  const { email, role, coopIds } = body;

  if (!email || !role) {
    return NextResponse.json({ error: "Email dan role wajib diisi" }, { status: 400 });
  }

  // Check if user already exists and is already a member
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1)
    .single();

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", existingUser.id)
      .eq("organization_id", org.id)
      .limit(1)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "User sudah menjadi anggota" }, { status: 400 });
    }

    // Add directly if user exists
    await supabase.from("organization_members").insert({
      id: nanoid(),
      user_id: existingUser.id,
      organization_id: org.id,
      role,
    });

    // Assign coops if provided
    if (coopIds && coopIds.length > 0) {
      const assignments = coopIds.map((coopId: string) => ({
        id: nanoid(),
        user_id: existingUser.id,
        coop_id: coopId,
        organization_id: org.id,
      }));
      await supabase.from("coop_assignments").insert(assignments);
    }

    return NextResponse.json({ message: "Anggota berhasil ditambahkan" });
  }

  // Create invitation for non-existing user
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

  await supabase.from("invitations").insert({
    id: nanoid(),
    organization_id: org.id,
    email,
    role,
    token,
    status: "pending",
    assigned_coop_ids: coopIds && coopIds.length > 0 ? JSON.stringify(coopIds) : null,
    invited_by: session.user.id,
    expires_at: expiresAt,
  });

  return NextResponse.json({
    message: "Undangan berhasil dibuat",
    inviteLink: `/invite/${token}`,
  });
}
