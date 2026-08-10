/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "http2.mlstatic.com",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 dias
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Cache de 1 ano para ícones estáticos — reduz requisições repetidas de
  // crawlers (Google, Bing, Meta, Claude, Ahrefs etc.) que hoje buscam
  // esses arquivos sem cache a cada visita.
  //
  // NOTA: "/favicon.ico" foi deixado de fora de propósito. O Next.js App
  // Router reserva essa URL internamente (convenção de metadata file) e
  // sempre anexa seu próprio Cache-Control (`public, max-age=0,
  // must-revalidate`) à resposta, independente de o arquivo físico estar
  // em app/ ou public/. Adicionar um header aqui resulta em DOIS headers
  // Cache-Control conflitantes na mesma resposta (confirmado em teste local
  // com build limpo) — HTTP invalido, pior que não ter cache nenhum. O
  // favicon efetivamente usado pelo browser já vem cacheado por 1 ano via
  // favicon-32.png/favicon-16.png (declarados em metadata.icons no layout).
  async headers() {
    const oneYearImmutable = {
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    };
    return [
      { source: "/favicon-16.png", headers: [oneYearImmutable] },
      { source: "/favicon-32.png", headers: [oneYearImmutable] },
      { source: "/icon-512.png", headers: [oneYearImmutable] },
      { source: "/apple-touch-icon.png", headers: [oneYearImmutable] },
    ];
  },
};

export default nextConfig;
