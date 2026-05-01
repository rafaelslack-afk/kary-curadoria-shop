"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, Tag, ChevronRight, AlertTriangle, CreditCard } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { calculateCouponDiscount } from "@/lib/coupons";
import { formatCurrency } from "@/lib/utils";

export default function CarrinhoPage() {
  const {
    items,
    coupon: appliedCoupon,
    removeItem,
    updateQuantity,
    subtotal,
    setCoupon,
    clearCoupon,
  } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Estoque em tempo real
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const checkStock = useCallback(async () => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.variantId).join(",");
    try {
      const res = await fetch(`/api/products/variants/stock?ids=${ids}`);
      if (!res.ok) return;
      const data: { id: string; stock_qty: number }[] = await res.json();
      const map: Record<string, number> = {};
      for (const v of data) map[v.id] = v.stock_qty;
      setStockMap(map);
    } catch {
      // silently fail — não bloquear o carrinho
    }
  }, [items]);

  useEffect(() => {
    checkStock();
  }, [checkStock]);

  const outOfStockItems = items.filter(
    (item) => item.variantId in stockMap && stockMap[item.variantId] < item.quantity
  );
  const hasOutOfStock = outOfStockItems.length > 0;

  const sub = subtotal();
  const discountAmount = calculateCouponDiscount(sub, appliedCoupon);

  const total = sub - discountAmount;

  useEffect(() => {
    setCouponCode(appliedCoupon?.code ?? "");
  }, [appliedCoupon]);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode.trim())}&subtotal=${sub}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setCouponError(data.error ?? "Cupom inválido.");
        clearCoupon();
      } else {
        setCoupon({
          code: data.code,
          discount: data.value,
          type: data.type,
          minOrder: data.min_order ?? 0,
        });
        setCouponError("");
      }
    } catch {
      setCouponError("Erro ao validar cupom. Tente novamente.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    clearCoupon();
    setCouponCode("");
    setCouponError("");
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <ShoppingBag size={40} className="mx-auto text-kc-muted opacity-40 mb-4" />
        <h1 className="font-serif text-2xl font-medium text-kc-dark mb-2">
          Seu carrinho está vazio
        </h1>
        <p className="text-sm text-kc-muted mb-6">
          Explore nossa coleção e adicione peças que você amar.
        </p>
        <Link
          href="/produtos"
          className="inline-block bg-kc text-white text-[11px] tracking-[0.2em] px-8 py-4 hover:bg-kc-dark transition-colors uppercase"
        >
          Ver Coleção
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.26em] text-kc-muted mb-1 uppercase">Compra</p>
        <h1 className="font-serif text-2xl font-medium text-kc-dark">
          Carrinho
        </h1>
        <p className="text-xs text-kc-muted mt-1">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Item list ── */}
        <div className="lg:col-span-2 space-y-px">

          {/* Column headers — desktop */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto] gap-4 pb-2 border-b border-kc-line">
            <span className="text-[9px] tracking-[0.2em] text-kc-muted uppercase">Produto</span>
            <span className="text-[9px] tracking-[0.2em] text-kc-muted uppercase text-center w-24">Qtd.</span>
            <span className="text-[9px] tracking-[0.2em] text-kc-muted uppercase text-right w-24">Subtotal</span>
          </div>

          {items.map((item) => (
            <div
              key={item.variantId}
              className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto_auto] gap-4 py-5 border-b border-kc-line items-start"
            >
              {/* Image */}
              <Link href={`/produtos/${item.slug}`}>
                <div className="relative w-16 md:w-20 aspect-[3/4] bg-kc-cream overflow-hidden shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.productName} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                        <rect x="8" y="2" width="16" height="28" rx="1" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="min-w-0">
                <Link href={`/produtos/${item.slug}`}>
                  <h3 className="font-serif text-sm font-medium text-kc-dark leading-snug hover:text-kc transition-colors line-clamp-2 mb-1">
                    {item.productName}
                  </h3>
                </Link>
                <p className="text-[10px] text-kc-muted mb-0.5">
                  {[item.color, item.size].filter(Boolean).join(" / ")}
                </p>
                <p className="text-[10px] text-kc-muted mb-2">{formatCurrency(item.price)} / un.</p>
                {/* Badge de estoque */}
                {item.variantId in stockMap && stockMap[item.variantId] === 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 mb-2">
                    <AlertTriangle size={9} />
                    Esgotado
                  </span>
                )}
                {item.variantId in stockMap && stockMap[item.variantId] > 0 && stockMap[item.variantId] < item.quantity && (
                  <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 mb-2">
                    <AlertTriangle size={9} />
                    Apenas {stockMap[item.variantId]} disponível
                  </span>
                )}
                {/* mb-1 spacer when no badge */}
                {!(item.variantId in stockMap) && <div className="mb-1" />}

                {/* Mobile: quantity + price */}
                <div className="md:hidden flex items-center justify-between">
                  <QuantityControl
                    quantity={item.quantity}
                    onChange={(q) => updateQuantity(item.variantId, q)}
                    onRemove={() => removeItem(item.variantId)}
                  />
                  <span className="text-sm font-medium text-kc">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              </div>

              {/* Desktop: quantity */}
              <div className="hidden md:flex items-center justify-center w-24">
                <QuantityControl
                  quantity={item.quantity}
                  onChange={(q) => updateQuantity(item.variantId, q)}
                  onRemove={() => removeItem(item.variantId)}
                />
              </div>

              {/* Desktop: subtotal */}
              <div className="hidden md:flex items-center justify-end w-24">
                <span className="text-sm font-medium text-kc">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            </div>
          ))}

          {/* Continue shopping */}
          <div className="pt-4">
            <Link
              href="/produtos"
              className="text-[10px] tracking-[0.14em] text-kc-muted hover:text-kc transition-colors uppercase"
            >
              ← Continuar comprando
            </Link>
          </div>
        </div>

        {/* ── Order summary ── */}
        <div className="lg:col-span-1">
          <div className="bg-kc-light border border-kc-line p-6 space-y-5 sticky top-4">

            <p className="text-[10px] tracking-[0.22em] text-kc-muted uppercase">
              Resumo do pedido
            </p>

            {/* Coupon */}
            <div>
              <p className="text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-2 flex items-center gap-1.5">
                <Tag size={10} />
                Cupom de desconto
              </p>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <div>
                    <span className="text-[10px] tracking-[0.1em] text-emerald-700 font-medium">
                      {appliedCoupon.code}
                    </span>
                    <p className="text-[9px] text-emerald-600">
                      {appliedCoupon.type === "percent"
                        ? `${appliedCoupon.discount}% de desconto`
                        : `${formatCurrency(appliedCoupon.discount)} de desconto`}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-[9px] text-emerald-600 hover:text-red-500 transition-colors underline underline-offset-2"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="CÓDIGO"
                    className="flex-1 border border-kc-line bg-white px-3 py-2 text-xs text-kc-dark placeholder-kc-muted/60 focus:outline-none focus:border-kc tracking-wider"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="border border-kc text-kc text-[10px] tracking-[0.1em] px-3 py-2 hover:bg-kc hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {couponLoading ? "..." : "Aplicar"}
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[10px] text-red-500 mt-1">{couponError}</p>
              )}
            </div>

            <div className="h-px bg-kc-line" />

            {/* Totals */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs text-kc-muted">
                <span>Subtotal</span>
                <span>{formatCurrency(sub)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Desconto ({appliedCoupon.code})</span>
                  <span>− {formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-kc-muted">
                <span>Frete</span>
                <span className="text-kc-dark">Calculado no checkout</span>
              </div>
            </div>

            <div className="h-px bg-kc-line" />

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-kc-dark font-medium">Total</span>
              <div className="text-right">
                <span className="text-xl font-medium text-kc">{formatCurrency(total)}</span>
                <p className="text-[9px] text-kc-muted">+ frete</p>
              </div>
            </div>

            {/* Parcelamento */}
            {total >= 10 && (
              <div className="flex items-center gap-2.5 bg-[#F5F1EA] border border-[#D9C9B8] rounded-lg px-3.5 py-2.5">
                <CreditCard size={15} className="text-[#A0622A] shrink-0" />
                <span className="text-xs text-[#5C3317]">
                  <strong>Parcelamento disponível</strong>{" "}no cartão de crédito
                </span>
              </div>
            )}

            {/* Checkout CTA */}
            {hasOutOfStock ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3">
                  <AlertTriangle size={13} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-red-700 leading-relaxed">
                    {outOfStockItems.map((i) => i.productName).join(", ")} não {outOfStockItems.length === 1 ? "está" : "estão"} mais disponível{outOfStockItems.length > 1 ? "is" : ""}. Remova {outOfStockItems.length === 1 ? "o item" : "os itens"} para continuar.
                  </p>
                </div>
                <button
                  disabled
                  className="flex items-center justify-center gap-2 bg-kc-line text-kc-muted text-[11px] tracking-[0.18em] uppercase py-4 cursor-not-allowed w-full"
                >
                  Finalizar pedido
                  <ChevronRight size={13} />
                </button>
              </div>
            ) : (
              <Link
                href="/checkout"
                className="flex items-center justify-center gap-2 bg-kc text-white text-[11px] tracking-[0.18em] uppercase py-4 hover:bg-kc-dark transition-colors w-full"
              >
                Finalizar pedido
                <ChevronRight size={13} />
              </Link>
            )}

            {/* Payment methods */}
            <div className="flex items-center justify-center gap-3 pt-1">
              {["PIX", "CARTÃO", "DÉBITO"].map((m) => (
                <span
                  key={m}
                  className="text-[8px] tracking-[0.1em] border border-kc-line text-kc-muted px-1.5 py-0.5"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuantityControl({
  quantity,
  onChange,
  onRemove,
}: {
  quantity: number;
  onChange: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => (quantity === 1 ? onRemove() : onChange(quantity - 1))}
        className="w-7 h-7 flex items-center justify-center border border-kc-line text-kc-muted hover:border-kc hover:text-kc transition-colors"
      >
        {quantity === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
      </button>
      <span className="w-8 text-center text-xs font-medium text-kc-dark">
        {quantity}
      </span>
      <button
        onClick={() => onChange(quantity + 1)}
        className="w-7 h-7 flex items-center justify-center border border-kc-line text-kc-muted hover:border-kc hover:text-kc transition-colors"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}
