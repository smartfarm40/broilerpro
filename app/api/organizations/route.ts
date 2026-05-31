import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  // Organization creation is disabled for self-service.
  // Organizations are created by system admin via Supabase dashboard.
  // Users join organizations via invitation links only.
  return NextResponse.json(
    { error: "Pembuatan organisasi hanya bisa dilakukan oleh administrator sistem." },
    { status: 403 }
  );
}
