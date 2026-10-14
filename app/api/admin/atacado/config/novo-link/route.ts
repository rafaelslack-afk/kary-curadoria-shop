import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { regenerateAtacadoToken } from "@/lib/atacado/config";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/atacado/config/novo-link — gera um token novo. O link e os
// cookies anteriores deixam de valer na hora.
export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const token = await regenerateAtacadoToken();
    return NextResponse.json({ link: `${SITE_URL}/atacado/${token}` }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 500 });
  }
}
