import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { nanoid } from "@/src/lib/utils";
import { requireOrganization } from "@/src/lib/session";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const body = await request.json();
  const { id, amountKg, bags, note } = body;

  if (!id) {
    return NextResponse.json({ error: "ID wajib" }, { status: 400 });
  }

  const { data: entry } = await supabase
    .from("feed_stock")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  const oldValue = JSON.stringify({
    amount_kg: entry.amount_kg,
    bags: entry.bags,
    note: entry.note,
  });

  // Update
  const updateData: Record<string, unknown> = {};
  if (amountKg !== undefined) updateData.amount_kg = amountKg;
  if (bags !== undefined) updateData.bags = bags;
  if (note !== undefined) updateData.note = note;

  // If bags changed for incoming, recalculate amount_kg
  if (entry.type === "incoming" && bags !== undefined) {
    updateData.amount_kg = bags * 50;
  }

  await supabase.from("feed_stock").update(updateData).eq("id", id);

  const newValue = JSON.stringify({ ...updateData });

  // Activity log
  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "edit",
    entity: "feed_stock",
    entity_id: id,
    description: `Edit data pakan: ${entry.type === "incoming" ? "pakan datang" : "pakan pakai"} tanggal ${entry.date}`,
    old_value: oldValue,
    new_value: newValue,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID wajib" }, { status: 400 });
  }

  const { data: entry } = await supabase
    .from("feed_stock")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  await supabase.from("feed_stock").delete().eq("id", id);

  // Activity log
  await supabase.from("activity_logs").insert({
    id: nanoid(),
    user_id: session.user.id,
    organization_id: org.id,
    action: "delete",
    entity: "feed_stock",
    entity_id: id,
    description: `Hapus data pakan: ${entry.type === "incoming" ? `${entry.bags} karung datang` : `${entry.amount_kg} kg pakai`} tanggal ${entry.date}`,
    old_value: JSON.stringify(entry),
  });

  return NextResponse.json({ success: true });
}
