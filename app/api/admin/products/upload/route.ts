import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET = "products";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function ensureBucket() {
  const admin = createAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  const exists = (buckets ?? []).some((bucket) => bucket.name === BUCKET);
  if (exists) return admin;

  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ALLOWED_TYPES,
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }

  return admin;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureBucket();
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Formato nao suportado: ${file.type || file.name}` },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Erro ao enviar imagens." },
      { status: 500 }
    );
  }
}
