// ── Buffer de segurança de estoque ────────────────────────────────────────────
//
// O KVO exibe (stock_qty - STOCK_BUFFER) para o cliente final.
// Definido como 1 durante o período inicial de integração com o ERP.
// Zerar (ou remover) após 30 dias de integração estável.
//
// ATENÇÃO: esta constante é importada em múltiplos lugares.
// Ao alterar, garanta que todas as referências estejam consistentes:
//   - app/api/products/route.ts               (API pública — lista de produtos)
//   - app/api/products/[id]/variants/route.ts (API pública — variantes por produto)
//   - app/admin/(authenticated)/estoque/page.tsx
//   - app/admin/(authenticated)/produtos/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
export const STOCK_BUFFER = 1;
