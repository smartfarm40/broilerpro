import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization } from "@/src/lib/session";

// GET - get today's checkins for this supervisor
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const today = new Date().toISOString().split("T")[0];

  const { data: checkins } = await supabase
    .from("visit_checkins")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("organization_id", org.id)
    .eq("date", today)
    .order("created_at", { ascending: false });

  return NextResponse.json(checkins || []);
}

// POST - check in to a coop
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const body = await request.json();
  const { coopId, condition, notes } = body;

  if (!coopId) {
    return NextResponse.json({ error: "Pilih kandang" }, { status: 400 });
  }

  const { data: coop } = await supabase
    .from("coops")
    .select("*")
    .eq("id", coopId)
    .eq("organization_id", org.id)
    .single();

  if (!coop) {
    return NextResponse.json({ error: "Kandang tidak ditemukan" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const checkInTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const checkinId = nanoid();
  await supabase.from("visit_checkins").insert({
    id: checkinId,
    user_id: session.user.id,
    coop_id: coopId,
    organization_id: org.id,
    date: today,
    check_in_time: checkInTime,
    condition: condition || "baik",
    notes: notes || null,
  });

  // Activity log
  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "create",
    entity: "checkin",
    entity_id: checkinId,
    description: `Check-in ${coop.name} pukul ${checkInTime} — Kondisi: ${condition || "baik"}`,
  });

  return NextResponse.json({ success: true, id: checkinId, checkInTime });
}

// PATCH - check out
export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const body = await request.json();
  const { checkinId } = body;

  if (!checkinId) {
    return NextResponse.json({ error: "ID check-in wajib" }, { status: 400 });
  }

  const { data: checkin } = await supabase
    .from("visit_checkins")
    .select("*")
    .eq("id", checkinId)
    .eq("user_id", session.user.id)
    .single();

  if (!checkin) {
    return NextResponse.json({ error: "Check-in tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  const checkOutTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  await supabase
    .from("visit_checkins")
    .update({ check_out_time: checkOutTime })
    .eq("id", checkinId);

  // Activity log
  const { data: coop } = await supabase
    .from("coops")
    .select("*")
    .eq("id", checkin.coop_id)
    .single();

  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "edit",
    entity: "checkin",
    entity_id: checkinId,
    description: `Check-out ${coop?.name || "kandang"} pukul ${checkOutTime} (masuk: ${checkin.check_in_time})`,
  });

  return NextResponse.json({ success: true, checkOutTime });
}
