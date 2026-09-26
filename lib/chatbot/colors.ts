// Famílias de cor para a busca do assistente. A cor pedida pela cliente
// ("branca", "off white", "bege") vira um conjunto de cores reais do catálogo
// (product_variants.color). Comparação sem acento, maiúsculas nem gênero.
//
// Revisado contra as cores existentes em product_variants: Amarelo, Amarelo
// Manteiga, Azul, Azul Bebê, Azul Gelo, Azul Marinho, Bege, Bege Areia,
// Branco, Café, Cappuccino, Caramelo, Cinza, Cru, Crua, Laranja, Lilás,
// Marrom, Marsalla, Mostarda, Nude, Off-White, Preto, Rosa, Rose, Terracota,
// Verde, Verde Musgo, Verde Oliva, Vermelho, Vinho.

function normColor(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface ColorFamily {
  // Palavras que a cliente pode usar para pedir a família
  aliases: string[];
  // Cores do catálogo (e variações de nome) que pertencem à família
  cores: string[];
}

const FAMILIAS: ColorFamily[] = [
  {
    aliases: ["branco", "branca", "off white", "offwhite", "off", "white", "creme", "perola"],
    cores: ["Branco", "Off-White", "Off White", "Crua", "Cru", "Fundo branco", "Creme", "Pérola"],
  },
  {
    aliases: ["bege", "nude", "areia", "caqui", "cru", "crua", "creme"],
    cores: ["Bege", "Bege Areia", "Nude", "Crua", "Cru", "Areia", "Caqui", "Creme"],
  },
  {
    aliases: ["marrom", "cafe", "caramelo", "tabaco", "cappuccino", "capuccino", "terracota", "chocolate", "camel"],
    cores: ["Marrom", "Café", "Caramelo", "Tabaco", "Cappuccino", "Terracota", "Chocolate", "Camel"],
  },
  {
    aliases: ["verde", "musgo", "oliva"],
    cores: ["Verde", "Verde Musgo", "Verde Oliva", "Verde Água", "Verde Folha"],
  },
  {
    aliases: ["azul", "marinho", "bebe"],
    cores: ["Azul", "Azul Marinho", "Azul Bebê", "Azul Gelo"],
  },
  {
    aliases: ["rosa", "rose", "pink", "lilas"],
    cores: ["Rosa", "Rose", "Rosê", "Lilás"],
  },
  {
    aliases: ["lilas", "roxo", "roxa", "lavanda"],
    cores: ["Lilás", "Roxo", "Lavanda"],
  },
  {
    aliases: ["vermelho", "vermelha", "vinho", "marsala", "marsalla", "bordo"],
    cores: ["Vermelho", "Vinho", "Marsala", "Marsalla", "Bordô"],
  },
  {
    aliases: ["preto", "preta", "black"],
    cores: ["Preto", "Fundo preto"],
  },
  {
    aliases: ["amarelo", "amarela", "mostarda", "manteiga"],
    cores: ["Amarelo", "Amarelo Manteiga", "Mostarda"],
  },
  {
    aliases: ["cinza", "chumbo", "grafite"],
    cores: ["Cinza", "Chumbo", "Grafite"],
  },
  {
    aliases: ["laranja", "coral"],
    cores: ["Laranja", "Terracota", "Coral"],
  },
];

const BY_ALIAS = new Map<string, Set<string>>();
for (const f of FAMILIAS) {
  const cores = f.cores.map(normColor);
  for (const alias of [...f.aliases, ...cores]) {
    const key = normColor(alias);
    const set = BY_ALIAS.get(key) ?? new Set<string>();
    cores.forEach((c) => set.add(c));
    BY_ALIAS.set(key, set);
  }
}

// Plural simples: "brancas" → "branca", "pretos" → "preto"
function singular(w: string): string {
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

/** Cores do catálogo (normalizadas) aceitas para o pedido; null se não reconhecer como cor. */
export function colorFamily(requested: string): Set<string> | null {
  const key = normColor(requested);
  if (!key) return null;
  const direct = BY_ALIAS.get(key) ?? BY_ALIAS.get(singular(key));
  if (direct) return new Set(Array.from(direct).concat(key));
  // Pedido composto ("azul marinho claro"): une as famílias das palavras
  const out = new Set<string>([key]);
  let found = false;
  for (const w of key.split(" ")) {
    const fam = BY_ALIAS.get(w) ?? BY_ALIAS.get(singular(w));
    if (fam) {
      found = true;
      fam.forEach((c) => out.add(c));
    }
  }
  return found ? out : null;
}

/** Palavras (normalizadas) de um termo que são nomes de cor. */
export function isColorWord(word: string): boolean {
  const w = normColor(word);
  return BY_ALIAS.has(w) || BY_ALIAS.has(singular(w));
}

/** A cor de uma variante pertence ao conjunto pedido? */
export function colorMatches(variantColor: string | null, accepted: Set<string>): boolean {
  if (!variantColor) return false;
  return accepted.has(normColor(variantColor));
}
