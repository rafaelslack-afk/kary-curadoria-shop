"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, Tag, ChevronRight, AlertTriangle, CreditCard, Package, Loader2 } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils";
import { useCoupon } from "@/lib/hooks/useCoupon";
import { useShipping, type ShippingOption } from "@/lib/hooks/useShipping";

// Mesma chave de sessionStorage usada na simulação de frete da página de
// produto e no pré-fill do checkout — reaproveitada aqui para persistir
// CEP + opção de frete escolhidos no carrinho.
const CEP_STORAGE_KEY = "kary_cep_simulado";

function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export default function CarrinhoPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotal,
  } = useCartStore();

  const sub = subtotal();

  const {
    couponCode, setCouponCode,
    appliedCoupon,
    couponError, couponLoading,
    applyCoupon, removeCoupon,
  } = useCoupon(sub, { productIds: items.map((i) => i.productId) });

  // ── Frete (Melhor Envio via hook compartilhado com o checkout) ────────────
  const shipping = useShipping(items);
  const [cepInput, setCepInput] = useState("");
  const [cepConfirmado, setCepConfirmado] = useState("");
  const [cepMessage, setCepMessage] = useState("");

  const cartFreteErro =
    cepMessage ||
    (shipping.erro
      ? "Não conseguimos calcular o frete para este CEP. Você pode continuar e calcular novamente no checkout."
      : "");

  async function handleCalcularFrete(cepValor?: string) {
    const raw = cepValor ?? cepInput;
    const digits = raw.replace(/\D/g, "");
    setCepMessage("");

    if (digits.length !== 8) {
      setCepMessage("CEP inválido, verifique e tente novamente");
      return;
    }

    try {
      const res = await fetch(`/api/cep?cep=${digits}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setCepMessage("Não conseguimos calcular o frete para este CEP. Você pode continuar e calcular novamente no checkout.");
        return;
      }
      try {
        sessionStorage.setItem(CEP_STORAGE_KEY, JSON.stringify({
          cep: digits,
          logradouro: data.logradouro ?? "",
          bairro: data.bairro ?? "",
          cidade: data.cidade ?? "",
          estado: data.estado ?? "",
        }));
      } catch { /* sessionStorage pode estar bloqueado em alguns navegadores */ }
      setCepConfirmado(maskCep(digits));
    } catch {
      setCepMessage("Não conseguimos calcular o frete para este CEP. Você pode continuar e calcular novamente no checkout.");
      return;
    }

    await shipping.calcularFrete(digits);
  }

  function handleAlterarCepCarrinho() {
    setCepConfirmado("");
    setCepInput("");
    setCepMessage("");
    shipping.limparFrete();
    try { sessionStorage.removeItem(CEP_STORAGE_KEY); } catch { /* ignore */ }
  }

  function handleSelecionarOpcao(opt: ShippingOption) {
    shipping.selecionarOpcao(opt);
    // Persiste a escolha para o checkout já carregar pré-selecionado
    try {
      const raw = sessionStorage.getItem(CEP_STORAGE_KEY);
      const base = raw ? JSON.parse(raw) : {};
      sessionStorage.setItem(CEP_STORAGE_KEY, JSON.stringify({ ...base, shippingOptionId: opt.id }));
    } catch { /* sessionStorage pode estar bloqueado em alguns navegadores */ }
  }

  // CEP salvo de uma simulação anterior (página de produto ou carrinho) —
  // pré-preenche e calcula automaticamente ao carregar o carrinho.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CEP_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { cep?: string };
      if (saved.cep) {
        setCepInput(maskCep(saved.cep));
        handleCalcularFrete(saved.cep);
      }
    } catch { /* sessionStorage indisponível */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const discountAmount = appliedCoupon?.discount ?? 0;
  const freteSelecionado = shipping.opcaoSelecionada?.preco ?? 0;
  const total = sub - discountAmount + freteSelecionado;

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
                        ? `${appliedCoupon.value}% de desconto`
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
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="CÓDIGO"
                    className="flex-1 border border-kc-line bg-white px-3 py-2 text-xs text-kc-dark placeholder-kc-muted/60 focus:outline-none focus:border-kc tracking-wider"
                  />
                  <button
                    onClick={applyCoupon}
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

            {/* Frete */}
            <div>
              <p className="text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-2 flex items-center gap-1.5">
                <Package size={10} />
                Calcular frete
              </p>

              {!cepConfirmado ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cepInput}
                      onChange={(e) => { setCepInput(maskCep(e.target.value)); setCepMessage(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleCalcularFrete()}
                      placeholder="00000-000"
                      inputMode="numeric"
                      className="flex-1 border border-kc-line bg-white px-3 py-2 text-xs text-kc-dark placeholder-kc-muted/60 focus:outline-none focus:border-kc"
                    />
                    <button
                      onClick={() => handleCalcularFrete()}
                      disabled={shipping.calculando}
                      className="border border-kc text-kc text-[10px] tracking-[0.1em] px-3 py-2 hover:bg-kc hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {shipping.calculando ? <Loader2 size={12} className="animate-spin" /> : "Calcular"}
                    </button>
                  </div>
                  {cartFreteErro && (
                    <p className="text-[10px] text-red-500 mt-1">{cartFreteErro}</p>
                  )}
                </>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kc-dark">Frete para {cepConfirmado}</span>
                    <button
                      onClick={handleAlterarCepCarrinho}
                      className="text-[10px] text-kc-muted hover:text-kc transition-colors underline underline-offset-2 whitespace-nowrap"
                    >
                      Alterar CEP
                    </button>
                  </div>

                  {shipping.calculando && (
                    <div className="space-y-2">
                      {[0, 1].map((i) => (
                        <div key={i} className="border border-kc-line p-3 h-10 animate-pulse" />
                      ))}
                    </div>
                  )}

                  {!shipping.calculando && shipping.opcoes.length > 0 && (
                    <div className="space-y-2">
                      {shipping.opcoes.map((opt) => {
                        const selected = shipping.opcaoSelecionada?.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelecionarOpcao(opt)}
                            className={`w-full flex items-center justify-between p-3 border text-left transition-colors ${selected ? "border-kc bg-kc/5" : "border-kc-line hover:border-kc-muted"}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-kc" : "border-kc-line"}`}>
                                {selected && <div className="w-1.5 h-1.5 rounded-full bg-kc" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-kc-dark">{opt.name}</p>
                                <p className="text-[9px] text-kc-muted">
                                  até {opt.prazo} dia{opt.prazo !== 1 ? "s" : ""} útil{opt.prazo !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-kc">{formatCurrency(opt.preco)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!shipping.calculando && cartFreteErro && (
                    <p className="text-[10px] text-red-500">{cartFreteErro}</p>
                  )}
                </div>
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

              {shipping.opcaoSelecionada ? (
                <div className="flex justify-between text-xs text-kc-muted">
                  <span>Frete ({shipping.opcaoSelecionada.name})</span>
                  <span className="text-kc-dark">{formatCurrency(shipping.opcaoSelecionada.preco)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-xs text-kc-muted">
                  <span>Frete</span>
                  <span className="text-kc-dark">Frete calculado no próximo passo</span>
                </div>
              )}
            </div>

            <div className="h-px bg-kc-line" />

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-kc-dark font-medium">Total</span>
              <div className="text-right">
                <span className="text-xl font-medium text-kc">{formatCurrency(total)}</span>
                {!shipping.opcaoSelecionada && (
                  <p className="text-[9px] text-kc-muted">+ frete</p>
                )}
              </div>
            </div>

            {/* Parcelamento */}
            {total >= 10 && (
              <div className="flex items-center gap-2.5 bg-[#F5F1EA] border border-[#D9C9B8] rounded-lg px-3.5 py-2.5">
                <CreditCard size={15} className="text-[#A0622A] shrink-0" />
                <span className="text-xs text-[#5C3317]">
                  Parcele em{" "}
                  <strong>
                    3x de R$ {(total / 3).toFixed(2).replace(".", ",")} sem juros
                  </strong>{" "}
                  no cartão
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
