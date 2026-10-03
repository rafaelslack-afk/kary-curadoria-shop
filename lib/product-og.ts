import { SITE_URL } from "@/lib/site";

// Dados do card de compartilhamento (Open Graph) de um produto. Usado pela
// página /produtos/[slug] e pelo link curto /p/[ref] — os dois precisam gerar
// exatamente o mesmo card no Instagram, WhatsApp e Facebook.
export interface ProductOgSource {
  name: string;
  slug: string;
  description: string | null;
  images: string[] | null;
}

export interface ProductOg {
  title: string;
  description: string;
  url: string;
  image: { url: string; width: number; height: number; alt: string; type?: string };
}

export function buildProductOg(product: ProductOgSource): ProductOg {
  const description =
    product.description?.substring(0, 160) ??
    `${product.name} — Kary Curadoria. Moda clássica e elegante direto do Brás, SP.`;

  // Truncar título OG para ≤ 60 caracteres (limite recomendado por crawlers)
  const title =
    product.name.length > 60 ? product.name.slice(0, 57) + "..." : product.name;

  // Adicionar transformação Supabase para reduzir peso da imagem (< 600 KB)
  // width/height=1200 mantém proporção 1:1 (ideal para produto de moda)
  // quality=75 e format=webp reduzem drasticamente o tamanho
  const rawImage = product.images?.[0];
  const image = rawImage
    ? {
        url: `${rawImage.replace("/object/public/", "/render/image/public/")}?width=1200&height=1200&quality=75&format=webp&resize=fill`,
        width: 1200,
        height: 1200,
        alt: title,
        type: "image/webp",
      }
    : { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Kary Curadoria" };

  return {
    title,
    description,
    url: `${SITE_URL}/produtos/${product.slug}`,
    image,
  };
}

// Link curto de compartilhamento (DM do Instagram, WhatsApp).
export function shortProductUrl(skuBase: string): string {
  return `${SITE_URL}/p/${encodeURIComponent(skuBase.trim().toUpperCase())}`;
}
