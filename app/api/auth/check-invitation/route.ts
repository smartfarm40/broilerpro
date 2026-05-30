import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ hasInvitation: false });
  }

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

  // Check if invitation is expired
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ hasInvitation: false, expired: true });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", invitation.organization_id)
    .single();

  return NextResponse.json({
    hasInvitation: true,
    organizationName: org?.name || "",
    role: invitation.role,
  });
}
