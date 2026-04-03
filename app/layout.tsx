import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kary Curadoria | Moda Feminina com Elegância",
    template: "%s | Kary Curadoria",
  },
  description:
    "Moda feminina com elegância e curadoria exclusiva no coração do Brás. Conjuntos de linho, alfaiataria casual e peças atemporais.",
  keywords: [
    "moda feminina",
    "conjuntos de linho",
    "alfaiataria casual",
    "Brás",
    "São Paulo",
    "Kary Curadoria",
    "loja online",
  ],
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    other: [{ rel: "icon", url: "/icon-512.png", sizes: "512x512" }],
  },
  openGraph: {
    title: "Kary Curadoria | Moda Feminina com Elegância",
    description:
      "Moda feminina com elegância e curadoria exclusiva no coração do Brás. Conjuntos de linho, alfaiataria casual e peças atemporais.",
    url: "https://karycuradoria.com.br",
    siteName: "Kary Curadoria",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
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
