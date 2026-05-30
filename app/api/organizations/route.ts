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

  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: "Nama organisasi wajib diisi" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const orgId = nanoid();
  const memberId = nanoid();

  await supabase.from("organizations").insert({
    id: orgId,
    name,
    slug: `${slug}-${orgId.slice(0, 6)}`,
    owner_id: session.user.id,
  });

  await supabase.from("organization_members").insert({
    id: memberId,
    user_id: session.user.id,
    organization_id: orgId,
    role: "owner",
  });

  return NextResponse.json({ id: orgId, name, slug });
}
