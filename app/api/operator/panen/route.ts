import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import { headers } from "next/headers";
import { requireOrganization } from "@/src/lib/session";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await requireOrganization(session.user.id);
  const body = await request.json();
  const { flockId, totalWeight, totalBirds, notes } = body;

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

  // Mark flock as harvested
  await supabase
    .from("flocks")
    .update({
      status: "harvest",
      notes: `Panen: ${totalBirds} ekor, ${totalWeight} kg. ${notes || ""}`.trim(),
    })
    .eq("id", flockId);

  // Update coop status to empty
  await supabase.from("coops").update({ status: "empty" }).eq("id", flock.coop_id);

  return NextResponse.json({ success: true });
}
