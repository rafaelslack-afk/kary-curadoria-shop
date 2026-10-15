"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { hrefCatalogo, marcarRestauracao } from "@/lib/atacado/navegacao";
import { cn } from "@/lib/utils";

// Botão grande de volta ao catálogo (página do produto e carrinho). Leva ao
// catálogo com a mesma categoria, busca e rolagem; a forma de pagamento e o
// carrinho já ficam no armazenamento próprio do atacado.
export function BotaoCatalogo({ children, className }: { children: React.ReactNode; className?: string }) {
  const [href, setHref] = useState("/atacado");
  useEffect(() => setHref(hrefCatalogo()), []);

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={marcarRestauracao}
      className={cn(
        "inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg",
        "border-2 border-kc bg-white text-kc text-base font-medium leading-tight transition-colors",
        "hover:bg-kc hover:text-white",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kc-dark",
        className
      )}
    >
      <ArrowLeft size={18} aria-hidden />
      {children}
    </Link>
  );
}
