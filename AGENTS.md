# AGENTS.md — Guia de Desenvolvimento Compartilhado (KVO — Kary Curadoria)

Este arquivo é o ponto de entrada para **agentes de IA** e **desenvolvedores** que trabalham no repositório `kary-curadoria-shop`.

## 1. O que é este projeto

- **Marca:** **Kary Curadoria** — loja de vestuário feminino atemporal (linho, alfaiataria, conjuntos e peças clássicas) com mais de 30 anos de atuação e loja física no Brás, São Paulo/SP (`Rua Min. Firmino Whitaker, 49/55, Box 142`).
- **Produto:** **KVO (Kary Vendas Online)** — plataforma própria de e-commerce omnichannel em `https://karycuradoria.com.br`, composta por:
  1. **Loja B2C (Varejo):** `app/(loja)/` — catálogo, PDP, carrinho, checkout transparente (Mercado Pago), frete (Melhor Envio), rastreio, recuperação de abandono e assistente virtual de IA.
  2. **Catálogo Atacado (B2B):** `app/atacado/` — catálogo separado sem indexação, precificação própria por forma de pagamento, pedido mínimo por peças, romaneio público por token e fechamento via WhatsApp.
  3. **Painel Administrativo:** `app/admin/` — gestão de pedidos, produtos, variantes/SKUs, estoque, banners, home, menus, cupons, clientes, atacado, ERP sync, chatbot e relatórios.
  4. **Integrações & Canais:** ERP bidirecional, Mercado Pago, Melhor Envio, Resend, Anthropic Claude (Chatbot), Meta Catalog (`/feed.xml`), Links curtos (`/p/[ref]`), TikTok Pixel + Events API, TikTok Shop, GA4 e Google Customer Reviews.

Para detalhes completos, consulte:
- **[`docs/NEGOCIO_E_REGRAS.md`](docs/NEGOCIO_E_REGRAS.md)** — Domínio, regras de negócio (varejo, atacado, estoque, preços, políticas e marketing).
- **[`docs/ARQUITETURA_TECNICA.md`](docs/ARQUITETURA_TECNICA.md)** — Arquitetura, schema Supabase, fluxos ponta a ponta, mapa de APIs, variáveis de ambiente e débitos técnicos conhecidos.

---

## 2. Stack e Comandos Essenciais

- **Framework:** Next.js 14.2 (`App Router`), React 18, TypeScript 5 (`strict: true`).
- **Estilo:** Tailwind CSS 3.4 — paleta da marca `kc` (`#A0622A`, `#5C3317`, `#EDE8DC`, `#F5F1EA`, `#B89070`) + fontes `Cormorant Garamond` (serif) e `Jost` (sans).
- **Banco / Auth / Storage:** Supabase (PostgreSQL + RLS + `@supabase/ssr` + Storage com Image Transformations).
- **Estado Client-Side:** Zustand 5 (`kvo-cart` para varejo em `lib/store/cart.ts`; `kvo-atacado-cart` para atacado em `lib/atacado/cart-store.ts`).
- **Deploy / Cron:** Vercel (`vercel.json` agenda `/api/cron/cancel-expired-orders` de hora em hora).

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção (execute antes de abrir PR)
npm run lint     # ESLint (eslint-config-next)
```

---

## 3. Mapa Rápido de Pastas

```text
app/
├── (loja)/             # Vitrine B2C, PDP, carrinho, checkout, pix, sucesso, rastrear, retomar, institucionais
├── atacado/            # Catálogo B2B ((area)/), redirect legado ([token]/), romaneio público (romaneio/[token]/)
├── admin/              # Login e painel autenticado ((authenticated)/)
├── api/
│   ├── admin/          # 45 rotas administrativas (TODAS exigem requireAdmin())
│   ├── atacado/        # Disponibilidade e criação de pedidos B2B
│   ├── chat/           # Assistente virtual (Claude Haiku 4.5), status e link WhatsApp
│   ├── checkout/       # Captura de abandono e retomada de carrinho
│   ├── coupons/        # Validação de cupom e cupom flutuante
│   ├── cron/           # Cancelamento de pedidos expirados + purga de PII de tracking
│   ├── orders/         # Criação, consulta pública sem PII, status, rastreio e PUT admin
│   ├── products/       # Catálogo público, busca, relacionados e variantes/estoque
│   ├── shipping/       # Cotação Melhor Envio com quoteToken assinado
│   ├── stock/sync/     # Inbound de estoque do ERP
│   ├── tracking/       # TikTok Events API (eventos pré-compra; Purchase é server-only)
│   └── webhooks/       # Webhook Mercado Pago
├── feed.xml/           # Feed RSS/XML para Meta Catalog
├── p/[ref]/            # Links curtos com detecção de bots de preview (OG) vs 302 para browser
components/             # loja/, atacado/, admin/, analytics/, ui/
lib/                    # Regras de negócio, clientes Supabase, integrações (atacado/, chatbot/, email/, erp/, tracking/, store/, hooks/)
supabase/               # schema.sql + migrations/*.sql
types/database.ts       # Tipos TypeScript do banco
scripts/                # Utilitários CLI (favicon, teste de links curtos, consulta de parcelas MP)
```

---

## 4. Invariantes e Regras de Ouro (NÃO QUEBRAR)

### 4.1 Supabase e Cache do Next.js
1. **Escolha o cliente Supabase correto (`lib/supabase/`):**
   - `createNoStoreAdminClient()` (`admin-no-store.ts`): **obrigatório** para leituras de `system_config`, módulo Atacado, Chatbot/Circuit Breaker e qualquer dado que precise refletir edições do admin sem esperar cache. O Next.js App Router pode cachear fetches internos do `supabase-js` mesmo com `dynamic = "force-dynamic"`.
   - `createAdminClient()` (`admin.ts`): operações server-side com service role (bypass RLS). **Nunca importar em arquivos `"use client"`**.
   - `createAnonClient()` (`anon.ts`): rotas públicas da loja sem cookies (evita renovar sessão de admin logado no mesmo navegador).
   - `createClient()` (`server.ts`): exclusivo para validação de sessão admin (`requireAdmin()`).
   - `createClient()` (`client.ts`): exclusivo para login/logout no browser (`autoRefreshToken: false` para não competir com o `middleware.ts`).
2. **Separação isomórfica estrita:** `lib/pricing.ts`, `lib/stock-availability.ts`, `lib/tiktok-shop.ts`, `lib/meta-catalog.ts`, `lib/storage-image.ts`, `lib/atacado/pricing.ts` e `lib/tracking/contents.ts` são importados por componentes client. **Nunca** importe `@/lib/supabase/*` nesses arquivos; leituras de banco ficam em arquivos `*-server.ts`.
3. **ISR seguro contra falhas transitórias:** em `app/(loja)/produtos/[slug]/page.tsx` e `app/feed.xml/route.ts`, erros do Supabase **devem lançar exceção** (nunca retornar `notFound()` ou XML vazio), para o ISR preservar o cache anterior válido.

### 4.2 Segurança e Autenticação
4. **Proteção de APIs Admin:** toda rota em `app/api/admin/**` e operações privadas/de escrita em `/api/products`, `/api/categories` e `/api/orders` devem chamar `requireAdmin()` (`lib/admin-auth.ts`). O `middleware.ts` protege apenas páginas `/admin/*`, não `/api/*`.
5. **Privacidade em `GET /api/orders/[id]`:** essa rota é pública (usada no polling do PIX e na página de sucesso) e **nunca** deve retornar PII (nome, e-mail, CPF, telefone, endereço). O pedido completo só é retornado em `GET /api/admin/orders/[id]`.
6. **Não poluir `orders.updated_at`:** `updated_at` é usado como proxy da data de confirmação do pagamento (usado pelo Google Customer Reviews). Colunas `erp_*` são ignoradas pelo trigger `fn_orders_set_updated_at()`, mas atualizações desnecessárias em outras colunas (como `payment_type`/`installments`) só devem ocorrer quando estiverem `NULL` (`lib/payment-details-store.ts`).
7. **Sem segredos no client:** tokens de API (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `MERCADOPAGO_ACCESS_TOKEN_*`, `MELHORENVIO_TOKEN_*`, `TIKTOK_EVENTS_API_TOKEN`, `ERP_WEBHOOK_SECRET`, `STOCK_SYNC_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`) são estritamente server-only (nunca prefixar com `NEXT_PUBLIC_`).

### 4.3 Estoque, Preços e Pedidos (Varejo)
8. **Fonte única de preço Plus Size:** nunca somar acréscimo de `G1`/`G2`/`G3` manualmente; usar sempre `calcularPrecoComPlusSize()` (`lib/pricing.ts`) com markups de `getPlusSizeMarkups()` (`lib/pricing-server.ts`).
9. **Estoque bruto vs `STOCK_BUFFER`:** `STOCK_BUFFER = 1` (`lib/constants.ts`) é aplicado na listagem de API pública (`GET /api/products` e `/api/products/[id]/variants`) e exibido no admin; **porém**, `lib/stock-availability.ts` (usado na PDP, carrinho, `orders/create` e chatbot) e `lib/atacado/disponibilidade.ts` usam intencionalmente o `stock_qty` bruto. Não misture os dois sem alinhamento explícito.
10. **Colunas legadas PagBank:** o ID e o status do pagamento do **Mercado Pago** são persistidos em `orders.pagbank_charge_id` e `orders.pagbank_status`. Não renomeie essas colunas sem migração coordenada em todas as rotas, webhooks, scripts e admin.
11. **Baixa de estoque sem duplicidade:** o estoque é reservado (`type = "reserva"`) em `POST /api/orders/create` **antes** da chamada ao Mercado Pago. Ao virar `"paid"`, o trigger `fn_handle_order_status_change()` apenas converte `"reserva"` em `"saida"` — não subtrai `stock_qty` novamente.
12. **ERP Sync (`POST /api/stock/sync`):** grava `inventory_log.quantity = 0` propositalmente ao fazer SET absoluto de `stock_qty`, para evitar dupla movimentação por triggers.

### 4.4 Módulo Atacado (B2B)
13. **Isolamento total do varejo:** o atacado **nunca** baixa estoque, **nunca** limita quantidade pelo `stock_qty` (checa apenas `stock_qty > 0`), **nunca** dispara ERP, Mercado Pago, Melhor Envio, Resend ou pixels de marketing, e **nunca** deve ser indexado (`noindex, nofollow` + `X-Robots-Tag`).
14. **Sigilo de preço bruto e percentuais:** `base_unit_price` e `discount_snapshot` são exclusivos do backoffice. Nunca exponha percentuais de desconto ou preço bruto no catálogo `/atacado`, no romaneio `/atacado/romaneio/[token]` ou na mensagem de WhatsApp.
15. **Troca de pagamento no atacado:** bloqueada em `PUT /api/admin/atacado/pedidos/[id]`; deve passar sempre por `POST /api/admin/atacado/pedidos/[id]/pagamento` (fluxo prévia → aplicar).

### 4.5 Chatbot IA (Claude Haiku 4.5)
16. **Prompt estático para Prompt Caching:** `CHAT_SYSTEM_PROMPT` (`lib/chatbot/system-prompt.ts`) usa `cache_control: { type: "ephemeral" }`. Não interpole dados dinâmicos (data, usuário, estoque) no system prompt.
17. **Zero URLs e zero alucinação de produtos:** o modelo nunca recebe URLs nem gera links em texto (`sanitizeReply` remove links/markdown). Cards de produto só são montados server-side via `mostrar_produtos` validados contra IDs realmente retornados pelas tools na mesma rodada.
18. **Fail-closed em erro de config:** se `getChatbotConfig()` falhar ao ler `system_config`, o assistente desliga (`enabled: false`) para evitar consumo descontrolado da API Anthropic.

### 4.6 Tracking & Catálogo
19. **IDs unificados de catálogo (`lib/meta-catalog.ts`):** `g:item_group_id` = `sku_base` normalizado; `g:id` = `CODIGO-COR` (sem tamanho). Feed `/feed.xml`, links curtos `/p/[ref]`, Meta Pixel e TikTok Pixel/Events API compartilham essa mesma convenção.
20. **Purchase TikTok é server-only:** `POST /api/tracking/tiktok` rejeita `Purchase`. O evento `Purchase` é enviado apenas pelo servidor (`sendOrderPurchase` em `lib/tracking/tiktok-server.ts`) quando o pagamento é efetivamente aprovado, usando `event_id = purchase_<orderId>` para deduplicação com o browser.

---

## 5. Convenções de Código e PR

- **Idioma:** código de domínio, comentários explicativos, mensagens de UI e commits em **português (pt-BR)**; identificadores de banco/API seguem mistura já estabelecida (`snake_case` no Postgres, `camelCase` no TypeScript).
- **Comentários de decisão:** o repositório valoriza comentários explicando o *porquê* de decisões não óbvias (cache, segurança, triggers, compatibilidade). Preserve comentários existentes ao editar arquivos.
- **Alterações de banco:** toda nova coluna/tabela/política deve gerar um arquivo SQL versionado em `supabase/migrations/` (com `IF NOT EXISTS` quando aplicável) e atualizar `types/database.ts`.
- **Checklist antes de concluir uma mudança:**
  1. `npm run lint` e `npm run build` sem erros.
  2. Se mexeu em preços/estoque/checkout/atacado/chatbot, verificar se manteve a separação client/server e o cliente Supabase adequado (`no-store` quando necessário).
  3. Se adicionou variável de ambiente, documentar em `.env.production.example` e em `docs/ARQUITETURA_TECNICA.md`.
