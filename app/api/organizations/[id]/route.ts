import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { checkRole } from "@/src/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkRole(session.user.id, id, ["owner"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug } = body;

  const updateData: Record<string, string> = {};
  if (name) updateData.name = name;
  if (slug) updateData.slug = slug;

  if (Object.keys(updateData).length > 0) {
    await supabase.from("organizations").update(updateData).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
