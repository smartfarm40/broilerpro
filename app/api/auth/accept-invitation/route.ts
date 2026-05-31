import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { nanoid } from "@/src/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, name, password } = body;

  if (!token || !name || !password) {
    return NextResponse.json({ error: "Token, nama, dan password wajib diisi" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
  }

  // Find invitation by token
  const { data: invitation } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .limit(1)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Undangan tidak ditemukan atau sudah digunakan" }, { status: 404 });
  }

  // Check expiry
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    await supabase.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
    return NextResponse.json({ error: "Undangan sudah kadaluarsa" }, { status: 410 });
  }

  // Create user via Supabase Auth (using service role)
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  let userId: string;

  // Try to create user first
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: invitation.email,
    password,
    user_metadata: { nama: name, name },
    email_confirm: true,
  });

  if (createError) {
    // If user already exists, try to update their password
    if (createError.message.includes("already") || createError.message.includes("exists") || createError.status === 422) {
      // Get user by signing in won't work (don't know old password)
      // Use admin getUserByEmail equivalent - list and filter
      const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = listData?.users?.find(u => u.email === invitation.email);
      
      if (existingUser) {
        userId = existingUser.id;
        await adminClient.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { nama: name, name },
        });
      } else {
        return NextResponse.json({ error: "Gagal membuat akun: " + createError.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Gagal membuat akun: " + createError.message }, { status: 500 });
    }
  } else {
    userId = newUser.user.id;
  }

  // Ensure user exists in public.users table
  await supabase.from("users").upsert({
    id: userId,
    name,
    email: invitation.email,
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Add user to organization
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", invitation.organization_id)
    .limit(1)
    .single();

  if (!existingMember) {
    await supabase.from("organization_members").insert({
      id: nanoid(),
      user_id: userId,
      organization_id: invitation.organization_id,
      role: invitation.role,
    });
  }

  // Create coop assignments if specified
  if (invitation.assigned_coop_ids) {
    try {
      const coopIds = JSON.parse(invitation.assigned_coop_ids) as string[];
      const assignments = coopIds.map((coopId) => ({
        id: nanoid(),
        user_id: userId,
        coop_id: coopId,
        organization_id: invitation.organization_id,
      }));
      await supabase.from("coop_assignments").insert(assignments);
    } catch {
      // ignore parse errors
    }
  }

  // Mark invitation as accepted
  await supabase.from("invitations").update({ status: "accepted" }).eq("id", invitation.id);

  // Sign in the user and return session cookie
  const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
    email: invitation.email,
    password,
  });

  const response = NextResponse.json({ success: true, role: invitation.role });

  if (signInData?.session && !signInError) {
    response.cookies.set("sb-auth-token", signInData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    response.cookies.set("sb-refresh-token", signInData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}
