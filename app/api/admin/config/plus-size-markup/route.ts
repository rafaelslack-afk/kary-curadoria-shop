import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlusSizeMarkups } from "@/lib/pricing-server";
import { requireAdmin } from "@/lib/admin-auth";

const CONFIG_KEY = "plus_size_markup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/config/plus-size-markup — markups atuais (tela admin)
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const markups = await getPlusSizeMarkups();
  return NextResponse.json({ markups });
}

// PUT /api/admin/config/plus-size-markup — body: { markups: { G1, G2, G3 } }
export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: { markups?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const markups = body.markups;
  if (!markups || typeof markups !== "object") {
    return NextResponse.json({ error: "Campo 'markups' é obrigatório." }, { status: 400 });
  }

  // Valida que todos os valores são números não negativos
  const sanitized: Record<string, number> = {};
  for (const [size, raw] of Object.entries(markups)) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json(
        { error: `Valor inválido para ${size}. Informe um número maior ou igual a zero.` },
        { status: 400 }
      );
    }
    sanitized[size] = n;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("system_config")
    .upsert({
      key: CONFIG_KEY,
      value: JSON.stringify(sanitized),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, markups: sanitized });
}
