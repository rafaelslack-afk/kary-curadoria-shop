import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// Área de atacado: fora dos buscadores (noindex em meta e em X-Robots-Tag no
// next.config.mjs, e fora do sitemap), mas com card de compartilhamento próprio
// para o Instagram, WhatsApp e Facebook. Sem preços nem descontos no texto.
// A imagem é estática (public/og-atacado.jpg, 1200x630): não depende do Supabase.
const TITLE = "Catálogo Atacado | Kary Curadoria";
const DESCRIPTION =
  "Moda feminina de alfaiataria e linho em atacado. Confira o catálogo com preços para lojistas e monte o seu pedido.";
const URL = `${SITE_URL}/atacado`;
const IMAGE = { url: `${SITE_URL}/og-atacado.jpg`, width: 1200, height: 630, alt: "Kary Curadoria — Catálogo Atacado", type: "image/jpeg" };

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Kary Curadoria",
    url: URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGE.url],
  },
};

export default function AtacadoRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
