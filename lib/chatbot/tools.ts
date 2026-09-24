// Ferramentas do assistente virtual. Todas executam no servidor, somente
// leitura (exceto a marcação de handoff), consultando o Supabase em tempo real.
//
// Regra de segurança: o modelo NUNCA recebe URLs (imagem, produto, WhatsApp).
// Cards de produto e o link de WhatsApp enviados ao client são montados pelo
// servidor a partir de `cards` / `whatsappUrl` dos resultados — assim nenhum
// link ou preço inventado pelo modelo chega à cliente.
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { productAvailability, variantAvailability, isVariantOutOfStock, type Disponibilidade } from "@/lib/stock-availability";
import { calcularPrecoComPlusSize } from "@/lib/pricing";
import { getPlusSizeMarkups } from "@/lib/pricing-server";
import { buildWhatsAppUrl } from "@/lib/site";

export interface ChatProductCard {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  soldOut?: boolean;
}

export interface ToolOutcome {
  result: unknown;
  isError?: boolean;
  cards?: ChatProductCard[];
  whatsappUrl?: string;
}

// ── Definições (conteúdo fixo entre requisições — cacheável) ─────────────────

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_produtos",
    description:
      "Busca peças ativas da loja, com ou sem estoque. Use para qualquer pedido de sugestão de peça. " +
      "Use `termo` para o que a cliente descreveu (tipo de peça, tecido, estilo, ou uma referência como " +
      "'CON-0063'); cada palavra é buscada no nome, descrição, categoria e referência, e as peças que casam " +
      "com mais palavras vêm primeiro. Use `categoria` somente com um dos slugs listados no prompt. Só passe " +
      "`cor`, `tamanho` ou `preco_max` se a cliente pediu isso nesta conversa. Cada peça traz `disponibilidade` " +
      "('disponível', 'últimas unidades' ou 'esgotado'). Quando `termo_no_nome` é false, o termo aparece só na " +
      "descrição: não afirme que a peça é daquele tecido. Retorna no máximo 6 peças.",
    input_schema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Palavras-chave ou referência (ex: 'conjunto blazer calça', 'linho', 'CON-0063')." },
        categoria: { type: "string", description: "Slug de categoria, ex: 'conjuntos', 'blazer', 'calcas'." },
        cor: { type: "string", description: "Cor pedida pela cliente, ex: 'preto', 'off-white'." },
        tamanho: { type: "string", description: "Tamanho pedido pela cliente, ex: 'M', 'G1', 'Único'." },
        preco_max: { type: "number", description: "Preço base máximo em reais, se a cliente informou." },
        limite: { type: "number", description: "Quantidade máxima de peças (1 a 6)." },
      },
    },
  },
  {
    name: "detalhes_produto",
    description:
      "Retorna descrição, disponibilidade por cor e tamanho (em rótulos) e o preço final de cada tamanho " +
      "(já inclui o acréscimo de plus size em G1/G2/G3). Aceita o slug OU a referência da peça (ex: 'CON-0063', " +
      "'con 0063'). Use antes de afirmar disponibilidade ou preço de um tamanho, e sempre que a cliente citar uma referência.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug da peça (de buscar_produtos) ou a referência dela." },
        referencia: { type: "string", description: "Referência da peça, ex: 'CON-0063'. Alternativa ao slug." },
      },
    },
  },
  {
    name: "sugerir_combinacoes",
    description:
      "Sugere peças de categorias complementares (ativas e com estoque) para montar um look com a peça informada.",
    input_schema: {
      type: "object",
      properties: {
        slug_base: { type: "string", description: "Slug da peça base do look." },
        limite: { type: "number", description: "Quantidade máxima de sugestões (1 a 4)." },
      },
      required: ["slug_base"],
    },
  },
  {
    name: "informacoes_loja",
    description:
      "Retorna o texto oficial e resumido de uma política ou informação da loja. Use sempre que a cliente " +
      "perguntar sobre trocas, frete, pagamento, atacado, loja física ou prazo de entrega.",
    input_schema: {
      type: "object",
      properties: {
        assunto: {
          type: "string",
          enum: ["trocas", "frete", "pagamento", "atacado", "loja_fisica", "prazo"],
        },
      },
      required: ["assunto"],
    },
  },
  {
    name: "encaminhar_whatsapp",
    description:
      "Encaminha a cliente para a consultora da loja no WhatsApp. Um botão com o link aparece automaticamente " +
      "para a cliente — não escreva o link na resposta.",
    input_schema: {
      type: "object",
      properties: {
        resumo: {
          type: "string",
          description: "Resumo curto, em primeira pessoa da cliente, do que ela precisa (vai pré-preenchido na mensagem).",
        },
        motivo: {
          type: "string",
          description: "Motivo do encaminhamento, ex: 'atacado', 'medidas', 'troca', 'reclamacao', 'esgotado', 'pediu_pessoa'.",
        },
      },
      required: ["resumo", "motivo"],
    },
  },
];

// ── Textos fixos (conferidos contra /trocas-e-devolucoes, /politica-de-privacidade e checkout) ──

const INFORMACOES_LOJA: Record<string, { texto: string; pagina?: string }> = {
  trocas: {
    texto:
      "Direito de arrependimento: 7 dias corridos após o recebimento, com reembolso integral do produto, do frete " +
      "original e do frete de devolução (a Kary paga os fretes). Defeito de fabricação: 30 dias corridos após o " +
      "recebimento, com troca ou reembolso integral e todos os fretes pagos pela Kary. Troca de tamanho ou cor: " +
      "7 dias corridos após o recebimento; o frete de envio é da cliente e o de reenvio varia por região (Sul, " +
      "Sudeste e Centro-Oeste: cliente paga 50%; Norte e Nordeste: cliente paga integralmente; em troca com upgrade " +
      "a partir de R$ 180 o reenvio é por conta da Kary). Também é possível trocar presencialmente na loja do Brás " +
      "em até 7 dias corridos. Peças devem voltar com etiqueta, sem uso, sem odor e sem ajustes. Não há troca de " +
      "peças íntimas, de peças com desconto acima de 50% ou com etiqueta removida. A solicitação é feita pelo " +
      "e-mail contato@karycuradoria.com.br.",
    pagina: "/trocas-e-devolucoes",
  },
  frete: {
    texto:
      "O frete é calculado pelo CEP no carrinho ou no checkout, com opções PAC e SEDEX via Melhor Envio. " +
      "Não há frete grátis. Enviamos para todo o Brasil.",
  },
  pagamento: {
    texto:
      "Aceitamos PIX (aprovação instantânea) e cartão de crédito em até 3x sem juros. A partir de 4x há juros " +
      "do emissor do cartão.",
  },
  atacado: {
    texto:
      "Compras em atacado (para revenda) são negociadas diretamente com a nossa equipe pelo WhatsApp. No atacado " +
      "não há direito de arrependimento nem troca por tamanho ou gosto: a troca é aceita somente por defeito de " +
      "fabricação, comunicada em até 30 dias corridos do recebimento, com vídeo obrigatório da abertura da " +
      "embalagem mostrando o defeito.",
    pagina: "/trocas-e-devolucoes",
  },
  loja_fisica: {
    texto:
      "Loja física: Rua Min. Firmino Whitaker, 49/55, Box 142, Brás, São Paulo/SP, CEP 03027-000.",
  },
  prazo: {
    texto:
      "O prazo exato de entrega depende do CEP e da opção de frete escolhida (PAC ou SEDEX); ele aparece no " +
      "carrinho e no checkout. O código de rastreamento é enviado por e-mail quando o pedido é despachado.",
  },
};

// ── Complementos para montar looks (categorias reais ativas) ─────────────────

const CATEGORIAS_COMPLEMENTARES: Record<string, string[]> = {
  blazer: ["calcas", "shorts", "saias", "blusinhas", "body", "camisas"],
  calcas: ["blazer", "camisas", "blusinhas", "body", "casacos"],
  shorts: ["blazer", "blusinhas", "body", "camisas"],
  saias: ["blazer", "blusinhas", "body", "camisas"],
  camisas: ["calcas", "shorts", "saias", "blazer"],
  blusinhas: ["calcas", "shorts", "saias", "blazer"],
  body: ["calcas", "saias", "shorts", "blazer", "casacos"],
  casacos: ["calcas", "vestidos", "body", "blusinhas", "saias"],
  jaquetas: ["calcas", "vestidos", "body", "blusinhas", "saias"],
  vestidos: ["casacos", "jaquetas", "blazer"],
  conjuntos: ["casacos", "jaquetas", "body", "blusinhas"],
};

// ── Catálogo ─────────────────────────────────────────────────────────────────

interface VariantRow {
  color: string | null;
  size: string;
  stock_qty: number;
  stock_min: number;
  active: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku_base: string | null;
  description: string | null;
  price: number;
  images: string[] | null;
  featured: boolean;
  created_at: string;
  categories: { slug: string; name: string } | null;
  product_variants: VariantRow[];
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Singular aproximado para casar "conjuntos" com "conjunto"
function stem(word: string): string {
  const w = norm(word);
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "com", "e", "em", "para", "pra", "um", "uma", "uns", "umas",
  "o", "a", "os", "as", "no", "na", "nos", "nas", "ou", "que",
]);

function searchWords(termo: string): string[] {
  return uniq(
    norm(termo)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
      .map(stem)
  );
}

// Variantes que a PDP exibe: só as ativas (o produto já vem filtrado por ativo)
function pdpVariants(p: ProductRow): VariantRow[] {
  return p.product_variants.filter((v) => v.active);
}

function isBuyable(v: VariantRow): boolean {
  return !isVariantOutOfStock(v);
}

// ── Referência (sku_base) ────────────────────────────────────────────────────
// Aceita "CON-0063", "con 0063", "CON0063", "con 63". Compara letras + número,
// então zeros à esquerda e separadores não importam.

interface RefKey {
  letters: string;
  num: number;
}

function refKey(raw: string): RefKey | null {
  const m = norm(raw).replace(/[^a-z0-9]/g, "").match(/^([a-z]+)(\d+)$/);
  return m ? { letters: m[1], num: Number(m[2]) } : null;
}

// Candidatos a referência no texto: cada token, e pares "letras" + "número"
// separados por espaço, hífen ou ponto (ex.: "con 0063").
function referenceCandidates(text: string): RefKey[] {
  const tokens = norm(text).split(/[^a-z0-9]+/).filter(Boolean);
  const out: RefKey[] = [];
  tokens.forEach((t, i) => {
    const single = refKey(t);
    if (single) out.push(single);
    const next = tokens[i + 1];
    if (/^[a-z]+$/.test(t) && next && /^\d+$/.test(next)) {
      out.push({ letters: t, num: Number(next) });
    }
  });
  return out;
}

function findByReference(catalog: ProductRow[], text: string): ProductRow[] {
  const candidates = referenceCandidates(text);
  if (candidates.length === 0) return [];
  return catalog.filter((p) => {
    const k = p.sku_base ? refKey(p.sku_base) : null;
    return !!k && candidates.some((c) => c.letters === k.letters && c.num === k.num);
  });
}

const DISPONIBILIDADE_ORDEM: Record<Disponibilidade, number> = {
  "disponível": 0,
  "últimas unidades": 0,
  esgotado: 1,
};

function toCard(p: ProductRow): ChatProductCard {
  const soldOut = productAvailability(pdpVariants(p)) === "esgotado";
  return {
    slug: p.slug,
    name: p.name,
    price: Number(p.price),
    image: p.images?.[0] ?? null,
    ...(soldOut ? { soldOut: true } : {}),
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

// Aceita slug ou referência. Resolve, em ordem: slug exato → referência
// (sku_base, formato livre) → sufixo "-ref-xxx-0000" do slug → prefixo único.
function resolveProduct(catalog: ProductRow[], raw: string): ProductRow | undefined {
  const key = norm(raw).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!key) return undefined;
  const exact = catalog.find((p) => p.slug === key);
  if (exact) return exact;
  const bySku = findByReference(catalog, raw);
  if (bySku.length === 1) return bySku[0];
  const ref = key.match(/[a-z]{3}-\d{4}$/)?.[0];
  if (ref) {
    const byRef = catalog.filter((p) => p.slug.endsWith(`-${ref}`));
    if (byRef.length === 1) return byRef[0];
  }
  const byPrefix = catalog.filter((p) => p.slug.startsWith(key));
  return byPrefix.length === 1 ? byPrefix[0] : undefined;
}

const NOT_FOUND_HINT =
  "Peça não encontrada por este slug ou referência. Use buscar_produtos com o nome ou a referência.";

// Executor com cache por requisição (catálogo e markups carregados uma vez
// mesmo que o modelo chame várias ferramentas na mesma mensagem).
export function createToolExecutor(conversationId: string) {
  let catalogPromise: Promise<ProductRow[]> | null = null;
  let markupsPromise: Promise<Record<string, number>> | null = null;

  function loadCatalog(): Promise<ProductRow[]> {
    if (!catalogPromise) {
      catalogPromise = (async () => {
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("products")
          .select(
            "id, name, slug, sku_base, description, price, images, featured, created_at, categories(slug, name), product_variants(color, size, stock_qty, stock_min, active)"
          )
          .eq("active", true)
          .limit(1000);
        if (error) throw new Error("catalog_unavailable");
        return (data ?? []) as unknown as ProductRow[];
      })();
    }
    return catalogPromise;
  }

  function loadMarkups(): Promise<Record<string, number>> {
    if (!markupsPromise) markupsPromise = getPlusSizeMarkups();
    return markupsPromise;
  }

  function sortProducts(list: ProductRow[]): ProductRow[] {
    return [...list].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function productSummary(p: ProductRow, variants: VariantRow[]) {
    const buyable = variants.filter(isBuyable);
    const disponibilidade = productAvailability(variants);
    return {
      slug: p.slug,
      nome: p.name,
      referencia: p.sku_base,
      categoria: p.categories?.slug ?? null,
      preco_base: Number(p.price),
      disponibilidade,
      ...(disponibilidade === "esgotado"
        ? {}
        : {
            cores_disponiveis: uniq(buyable.map((v) => v.color).filter((c): c is string => !!c)),
            tamanhos_disponiveis: uniq(buyable.map((v) => v.size)),
          }),
    };
  }

  async function buscarProdutos(input: Record<string, unknown>): Promise<ToolOutcome> {
    const termo = str(input.termo);
    const categoria = stem(str(input.categoria));
    const cor = norm(str(input.cor));
    const tamanho = norm(str(input.tamanho));
    const precoMax = Number(input.preco_max);
    const limite = clampInt(input.limite, 6, 1, 6);

    const catalog = await loadCatalog();

    // Referência (ex.: "CON-0063", "con 0063"): busca direta por sku_base
    const byRef = termo ? findByReference(catalog, termo) : [];
    if (byRef.length > 0) {
      const selected = sortProducts(byRef).slice(0, limite);
      return {
        result: {
          total_encontrado: byRef.length,
          busca_por_referencia: true,
          produtos: selected.map((p) => productSummary(p, pdpVariants(p))),
        },
        cards: selected.map(toCard),
      };
    }

    const words = searchWords(termo);

    // Variantes consideradas: as que a PDP exibe, restritas à cor/tamanho
    // pedidos. Produtos sem estoque NÃO são descartados.
    const scored: { p: ProductRow; variants: VariantRow[]; score: number; inName: boolean; disp: Disponibilidade }[] = [];
    for (const p of catalog) {
      if (categoria) {
        const cs = p.categories ? `${norm(p.categories.slug)} ${norm(p.categories.name)}` : "";
        if (!cs.includes(categoria)) continue;
      }

      if (Number.isFinite(precoMax) && precoMax > 0 && Number(p.price) > precoMax) continue;

      let variants = pdpVariants(p);
      if (cor || tamanho) {
        variants = variants.filter(
          (v) => (!cor || norm(v.color ?? "").includes(cor)) && (!tamanho || norm(v.size) === tamanho)
        );
        if (variants.length === 0) continue;
      }

      let score = 0;
      if (words.length > 0) {
        const hay = norm(`${p.name} ${p.description ?? ""} ${p.categories?.name ?? ""} ${p.sku_base ?? ""}`);
        score = words.filter((w) => hay.includes(w)).length;
        if (score === 0) continue;
      }

      const name = norm(p.name);
      scored.push({
        p,
        variants,
        score,
        inName: words.length > 0 && words.every((w) => name.includes(w)),
        disp: productAvailability(variants),
      });
    }

    // Mais palavras casadas → todas no nome → disponíveis antes de esgotadas
    // → destaque → mais recentes
    const recency = new Map(sortProducts(scored.map((s) => s.p)).map((p, i) => [p.id, i]));
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.inName) - Number(a.inName) ||
        DISPONIBILIDADE_ORDEM[a.disp] - DISPONIBILIDADE_ORDEM[b.disp] ||
        (recency.get(a.p.id) ?? 0) - (recency.get(b.p.id) ?? 0)
    );
    const selected = scored.slice(0, limite);

    const anyInName = scored.some((s) => s.inName);
    const onlyInDescription = words.length > 0 && selected.length > 0 && !anyInName;

    return {
      result: {
        total_encontrado: scored.length,
        ...(words.length > 1
          ? {
              palavras_buscadas: words,
              total_com_todas_as_palavras: scored.filter((s) => s.score === words.length).length,
            }
          : {}),
        ...(selected.length === 0
          ? {
              observacao:
                "Nada encontrado. Tente de novo com menos palavras ou sinônimos (ex.: blazer/casaqueto/terno, " +
                "calça/pantalona) antes de dizer que não encontrou.",
            }
          : onlyInDescription
          ? {
              observacao:
                `Nenhuma peça tem "${termo}" no nome; o termo aparece só na descrição (pode ser sugestão de look ` +
                "ou parte da composição). Não afirme que as peças são desse tecido; apresente como opções relacionadas.",
            }
          : {}),
        produtos: selected.map((s) => ({
          ...productSummary(s.p, s.variants),
          ...(words.length > 1 ? { palavras_casadas: `${s.score}/${words.length}` } : {}),
          ...(words.length > 0 ? { termo_no_nome: s.inName } : {}),
        })),
      },
      cards: selected.map((s) => toCard(s.p)),
    };
  }

  async function detalhesProduto(input: Record<string, unknown>): Promise<ToolOutcome> {
    const slug = str(input.slug, 300) || str(input.referencia, 300);
    const catalog = await loadCatalog();
    const p = resolveProduct(catalog, slug);
    if (!p) return { result: { encontrado: false, busca: slug, observacao: NOT_FOUND_HINT } };

    const markups = await loadMarkups();
    const variants = pdpVariants(p);
    const byColor = new Map<string, VariantRow[]>();
    for (const v of variants) {
      const key = v.color ?? "Única";
      byColor.set(key, [...(byColor.get(key) ?? []), v]);
    }

    return {
      result: {
        encontrado: true,
        slug: p.slug,
        nome: p.name,
        referencia: p.sku_base,
        categoria: p.categories?.slug ?? null,
        descricao: (p.description ?? "").slice(0, 1500),
        preco_base: Number(p.price),
        disponibilidade: productAvailability(variants),
        grade: Array.from(byColor.entries()).map(([cor, vs]) => ({
          cor,
          tamanhos: vs.map((v) => ({
            tamanho: v.size,
            disponibilidade: variantAvailability(v),
            preco: calcularPrecoComPlusSize(Number(p.price), v.size, markups),
          })),
        })),
      },
      cards: [toCard(p)],
    };
  }

  async function sugerirCombinacoes(input: Record<string, unknown>): Promise<ToolOutcome> {
    const slugBase = str(input.slug_base, 300);
    const limite = clampInt(input.limite, 4, 1, 4);
    const catalog = await loadCatalog();
    const base = resolveProduct(catalog, slugBase);
    if (!base) return { result: { encontrado: false, slug_base: slugBase, observacao: NOT_FOUND_HINT } };

    const baseCat = base.categories?.slug ?? "";
    const baseDisponivel = pdpVariants(base).some(isBuyable);
    const complementares = CATEGORIAS_COMPLEMENTARES[baseCat] ?? [];
    if (complementares.length === 0) {
      return { result: { encontrado: true, sugestoes: [], observacao: "Sem categorias complementares para esta peça." } };
    }

    // Uma peça por categoria em rodízio, para variar o look
    const pools = complementares.map((cat) =>
      sortProducts(
        catalog.filter(
          (p) =>
            p.id !== base.id &&
            p.categories?.slug === cat &&
            pdpVariants(p).some(isBuyable)
        )
      )
    );
    const selected: ProductRow[] = [];
    for (let i = 0; selected.length < limite && pools.some((pool) => pool.length > i); i++) {
      for (const pool of pools) {
        if (pool[i] && selected.length < limite) selected.push(pool[i]);
      }
    }

    return {
      result: {
        encontrado: true,
        peca_base: {
          slug: base.slug,
          nome: base.name,
          categoria: baseCat,
          disponivel: baseDisponivel,
        },
        ...(baseDisponivel
          ? {}
          : { observacao: "A peça base está esgotada. Avise a cliente antes de sugerir as combinações." }),
        sugestoes: selected.map((p) => ({
          slug: p.slug,
          nome: p.name,
          categoria: p.categories?.slug ?? null,
          preco_base: Number(p.price),
        })),
      },
      cards: selected.map(toCard),
    };
  }

  function informacoesLoja(input: Record<string, unknown>): ToolOutcome {
    const assunto = str(input.assunto);
    const info = INFORMACOES_LOJA[assunto];
    if (!info) return { result: { erro: "assunto_desconhecido" }, isError: true };
    return { result: { assunto, ...info } };
  }

  async function encaminharWhatsapp(input: Record<string, unknown>): Promise<ToolOutcome> {
    const resumo = str(input.resumo, 300);
    const url = buildWhatsAppUrl(`Olá! Vim pelo assistente do site. ${resumo}`.trim());

    const admin = createAdminClient();
    await admin
      .from("chat_conversations")
      .update({ handed_off_whatsapp: true, updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return {
      result: { encaminhado: true, observacao: "O botão do WhatsApp será exibido para a cliente." },
      whatsappUrl: url,
    };
  }

  return async function run(name: string, rawInput: unknown): Promise<ToolOutcome> {
    const input = asRecord(rawInput);
    try {
      switch (name) {
        case "buscar_produtos":
          return await buscarProdutos(input);
        case "detalhes_produto":
          return await detalhesProduto(input);
        case "sugerir_combinacoes":
          return await sugerirCombinacoes(input);
        case "informacoes_loja":
          return informacoesLoja(input);
        case "encaminhar_whatsapp":
          return await encaminharWhatsapp(input);
        default:
          return { result: { erro: "ferramenta_desconhecida" }, isError: true };
      }
    } catch {
      return { result: { erro: "falha_temporaria_ao_consultar_a_loja" }, isError: true };
    }
  };
}
