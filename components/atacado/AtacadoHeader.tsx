"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useAtacadoCart } from "@/lib/atacado/cart-store";
import { precoAtacado } from "@/lib/atacado/pricing";
import { useAtacadoConfig, useMounted } from "@/components/atacado/AtacadoProvider";
import { useFormaPagamento } from "@/components/atacado/SeletorPagamento";
import { formatCurrency } from "@/lib/utils";

// Cabeçalho fixo de toda página /atacado/**: logotipo (volta ao catálogo de
// atacado, nunca à loja) e "Meu pedido" com peças e total sem frete.
export function AtacadoHeader() {
  const mounted = useMounted();
  const { regra, minimoPecas } = useAtacadoConfig();
  const forma = useFormaPagamento();
  const items = useAtacadoCart((s) => s.items);

  const pieces = mounted ? items.reduce((n, it) => n + it.quantity, 0) : 0;
  const total = mounted
    ? Math.round(items.reduce((s, it) => s + precoAtacado(it.retailPrice, it.size, forma, regra) * it.quantity, 0) * 100) / 100
    : 0;
  const faltam = Math.max(0, minimoPecas - pieces);
  const resumo = pieces > 0 ? `${pieces} ${pieces === 1 ? "peça" : "peças"} · ${formatCurrency(total)}` : "nenhuma peça";

  return (
    <header className="bg-white border-b border-kc-line sticky top-0 z-40 print:hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link
          href="/atacado"
          prefetch={false}
          className="flex flex-col leading-none rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kc-dark"
        >
          <span className="font-serif text-xl text-kc-dark tracking-[0.12em]">KARY</span>
          <span className="text-[9px] tracking-[0.28em] text-kc-muted">CURADORIA · ATACADO</span>
        </Link>
        <Link
          href="/atacado/pedido"
          prefetch={false}
          aria-label={`Meu pedido: ${resumo}`}
          className="flex items-center gap-2.5 min-h-[44px] px-3 sm:px-4 rounded-lg border-2 border-kc text-kc-dark hover:bg-kc hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kc-dark"
        >
          <ShoppingBag size={20} strokeWidth={1.75} aria-hidden className="shrink-0" />
          <span className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 leading-tight text-left">
            <span className="text-[13px] sm:text-sm font-medium">Meu pedido</span>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <span className="text-[11px] sm:text-sm">{resumo}</span>
          </span>
        </Link>
      </div>
      {mounted && faltam > 0 && (
        <p className="bg-amber-50 border-t border-amber-200 text-amber-900 text-xs text-center px-4 py-1.5">
          {faltam === 1 ? "Falta 1 peça" : `Faltam ${faltam} peças`} para o pedido mínimo
        </p>
      )}
    </header>
  );
}
