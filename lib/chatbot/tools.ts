// Ferramentas do assistente virtual. Todas executam no servidor, somente
// leitura (exceto a marcação de handoff), consultando o Supabase em tempo real.
//
// Regra de segurança: o modelo NUNCA recebe URLs (imagem, produto, WhatsApp).
// Cards de produto e o link de WhatsApp enviados ao client são montados pelo
// servidor a partir de `cards` / `whatsappUrl` dos resultados — assim nenhum
// link ou preço inventado pelo modelo chega à cliente.
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { STOCK_BUFFER } from "@/lib/constants";
import { calcularPrecoComPlusSize } from "@/lib/pricing";
import { getPlusSizeMarkups } from "@/lib/pricing-server";
import { buildWhatsAppUrl } from "@/lib/site";

export interface ChatProductCard {
  slug: string;
  name: string;
  price: number;
  image: string | null;
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
      "Busca peças ativas e com estoque disponível na loja. Use para qualquer pedido de sugestão de peça. " +
      "Use `termo` para tecido, estilo ou tipo de peça (ex: 'linho', 'pantalona', 'colete'), e `categoria` " +
      "somente com um dos slugs de categoria listados no prompt. Retorna no máximo 6 peças.",
    input_schema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Palavras-chave (tecido, estilo, tipo de peça)." },
        categoria: { type: "string", description: "Slug de categoria, ex: 'conjuntos', 'blazer', 'calcas'." },
        cor: { type: "string", description: "Cor desejada, ex: 'preto', 'off-white'." },
        tamanho: { type: "string", description: "Tamanho desejado, ex: 'M', 'G1', 'Único'." },
        preco_max: { type: "number", description: "Preço base máximo em reais." },
        limite: { type: "number", description: "Quantidade máxima de peças (1 a 6)." },
      },
    },
  },
  {
    name: "detalhes_produto",
    description:
      "Retorna descrição, disponibilidade por cor e tamanho (em rótulos) e o preço final de cada tamanho " +
      "(já inclui o acréscimo de plus size em G1/G2/G3). Use antes de afirmar disponibilidade ou preço de um tamanho.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug da peça, obtido de buscar_produtos." },
      },
      required: ["slug"],
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
  active: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[] | null;
  featured: boolean;
  created_at: string;
  categories: { slug: string; name: string } | null;
  product_variants: VariantRow[];
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Singular aproximado para casar "conjuntos" com "conjunto"
function stem(word: string): string {
  const w = norm(word);
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "com", "e", "em", "para", "um", "uma", "o", "a", "os", "as"]);

function available(v: VariantRow): number {
  return v.active ? v.stock_qty - STOCK_BUFFER : 0;
}

function availabilityLabel(v: VariantRow): string {
  const n = available(v);
  if (n <= 0) return "esgotado";
  if (n <= 2) return "últimas unidades";
  return "disponível";
}

function toCard(p: ProductRow): ChatProductCard {
  return { slug: p.slug, name: p.name, price: Number(p.price), image: p.images?.[0] ?? null };
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
            "id, name, slug, description, price, images, featured, created_at, categories(slug, name), product_variants(color, size, stock_qty, active)"
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

  async function buscarProdutos(input: Record<string, unknown>): Promise<ToolOutcome> {
    const termo = str(input.termo);
    const categoria = stem(str(input.categoria));
    const cor = norm(str(input.cor));
    const tamanho = norm(str(input.tamanho));
    const precoMax = Number(input.preco_max);
    const limite = clampInt(input.limite, 6, 1, 6);

    const words = norm(termo)
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOPWORDS.has(w))
      .map(stem);

    const catalog = await loadCatalog();
    const matches = catalog.filter((p) => {
      const inStock = p.product_variants.filter((v) => available(v) > 0);
      if (inStock.length === 0) return false;

      if (categoria) {
        const cs = p.categories ? `${norm(p.categories.slug)} ${norm(p.categories.name)}` : "";
        if (!cs.includes(categoria)) return false;
      }

      if (words.length > 0) {
        const hay = norm(`${p.name} ${p.description ?? ""} ${p.categories?.name ?? ""}`);
        if (!words.every((w) => hay.includes(w))) return false;
      }

      if (Number.isFinite(precoMax) && precoMax > 0 && Number(p.price) > precoMax) return false;

      if (cor || tamanho) {
        const ok = inStock.some(
          (v) =>
            (!cor || norm(v.color ?? "").includes(cor)) &&
            (!tamanho || norm(v.size) === tamanho)
        );
        if (!ok) return false;
      }

      return true;
    });

    const selected = sortProducts(matches).slice(0, limite);

    return {
      result: {
        total_encontrado: matches.length,
        produtos: selected.map((p) => {
          const inStock = p.product_variants.filter((v) => available(v) > 0);
          return {
            slug: p.slug,
            nome: p.name,
            categoria: p.categories?.slug ?? null,
            preco_base: Number(p.price),
            cores_disponiveis: uniq(inStock.map((v) => v.color).filter((c): c is string => !!c)),
            tamanhos_disponiveis: uniq(inStock.map((v) => v.size)),
          };
        }),
      },
      cards: selected.map(toCard),
    };
  }

  async function detalhesProduto(input: Record<string, unknown>): Promise<ToolOutcome> {
    const slug = str(input.slug, 300);
    const catalog = await loadCatalog();
    const p = catalog.find((x) => x.slug === slug);
    if (!p) return { result: { encontrado: false, slug } };

    const markups = await loadMarkups();
    const byColor = new Map<string, VariantRow[]>();
    for (const v of p.product_variants.filter((x) => x.active)) {
      const key = v.color ?? "Única";
      byColor.set(key, [...(byColor.get(key) ?? []), v]);
    }

    return {
      result: {
        encontrado: true,
        slug: p.slug,
        nome: p.name,
        categoria: p.categories?.slug ?? null,
        descricao: (p.description ?? "").slice(0, 1500),
        preco_base: Number(p.price),
        grade: Array.from(byColor.entries()).map(([cor, variants]) => ({
          cor,
          tamanhos: variants.map((v) => ({
            tamanho: v.size,
            disponibilidade: availabilityLabel(v),
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
    const base = catalog.find((x) => x.slug === slugBase);
    if (!base) return { result: { encontrado: false, slug_base: slugBase } };

    const baseCat = base.categories?.slug ?? "";
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
            p.product_variants.some((v) => available(v) > 0)
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
        peca_base: { slug: base.slug, nome: base.name, categoria: baseCat },
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
