import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/admin/products/[id]/variants/[variantId]
// Exclui variante se não tiver histórico de pedidos.
// Se tiver, retorna 409 com instrução para desativar.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  const { variantId } = params;

  if (!variantId) {
    return NextResponse.json({ error: "variantId não informado." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verificar se há order_items vinculados
  const { count, error: countErr } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("variant_id", variantId);

  if (countErr) {
    console.error("[variants DELETE] Erro ao verificar order_items:", countErr.message);
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Variante tem histórico de vendas. Desative-a ao invés de excluir." },
      { status: 409 }
    );
  }

  const { error: deleteErr } = await admin
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (deleteErr) {
    console.error("[variants DELETE] Erro ao excluir variante:", deleteErr.message);
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
