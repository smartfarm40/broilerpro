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
  const { flockId, deadCount, cullCount, notes } = body;

  if (!flockId) {
    return NextResponse.json({ error: "Pilih kandang" }, { status: 400 });
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

  // Get or create today's record
  const { data: existing } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .eq("date", today)
    .limit(1)
    .single();

  if (existing) {
    const newPopulation = existing.remaining_population - (deadCount || 0) - (cullCount || 0);
    await supabase
      .from("daily_records")
      .update({
        dead_count: (existing.dead_count || 0) + (deadCount || 0),
        cull_count: (existing.cull_count || 0) + (cullCount || 0),
        remaining_population: newPopulation,
        notes: notes || existing.notes,
      })
      .eq("id", existing.id);

    // Activity log
    await supabase.from("activity_logs").insert({
      id: nanoid(),
      user_id: session.user.id,
      organization_id: org.id,
      action: "edit",
      entity: "deplesi",
      entity_id: existing.id,
      description: `Update deplesi: +${deadCount || 0} mati, +${cullCount || 0} afkir. Sisa: ${newPopulation}`,
    });

    return NextResponse.json({ success: true, updated: true, remainingPopulation: newPopulation });
  }

  // Get previous record for population
  const { data: prevRecord } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const previousPopulation = prevRecord ? prevRecord.remaining_population : flock.doc_count;
  const remainingPopulation = previousPopulation - (deadCount || 0) - (cullCount || 0);

  const recordId = nanoid();
  await supabase.from("daily_records").insert({
    id: recordId,
    flock_id: flockId,
    organization_id: org.id,
    date: today,
    day_number: dayNumber,
    dead_count: deadCount || 0,
    cull_count: cullCount || 0,
    remaining_population: remainingPopulation,
    health_condition: "normal",
    notes: notes || null,
    created_by: session.user.id,
  });

  // Activity log
  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "create",
    entity: "deplesi",
    entity_id: recordId,
    description: `Input deplesi: ${deadCount || 0} mati, ${cullCount || 0} afkir. Sisa: ${remainingPopulation}`,
  });

  return NextResponse.json({ success: true, remainingPopulation });
}
