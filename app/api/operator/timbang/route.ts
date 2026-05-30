import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization } from "@/src/lib/session";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const body = await request.json();
  const { flockId, avgWeight, sampleCount } = body;

  if (!flockId || !avgWeight) {
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

  const today = new Date().toISOString().split("T")[0];
  const dayNumber = Math.floor(
    (Date.now() - new Date(flock.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check if today's record exists
  const { data: existing } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .eq("date", today)
    .limit(1)
    .single();

  if (existing) {
    // Get the record before today for ADG calculation
    const { data: beforeToday } = await supabase
      .from("daily_records")
      .select("*")
      .eq("flock_id", flockId)
      .neq("date", today)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    const previousWeight = beforeToday?.avg_weight || 0;
    const adg = avgWeight - previousWeight;

    await supabase
      .from("daily_records")
      .update({
        avg_weight: avgWeight,
        sample_count: sampleCount || 30,
        adg: Math.round(adg * 10) / 10,
      })
      .eq("id", existing.id);
    return NextResponse.json({ success: true, updated: true });
  }

  const { data: prevRecord } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const previousPopulation = prevRecord ? prevRecord.remaining_population : flock.doc_count;
  const previousWeight = prevRecord?.avg_weight || 0;
  const adg = avgWeight - previousWeight;

  await supabase.from("daily_records").insert({
    id: nanoid(),
    flock_id: flockId,
    organization_id: org.id,
    date: today,
    day_number: dayNumber,
    dead_count: 0,
    cull_count: 0,
    remaining_population: previousPopulation,
    avg_weight: avgWeight,
    sample_count: sampleCount || 30,
    adg: Math.round(adg * 10) / 10,
    health_condition: "normal",
    created_by: session.user.id,
  });

  return NextResponse.json({ success: true });
}
