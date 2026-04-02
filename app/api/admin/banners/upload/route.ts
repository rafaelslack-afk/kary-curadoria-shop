import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_SIZES = {
  desktop: { width: 1920, height: 520 },
  mobile: { width: 1080, height: 1350 },
} as const;

export async function POST(request: NextRequest) {
  const admin = createAdminClient();

  const formData = await request.formData();
  const file     = formData.get("file") as File | null;
  const requestedFolder = (formData.get("folder") as string) ?? "desktop";
  const folder = requestedFolder === "mobile" ? "mobile" : "desktop";

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const target = TARGET_SIZES[folder];

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(sourceBuffer)
      .rotate()
      .resize(target.width, target.height, {
        fit: "cover",
        position: "top",
      })
      .jpeg({
        quality: 94,
        chromaSubsampling: "4:4:4",
        mozjpeg: true,
      })
      .toBuffer();
  } catch (error) {
    return NextResponse.json(
      { error: `Falha ao ajustar imagem: ${(error as Error).message}` },
      { status: 400 }
    );
  }

  const { error } = await admin.storage.from("banners").upload(path, outputBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from("banners").getPublicUrl(path);
  return NextResponse.json({
    url: data.publicUrl,
    width: target.width,
    height: target.height,
  });
}
