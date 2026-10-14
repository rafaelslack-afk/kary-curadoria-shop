"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useAtacadoCart } from "@/lib/atacado/cart-store";
import { useMounted } from "@/components/atacado/AtacadoProvider";

export function AtacadoHeader() {
  const mounted = useMounted();
  const pieces = useAtacadoCart((s) => s.items.reduce((n, it) => n + it.quantity, 0));

  return (
    <header className="bg-white border-b border-kc-line sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/atacado" prefetch={false} className="flex flex-col leading-none">
          <span className="font-serif text-xl text-kc-dark tracking-[0.12em]">KARY</span>
          <span className="text-[9px] tracking-[0.28em] text-kc-muted">CURADORIA · ATACADO</span>
        </Link>
        <Link
          href="/atacado/pedido"
          prefetch={false}
          className="flex items-center gap-2 text-sm text-kc-dark hover:text-kc transition-colors"
        >
          <ShoppingBag size={20} strokeWidth={1.5} />
          <span>Meu pedido</span>
          {mounted && pieces > 0 && (
            <span className="bg-kc text-white text-[10px] font-medium rounded-full px-2 py-0.5">{pieces}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
