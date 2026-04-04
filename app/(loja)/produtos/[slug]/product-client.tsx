"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag, Check, Zap, ZoomIn } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";
import { buildWhatsAppUrl } from "@/lib/site";
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
