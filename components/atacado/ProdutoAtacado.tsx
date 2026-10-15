"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Check, ShoppingBag } from "lucide-react";
import { useAtacadoConfig } from "@/components/atacado/AtacadoProvider";
import { BotaoCatalogo } from "@/components/atacado/BotaoCatalogo";
import { SeletorPagamento, useFormaPagamento } from "@/components/atacado/SeletorPagamento";
import { useAtacadoCart, MAX_QTD_POR_ITEM } from "@/lib/atacado/cart-store";
import { precoAtacado } from "@/lib/atacado/pricing";
import { formatCurrency, cn } from "@/lib/utils";
import { sortSizes, type AtacadoProduct } from "@/lib/atacado/types";

export function ProdutoAtacado({ product }: { product: AtacadoProduct }) {
  const { regra } = useAtacadoConfig();
  const forma = useFormaPagamento();
  const addItems = useAtacadoCart((s) => s.addItems);

  const cores = useMemo(() => Array.from(new Set(product.variants.map((v) => v.color))), [product.variants]);
  const [cor, setCor] = useState(cores[0] ?? "");
  const [qtd, setQtd] = useState<Record<string, number>>({}); // variantId → quantidade
  const [foto, setFoto] = useState(0);
  const [adicionado, setAdicionado] = useState(false);
  const confirmacaoRef = useRef<HTMLDivElement>(null);

  // Confirmação inline (não cobre o botão de WhatsApp): leva à vista ao adicionar
  useEffect(() => {
    if (adicionado) confirmacaoRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [adicionado]);

  const variantesDaCor = useMemo(() => {
    const vs = product.variants.filter((v) => v.color === cor);
    const order = sortSizes(vs.map((v) => v.size));
    return [...vs].sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
  }, [product.variants, cor]);

  // Fotos da cor escolhida (se a variante tiver) ou do produto
  const fotos = useMemo(() => {
    const daCor = variantesDaCor.find((v) => v.images.length > 0)?.images ?? [];
    return daCor.length > 0 ? daCor : product.images;
  }, [variantesDaCor, product.images]);

  const totalSelecionado = Object.values(qtd).reduce((n, q) => n + q, 0);

  function setQ(variantId: string, q: number) {
    setAdicionado(false);
    setQtd((prev) => ({ ...prev, [variantId]: Math.max(0, Math.min(q, MAX_QTD_POR_ITEM)) }));
  }

  function adicionar() {
    const items = product.variants
      .filter((v) => (qtd[v.id] ?? 0) > 0)
      .map((v) => ({
        variantId: v.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        reference: product.reference,
        image: v.images[0] ?? product.images[0] ?? null,
        color: v.color,
        size: v.size,
        retailPrice: product.price,
        quantity: qtd[v.id],
      }));
    if (items.length === 0) return;
    addItems(items);
    setQtd({});
    setAdicionado(true);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      <div className="mb-5">
        <BotaoCatalogo>Voltar ao catálogo</BotaoCatalogo>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-10">
        {/* Fotos */}
        <div>
          <div className="aspect-[3/4] bg-kc-cream rounded-lg overflow-hidden">
            {fotos[foto] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotos[foto]} alt={product.name} className="w-full h-full object-cover" />
            )}
          </div>
          {fotos.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {fotos.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setFoto(i)}
                  className={cn("w-16 h-20 shrink-0 rounded overflow-hidden border-2", i === foto ? "border-kc" : "border-transparent")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dados e grade */}
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-kc-dark leading-tight">{product.name}</h1>
          {product.reference && <p className="text-xs tracking-[0.14em] text-kc-muted mt-1">REF. {product.reference}</p>}

          <div className="mt-5 mb-5">
            <SeletorPagamento />
          </div>

          {/* Cores */}
          <p className="text-xs tracking-[0.14em] uppercase text-kc-muted mb-2">Cor</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {cores.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCor(c);
                  setFoto(0);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-sm transition-colors",
                  c === cor ? "border-kc-dark bg-kc-dark text-white" : "border-kc-line bg-white text-kc-dark hover:border-kc"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Quantidade por tamanho */}
          <p className="text-xs tracking-[0.14em] uppercase text-kc-muted mb-2">Tamanhos e quantidades</p>
          <div className="bg-white border border-kc-line rounded-lg divide-y divide-kc-line">
            {variantesDaCor.map((v) => {
              const q = qtd[v.id] ?? 0;
              return (
                <div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-kc-dark">{v.size}</p>
                    <p className="text-xs text-kc">{formatCurrency(precoAtacado(product.price, v.size, forma, regra))}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQ(v.id, q - 1)}
                      aria-label={`Diminuir ${v.size}`}
                      className="w-9 h-9 rounded-md border border-kc-line flex items-center justify-center text-kc-dark disabled:opacity-30"
                      disabled={q === 0}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_QTD_POR_ITEM}
                      value={q}
                      onChange={(e) => setQ(v.id, Math.floor(Number(e.target.value) || 0))}
                      aria-label={`Quantidade ${v.color} ${v.size}`}
                      className="w-14 h-9 text-center border border-kc-line rounded-md text-sm text-kc-dark focus:outline-none focus:border-kc"
                    />
                    <button
                      type="button"
                      onClick={() => setQ(v.id, q + 1)}
                      aria-label={`Aumentar ${v.size}`}
                      className="w-9 h-9 rounded-md border border-kc-line flex items-center justify-center text-kc-dark"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={adicionar}
            disabled={totalSelecionado === 0}
            className="mt-5 w-full bg-kc-dark text-white rounded-lg py-3.5 text-sm tracking-[0.12em] uppercase hover:bg-kc transition-colors disabled:opacity-40"
          >
            Adicionar ao pedido{totalSelecionado > 0 ? ` (${totalSelecionado} ${totalSelecionado === 1 ? "peça" : "peças"})` : ""}
          </button>

          {adicionado && (
            <div
              ref={confirmacaoRef}
              role="status"
              className="mt-4 rounded-lg bg-emerald-50 border border-emerald-300 p-4 text-emerald-900"
            >
              <p className="flex items-center gap-2 text-base font-medium mb-3">
                <Check size={20} aria-hidden /> Peça adicionada ao pedido
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <BotaoCatalogo className="sm:flex-1">Continuar escolhendo</BotaoCatalogo>
                <Link
                  href="/atacado/pedido"
                  prefetch={false}
                  className="inline-flex w-full sm:flex-1 items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-kc-dark text-white text-base font-medium hover:bg-kc transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kc-dark"
                >
                  <ShoppingBag size={18} aria-hidden /> Ver meu pedido
                </Link>
              </div>
            </div>
          )}

          <div className="mt-4">
            <BotaoCatalogo>Voltar ao catálogo</BotaoCatalogo>
          </div>

          {product.description && (
            <div className="mt-8">
              <p className="text-xs tracking-[0.14em] uppercase text-kc-muted mb-2">Descrição</p>
              <p className="text-sm text-kc-dark/80 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
