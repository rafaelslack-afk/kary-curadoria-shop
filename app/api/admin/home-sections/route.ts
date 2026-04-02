import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/home-sections — all sections (incl. inactive)
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("home_sections")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/home-sections — create
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { title, description, href, button_text, icon_type, order_index, active } = body as {
    title?: string;
    description?: string;
    href?: string;
    button_text?: string;
    icon_type?: string;
    order_index?: number;
    active?: boolean;
  };

  if (!title?.trim() || !href?.trim()) {
    return NextResponse.json({ error: "Título e URL são obrigatórios." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("home_sections")
    .insert({
      title: title.trim(),
      description: (description ?? "").trim(),
      href: href.trim(),
      button_text: (button_text ?? "Ver Coleção →").trim(),
      icon_type: icon_type ?? "linen",
      order_index: order_index ?? 0,
      active: active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
