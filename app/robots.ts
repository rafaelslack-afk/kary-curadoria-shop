import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /atacado fica liberado para os robôs de preview (Meta, WhatsApp) lerem o
      // card; segue fora dos buscadores por noindex (meta + X-Robots-Tag) e fora
      // do sitemap. Só os romaneios (dados de clientes) ficam bloqueados.
      disallow: ["/admin/", "/api/", "/checkout/", "/atacado/romaneio/"],
    },
    sitemap: "https://karycuradoria.com.br/sitemap.xml",
  };
}
