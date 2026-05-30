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
  const { flockId, bags } = body;

  if (!flockId || !bags) {
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
  const amountKg = bags * 50;

  const feedStockId = nanoid();
  await supabase.from("feed_stock").insert({
    id: feedStockId,
    flock_id: flockId,
    organization_id: org.id,
    date: today,
    type: "incoming",
    amount_kg: amountKg,
    bags,
    note: `${bags} karung @ 50kg`,
    created_by: session.user.id,
  });

  // Activity log
  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "create",
    entity: "feed_stock",
    entity_id: feedStockId,
    description: `Pakan datang: ${bags} karung (${amountKg} kg)`,
  });

  return NextResponse.json({ success: true, bags, amountKg });
}
