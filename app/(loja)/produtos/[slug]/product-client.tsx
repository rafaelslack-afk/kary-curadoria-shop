"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag, Check, Zap, ZoomIn, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";
import { buildWhatsAppUrl } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";
import type { Product, ProductVariant, Category } from "@/types/database";

// ── Componente de imagem com zoom/pan ────────────────────────────────────────

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [transform, setTransform] = useState("scale(1)");
  const [isZoomed, setIsZoomed] = useState(false);
  const [transition, setTransition] = useState("transform 0.3s ease-out");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    setTransition("transform 0.15s ease-out");
    setIsZoomed(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // translate: mover imagem para revelar a área sob o cursor
    const tx = (50 - x) * 0.7; // ×0.7 suaviza o deslocamento
    const ty = (50 - y) * 0.7;
    setTransform(`scale(2.2) translate(${tx}%, ${ty}%)`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTransition("transform 0.35s ease-out");
    setTransform("scale(1)");
    setIsZoomed(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ cursor: isZoomed ? "crosshair" : "zoom-in" }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover will-change-transform"
        style={{ transform, transition }}
        priority
      />
      {/* Indicador — só desktop (pointer: fine) */}
      {!isZoomed && (
        <div className="absolute bottom-3 right-3 hidden md:flex items-center gap-1.5 bg-black/40 text-white text-[10px] tracking-wide px-2.5 py-1.5 rounded-full pointer-events-none select-none backdrop-blur-sm">
          <ZoomIn size={11} />
          Passe o mouse para ampliar
        </div>
      )}
    </div>
  );
}

interface Props {
  product: Product & { categories: Category | null };
  variants: ProductVariant[];
  colorHexMap: Record<string, string>;
}

export function ProductClient({ product, variants, colorHexMap }: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();

  // ── GA4: view_item ────────────────────────────────────────────────────────
  useEffect(() => {
    trackEvent('view_item', {
      currency: 'BRL',
      value: product.price,
      items: [{
        item_id: product.sku_base ?? product.id,
        item_name: product.name,
        item_category: product.categories?.name,
        price: product.price,
      }],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // ── Detecção de modo: único tamanho ou grade cor×tamanho ──────────────────

  // Cores únicas disponíveis (variantes com pelo menos 1 em estoque em algum tamanho)
  const availableColors = useMemo(() => {
    const hasColor = variants.some((v) => v.color);
    if (!hasColor) return []; // produto sem cores — usa fluxo antigo de tamanhos
    const colorNames = Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[];
    return colorNames.map((name) => {
      const hasStock = variants.some((v) => v.color === name && v.stock_qty > 0);
      return { name, hasStock };
    });
  }, [variants]);

  const hasColors = availableColors.length > 0;

  // Tamanhos disponíveis para a cor selecionada (ou todos se sem cor)
  const sizesForColor = useMemo(() => {
    if (!hasColors) return variants;
    if (!selectedColor) return [];
    return variants.filter((v) => v.color === selectedColor);
  }, [hasColors, selectedColor, variants]);

  // Auto-seleciona se só há 1 tamanho para a cor
  function selectColor(colorName: string) {
    setSelectedColor(colorName);
    setSelectedVariant(null);
    const sizes = variants.filter((v) => v.color === colorName);
    if (sizes.length === 1) setSelectedVariant(sizes[0]);
  }

  const hasDiscount =
    product.original_price && product.original_price > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0;

  const outOfStock =
    selectedVariant !== null && selectedVariant.stock_qty === 0;
  const allOutOfStock = variants.every((v) => v.stock_qty === 0);

  function handleAddToCart() {
    if (!selectedVariant || outOfStock) return;
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      size: selectedVariant.size,
      color: selectedVariant.color ?? null,
      sku: selectedVariant.sku,
      price: product.price,
      image: product.images?.[0] ?? null,
      weight_g: product.weight_g,
      length_cm: product.length_cm,
      width_cm: product.width_cm,
      height_cm: product.height_cm,
    });
    trackEvent('add_to_cart', {
      currency: 'BRL',
      value: product.price,
      items: [{
        item_id: selectedVariant.sku,
        item_name: product.name,
        item_category: product.categories?.name,
        item_variant: [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' / '),
        price: product.price,
        quantity: 1,
      }],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!selectedVariant || outOfStock) return;
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      size: selectedVariant.size,
      color: selectedVariant.color ?? null,
      sku: selectedVariant.sku,
      price: product.price,
      image: product.images?.[0] ?? null,
      weight_g: product.weight_g,
      length_cm: product.length_cm,
      width_cm: product.width_cm,
      height_cm: product.height_cm,
    });
    router.push("/checkout");
  }

  const images = product.images?.length > 0 ? product.images : [];

  // ── Botão de adicionar: texto contextual ──────────────────────────────────
  function cartButtonLabel() {
    if (allOutOfStock) return "Produto sem estoque";
    if (hasColors && !selectedColor) return "Selecione uma cor";
    if (!selectedVariant) {
      if (sizesForColor.length === 1) return "Adicionar ao carrinho";
      return "Selecione um tamanho";
    }
    if (outOfStock) return "Sem estoque neste tamanho";
    return "Adicionar ao carrinho";
  }

  const canAddToCart =
    !allOutOfStock && selectedVariant !== null && !outOfStock;

  // ── Simulador de frete ───────────────────────────────────────────────────
  const [cep, setCep] = useState("");
  const [freteOpcoes, setFreteOpcoes] = useState<{ id: number; name: string; preco: number; prazo: number }[]>([]);
  const [freteLoading, setFreteLoading] = useState(false);
  const [freteErro, setFreteErro] = useState("");
  const [cepInfo, setCepInfo] = useState<{ city: string; state: string } | null>(null);

  async function calcularFrete(cepValor?: string) {
    const cepLimpo = (cepValor ?? cep).replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setFreteErro("CEP inválido");
      return;
    }
    setFreteLoading(true);
    setFreteErro("");
    setFreteOpcoes([]);
    setCepInfo(null);
    try {
      const viaCep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const cepData = await viaCep.json();
      if (cepData.erro) {
        setFreteErro("CEP não encontrado");
        return;
      }
      setCepInfo({ city: cepData.localidade, state: cepData.uf });

      const res = await fetch("/api/shipping/melhorenvio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cepDestino: cepLimpo,
          produtos: [{
            peso_g: product.weight_g ?? 500,
            comprimento_cm: product.length_cm ?? 30,
            largura_cm: product.width_cm ?? 20,
            altura_cm: product.height_cm ?? 5,
            quantity: 1,
          }],
        }),
      });
      const data = await res.json();
      if (data.error) {
        setFreteErro("Frete indisponível para este CEP");
        return;
      }
      setFreteOpcoes(data.opcoes ?? []);
    } catch {
      setFreteErro("Erro ao calcular frete");
    } finally {
      setFreteLoading(false);
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "");
    const masked = v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5, 8) : v;
    setCep(masked);
    if (v.length === 8) calcularFrete(v);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-kc-muted mb-6">
        <Link href="/produtos" className="hover:text-kc-dark transition-colors flex items-center gap-1">
          <ChevronLeft size={11} />
          Coleções
        </Link>
        {product.categories && (
          <>
            <span>/</span>
            <Link href={`/produtos?categoria=${product.categories.slug}`} className="hover:text-kc-dark transition-colors">
              {product.categories.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-kc-dark">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

        {/* ── Gallery ── */}
        <div className="space-y-3">
          <div className="relative w-full aspect-[3/4] bg-kc-cream overflow-hidden">
            {images.length > 0 ? (
              <ZoomableImage src={images[selectedImage]} alt={product.name} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-25">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="12" y="4" width="24" height="40" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="12" y1="22" x2="36" y2="22" stroke="currentColor" strokeWidth="0.8" />
                </svg>
                <span className="text-[9px] tracking-[0.2em] text-kc-muted">FOTO</span>
              </div>
            )}
            {/* Badges — ficam acima do zoom */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
              {hasDiscount && (
                <span className="bg-kc-dark text-kc-cream text-[9px] tracking-[0.1em] px-2.5 py-1">{discountPct}% OFF</span>
              )}
              {allOutOfStock && (
                <span className="bg-white/90 text-kc-dark text-[9px] tracking-[0.14em] px-2.5 py-1">SEM ESTOQUE</span>
              )}
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`relative shrink-0 w-16 aspect-[3/4] bg-kc-cream overflow-hidden border transition-colors ${selectedImage === i ? "border-kc" : "border-kc-line hover:border-kc-muted"}`}>
                  <Image src={src} alt={`${product.name} ${i + 1}`} fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col gap-5">
          {product.categories && (
            <p className="text-[10px] tracking-[0.24em] text-kc-muted uppercase">{product.categories.name}</p>
          )}
          <h1 className="font-serif text-2xl md:text-3xl font-medium text-kc-dark leading-snug">{product.name}</h1>

          <div className="flex items-baseline gap-3">
            {hasDiscount && (
              <span className="text-sm text-kc-muted line-through">{formatCurrency(product.original_price!)}</span>
            )}
            <span className="text-2xl font-medium text-kc">{formatCurrency(product.price)}</span>
          </div>

          <div className="h-px bg-kc-line" />

          {/* ── Seletor de Cor ── */}
          {hasColors && (
            <div>
              <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase mb-3">
                Cor
                {selectedColor && (
                  <span className="ml-2 text-kc-dark font-medium">— {selectedColor}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {availableColors.map(({ name, hasStock }) => {
                  const isSelected = selectedColor === name;
                  return (
                    <button
                      key={name}
                      onClick={() => hasStock && selectColor(name)}
                      disabled={!hasStock}
                      title={name}
                      className={`relative w-9 h-9 rounded-full border-2 transition-all ${
                        !hasStock
                          ? "cursor-not-allowed opacity-40"
                          : isSelected
                          ? "border-kc scale-110"
                          : "border-transparent hover:border-kc-muted"
                      }`}
                    >
                      <span
                        className="absolute inset-0.5 rounded-full border border-black/10"
                        style={{ backgroundColor: colorHexMap[name] ?? "#cccccc" }}
                      />
                      {!hasStock && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-full h-px bg-gray-400 rotate-45 absolute opacity-60" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Seletor de Tamanho ── */}
          {(!hasColors || selectedColor) && (
            <div>
              <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase mb-3">
                Tamanho
                {selectedVariant && (
                  <span className="ml-2 text-kc-dark font-medium">— {selectedVariant.size}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isOos = v.stock_qty === 0;
                  const isLow = !isOos && v.stock_qty <= v.stock_min;
                  return (
                    <div key={v.id} className="relative">
                      <button
                        onClick={() => !isOos && setSelectedVariant(v)}
                        disabled={isOos}
                        className={`relative w-12 h-12 border text-xs font-medium transition-colors ${
                          isOos
                            ? "border-kc-line text-kc-line cursor-not-allowed"
                            : isSelected
                            ? "border-kc bg-kc text-white"
                            : "border-kc-line text-kc-dark hover:border-kc"
                        }`}
                      >
                        {v.size}
                        {isOos && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-full h-px bg-kc-line rotate-45 absolute" />
                          </span>
                        )}
                      </button>
                      {isLow && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] bg-amber-500 text-white px-1 rounded leading-tight">
                          Últimas
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Info de estoque */}
              {selectedVariant && (
                <p className="text-[10px] text-kc-muted mt-2">
                  {selectedVariant.stock_qty === 0
                    ? "Sem estoque neste tamanho"
                    : selectedVariant.stock_qty <= selectedVariant.stock_min
                    ? `Últimas ${selectedVariant.stock_qty} unidade${selectedVariant.stock_qty > 1 ? "s" : ""}`
                    : "Em estoque"}
                </p>
              )}
            </div>
          )}

          {/* ── Botões de ação ── */}
          {/* Mobile: empilhado (Comprar Agora primeiro); Desktop: lado a lado */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {/* Adicionar ao Carrinho — outline terracota */}
            <button
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-[11px] tracking-[0.2em] uppercase border transition-colors ${
                added
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : !canAddToCart
                  ? "border-kc-line text-kc-muted cursor-not-allowed bg-transparent"
                  : "border-[#A0622A] text-[#A0622A] bg-transparent hover:bg-[#A0622A]/5"
              }`}
            >
              {added ? (
                <>
                  <Check size={14} />
                  Adicionado
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  {canAddToCart ? "Adicionar ao Carrinho" : cartButtonLabel()}
                </>
              )}
            </button>

            {/* Comprar Agora — sólido terracota */}
            <button
              onClick={handleBuyNow}
              disabled={!canAddToCart}
              className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-[11px] tracking-[0.2em] uppercase transition-colors ${
                !canAddToCart
                  ? "bg-kc-cream text-kc-muted cursor-not-allowed"
                  : "bg-[#A0622A] text-white hover:bg-[#8a5224]"
              }`}
            >
              <Zap size={14} />
              Comprar Agora
            </button>
          </div>

          {/* ── Simulador de Frete ── */}
          <div className="border border-kc-line bg-kc-cream/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Truck size={13} className="text-kc-muted shrink-0" />
              <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase">Calcular Frete</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="flex-1 border border-kc-line bg-white px-3 py-2 text-xs text-kc-dark placeholder:text-kc-muted focus:outline-none focus:border-kc"
              />
              <button
                onClick={() => calcularFrete()}
                disabled={freteLoading || cep.replace(/\D/g, "").length !== 8}
                className="px-4 py-2 bg-kc-dark text-kc-cream text-[10px] tracking-[0.16em] uppercase disabled:opacity-40 hover:bg-kc-dark/80 transition-colors"
              >
                {freteLoading ? "…" : "OK"}
              </button>
            </div>

            {cepInfo && (
              <p className="text-[11px] text-kc-muted">{cepInfo.city} — {cepInfo.state}</p>
            )}

            {freteErro && (
              <p className="text-[11px] text-red-600">{freteErro}</p>
            )}

            {freteOpcoes.length > 0 && (
              <ul className="space-y-2 pt-1">
                {freteOpcoes.map((op) => (
                  <li key={op.id} className="flex items-center justify-between bg-white border border-kc-line px-3 py-2.5">
                    <span className="text-xs text-kc-dark">{op.name}</span>
                    <div className="text-right">
                      <span className="text-xs font-medium text-kc">
                        {op.preco === 0 ? "Grátis" : op.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="block text-[10px] text-kc-muted">
                        {op.prazo === 0 ? "Retirada" : `${op.prazo} dia${op.prazo > 1 ? "s" : ""} úteis`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Selos de Segurança e Confiança ── */}
          <div style={{
            marginTop: 16,
            padding: '14px 16px',
            background: '#F5F1EA',
            borderRadius: 8,
            border: '1px solid #EDE8DC'
          }}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: '#5C3317',
              margin: '0 0 12px 0',
              textTransform: 'uppercase'
            }}>
              🔒 Compra 100% Segura
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Mercado Pago */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'white', borderRadius: 6, border: '1px solid #EDE8DC' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#009EE3">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#009EE3', margin: 0 }}>Mercado Pago</p>
                  <p style={{ fontSize: 9, color: '#B89070', margin: 0 }}>Pagamento protegido</p>
                </div>
              </div>

              {/* SSL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'white', borderRadius: 6, border: '1px solid #EDE8DC' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', margin: 0 }}>SSL Seguro</p>
                  <p style={{ fontSize: 9, color: '#B89070', margin: 0 }}>Dados criptografados</p>
                </div>
              </div>

              {/* Correios */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'white', borderRadius: 6, border: '1px solid #EDE8DC' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#A0622A">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#A0622A', margin: 0 }}>Correios</p>
                  <p style={{ fontSize: 9, color: '#B89070', margin: 0 }}>Entrega rastreada</p>
                </div>
              </div>

              {/* Troca garantida */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'white', borderRadius: 6, border: '1px solid #EDE8DC' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#A0622A">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#A0622A', margin: 0 }}>Troca Garantida</p>
                  <p style={{ fontSize: 9, color: '#B89070', margin: 0 }}>7 dias para trocar</p>
                </div>
              </div>
            </div>

            {/* Métodos de pagamento */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #EDE8DC', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#B89070' }}>Aceito:</span>
              {['PIX', 'Visa', 'Master', 'Elo', 'Amex', 'Boleto'].map((m) => (
                <span key={m} style={{ fontSize: 9, fontWeight: 700, color: '#5C3317', background: 'white', border: '1px solid #EDE8DC', borderRadius: 3, padding: '2px 6px', letterSpacing: '0.05em' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* WhatsApp CTA */}
          <a
            href={buildWhatsAppUrl(`Olá! Tenho interesse no produto: ${product.name}`)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border border-kc-line text-kc-muted py-3 text-[10px] tracking-[0.16em] uppercase hover:border-kc hover:text-kc-dark transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.716a.5.5 0 0 0 .608.625l5.926-1.51A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.956 0-3.792-.56-5.35-1.53l-.39-.24-4.04 1.03 1.03-3.95-.25-.41A9.941 9.941 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Dúvidas? Fale conosco
          </a>

          {/* Description */}
          {product.description && (
            <>
              <div className="h-px bg-kc-line" />
              <div>
                <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase mb-2">Descrição</p>
                <p className="text-sm text-kc-dark/80 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            </>
          )}

          {/* SKU */}
          {selectedVariant?.sku && (
            <p className="text-[9px] text-kc-muted tracking-wider">SKU: {selectedVariant.sku}</p>
          )}
        </div>
      </div>
    </div>
  );
}
