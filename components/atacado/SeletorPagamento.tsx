"use client";

import { FORMAS_PAGAMENTO } from "@/lib/atacado/pricing";
import { useAtacadoCart } from "@/lib/atacado/cart-store";
import { useMounted } from "@/components/atacado/AtacadoProvider";
import { cn } from "@/lib/utils";

// Seletor geral: muda todos os preços da página e do carrinho. A escolha fica
// guardada junto com o carrinho do atacado (PIX por padrão).
export function SeletorPagamento() {
  const mounted = useMounted();
  const forma = useAtacadoCart((s) => s.formaPagamento);
  const setForma = useAtacadoCart((s) => s.setFormaPagamento);
  const atual = mounted ? forma : "pix";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs tracking-[0.14em] uppercase text-kc-muted">Pagamento</span>
      <div role="radiogroup" aria-label="Forma de pagamento" className="inline-flex rounded-full border border-kc-line bg-white p-1">
        {FORMAS_PAGAMENTO.map((f) => (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={atual === f.value}
            onClick={() => setForma(f.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm transition-colors",
              atual === f.value ? "bg-kc-dark text-white" : "text-kc-dark hover:bg-kc-light"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Forma de pagamento atual (PIX até o carrinho carregar do localStorage). */
export function useFormaPagamento() {
  const mounted = useMounted();
  const forma = useAtacadoCart((s) => s.formaPagamento);
  return mounted ? forma : "pix";
}
