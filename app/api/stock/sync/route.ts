import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSize } from "@/lib/erp-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mapeamento de cores Firestore/ERP → código SKU do KVO
const COLOR_TO_SKU: Record<string, string> = {
  // Amarelos
  "Amarelo":         "AMARELO",
  "Amarelo Manteiga": "MANTEI",

  // Azuis
  "Azul":            "AZUL",
  "Azul Gelo":       "AZUL",
  "Azul Bebê":       "AZULB",
  "Azul Bebe":       "AZULB",
  "Azul Marinho":    "MARINHO",

  // Beges
  "Bege":            "BEGE",
  "Bege Areia":      "BEGE",
  "Bege Escuro":     "BEGED",

  // Brancos
  "Branco":          "BRANCO",
  "fundo branco":    "FBRAN",
  "Fundo branco":    "FBRAN",

  // Crus
  "CRU":             "CRUA",
  "Cru":             "CRUA",
  "Crua":            "CRUA",

  // Cafés
  "Café":            "CAFE",
  "Cafe":            "CAFE",

  // Capuccinos
  "Capuccino":       "CAPPUCCINO",
  "Cappuccino":      "CAPPUCCINO",

  // Outros
  "Caqui":           "CAQUI",
  "Caramelo":        "CARAMELO",
  "Cinza":           "CINZA",
  "Colorida":        "COLORIDA",

  // Fundos
  "Fundo preto":     "FPRET",
  "fundo preto":     "FPRET",

  // Lilás
  "Lilas":           "LILAS",
  "Lilás":           "LILAS",

  // Mostarda
  "MOSTARDA":        "MOSTARDA",
  "Mostarda":        "MOSTARDA",

  // Marrons
  "Marrom":          "MARROM",

  // Marsalas
  "Marsala":         "MARSALLA",
  "Marsalha":        "MARSALLA",
  "Marsalla":        "MARSALLA",

  // Nude
  "Nude":            "NUDE",

  // Off White
  "Off White":       "OFFW",
  "Off-White":       "OFFW",
  "Off white":       "OFFW",
  "Off-white":       "OFFW",

  // Onça
  "Onça":            "ONCA",
  "Onca":            "ONCA",

  // Pretos
  "Preto":           "PRETO",

  // Rosas
  "Rosa":            "ROSA",
  "Rose":            "ROSE",
  "Rosê":            "ROSE",

  // Tabaco
  "Tabaco":          "TABACO",

  // Terracota
  "Terracota":       "TERRACOTA",

  // Verdes
  "Verde":           "VERDE",
  "Verde Agua":      "VERDEA",
  "Verde Água":      "VERDEA",
  "Verde Folha":     "VERDEF",
  "Verde Musgo":     "MUSGO",
  "Verde Oliva":     "OLIVA",

  // Vermelho
  "Vermelho":        "VERMELHO",

  // Vinho
  "Vinho":           "VINHO",
};

// ── Resolução de código de cor ────────────────────────────────────────────────
// Prioridade: (1) mapeamento DB por produto → (2) mapeamento DB global
//             → (3) tabela hardcoded → (4) primeiros 4 chars

interface ColorMapping {
  erp_color:    string;
  sku_code:     string;
  product_code: string | null;
}

function getSkuColorCode(
  erp_color:    string,
  product_code: string,
  mappings:     ColorMapping[]
): string {
  // 1. Mapeamento específico para este produto
  const specific = mappings.find(
    (m) => m.erp_color === erp_color && m.product_code === product_code
  );
  if (specific) return specific.sku_code;

  // 2. Mapeamento global (product_code = null)
  const global = mappings.find(
    (m) => m.erp_color === erp_color && m.product_code === null
  );
  if (global) return global.sku_code;

  // 3. Tabela hardcoded (legado)
  const hardcoded = COLOR_TO_SKU[erp_color];
  if (hardcoded) return hardcoded;

  // 4. Fallback: primeiros 4 chars em maiúsculas
  console.warn(`[ERP Sync] Cor não mapeada: "${erp_color}" — fallback: ${erp_color.substring(0, 4).toUpperCase()}`);
  return erp_color.substring(0, 4).toUpperCase();
}

function buildSku(
  code:     string,
  color:    string,
  size:     string,
  mappings: ColorMapping[]
): string {
  const colorCode = getSkuColorCode(color, code, mappings);
  const sizeCode   = normalizeSize(size);
  return `${code}-${colorCode}-${sizeCode}`;
}

// POST /api/stock/sync
// Chamado pelo ERP (Cloud Function) para sincronizar saldo de estoque físico.
export async function POST(request: NextRequest) {
  // ── Autenticação via Bearer secret ──────────────────────────────────────
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.STOCK_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse do body ────────────────────────────────────────────────────────
  let body: {
    origin: string;
    product_code: string;
    items: { color: string; size: string; quantity: number }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!body.product_code || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Campos obrigatórios: product_code, items[]." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // ── Verificar se o produto tem sync ERP habilitado ───────────────────────
  const { data: product } = await admin
    .from("products")
    .select("id, erp_sync_enabled")
    .eq("sku_base", body.product_code)
    .maybeSingle();

  if (product && product.erp_sync_enabled === false) {
    console.log(`[ERP Sync] Produto ${body.product_code} com sync desabilitado — ignorando`);
    return NextResponse.json({
      success:   true,
      synced:    0,
      skipped:   [{ product_code: body.product_code, reason: "erp_sync_disabled" }],
      not_found: [],
      errors:    [],
      timestamp: new Date().toISOString(),
    });
  }

  // ── Carregar mapeamentos de cor do banco (específicos + globais) ─────────
  const { data: dbMappings } = await admin
    .from("erp_color_mapping")
    .select("erp_color, sku_code, product_code");

  const mappings: ColorMapping[] = dbMappings ?? [];

  const results = {
    synced:    [] as string[],
    not_found: [] as string[],
    errors:    [] as string[],
  };

  // ── Processar cada item ───────────────────────────────────────────────────
  for (const item of body.items) {
    const sku = buildSku(body.product_code, item.color, item.size, mappings);

    try {
      // Buscar variante pelo SKU
      const { data: variant, error: variantError } = await admin
        .from("product_variants")
        .select("id, sku, stock_qty, product_id")
        .eq("sku", sku)
        .single();

      if (variantError || !variant) {
        results.not_found.push(sku);
        console.warn(`[ERP Sync] SKU não encontrado: ${sku}`);

        // Registrar erro para monitoramento no painel admin
        try {
          await admin.from("erp_sync_errors").insert({
            product_code: body.product_code,
            color_erp:    item.color,
            size:         item.size,
            sku_tentado:  sku,
            quantity:     item.quantity,
            error_type:   "not_found",
            resolved:     false,
          });
        } catch (insertErr) {
          console.error("[ERP Sync] Falha ao registrar erro:", insertErr);
        }

        continue;
      }

      const oldQty = variant.stock_qty;
      const newQty = item.quantity;

      // Atualizar stock_qty
      const { error: updateError } = await admin
        .from("product_variants")
        .update({ stock_qty: newQty })
        .eq("id", variant.id);

      if (updateError) {
        results.errors.push(`${sku}: ${updateError.message}`);
        console.error(`[ERP Sync] Erro ao atualizar ${sku}:`, updateError.message);
        continue;
      }

      // Registrar movimentação no inventory_log
      // IMPORTANTE: quantity = 0 porque o estoque já foi SUBSTITUÍDO (SET) pela linha acima.
      // Se houver trigger em inventory_log que faça stock_qty += quantity, usar 0 evita
      // que o valor seja acumulado em cima do SET correto.
      // O delta real fica registrado no campo reason para auditoria.
      await admin.from("inventory_log").insert({
        variant_id:   variant.id,
        product_id:   variant.product_id,
        type:         "ajuste",
        sales_channel: "physical",
        quantity:     0,
        reason:       `Sync ERP — estoque físico substituído: ${oldQty} → ${newQty} (ERP absoluto)`,
        created_by:   "erp_sync",
      });

      results.synced.push(sku);
      console.log(`[ERP Sync] ${sku}: ${oldQty} → ${newQty}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${sku}: ${msg}`);
      console.error(`[ERP Sync] Exceção ao processar ${sku}:`, msg);
    }
  }

  // ── Registrar timestamp da última sync ───────────────────────────────────
  await admin.from("system_config").upsert({
    key:        "last_erp_sync",
    value:      new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success:   true,
    synced:    results.synced.length,
    not_found: results.not_found,
    errors:    results.errors,
    timestamp: new Date().toISOString(),
  });
}
