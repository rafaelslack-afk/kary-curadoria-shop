import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Autenticação de serviço (servidor-para-servidor), para rotas /api/admin
// que também são chamadas por integrações externas sem sessão de navegador.
//
// Aceita `Authorization: Bearer <STOCK_SYNC_SECRET>` — o mesmo segredo que o
// ERP já usa para autenticar em /api/stock/sync (o ERP envia o mesmo token
// para as duas rotas).
export function hasValidServiceSecret(request: NextRequest): boolean {
  const secret = process.env.STOCK_SYNC_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
