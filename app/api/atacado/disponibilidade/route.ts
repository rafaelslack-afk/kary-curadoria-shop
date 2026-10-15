import { NextRequest, NextResponse } from "next/server";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { checkAtacadoAccess } from "@/lib/atacado/access";
import { varianteDisponivelAtacado } from "@/lib/atacado/disponibilidade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/atacado/disponibilidade { productIds, variantIds } — o que mudou
// no carrinho de atacado: peças que saíram do atacado (desativadas no cadastro
// ou inativas) e variantes (cor/tamanho) sem estoque ou inativas. O carrinho
// sinaliza e bloqueia o envio até a cliente remover. Só devolve ids: o número
// do estoque nunca sai daqui.
export async function POST(request: NextRequest) {
  const { ok } = await checkAtacadoAccess();
  if (!ok) return NextResponse.json({ error: "Link de atacado expirado." }, { status: 401 });

  let body: { productIds?: unknown; variantIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const ids = Array.from(
    new Set((Array.isArray(body.productIds) ? body.productIds : []).filter((id): id is string => typeof id === "string" && UUID_RE.test(id)))
  ).slice(0, 300);
  const variantIds = Array.from(
    new Set((Array.isArray(body.variantIds) ? body.variantIds : []).filter((id): id is string => typeof id === "string" && UUID_RE.test(id)))
  ).slice(0, 300);
  if (ids.length === 0 && variantIds.length === 0) return NextResponse.json({ foraDoAtacado: [], variantesIndisponiveis: [] });

  const db = createNoStoreAdminClient();
  const [{ data, error }, { data: vdata, error: verror }] = await Promise.all([
    db.from("products").select("id, name, active, atacado_enabled").in("id", ids),
    variantIds.length > 0
      ? db.from("product_variants").select("id, product_id, active, stock_qty").in("id", variantIds)
      : Promise.resolve({ data: [] as { id: string; product_id: string; active: boolean; stock_qty: number }[], error: null }),
  ]);
  if (error || verror) return NextResponse.json({ error: "Não foi possível conferir agora." }, { status: 503 });

  const encontrados = new Map((data ?? []).map((p) => [p.id, p]));
  const foraDoAtacado = ids
    .filter((id) => {
      const p = encontrados.get(id);
      return !p || !p.active || p.atacado_enabled === false;
    })
    .map((id) => ({ productId: id, name: encontrados.get(id)?.name ?? null }));

  const achadas = new Map((vdata ?? []).map((v) => [v.id, v]));
  const variantesIndisponiveis = variantIds
    .filter((id) => {
      const v = achadas.get(id);
      return !v || !varianteDisponivelAtacado(v);
    })
    .map((id) => ({ variantId: id, productId: achadas.get(id)?.product_id ?? null }));

  return NextResponse.json({ foraDoAtacado, variantesIndisponiveis }, { headers: { "Cache-Control": "no-store" } });
}
