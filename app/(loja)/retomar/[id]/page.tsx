"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShoppingBag } from "lucide-react";
import { useCartStore, type CartItem } from "@/lib/store/cart";

// Página de retomada de carrinho abandonado.
// Link enviado ao cliente (WhatsApp/e-mail) no formato /retomar/{id do
// abandoned_checkouts}. Restaura os itens no carrinho e leva ao checkout.
export default function RetomarCarrinhoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "not-found">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/checkout/resume/${params.id}`);
        if (!res.ok) {
          if (!cancelled) setStatus("not-found");
          return;
        }
        const data = (await res.json()) as { items: CartItem[] };
        if (cancelled) return;

        useCartStore.setState({ items: data.items, coupon: null });
        router.replace("/checkout");
      } catch {
        if (!cancelled) setStatus("not-found");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  if (status === "not-found") {
    return (
      <div className="min-h-screen bg-kc-cream flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center bg-white rounded-xl border border-kc-line p-8">
          <ShoppingBag size={40} strokeWidth={1} className="mx-auto text-kc-muted mb-4" />
          <h1 className="font-serif text-xl font-medium text-kc-dark mb-2">
            Carrinho não encontrado
          </h1>
          <p className="text-sm text-kc-muted mb-6">
            Não encontramos esse carrinho. Que tal dar uma olhada em nossos produtos?
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-kc text-white py-3 px-6 text-[11px] tracking-[0.2em] uppercase hover:bg-kc-dark transition-colors"
          >
            Ver Produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kc-cream flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3 text-kc-muted">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Restaurando seu carrinho…</p>
      </div>
    </div>
  );
}
