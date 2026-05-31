import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const token = request.nextUrl.searchParams.get("token");

  // Verify by token (used by /invite page)
  if (token) {
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .limit(1)
      .single();

    if (!invitation) {
      return NextResponse.json({ valid: false, error: "Undangan tidak ditemukan atau sudah digunakan." }, { status: 404 });
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
      return NextResponse.json({ valid: false, error: "Link undangan sudah kadaluarsa." }, { status: 410 });
    }

    // Get organization name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .single();

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      organizationName: org?.name || "",
      organizationId: invitation.organization_id,
    });
  }

  // Verify by email (used by /register page to check if user has pending invite)
  if (email) {
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("email", email)
      .eq("status", "pending")
      .limit(1)
      .single();

    if (!invitation) {
      return NextResponse.json({ hasInvitation: false });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ hasInvitation: false, expired: true });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .single();

    return NextResponse.json({
      hasInvitation: true,
      organizationName: org?.name || "",
      role: invitation.role,
    });
  }

  return NextResponse.json({ valid: false, hasInvitation: false });
}
