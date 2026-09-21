import { NextResponse } from "next/server";
import { getPlusSizeMarkups } from "@/lib/pricing-server";

// GET /api/config/plus-size-markup — markups atuais de G1/G2/G3 (público,
// consumido pela PDP para calcular o preço exibido em tempo real).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const markups = await getPlusSizeMarkups();
  return NextResponse.json({ markups });
}
