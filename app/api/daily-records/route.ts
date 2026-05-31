import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization, checkRole } from "@/src/lib/session";
import { calculatePerformance } from "@/src/lib/types";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const hasAccess = await checkRole(session.user.id, org.id, [
    "owner", "manager", "supervisor", "operator",
  ]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    flockId, date, deadCount, cullCount, avgWeight, sampleCount,
    feedType, feedIn, feedRemaining, healthCondition,
    medication, symptoms, tempMorning, tempAfternoon, tempEvening,
    humidity, notes,
  } = body;

  if (!flockId || !date) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  // Input validation
  if (deadCount !== undefined && (deadCount < 0 || !Number.isInteger(Number(deadCount)))) {
    return NextResponse.json({ error: "Jumlah mati harus bilangan bulat positif" }, { status: 400 });
  }
  if (cullCount !== undefined && (cullCount < 0 || !Number.isInteger(Number(cullCount)))) {
    return NextResponse.json({ error: "Jumlah culling harus bilangan bulat positif" }, { status: 400 });
  }
  if (avgWeight !== undefined && avgWeight < 0) {
    return NextResponse.json({ error: "Berat rata-rata tidak boleh negatif" }, { status: 400 });
  }
  if (feedIn !== undefined && feedIn < 0) {
    return NextResponse.json({ error: "Pakan masuk tidak boleh negatif" }, { status: 400 });
  }

  // Verify flock belongs to org
  const { data: flock } = await supabase
    .from("flocks")
    .select("*")
    .eq("id", flockId)
    .eq("organization_id", org.id)
    .single();

  if (!flock) {
    return NextResponse.json({ error: "Flock tidak ditemukan" }, { status: 404 });
  }

  // Check if record already exists for this date
  const { data: existing } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .eq("date", date)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Recording untuk tanggal ini sudah ada" }, { status: 400 });
  }

  // Calculate day number
  const startDate = new Date(flock.start_date);
  const recordDate = new Date(date);
  const dayNumber = Math.floor((recordDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Get previous record for calculations
  const { data: prevRecord } = await supabase
    .from("daily_records")
    .select("*")
    .eq("flock_id", flockId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  // Calculate remaining population
  const previousPopulation = prevRecord
    ? prevRecord.remaining_population
    : flock.doc_count;
  const remainingPopulation = previousPopulation - (deadCount || 0) - (cullCount || 0);

  // Validate: population cannot go negative
  if (remainingPopulation < 0) {
    return NextResponse.json({ 
      error: `Jumlah mati + culling (${(deadCount || 0) + (cullCount || 0)}) melebihi populasi tersisa (${previousPopulation})` 
    }, { status: 400 });
  }

  // Calculate feed consumed
  const feedConsumed = (feedIn || 0) - (feedRemaining || 0);

  // Calculate cumulative feed
  const cumulativeFeed = (prevRecord?.cumulative_feed || 0) + feedConsumed;

  // Calculate total dead + cull
  const totalDead = (prevRecord ? (flock.doc_count - prevRecord.remaining_population) : 0) + (deadCount || 0);
  const totalCull = cullCount || 0;

  // Calculate performance metrics
  const totalLiveWeight = remainingPopulation * ((avgWeight || 0) / 1000); // kg
  const previousWeight = prevRecord?.avg_weight || 0;

  const metrics = calculatePerformance({
    totalFeed: cumulativeFeed,
    totalLiveWeight,
    currentWeight: avgWeight || 0,
    previousWeight,
    totalDead,
    totalCull,
    initialPopulation: flock.doc_count,
    currentPopulation: remainingPopulation,
    dayNumber,
    dailyFeedConsumed: feedConsumed,
  });

  const recordId = nanoid();
  const { error: insertError } = await supabase.from("daily_records").insert({
    id: recordId,
    flock_id: flockId,
    organization_id: org.id,
    date,
    day_number: dayNumber,
    dead_count: deadCount || 0,
    cull_count: cullCount || 0,
    remaining_population: remainingPopulation,
    avg_weight: avgWeight || null,
    sample_count: sampleCount || null,
    feed_type: feedType || null,
    feed_in: feedIn || 0,
    feed_remaining: feedRemaining || 0,
    feed_consumed: feedConsumed,
    cumulative_feed: cumulativeFeed,
    health_condition: healthCondition || "normal",
    medication: medication || null,
    symptoms: symptoms || null,
    temp_morning: tempMorning || null,
    temp_afternoon: tempAfternoon || null,
    temp_evening: tempEvening || null,
    humidity: humidity || null,
    fcr: metrics.fcr || null,
    adg: metrics.adg || null,
    depletion: metrics.depletion || null,
    ip_score: metrics.ipScore || null,
    notes: notes || null,
    created_by: session.user.id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Recording untuk tanggal ini sudah ada" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menyimpan: " + insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id: recordId, metrics });
}
