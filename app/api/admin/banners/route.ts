import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("banners")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const body  = await request.json();

  const { data, error } = await admin
    .from("banners")
    .insert({
      title:         body.title          || null,
      subtitle:      body.subtitle       || null,
      button_text:   body.button_text    || null,
      button_link:   body.button_link    || null,
      image_desktop: body.image_desktop  || null,
      image_mobile:  body.image_mobile   || null,
      text_position: body.text_position  ?? "center",
      text_color:    body.text_color     ?? "light",
      order_index:   body.order_index    ?? 0,
      active:        body.active         ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
