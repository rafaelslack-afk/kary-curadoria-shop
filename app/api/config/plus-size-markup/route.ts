import { NextResponse } from "next/server";
import { getPlusSizeMarkups } from "@/lib/pricing-server";

// GET /api/config/plus-size-markup — markups atuais de G1/G2/G3 (público,
// consumido pela PDP para calcular o preço exibido em tempo real).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const markups = await getPlusSizeMarkups();
  // Só exibição na PDP; o preço cobrado é recalculado no servidor em /api/orders/create
  return NextResponse.json(
    { markups },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
