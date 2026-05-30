import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization, checkRole } from "@/src/lib/session";

// GET - list schedules for a flock
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const flockId = request.nextUrl.searchParams.get("flockId");

  if (!flockId) {
    return NextResponse.json([]);
  }

  const { data: schedules } = await supabase
    .from("medication_schedules")
    .select("*")
    .eq("flock_id", flockId)
    .eq("organization_id", org.id);

  return NextResponse.json(schedules || []);
}

// POST - create schedule (manager/supervisor only)
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const hasAccess = await checkRole(session.user.id, org.id, ["owner", "manager", "supervisor"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { flockId, dayNumber, name, dosage, method, notes } = body;

  if (!flockId || dayNumber === undefined || !name) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const { data: flock } = await supabase
    .from("flocks")
    .select("*")
    .eq("id", flockId)
    .eq("organization_id", org.id)
    .single();

  if (!flock) {
    return NextResponse.json({ error: "Flock tidak ditemukan" }, { status: 404 });
  }

  const id = nanoid();
  await supabase.from("medication_schedules").insert({
    id,
    flock_id: flockId,
    organization_id: org.id,
    day_number: dayNumber,
    name,
    dosage: dosage || null,
    method: method || null,
    notes: notes || null,
    created_by: session.user.id,
  });

  return NextResponse.json({ id, success: true });
}
