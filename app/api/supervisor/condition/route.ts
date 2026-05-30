import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization } from "@/src/lib/session";

// GET - get condition history for a flock
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

  // Get records that have health condition data
  const { data: records } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .eq("organization_id", org.id)
    .order("date", { ascending: false })
    .limit(20);

  const { data: flock } = await supabase
    .from("flocks")
    .select("*")
    .eq("id", flockId)
    .single();

  let coop = null;
  if (flock) {
    const { data: coopData } = await supabase
      .from("coops")
      .select("*")
      .eq("id", flock.coop_id)
      .single();
    coop = coopData;
  }

  // Filter records that have meaningful condition data
  const conditionRecords = (records || [])
    .filter((r) => r.health_condition !== "normal" || r.symptoms || r.medication)
    .map((r) => ({
      id: r.id,
      date: r.date,
      condition: r.health_condition || "normal",
      symptoms: r.symptoms || "",
      notes: r.medication || "",
      coopName: coop?.name || "Kandang",
    }));

  return NextResponse.json(conditionRecords);
}

// POST - record flock condition by supervisor
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const body = await request.json();
  const { flockId, condition, symptoms, notes } = body;

  if (!flockId) {
    return NextResponse.json({ error: "Flock ID wajib" }, { status: 400 });
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

  const today = new Date().toISOString().split("T")[0];
  const dayNumber = Math.floor(
    (Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Update or create today's record with condition data
  const { data: existing } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .eq("date", today)
    .limit(1)
    .single();

  if (existing) {
    await supabase
      .from("daily_records")
      .update({
        health_condition: condition || existing.health_condition,
        symptoms: symptoms || existing.symptoms,
        medication: notes || existing.medication,
      })
      .eq("id", existing.id);
  } else {
    const { data: prevRecord } = await supabase
      .from("daily_records")
      .select("*")
      .eq("flock_id", flockId)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    const previousPopulation = prevRecord ? prevRecord.remaining_population : flock.doc_count;

    await supabase.from("daily_records").insert({
      id: nanoid(),
      flock_id: flockId,
      organization_id: org.id,
      date: today,
      day_number: dayNumber,
      dead_count: 0,
      cull_count: 0,
      remaining_population: previousPopulation,
      health_condition: condition || "normal",
      symptoms: symptoms || null,
      medication: notes || null,
      created_by: session.user.id,
    });
  }

  // Activity log
  const { data: coop } = await supabase
    .from("coops")
    .select("*")
    .eq("id", flock.coop_id)
    .single();

  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "create",
    entity: "kondisi",
    entity_id: flockId,
    description: `Kondisi ${coop?.name || "kandang"}: ${condition}${symptoms ? ` — Gejala: ${symptoms}` : ""}`,
  });

  return NextResponse.json({ success: true });
}
