import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import GoogleAnalytics from "@/components/analytics/google-analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://karycuradoria.com.br"),
  title: {
    default: "Kary Curadoria — Moda Feminina no Brás",
    template: "%s | Kary Curadoria",
  },
  description:
    "Moda feminina com elegância e curadoria exclusiva. Conjuntos de linho, alfaiataria e muito mais. Loja física no Brás, SP e loja online.",
  keywords: [
    "moda feminina",
    "conjuntos de linho",
    "alfaiataria feminina",
    "loja moda Brás",
    "Kary Curadoria",
    "moda São Paulo",
    "loja online moda feminina",
  ],
  authors: [{ name: "Kary Curadoria" }],
  creator: "Kary Curadoria",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    other: [{ rel: "icon", url: "/icon-512.png", sizes: "512x512" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://karycuradoria.com.br",
    siteName: "Kary Curadoria",
    title: "Kary Curadoria — Moda Feminina no Brás",
    description:
      "Moda feminina com elegância e curadoria exclusiva no coração do Brás.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Kary Curadoria — Moda Feminina",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kary Curadoria — Moda Feminina no Brás",
    description: "Moda feminina com elegância e curadoria exclusiva.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
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
      <body className="font-sans antialiased">
        <GoogleAnalytics />

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '969990458816538');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=969990458816538&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        {children}
      </body>
    </html>
  );
}
