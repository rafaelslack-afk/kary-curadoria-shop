# Negócio e Regras de Domínio — Kary Curadoria (KVO)

Este documento consolida o entendimento completo do negócio da **Kary Curadoria** e de todas as regras de domínio implementadas no **KVO (Kary Vendas Online)**.

---

## 1. Sobre a Marca e o Produto

### 1.1 Kary Curadoria
- **Segmento:** Vestuário feminino atemporal — peças clássicas, elegantes e versáteis com foco em conjuntos de linho, alfaiataria, blazers, calças, camisas, vestidos, casacos, bodys, blusinhas e shorts.
- **Posicionamento:** Curadoria criteriosa com **mais de 30 anos de experiência** no mercado de confecções, priorizando tecido, caimento, versatilidade e durabilidade em vez de tendências passageiras.
- **Operação Omnichannel:**
  - **Loja Física:** Rua Min. Firmino Whitaker, 49/55, Box 142 — Brás, São Paulo/SP.
  - **E-commerce (KVO):** `https://karycuradoria.com.br` (varejo nacional B2C + catálogo atacado B2B).
  - **Atendimento Consultivo:** WhatsApp Varejo (`5511913187730`), WhatsApp Atacado (`5511940224088`, configurável), E-mail (`contato@karycuradoria.com.br`) e Instagram (`@karycuradoria`).
  - **Canais Complementares:** TikTok Shop (`@karycuradoria`) e Meta Catalog (Instagram/Facebook Shopping).
- **Identidade Visual:** Paleta terrosa/quente (`#A0622A` caramelo, `#5C3317` marrom café, `#EDE8DC` creme, `#F5F1EA` off-white quente, `#B89070` muted) com tipografia editorial (`Cormorant Garamond` para títulos e `Jost` para interface/corpo).

### 1.2 KVO (Kary Vendas Online)
O **KVO** é o produto digital de e-commerce da marca, desenvolvido sob medida para operar:
1. **Varejo B2C** com checkout transparente, cálculo de frete em tempo real, recuperação de abandono, régua de e-mails transacionais, rastreio e assistente virtual de IA.
2. **Atacado B2B** isolado do varejo, voltado para lojistas/revendedoras, com precificação por forma de pagamento, pedido mínimo em peças, romaneio compartilhável e fechamento consultivo no WhatsApp.
3. **Integração Bidirecional com ERP** da loja física (sincronização de estoque ERP → KVO e envio automático de vendas online KVO → ERP).

---

## 2. Catálogo, SKUs e Estoque

### 2.1 Estrutura de Produtos e Variantes
- **Produtos (`products`):** podem ser de dois tipos (`product_type`):
  - `individual`: produto simples com variantes próprias em `product_variants`.
  - `conjunto`: bundle/combo que referencia componentes em `product_bundle_items(bundle_product_id, variant_id, quantity)`. *(Nota técnica: no fluxo de checkout B2C atual, a compra e reserva operam diretamente sobre `variant_id` em `product_variants`; ver seção de débitos técnicos em `docs/ARQUITETURA_TECNICA.md`.)*
- **Variantes (`product_variants`):** o estoque vive sempre na variante (`size`, `color`, `sku`, `stock_qty`, `stock_min`, `active`, `images[]`).
  - A galeria da PDP e do Atacado pode trocar dinamicamente ao selecionar a cor usando `product_variants.images` (com fallback para `products.images`).
- **Flags operacionais por produto:**
  - `active`: visível na loja.
  - `featured`: destaque na vitrine.
  - `erp_sync_enabled`: `true` = estoque sincronizado pelo ERP; `false` = produto sob encomenda/consignado com estoque manual (o ERP pula a sync de entrada e recebe `is_encomenda: true` na notificação de venda).
  - `notifica_erp_venda`: `false` = vendas desse item não notificam o ERP.
  - `atacado_enabled`: `true` = exibido no catálogo B2B (`/atacado`); não afeta o varejo.
  - `tiktok_shop_url`: link opcional do produto específico na TikTok Shop.

### 2.2 Convenção de SKUs (`lib/sku.ts` e `app/api/admin/sku/next/route.ts`)
- **Prefixo por categoria:** `categories.prefix` (ex.: `LIN`, `ALF`, `VES`, `CON`).
- **Código base (`sku_base`):** sequencial de 4 dígitos por prefixo (`LIN-0001`, `LIN-0002`, ...).
- **SKU da variante:** `[sku_base]-[COR]-[TAMANHO]` em maiúsculas sem acentos (ex.: `LIN-0001-OFF-WHITE-M`).
- **Mapeamento de cores ERP → KVO (`lib/erp-sync.ts`):** resolução em 4 níveis:
  1. Mapeamento específico por produto (`erp_color_mapping` com `product_code`).
  2. Mapeamento global (`erp_color_mapping` com `product_code IS NULL`).
  3. Tabela legada `COLOR_TO_SKU` (ex.: `"Off White"` → `"OFFW"`, `"Verde Oliva"` → `"OLIVA"`).
  4. Fallback: 4 primeiros caracteres da cor em maiúsculo.

### 2.3 Regras de Disponibilidade e Buffer de Estoque
Existem **duas regras distintas** no código atual — é fundamental respeitar onde cada uma se aplica:

| Contexto | Regra de Estoque | Referência |
| :--- | :--- | :--- |
| **API pública de listagem e variantes** (`/api/products`, `/api/products/[id]/variants`) e **visão "Loja" no Admin** | Aplica `STOCK_BUFFER = 1` (`Math.max(0, stock_qty - 1)`), margem de segurança durante estabilização do ERP. | `lib/constants.ts` |
| **PDP, Carrinho, Criação de Pedido B2C e Chatbot IA** | Usa **`stock_qty` bruto** (sem `STOCK_BUFFER`): `0` = `"esgotado"`, `1..stock_min` = `"últimas unidades"`, `> stock_min` = `"disponível"`. | `lib/stock-availability.ts` |
| **Catálogo Atacado (B2B)** | Usa **`stock_qty > 0` bruto** como sinal binário (aparece ou não), mas **não limita** a quantidade pedida nem bloqueia/baixa estoque. | `lib/atacado/disponibilidade.ts` |

- **Regra de privacidade comercial:** o assistente virtual e o atacado **nunca** informam a quantidade numérica exata de peças em estoque para clientes.

---

## 3. Regras de Negócio — Varejo (B2C)

### 3.1 Preços, Promoções e Acréscimo Plus Size
- **Promoção:** exibida quando `original_price > price`; `price` é sempre o preço vigente.
- **Plus Size (`G1`, `G2`, `G3`):**
  - Acréscimos configuráveis no admin (`/admin/configuracoes/plus-size`) e salvos em `system_config.plus_size_markup` (JSON `Record<string, number>`).
  - Cálculo centralizado em `calcularPrecoComPlusSize(precoBase, tamanho, markups)` (`lib/pricing.ts`).
  - **Revalidação obrigatória no checkout:** `POST /api/orders/create` recalcula o preço unitário de cada item com base no banco + markup vigente; divergência > R$ 0,01 retorna HTTP `409` (`code: "preco_desatualizado"`).

### 3.2 Formas de Pagamento e Parcelamento
- **Métodos ativos no Checkout UI:** **PIX** e **Cartão de Crédito** (via Mercado Pago SDK v2). O backend mantém suporte a **Boleto** (`bolbradesco`, vencimento +3 dias), embora não esteja exposto na UI atual.
- **Desconto PIX no varejo:** não existe desconto global automático para PIX; descontos exclusivos de PIX ocorrem via cupons configurados com `allowed_payment_methods = "pix"`.
- **Parcelamento no cartão:**
  - Vitrine/PDP/Carrinho (`lib/installments.ts`): para valores ≥ R$ 10,00, exibe até **3x sem juros**.
  - Checkout (`InstallmentSelector.tsx` + `CardTokenizerForm.tsx`): antes da leitura do BIN do cartão, estima 1x–3x sem juros e 4x–12x com juros Price de 1,99% a.m.; após detectar o BIN, carrega os `payer_costs` reais do Mercado Pago (`installment_rate === 0` = sem juros).
- **Classificação para o ERP (`lib/payment-option.ts`):**
  - PIX → `pix` | Débito → `debito` | Crédito 1x → `credito_avista` | Crédito 2x–3x → `credito_3x` | Crédito 4x+ → `credito_parcelado`.

### 3.3 Frete e Logística (Melhor Envio — Correios e J&T Express)
- **Origem:** Brás, SP (`MELHORENVIO_CEP_ORIGEM`, fallback `03012020`).
- **Cálculo:** integra `/me/shipment/calculate` com dimensões mínimas dos Correios (`0.1 kg`, `11×2×16 cm`). Permite serviços dos **Correios** (PAC `id: 1` e SEDEX `id: 2`) e **J&T Express — Standard** (`id: 33`); se nenhum serviço permitido retornar para o CEP, usa outras transportadoras ordenadas por menor preço. Em falha da API, usa fallback fixo (`PAC` R$ 18,90 / 8 dias úteis; `SEDEX` R$ 34,50 / 3 dias úteis).
- **Comprovante assinado:** cada cotação gera um `quoteToken` assinado por HMAC-SHA256 (validade 24h, `lib/shipping-quote.ts`) usado na auditoria de totais do pedido.
- **Etiquetas no Admin:** consolida todos os itens em **1 único volume** (peso mín. 0,3 kg; comprimento somado até 100 cm) e envia `insurance_value`, atendendo Correios (PAC/SEDEX) e J&T Express Standard (`id: 33`), que não aceitam multi-volume.
- **Rastreamento:** links externos direcionam para os Correios (PAC/SEDEX) ou para o Melhor Rastreio (J&T Express) via `lib/shipping-tracking.ts`.
- **Frete grátis:** não há regra programática automática de frete grátis implementada no cálculo de frete.

### 3.4 Cupons de Desconto
- Tipos: `percent` (percentual sobre subtotal) ou `fixed` (valor fixo limitado ao subtotal).
- Regras validadas: ativo (`active`), validade (`expires_at`), limite de usos (`max_uses`), pedido mínimo (`min_order`), produto específico (`product_id`) e método de pagamento permitido (`allowed_payment_methods`: `all | pix | credit_card`).
- **Cupom Flutuante:** cupom com `is_floating = true` e `active = true` exibido em banner/pop-up após 3s (respeita dispensa na sessão).
- **Regra especial de recuperação de abandono:** mesmo se um cupom estiver com `active = false`, `POST /api/orders/create` aceita o cupom caso o e-mail da cliente possua um registro em `abandoned_checkouts` nos **últimos 7 dias**.

### 3.5 Abandono e Retomada de Carrinho
- **Captura:** disparada no checkout quando a cliente conclui a Etapa 0 (Identificação: nome, e-mail, CPF, telefone). Agrupa/atualiza registros não recuperados do mesmo e-mail em janela de 24h.
- **Retomada:** link `/retomar/<uuid>` restaura os itens do carrinho e redireciona para `/checkout`.
- **Classificação de recuperação:**
  - Compra concluída em **< 60 min** da captura → considerada compra direta (registro de abandono é deletado para não distorcer métricas).
  - Compra concluída em **≥ 60 min** → marcada como `recovered = true` com `order_id` vinculado.

### 3.6 Ciclo de Vida e Expiração de Pedidos B2C
Status possíveis: `pending` → `paid` → `preparing` → `shipped` → `delivered` (ou `cancelled`).
- **Cartão de crédito:** aprovação síncrona na criação; se recusado (`rejected`), o estoque reservado sofre rollback imediato e o pedido **não é salvo** (cliente pode corrigir no mesmo formulário).
- **PIX:** nasce `pending` com estoque reservado; UI exibe contagem de **30 minutos**, e o cron horário cancela automaticamente após **60 minutos** (`lib/order-expiration.ts`), restaurando o estoque.
- **Boleto:** vence em **3 dias** no Mercado Pago e o cron cancela após **5 dias** (7200 min) para cobrir compensação bancária.
- **Despacho:** ao inserir `tracking_code` em um pedido `preparing` no admin, o status avança automaticamente para `shipped` e dispara o e-mail de envio.
- **Alerta de estoque baixo:** após confirmação de pagamento no webhook, se alguma variante do pedido ficar com `stock_qty <= stock_min`, dispara e-mail de alerta para `contato@karycuradoria.com.br`.

### 3.7 Modo Pré-Lançamento (`lib/store-launch.ts`)
- Controlado por `STORE_PRELAUNCH_ENABLED` (default `true`; desligado apenas com `"false"`) e `NEXT_PUBLIC_STORE_LAUNCH_AT` / `STORE_LAUNCH_AT`.
- Quando ativo, todas as rotas de `app/(loja)/` renderizam a landing page `PrelaunchHome` em vez da loja aberta.

---

## 4. Regras de Negócio — Atacado (B2B)

O módulo Atacado (`/atacado`) foi projetado para ser **completamente separado do varejo**:

- **Acesso:** aberto no endereço fixo `/atacado` (sem login, sem token e sem cookie). Links antigos `/atacado/<token>` sofrem redirect `308` para `/atacado` limpando o cookie legado.
- **Não indexação:** bloqueado em buscadores via meta `robots: noindex, nofollow` e header `X-Robots-Tag: noindex, nofollow`, mas **liberado** em `robots.txt` para que robôs de preview (WhatsApp/Instagram/Facebook) exibam o card Open Graph (`public/og-atacado.jpg`, sem citar preços ou descontos).
- **Vitrine isolada:** sem chatbot, sem cupom flutuante, sem WhatsApp do varejo e sem pixels de marketing. Carrinho próprio (`kvo-atacado-cart`).
- **Pedido mínimo:** mínimo de **peças** (padrão **6 peças**, configurável em `system_config.atacado_minimo_pecas`), não por valor.
- **Precificação (`lib/atacado/pricing.ts`):**
  1. Parte de `products.price` (já promocional quando houver).
  2. Soma acréscimo plus size (`G1`/`G2`/`G3`) = **preço bruto** (`base_unit_price`).
  3. Aplica desconto conforme a **forma de pagamento escolhida**: `pix` (padrão **20%**) ou `credit_card` (padrão **10%**), configuráveis em `system_config.atacado_descontos`.
  4. **Sigilo:** percentuais e preço bruto nunca são exibidos no catálogo, romaneio ou mensagem de WhatsApp — apenas o preço final.
- **Estoque e integrações:** exibe apenas produtos com `active = true` e `atacado_enabled = true` cujas variantes tenham `active = true` e `stock_qty > 0`. **Não limita quantidade**, **não baixa estoque**, **não notifica ERP**, **não cobra online** e **não calcula frete automaticamente** (frete é preenchido pela equipe na negociação).
- **Fluxo do pedido (`ATC-0001`, `ATC-0002`...):**
  - Cliente preenche dados (com validação de CPF ou CNPJ), endereço (via `/api/cep`), escolhe PIX ou Cartão e envia.
  - Sistema gera o pedido com `romaneio_token` único e abre WhatsApp dedicado do atacado (`atacado_whatsapp`, padrão `5511940224088`) com resumo e link do romaneio (`/atacado/romaneio/[token]`).
  - **Status:** `novo` → `em_negociacao` → `aguardando_pagamento` → `pago` → `enviado` (ou `cancelado`).
  - **Negociação no Admin:** equipe pode adicionar/remover itens, editar preços manualmente (marca `price_overridden = true`), preencher `shipping_cost` e trocar a forma de pagamento (com prévia de recálculo preservando itens editados manualmente, salvo escolha explícita). O romaneio público reflete em tempo real o estado atualizado e suporta impressão A4.

---

## 5. Política de Trocas e Devoluções (`app/(loja)/trocas-e-devolucoes/page.tsx`)

### 5.1 Varejo (Regido pelo CDC)
| Situação | Prazo | Frete Ida (Cliente → Kary) | Frete Volta (Kary → Cliente) | Resolução |
| :--- | :--- | :--- | :--- | :--- |
| **Arrependimento (Art. 49 CDC)** | 7 dias corridos do recebimento | Kary paga | — | Reembolso integral (produto + frete original + devolução) |
| **Defeito de fabricação** | 30 dias corridos do recebimento | Kary paga | Kary paga | Troca ou reembolso integral |
| **Troca de tamanho/cor (S/SE/CO)** | 7 dias corridos | Cliente paga | Cliente paga 50% | Troca ou crédito na loja |
| **Troca de tamanho/cor (N/NE)** | 7 dias corridos | Cliente paga | Cliente paga 100% | Troca ou crédito na loja |
| **Troca + upgrade ≥ R$ 180** | 7 dias corridos | Cliente paga | Kary paga | Troca + envio do novo pedido |
| **Troca presencial (Brás)** | 7 dias corridos | Sem frete | Sem frete | Troca ou crédito na loja |

- **Condições:** solicitação prévia por e-mail (`contato@karycuradoria.com.br`), postagem em até **5 dias corridos** após aprovação, etiqueta fixada, sem uso/odor/lavagem/ajustes (bainhas etc.). Resolução em até **5 dias úteis** após recebimento.
- **Sem direito a troca:** peças íntimas, promoções com desconto > 50%, etiqueta removida, sinais de uso/maquiagem/perfume ou mau uso.
- **Devolução involuntária pelos Correios** (endereço inválido, destinatário ausente etc.): novo frete por conta da cliente via PIX/link.

### 5.2 Atacado (Regido pelo Código Civil)
- Não se aplica CDC (compra destinada a revenda): **sem direito de arrependimento** nem troca por tamanho/gosto.
- Troca aceita **exclusivamente por defeito de fabricação** (Arts. 441–446 do Código Civil) em até **30 dias corridos** do recebimento.
- **Regra operacional obrigatória:** comprovação por **vídeo gravado no momento da abertura da embalagem** mostrando claramente o defeito, enviado via WhatsApp.

---

## 6. Assistente Virtual de IA (Pré-venda)

- **Papel no negócio:** consultora virtual da Kary Curadoria no canto inferior esquerdo da loja varejo (oculta em `/checkout`, `/retomar`, `/atacado` e `/admin`), com objetivo de tirar dúvidas de catálogo, combinar looks, informar políticas oficiais e aquecer/encaminhar clientes para a consultora humana no WhatsApp.
- **Limites de conduta:**
  - Respostas curtas (2–4 frases), calorosas e elegantes, em texto puro (sem markdown/links).
  - Nunca inventa produtos, preços, cupons, descontos ou frete grátis; nunca informa estoque numérico; nunca coleta CPF, cartão, endereço completo ou senha.
  - Não consulta pedidos existentes (encaminha pós-venda/trocas para o WhatsApp).
- **Handoff estruturado:** o botão "Falar com a consultora" gera automaticamente uma mensagem resumida no WhatsApp contendo os termos buscados e até 3 peças de interesse usando links curtos `/p/<sku_base>`.

---

## 7. Canais de Aquisição, SEO e Tracking

- **Meta Catalog (`/feed.xml`):** feed RSS 2.0 com namespace `g:` agrupando por produto (`g:item_group_id` = `sku_base`) e criando 1 item por cor (`g:id` = `CODIGO-COR`, sem tamanho), com imagens otimizadas em WebP 1080px via Supabase Image Transformations.
- **Links Curtos (`/p/[ref]`):** URLs compartilháveis (usadas no feed Meta, WhatsApp, DMs e chatbot). Redirecionam navegadores com `302` para `/produtos/<slug>?utm_source=link_curto&utm_medium=dm` e servem HTML estático com Open Graph + JSON-LD `Product` para bots de preview.
- **TikTok Shop:** convite discreto configurável no admin (`/admin/configuracoes/tiktok-shop`), exibido fora do checkout/carrinho/atacado, apontando para `products.tiktok_shop_url` ou perfil `@karycuradoria`.
- **Mensuração e Privacidade:**
  - **GA4:** `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `click_tiktok_shop`.
  - **Meta Pixel (`969990458816538`):** `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` (deduplicado por `purchase_<orderId>`).
  - **TikTok Pixel + Events API:** deduplicação por `event_id`; `Purchase` enviado exclusivamente pelo servidor após pagamento confirmado; dados pessoais de navegação (`tracking_context`) são apagados imediatamente após envio bem-sucedido ou após 7 dias via cron (LGPD).
  - **Google Customer Reviews:** opt-in exibido em `/checkout/sucesso` apenas quando o pedido está confirmado como pago, com cálculo de data estimada de entrega em dias úteis.
