import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/admin/nav-links/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const allowed = ["label", "href", "order_index", "active"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("nav_links")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/admin/nav-links/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const admin = createAdminClient();

  // Não permitir excluir se só restar 1 link ativo
  const { count } = await admin
    .from("nav_links")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  if ((count ?? 0) <= 1) {
    // Verificar se o link a excluir é o único ativo
    const { data: link } = await admin.from("nav_links").select("active").eq("id", id).single();
    if (link?.active) {
      return NextResponse.json(
        { error: "Não é possível excluir o último link ativo do menu." },
        { status: 409 }
      );
    }
  }

  const { error } = await admin.from("nav_links").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
