import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { requireOrganization } from "@/src/lib/session";

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

  // Get all feed stock entries for this flock (oldest first)
  const { data: entries } = await supabase
    .from("feed_stock")
    .select("*")
    .eq("flock_id", flockId)
    .eq("organization_id", org.id)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (!entries || entries.length === 0) {
    return NextResponse.json([]);
  }

  // Group by date and calculate running total
  const dateMap = new Map<string, { incoming: number; used: number; entries: { id: string; type: string; amount_kg: number; bags: number | null }[] }>();

  for (const entry of entries) {
    const existing = dateMap.get(entry.date) || { incoming: 0, used: 0, entries: [] };
    if (entry.type === "incoming") {
      existing.incoming += entry.bags || 0;
    } else {
      existing.used += entry.amount_kg;
    }
    existing.entries.push({ id: entry.id, type: entry.type, amount_kg: entry.amount_kg, bags: entry.bags });
    dateMap.set(entry.date, existing);
  }

  // Build logs with running stock
  let runningStockKg = 0;
  const logs: { date: string; incoming: number; used: number; remainingKg: number; entries: { id: string; type: string; amount_kg: number; bags: number | null }[] }[] = [];

  const sortedDates = Array.from(dateMap.keys()).sort();
  for (const date of sortedDates) {
    const day = dateMap.get(date)!;
    runningStockKg += day.incoming * 50; // karung to kg
    runningStockKg -= day.used;

    logs.push({
      date,
      incoming: day.incoming, // in karung
      used: day.used, // in kg
      remainingKg: Math.max(0, runningStockKg),
      entries: day.entries,
    });
  }

  // Return newest first, limit 14
  return NextResponse.json(logs.reverse().slice(0, 14));
}
