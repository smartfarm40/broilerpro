import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization, checkRole } from "@/src/lib/session";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  return NextResponse.json(allCoops || []);
}

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
  const { name, capacity, location, latitude, longitude } = body;

  if (!name || !capacity) {
    return NextResponse.json({ error: "Nama dan kapasitas wajib diisi" }, { status: 400 });
  }

  const coopId = nanoid();
  await supabase.from("coops").insert({
    id: coopId,
    organization_id: org.id,
    name,
    capacity: parseInt(capacity),
    location: location || null,
    latitude: latitude || null,
    longitude: longitude || null,
    status: "empty",
  });

  return NextResponse.json({ id: coopId, name });
}
