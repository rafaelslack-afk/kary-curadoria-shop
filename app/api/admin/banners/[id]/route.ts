import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const body  = await request.json();

  const update: Record<string, unknown> = {};
  const fields = [
    "title", "subtitle", "button_text", "button_link",
    "image_desktop", "image_mobile", "text_position",
    "text_color", "order_index", "active",
  ] as const;

  for (const f of fields) {
    if (f in body) update[f] = body[f] === "" ? null : body[f];
  }

  const { data, error } = await admin
    .from("banners")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  // Remove images from storage if stored in our bucket
  const { data: banner } = await admin
    .from("banners")
    .select("image_desktop, image_mobile")
    .eq("id", params.id)
    .single();

  if (banner) {
    const toDelete: string[] = [];
    for (const url of [banner.image_desktop, banner.image_mobile]) {
      if (!url) continue;
      const match = (url as string).match(/banners\/(.+)$/);
      if (match) toDelete.push(match[1]);
    }
    if (toDelete.length > 0) {
      await admin.storage.from("banners").remove(toDelete);
    }
  }

  const { error } = await admin.from("banners").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
