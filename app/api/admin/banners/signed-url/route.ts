import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/banners/signed-url
// Gera uma URL assinada para upload direto ao Supabase Storage.
// O cliente faz PUT na signedUrl com o arquivo — sem passar pelo limite da Vercel.
export async function POST(request: NextRequest) {
  let body: { folder?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const folder = body.folder === "mobile" ? "mobile" : "desktop";
  const ext = (body.filename ?? "image.jpg").split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("banners")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Erro ao gerar URL de upload." },
      { status: 500 }
    );
  }

  const { data: publicData } = admin.storage.from("banners").getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    publicUrl: publicData.publicUrl,
  });
}
