import { SITE_URL } from "@/lib/site";
import { OPTIMIZED_IMAGE_TYPE, OPTIMIZED_IMAGE_WIDTH, optimizedImageUrl } from "@/lib/storage-image";

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
  // height ausente: a imagem mantém a proporção da foto (altura varia)
  image: { url: string; width: number; height?: number; alt: string; type?: string };
}

export function buildProductOg(product: ProductOgSource): ProductOg {
  const description =
    product.description?.substring(0, 160) ??
    `${product.name} — Kary Curadoria. Moda clássica e elegante direto do Brás, SP.`;

  // Truncar título OG para ≤ 60 caracteres (limite recomendado por crawlers)
  const title =
    product.name.length > 60 ? product.name.slice(0, 57) + "..." : product.name;

  // Mesma versão otimizada do feed da Meta (lib/storage-image.ts): WebP com
  // 1080px de largura, mantendo a proporção da foto (antes era 1200x1200 com
  // resize=fill, que achatava as fotos verticais).
  const rawImage = product.images?.[0];
  const image = rawImage
    ? {
        url: optimizedImageUrl(rawImage),
        width: OPTIMIZED_IMAGE_WIDTH,
        alt: title,
        type: OPTIMIZED_IMAGE_TYPE,
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
