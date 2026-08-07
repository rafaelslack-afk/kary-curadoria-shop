import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSize } from "@/lib/erp-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── GET /api/admin/erp-sync/mapping — Lista todos os mapeamentos ──────────────
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("erp_color_mapping")
    .select("id, erp_color, sku_code, product_code, created_by, created_at")
    .order("product_code", { ascending: true, nullsFirst: false })
    .order("erp_color", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// ── POST /api/admin/erp-sync/mapping ─────────────────────────────────────────
//
// Valida a existência da variante no KVO antes de salvar o mapeamento de cor.
//
// Body:
//   erp_color    — cor como vem do ERP (ex: "Verde Oliva")
//   sku_code     — código de cor KVO pretendido (ex: "OLIVA")
//   product_code — código base do produto (ex: "CON-0006")
//   size         — tamanho (ex: "M")
//   error_id?    — id em erp_sync_errors para marcar como resolvido
//   admin_email? — e-mail do admin (para auditoria)
//
// Respostas:
//   200  success          — mapeamento salvo, variante confirmada
//   404  variant_not_found — SKU não existe; devolve existing_variants
//   400  variant_inactive  — variante existe mas está inativa
//   400  body inválido
//   500  falha de DB
// ─────────────────────────────────────────────────────────────────────────────

interface MappingBody {
  erp_color:    string;
  sku_code:     string;
  product_code: string;
  size:         string;
  error_id?:    string;
  admin_email?: string;
}

export async function POST(request: NextRequest) {
  // ── Parse ────────────────────────────────────────────────────────────────────
  let body: MappingBody;
  try {
    body = await request.json() as MappingBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Body JSON inválido." },
      { status: 400 }
    );
  }

  const { erp_color, sku_code, product_code, size, error_id, admin_email } = body;

  if (!erp_color || !sku_code || !product_code || !size) {
    return NextResponse.json(
      { error: "missing_fields", message: "Campos obrigatórios: erp_color, sku_code, product_code, size." },
      { status: 400 }
    );
  }

  const admin       = createAdminClient();
  // size vem bruto do ERP (pode ter acento, ex: "ÚNICO") — normalizar antes
  // de montar o SKU, mesma regra aplicada em app/api/stock/sync/route.ts.
  const skuToCheck  = `${product_code}-${sku_code}-${normalizeSize(size)}`;
  const resolvedBy  = admin_email ?? "admin";

  // ── 1. Verificar se a variante existe ─────────────────────────────────────────
  const { data: variant } = await admin
    .from("product_variants")
    .select("id, sku, stock_qty, active")
    .eq("sku", skuToCheck)
    .single();

  if (!variant) {
    // Buscar variantes existentes do produto para sugerir ao admin
    const { data: existing } = await admin
      .from("product_variants")
      .select("sku, color, size, stock_qty, active")
      .like("sku", `${product_code}-%`)
      .order("sku");

    return NextResponse.json(
      {
        error:              "variant_not_found",
        message:            `Variante ${skuToCheck} não encontrada no KVO. Cadastre a variante primeiro antes de criar o mapeamento.`,
        sku_checked:        skuToCheck,
        existing_variants:  existing ?? [],
      },
      { status: 404 }
    );
  }

  // ── 2. Verificar se a variante está ativa ─────────────────────────────────────
  if (!variant.active) {
    return NextResponse.json(
      {
        error:       "variant_inactive",
        message:     `Variante ${skuToCheck} existe no KVO mas está inativa. Ative a variante antes de criar o mapeamento.`,
        sku_checked: skuToCheck,
        variant_id:  variant.id,
      },
      { status: 400 }
    );
  }

  // ── 3. Salvar mapeamento específico por produto ───────────────────────────────
  // Usa fetch-then-update-or-insert para respeitar os partial unique indexes
  // (product_code IS NOT NULL vs NULL não pode ser resolvido com upsert simples)
  const { data: existingMapping } = await admin
    .from("erp_color_mapping")
    .select("id")
    .eq("erp_color", erp_color)
    .eq("product_code", product_code)
    .maybeSingle();

  const mappingError = existingMapping
    ? (await admin
        .from("erp_color_mapping")
        .update({ sku_code })
        .eq("id", existingMapping.id)
      ).error
    : (await admin
        .from("erp_color_mapping")
        .insert({ erp_color, sku_code, product_code, created_by: resolvedBy })
      ).error;

  if (mappingError) {
    console.error("[ERP Mapping] Erro ao salvar mapeamento:", mappingError.message);
    return NextResponse.json(
      { error: "mapping_save_failed", message: "Erro ao salvar mapeamento." },
      { status: 500 }
    );
  }

  // ── 4. Marcar erro como resolvido (se error_id fornecido) ─────────────────────
  if (error_id) {
    const { error: resolveError } = await admin
      .from("erp_sync_errors")
      .update({
        resolved:    true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        notes:       `Mapeamento criado: "${erp_color}" → "${sku_code}" (variante ${skuToCheck} confirmada)`,
      })
      .eq("id", error_id);

    if (resolveError) {
      // Mapeamento já foi salvo — logar mas não falhar
      console.warn("[ERP Mapping] Não foi possível marcar erro como resolvido:", resolveError.message);
    }
  }

  return NextResponse.json({
    success:       true,
    message:       `Mapeamento salvo com sucesso. "${erp_color}" → "${sku_code}"`,
    sku_validated: skuToCheck,
    stock_qty:     variant.stock_qty,
  });
}
