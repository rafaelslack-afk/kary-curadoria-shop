import { NextRequest, NextResponse } from "next/server";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { checkAtacadoAccess } from "@/lib/atacado/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/atacado/disponibilidade { productIds } — quais peças do carrinho
// de atacado saíram do atacado (desativadas no cadastro ou inativas). O
// carrinho sinaliza essas peças e bloqueia o envio até a cliente removê-las.
export async function POST(request: NextRequest) {
  const { ok } = await checkAtacadoAccess();
  if (!ok) return NextResponse.json({ error: "Link de atacado expirado." }, { status: 401 });

  let body: { productIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const ids = Array.from(
    new Set((Array.isArray(body.productIds) ? body.productIds : []).filter((id): id is string => typeof id === "string" && UUID_RE.test(id)))
  ).slice(0, 300);
  if (ids.length === 0) return NextResponse.json({ foraDoAtacado: [] });

  const db = createNoStoreAdminClient();
  const { data, error } = await db.from("products").select("id, name, active, atacado_enabled").in("id", ids);
  if (error) return NextResponse.json({ error: "Não foi possível conferir agora." }, { status: 503 });

  const encontrados = new Map((data ?? []).map((p) => [p.id, p]));
  const foraDoAtacado = ids
    .filter((id) => {
      const p = encontrados.get(id);
      return !p || !p.active || p.atacado_enabled === false;
    })
    .map((id) => ({ productId: id, name: encontrados.get(id)?.name ?? null }));

  return NextResponse.json({ foraDoAtacado }, { headers: { "Cache-Control": "no-store" } });
}
