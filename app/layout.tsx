import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kary Curadoria | Moda Feminina com Elegancia",
    template: "%s | Kary Curadoria",
  },
  description:
    "Conjuntos de linho e alfaiataria casual com acabamento impecavel. Do dia a dia ao evento especial. Loja no Bras, Sao Paulo.",
  keywords: [
    "moda feminina",
    "conjuntos de linho",
    "alfaiataria casual",
    "Bras",
    "Sao Paulo",
    "Kary Curadoria",
    "loja online",
  ],
  openGraph: {
    title: "Kary Curadoria | Moda Feminina com Elegancia",
    description:
      "Conjuntos de linho e alfaiataria casual com acabamento impecavel. Do dia a dia ao evento especial.",
    url: "https://karycuradoria.com.br",
    siteName: "Kary Curadoria",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Jost:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
