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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid" }, { status: 400 });
  }

  const { name, capacity, location, latitude, longitude } = body;

  if (!name || !capacity) {
    return NextResponse.json({ error: "Nama dan kapasitas wajib diisi" }, { status: 400 });
  }

  const parsedCapacity = parseInt(capacity);
  if (isNaN(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 100000) {
    return NextResponse.json({ error: "Kapasitas harus antara 1 - 100.000 ekor" }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json({ error: "Nama kandang maksimal 100 karakter" }, { status: 400 });
  }

  const coopId = nanoid();
  const { error: insertError } = await supabase.from("coops").insert({
    id: coopId,
    organization_id: org.id,
    name: name.trim(),
    capacity: parsedCapacity,
    location: location?.trim() || null,
    latitude: latitude || null,
    longitude: longitude || null,
    status: "empty",
  });

  if (insertError) {
    return NextResponse.json({ error: "Gagal menambah kandang: " + insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id: coopId, name });
}
