import type { Metadata } from "next";

// Área de atacado: fora dos buscadores (também em robots.ts e fora do sitemap)
export const metadata: Metadata = {
  title: { absolute: "Atacado | Kary Curadoria" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AtacadoRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
