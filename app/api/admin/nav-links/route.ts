import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/nav-links — todos os links (ativos e inativos)
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("nav_links")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/admin/nav-links — criar novo link
export async function POST(request: NextRequest) {
  let body: { label?: string; href?: string; order_index?: number; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { label, href, order_index, active } = body;

  if (!label?.trim() || !href?.trim()) {
    return NextResponse.json({ error: "label e href são obrigatórios." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("nav_links")
    .insert({ label: label.trim(), href: href.trim(), order_index: order_index ?? 99, active: active ?? true })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
