"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/loja/product-card";
import type { Product } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

type RelatedProduct = Pick<
  Product,
  "id" | "name" | "slug" | "price" | "original_price" | "images" | "category_id"
>;

// Adapta para o ProductCard que espera Product & { total_stock?: number }
function toCardProduct(p: RelatedProduct): Product & { total_stock?: number } {
  return {
    ...p,
    description: null,
    cost_price: null,
    product_type: "individual",
    weight_g: null,
    length_cm: null,
    width_cm: null,
    height_cm: null,
    sku_base: null,
    active: true,
    featured: false,
    created_at: "",
    updated_at: "",
  } as Product & { total_stock?: number };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
      <div className="aspect-[3/4] w-full rounded-none bg-gray-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-200 animate-pulse rounded w-3/4" />
        <div className="h-3.5 bg-gray-200 animate-pulse rounded w-1/2" />
        <div className="h-3 bg-gray-200 animate-pulse rounded w-1/3" />
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RelatedProductsProps {
  categoryId: string | null;
  excludeId: string;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function RelatedProducts({ categoryId, excludeId }: RelatedProductsProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      category_id: categoryId,
      exclude_id: excludeId,
      limit: "8",
    });

    fetch(`/api/products/related?${params}`)
      .then((r) => r.json())
      .then((data: RelatedProduct[]) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => console.error("[RelatedProducts] Erro:", err))
      .finally(() => setLoading(false));
  }, [categoryId, excludeId]);

  // ── Controle das setas ─────────────────────────────────────────────────────

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [products, updateArrows]);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({
      left: -(scrollRef.current.offsetWidth),
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({
      left: scrollRef.current.offsetWidth,
      behavior: "smooth",
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Não exibir a seção se não houver produtos (após o carregamento)
  if (!loading && products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
      {/* Título */}
      <h2 className="font-serif text-2xl md:text-3xl text-[#5C3317] mb-8 tracking-wide">
        Você também pode gostar
      </h2>

      {/* Carrossel */}
      <div className="relative">
        {/* Seta esquerda — visível apenas md+ */}
        <button
          onClick={scrollLeft}
          aria-label="Anterior"
          disabled={!canScrollLeft}
          className={[
            "hidden md:flex",
            "absolute -left-5 top-1/2 -translate-y-1/2 z-10",
            "w-10 h-10 items-center justify-center",
            "bg-white border border-kc-line rounded-full shadow-md",
            "transition-all duration-200",
            canScrollLeft
              ? "opacity-100 cursor-pointer hover:border-[#A0622A] hover:text-[#A0622A]"
              : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>

        {/* Track do carrossel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((p) => (
                <div
                  key={p.id}
                  className="snap-start shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-12px)]"
                >
                  <ProductCard product={toCardProduct(p)} />
                </div>
              ))}
        </div>

        {/* Seta direita — visível apenas md+ */}
        <button
          onClick={scrollRight}
          aria-label="Próximo"
          disabled={!canScrollRight}
          className={[
            "hidden md:flex",
            "absolute -right-5 top-1/2 -translate-y-1/2 z-10",
            "w-10 h-10 items-center justify-center",
            "bg-white border border-kc-line rounded-full shadow-md",
            "transition-all duration-200",
            canScrollRight
              ? "opacity-100 cursor-pointer hover:border-[#A0622A] hover:text-[#A0622A]"
              : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
