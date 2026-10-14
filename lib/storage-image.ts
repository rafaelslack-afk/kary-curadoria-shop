// Versão otimizada das imagens do Supabase Storage (Image Transformations,
// plano Pro), usada no feed da Meta (/feed.xml) e no og:image do link curto
// /p/[ref] — os dois apontam para a MESMA URL, então compartilham o cache da CDN.
//
// /storage/v1/object/public/products/x.png
//   → /storage/v1/render/image/public/products/x.png?width=1080&quality=80&format=webp
//
// - width=1080 sem height: redimensiona mantendo a proporção da foto.
// - format=webp é obrigatório: sem ele o Supabase só converte quando o cliente
//   anuncia suporte a WebP no Accept, e o crawler da Meta manda "Accept: */*",
//   então receberia o PNG (só redimensionado). Com format=webp os logs mostram
//   o crawler recebendo 200 image/webp (~40 KB, contra ~2 MB do PNG original).
//
// NÃO importar nada de @/lib/supabase aqui — arquivo isomórfico.

export const OPTIMIZED_IMAGE_WIDTH = 1080;
export const OPTIMIZED_IMAGE_TYPE = "image/webp";

const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

// URLs que não são do Storage público (ex.: imagem externa) voltam intactas.
export function optimizedImageUrl(url: string): string {
  if (!url.includes(OBJECT_PATH)) return url;
  const [base] = url.split("?");
  return (
    base.replace(OBJECT_PATH, RENDER_PATH) +
    `?width=${OPTIMIZED_IMAGE_WIDTH}&quality=80&format=webp`
  );
}
