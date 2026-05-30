import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization, checkRole } from "@/src/lib/session";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const coopId = request.nextUrl.searchParams.get("coopId");

  if (coopId) {
    const { data: coopFlocks } = await supabase
      .from("flocks")
      .select("*")
      .eq("coop_id", coopId)
      .eq("organization_id", org.id);
    return NextResponse.json(coopFlocks || []);
  }

  const { data: allFlocks } = await supabase
    .from("flocks")
    .select("*")
    .eq("organization_id", org.id);
  return NextResponse.json(allFlocks || []);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const hasAccess = await checkRole(session.user.id, org.id, ["owner", "manager"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { coopId, startDate, docCount, strain, targetWeight, targetDays, notes } = body;

  if (!coopId || !startDate || !docCount || !strain || !targetWeight || !targetDays) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  // Verify coop belongs to org
  const { data: coop } = await supabase
    .from("coops")
    .select("*")
    .eq("id", coopId)
    .eq("organization_id", org.id)
    .single();

  if (!coop) {
    return NextResponse.json({ error: "Kandang tidak ditemukan" }, { status: 404 });
  }

  // Check no active flock in this coop
  const { data: existingFlock } = await supabase
    .from("flocks")
    .select("*")
    .eq("coop_id", coopId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (existingFlock) {
    return NextResponse.json({ error: "Kandang ini sudah memiliki flock aktif" }, { status: 400 });
  }

  const flockId = nanoid();
  await supabase.from("flocks").insert({
    id: flockId,
    coop_id: coopId,
    organization_id: org.id,
    start_date: startDate,
    doc_count: parseInt(docCount),
    strain,
    target_weight: parseInt(targetWeight),
    target_days: parseInt(targetDays),
    notes: notes || null,
    status: "active",
  });

  // Update coop status to active
  await supabase.from("coops").update({ status: "active" }).eq("id", coopId);

  return NextResponse.json({ id: flockId });
}
