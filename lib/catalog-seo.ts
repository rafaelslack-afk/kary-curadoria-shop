// Conteúdo de SEO (H1 / title / meta description) por categoria do catálogo.
//
// Termos de cauda longa com intenção de compra, validados por categoria —
// evita keyword stuffing e mantém título/descrição legíveis para humanos.
// Usado tanto no generateMetadata (server) quanto no H1 renderizado no
// catálogo (client), para que os dois nunca fiquem dessincronizados.

export interface CatalogSeoEntry {
  h1: string;
  title: string;
  description: string;
}

export const CATALOG_CATEGORY_SEO: Record<string, CatalogSeoEntry> = {
  conjuntos: {
    h1: "Conjuntos Femininos de Alfaiataria",
    title: "Conjuntos Femininos Alfaiataria e Linho | Kary Curadoria",
    description:
      "Conjuntos femininos de alfaiataria e linho, blazer e calça, prontos para o dia a dia ou eventos. Compre online com entrega para todo o Brasil.",
  },
  blazer: {
    h1: "Blazer Feminino de Alfaiataria e Linho",
    title: "Blazer Feminino de Linho e Alfaiataria | Kary Curadoria",
    description:
      "Blazer feminino de linho e alfaiataria para o trabalho ou looks elegantes. Peças atemporais com caimento impecável. Compre online.",
  },
  calcas: {
    h1: "Calças Femininas Alfaiataria e Pantalona",
    title: "Calça Pantalona e Social Feminina | Kary Curadoria",
    description:
      "Calça pantalona e calça social feminina, cintura alta, corte reto. Alfaiataria com conforto para o dia a dia. Compre online.",
  },
  camisas: {
    h1: "Camisa Social Feminina de Linho",
    title: "Camisa Social Feminina de Linho | Kary Curadoria",
    description:
      "Camisa feminina social e de linho, manga longa, ideal para compor looks elegantes. Peças exclusivas com entrega para todo o Brasil.",
  },
  vestidos: {
    h1: "Vestido Feminino Elegante e Social",
    title: "Vestido Feminino Social e de Linho | Kary Curadoria",
    description:
      "Vestido feminino elegante e social, em linho e tecidos nobres. Peças atemporais para o dia a dia ou eventos. Compre online.",
  },
  casacos: {
    h1: "Casaco Feminino de Alfaiataria",
    title: "Casaco Feminino Elegante e Alfaiataria | Kary Curadoria",
    description:
      "Casaco feminino de alfaiataria, corte clássico e atemporal. Peças exclusivas para compor looks sofisticados. Compre online.",
  },
  body: {
    h1: "Body Feminino Básico e Gola Alta",
    title: "Body Feminino Básico e Gola Alta | Kary Curadoria",
    description:
      "Body feminino básico e gola alta, segunda pele para compor qualquer look. Peças versáteis com entrega para todo o Brasil.",
  },
  blusinhas: {
    h1: "Blusa Feminina Social e Manga Longa",
    title: "Blusa Feminina Social e Elegante | Kary Curadoria",
    description:
      "Blusa feminina social e manga longa, leveza e charme para o dia a dia. Peças exclusivas Kary Curadoria. Compre online.",
  },
  shorts: {
    h1: "Short Feminino de Alfaiataria",
    title: "Short Social Feminino Alfaiataria | Kary Curadoria",
    description:
      "Short feminino de alfaiataria e cintura alta, elegância e conforto. Peças atemporais Kary Curadoria. Compre online.",
  },
};

// Fallback — sem categoria selecionada ou slug desconhecido (ex: "Todas",
// ou categorias ativas sem conteúdo de SEO dedicado ainda, como jaquetas/saias).
export const CATALOG_SEO_FALLBACK: CatalogSeoEntry = {
  h1: "Moda Feminina Elegante e Atemporal",
  title: "Moda Feminina Online | Kary Curadoria",
  description:
    "Conjuntos, blazers, vestidos e mais em alfaiataria e linho. Moda feminina elegante com curadoria exclusiva. Compre online, entrega para todo o Brasil.",
};

export function getCatalogSeo(categoria?: string | null): CatalogSeoEntry {
  if (!categoria) return CATALOG_SEO_FALLBACK;
  return CATALOG_CATEGORY_SEO[categoria] ?? CATALOG_SEO_FALLBACK;
}
