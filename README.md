# KVO — Kary Vendas Online (Kary Curadoria)

Plataforma própria de e-commerce omnichannel da **Kary Curadoria** — vestuário feminino atemporal com mais de 30 anos de história e loja física no Brás, São Paulo/SP.

- **Loja em produção:** https://karycuradoria.com.br
- **Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, Supabase (PostgreSQL + Auth + Storage), Mercado Pago, Melhor Envio, Resend e Anthropic Claude (Assistente Virtual).

---

## Documentação do Projeto (Agentes de IA & Desenvolvedores)

| Documento | Conteúdo |
| :--- | :--- |
| **[`AGENTS.md`](AGENTS.md)** | Guia rápido, mapa de pastas e **regras de ouro / invariantes** para desenvolvimento compartilhado entre agentes de IA e desenvolvedores. |
| **[`docs/NEGOCIO_E_REGRAS.md`](docs/NEGOCIO_E_REGRAS.md)** | Entendimento da marca Kary Curadoria e todas as regras de negócio: varejo B2C, atacado B2B, precificação plus size, estoque, cupons, frete, trocas/devoluções, chatbot e marketing. |
| **[`docs/ARQUITETURA_TECNICA.md`](docs/ARQUITETURA_TECNICA.md)** | Arquitetura Next.js, schema Supabase, clientes/cache, segurança, diagramas de fluxo (checkout, ERP, atacado, chatbot), mapa de APIs, variáveis de ambiente e débitos técnicos conhecidos. |

---

## Módulos Principais

1. **Loja Varejo (B2C)** (`app/(loja)/`): vitrine, busca, PDP com galeria por cor e acréscimo plus size (`G1`/`G2`/`G3`), carrinho com validação de estoque, checkout transparente (PIX e Cartão via Mercado Pago), cálculo de frete (Melhor Envio), cupons, recuperação de abandono (`/retomar/[id]`), rastreio (`/rastrear`) e Assistente Virtual de IA (Claude Haiku 4.5).
2. **Atacado (B2B)** (`app/atacado/`): catálogo isolado e não indexado (`/atacado`), precificação própria por forma de pagamento, pedido mínimo em peças, romaneio compartilhável/imprimível (`/atacado/romaneio/[token]`) e fechamento via WhatsApp.
3. **Painel Administrativo** (`app/admin/`): dashboard, pedidos, etiquetas Melhor Envio, produtos/variantes/SKUs, estoque, banners/home/menus, cupons, clientes, atacado, sincronização ERP, monitoramento do chatbot e relatórios com exportação CSV.
4. **Integrações & Canais**: sincronização bidirecional com ERP, Meta Catalog (`/feed.xml`), links curtos com Open Graph (`/p/[ref]`), TikTok Shop, GA4, Meta Pixel, TikTok Pixel + Events API e Google Customer Reviews.

---

## Executando Localmente

1. Copie as variáveis de ambiente (consulte `.env.example` e `.env.production.example`):

```bash
cp .env.production.example .env.local
```

2. Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

3. Scripts disponíveis:

```bash
npm run dev      # Servidor local (Next.js)
npm run build    # Build de produção
npm run start    # Executa build de produção
npm run lint     # Verificação ESLint
```
