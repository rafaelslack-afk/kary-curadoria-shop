import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { getTikTokShopConfig } from "@/lib/tiktok-shop-server";
import {
  TIKTOK_SHOP_CONFIG_KEY,
  TIKTOK_SHOP_TEXT_MAX,
  normalizeTikTokUrl,
  type TikTokShopConfig,
} from "@/lib/tiktok-shop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/config/tiktok-shop — configuração atual (tela admin)
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json({ config: await getTikTokShopConfig() });
}

// PUT /api/admin/config/tiktok-shop — body: { ativo, url_perfil, texto }
export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (typeof body.ativo !== "boolean") {
    return NextResponse.json({ error: "Campo 'ativo' deve ser verdadeiro ou falso." }, { status: 400 });
  }

  const url = normalizeTikTokUrl(body.url_perfil);
  if (!url) {
    return NextResponse.json(
      { error: "URL do perfil inválida: use um endereço tiktok.com." },
      { status: 400 }
    );
  }

  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  if (!texto) {
    return NextResponse.json({ error: "Informe o texto do convite." }, { status: 400 });
  }
  if (texto.length > TIKTOK_SHOP_TEXT_MAX) {
    return NextResponse.json(
      { error: `O texto pode ter no máximo ${TIKTOK_SHOP_TEXT_MAX} caracteres.` },
      { status: 400 }
    );
  }

  const config: TikTokShopConfig = { ativo: body.ativo, url_perfil: url, texto };

  const { error } = await createAdminClient()
    .from("system_config")
    .upsert({
      key: TIKTOK_SHOP_CONFIG_KEY,
      value: JSON.stringify(config),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, config });
}
