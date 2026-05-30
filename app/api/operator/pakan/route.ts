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
  const { flockId, feedName, feedMorning, feedAfternoon } = body;

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

  const totalFeedUsed = (feedMorning || 0) + (feedAfternoon || 0);

  // Record in feed_stock
  const feedStockId = nanoid();
  await supabase.from("feed_stock").insert({
    id: feedStockId,
    flock_id: flockId,
    organization_id: org.id,
    date: today,
    type: "used",
    amount_kg: totalFeedUsed,
    note: feedName || null,
    created_by: session.user.id,
  });

  // Update daily record
  const { data: prevRecord } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const cumulativeFeed = (prevRecord?.cumulative_feed || 0) + totalFeedUsed;

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
        feed_in: totalFeedUsed,
        feed_consumed: totalFeedUsed,
        cumulative_feed: cumulativeFeed,
        notes: feedName ? `Pakan: ${feedName}` : existing.notes,
      })
      .eq("id", existing.id);
  } else {
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
      feed_in: totalFeedUsed,
      feed_consumed: totalFeedUsed,
      cumulative_feed: cumulativeFeed,
      health_condition: "normal",
      notes: feedName ? `Pakan: ${feedName}` : null,
      created_by: session.user.id,
    });
  }

  // Activity log
  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "create",
    entity: "pakan",
    entity_id: feedStockId,
    description: `Input pakan ${totalFeedUsed} kg (Pagi: ${feedMorning || 0}, Siang: ${feedAfternoon || 0})${feedName ? ` - ${feedName}` : ""}`,
  });

  return NextResponse.json({ success: true });
}
