import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/products/related?category_id=UUID&exclude_id=UUID&limit=8
 *
 * Retorna produtos ativos da mesma categoria, excluindo o produto atual.
 * Se a categoria não tiver produtos suficientes (< 4), complementa
 * com os produtos mais recentes de outras categorias.
 *
 * Retorna apenas campos necessários para o carrossel:
 * id, name, slug, price, original_price, images, category_id
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");
  const excludeId = searchParams.get("exclude_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "8", 10), 16);
  const minCards = 4;

  if (!categoryId || !excludeId) {
    return NextResponse.json(
      { error: "category_id e exclude_id são obrigatórios." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const SELECT_COLS = "id, name, slug, price, original_price, images, category_id";

  // ── 1. Buscar da mesma categoria ─────────────────────────────────────────
  const { data: sameCategory, error: sameCatErr } = await admin
    .from("products")
    .select(SELECT_COLS)
    .eq("active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sameCatErr) {
    console.error("[related] Erro ao buscar produtos da categoria:", sameCatErr.message);
    return NextResponse.json({ error: sameCatErr.message }, { status: 500 });
  }

  const results = sameCategory ?? [];

  // ── 2. Complementar se < 4 produtos na mesma categoria ───────────────────
  if (results.length < minCards) {
    const needed = minCards - results.length;
    const excludeIds = [excludeId, ...results.map((p) => p.id)];

    const { data: others } = await admin
      .from("products")
      .select(SELECT_COLS)
      .eq("active", true)
      .neq("category_id", categoryId)
      .not("id", "in", `(${excludeIds.map((id) => `"${id}"`).join(",")})`)
      .order("created_at", { ascending: false })
      .limit(needed);

    if (others && others.length > 0) {
      results.push(...others);
    }
  }

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
