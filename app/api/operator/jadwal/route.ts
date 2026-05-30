import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization } from "@/src/lib/session";

// GET - get today's schedule for operator
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const flockId = request.nextUrl.searchParams.get("flockId");

  if (!flockId) {
    return NextResponse.json({ schedules: [], executions: [] });
  }

  const { data: flock } = await supabase
    .from("flocks")
    .select("*")
    .eq("id", flockId)
    .eq("organization_id", org.id)
    .single();

  if (!flock) {
    return NextResponse.json({ schedules: [], executions: [] });
  }

  // Calculate current day number
  const dayNumber = Math.floor(
    (Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get schedule for today's day number
  const { data: schedules } = await supabase
    .from("medication_schedules")
    .select("*")
    .eq("flock_id", flockId)
    .eq("organization_id", org.id)
    .eq("day_number", dayNumber);

  // Get today's executions
  const today = new Date().toISOString().split("T")[0];
  const { data: executions } = await supabase
    .from("medication_executions")
    .select("*")
    .eq("flock_id", flockId)
    .eq("organization_id", org.id)
    .eq("date", today);

  return NextResponse.json({ schedules: schedules || [], executions: executions || [], dayNumber });
}

// POST - execute/record a medication
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const body = await request.json();
  const { flockId, scheduleId, name, amount } = body;

  if (!flockId || !name) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  const execId = nanoid();
  await supabase.from("medication_executions").insert({
    id: execId,
    schedule_id: scheduleId || null,
    flock_id: flockId,
    organization_id: org.id,
    date: today,
    name,
    amount: amount || null,
    executed_by: session.user.id,
  });

  // Activity log
  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "create",
    entity: "jadwal",
    entity_id: execId,
    description: `Pelaksanaan: ${name}${amount ? ` (${amount})` : ""} — ${today}`,
  });

  return NextResponse.json({ success: true, id: execId });
}
