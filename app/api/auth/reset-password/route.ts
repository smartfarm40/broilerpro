import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateOrigin } from "@/src/lib/csrf";

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid" }, { status: 400 });
  }

  const { accessToken, refreshToken, password } = body;

  if (!password) {
    return NextResponse.json({ error: "Password baru wajib diisi" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Token reset tidak valid" }, { status: 400 });
  }

  // Create client with the user's session from reset link
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Set session from the reset token
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
  });

  if (sessionError) {
    return NextResponse.json({ error: "Link reset tidak valid atau sudah kadaluarsa" }, { status: 400 });
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return NextResponse.json({ error: "Gagal mengubah password: " + updateError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Password berhasil diubah" });
}
