import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { AVISO_MAX_CHARS, getAtacadoConfig, saveAtacadoConfig } from "@/lib/atacado/config";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/atacado/config — configurações e link secreto atual
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const config = await getAtacadoConfig();
  return NextResponse.json(
    { ...config, link: config.token ? `${SITE_URL}/atacado/${config.token}` : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// PUT /api/admin/atacado/config — { descontos, minimoPecas, whatsapp, aviso }
export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const d = (body.descontos ?? {}) as Record<string, unknown>;
  const pix = Number(d.pix);
  const card = Number(d.credit_card);
  if (![pix, card].every((n) => Number.isFinite(n) && n >= 0 && n < 100)) {
    return NextResponse.json({ error: "Descontos devem estar entre 0 e 99%." }, { status: 400 });
  }
  const minimo = Number(body.minimoPecas);
  if (!Number.isInteger(minimo) || minimo < 1 || minimo > 1000) {
    return NextResponse.json({ error: "Mínimo de peças inválido." }, { status: 400 });
  }
  const whatsapp = String(body.whatsapp ?? "").replace(/\D/g, "");
  if (whatsapp.length < 12 || whatsapp.length > 13) {
    return NextResponse.json({ error: "WhatsApp inválido. Use DDI + DDD + número (ex.: 5511940224088)." }, { status: 400 });
  }
  const aviso = (body.aviso ?? {}) as Record<string, unknown>;
  const texto = typeof aviso.texto === "string" ? aviso.texto.trim() : "";
  if (!texto || texto.length > AVISO_MAX_CHARS) {
    return NextResponse.json({ error: `O aviso precisa ter entre 1 e ${AVISO_MAX_CHARS} caracteres.` }, { status: 400 });
  }

  try {
    await saveAtacadoConfig({
      descontos: { pix: Math.round(pix * 100) / 100, credit_card: Math.round(card * 100) / 100 },
      minimoPecas: minimo,
      whatsapp,
      aviso: { ativo: aviso.ativo === true, texto },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  }
  return GET();
}
