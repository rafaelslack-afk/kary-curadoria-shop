import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

function buildSku(code: string, color: string, size: string): string {
  const colorCode = COLOR_TO_SKU[color];

  if (!colorCode) {
    console.warn(
      `[ERP Sync] Cor não mapeada: "${color}"` +
      ` — usando fallback: ${color.substring(0, 4).toUpperCase()}`
    );
  }

  return `${code}-${colorCode ?? color.substring(0, 4).toUpperCase()}-${size}`;
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

  const results = {
    synced:    [] as string[],
    not_found: [] as string[],
    errors:    [] as string[],
  };

  // ── Processar cada item ───────────────────────────────────────────────────
  for (const item of body.items) {
    const sku = buildSku(body.product_code, item.color, item.size);

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
      await admin.from("inventory_log").insert({
        variant_id:   variant.id,
        product_id:   variant.product_id,
        type:         "ajuste",
        sales_channel: "physical",
        quantity:     newQty - oldQty,
        reason:       `Sync ERP — estoque físico atualizado (${oldQty} → ${newQty})`,
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
