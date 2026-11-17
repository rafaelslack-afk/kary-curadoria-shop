"use client";

import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { isTikTokShopHiddenPath } from "@/lib/tiktok-shop";

// Convite discreto para a TikTok Shop.
// - Abre em nova aba; o próprio link tiktok.com abre o app no celular quando
//   instalado (sem esquemas snssdk://).
// - Clique registra só o evento GA4 "click_tiktok_shop". Nenhum evento de
//   conversão do Meta/TikTok é disparado aqui.
// - Nunca aparece em /checkout, /carrinho, /atacado ou /admin.

export function TikTokIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
    </svg>
  );
}

interface Props {
  local: "produto" | "rodape";
  href: string;
  /** true = link do produto na TikTok Shop; false = perfil. */
  isProductLink: boolean;
  skuBase?: string | null;
  className?: string;
  children: React.ReactNode;
}

export function TikTokShopLink({ local, href, isProductLink, skuBase, className, children }: Props) {
  const pathname = usePathname();
  if (isTikTokShopHiddenPath(pathname)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() =>
        trackEvent("click_tiktok_shop", {
          local,
          sku_base: skuBase ?? undefined,
          tipo_link: isProductLink ? "produto" : "perfil",
        })
      }
    >
      {children}
    </a>
  );
}

/** Item do rodapé, junto do Instagram (some nas páginas excluídas). */
export function TikTokShopFooterItem({ href }: { href: string }) {
  const pathname = usePathname();
  if (isTikTokShopHiddenPath(pathname)) return null;
  return (
    <li>
      <TikTokShopLink
        local="rodape"
        href={href}
        isProductLink={false}
        className="flex items-center gap-2.5 text-xs text-kc-cream/70 hover:text-kc-cream transition-colors"
      >
        <TikTokIcon size={14} />
        TikTok Shop
      </TikTokShopLink>
    </li>
  );
}
