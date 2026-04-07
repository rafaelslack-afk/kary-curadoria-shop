"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/loja/product-card";
import type { Category, Product } from "@/types/database";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type SortOption = "novidades" | "menor-preco" | "maior-preco" | "destaque";

interface Props {
  products: (Product & { total_stock: number; categories: Category | null })[];
  categories: Category[];
}

export function CatalogClient({ products, categories }: Props) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("categoria") ?? "";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sort, setSort] = useState<SortOption>("novidades");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sincroniza o estado com a URL quando o parâmetro ?categoria= muda
  // (ex: clique no menu de navegação enquanto já está em /produtos)
  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  const filtered = useMemo(() => {
    let result = [...products];

    // Filter by category slug
    if (selectedCategory) {
      result = result.filter((p) => p.categories?.slug === selectedCategory);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Sort
    switch (sort) {
      case "menor-preco":
        result.sort((a, b) => a.price - b.price);
        break;
      case "maior-preco":
        result.sort((a, b) => b.price - a.price);
        break;
      case "destaque":
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      default:
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [products, selectedCategory, search, sort]);

  const activeFilters =
    (selectedCategory ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] tracking-[0.26em] text-kc-muted mb-1 uppercase">Loja</p>
          <h1 className="font-serif text-2xl font-medium text-kc-dark">
            {selectedCategory
              ? (categories.find((c) => c.slug === selectedCategory)?.name ?? "Coleções")
              : "Todas as Coleções"}
          </h1>
          <p className="text-xs text-kc-muted mt-1">
            {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
          </p>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-kc-muted hidden sm:block">Ordenar:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border border-kc-line bg-kc-light text-xs text-kc-dark px-3 py-2 focus:outline-none focus:border-kc"
          >
            <option value="novidades">Novidades</option>
            <option value="destaque">Destaques</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">

        {/* Sidebar Filters — desktop */}
        <aside className="hidden md:block w-48 shrink-0 space-y-6">

          {/* Search */}
          <div>
            <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase mb-2">Busca</p>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-kc-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome do produto"
                className="w-full border border-kc-line bg-kc-light pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-kc"
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase mb-2">Categorias</p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`text-xs text-left w-full py-1 transition-colors ${
                    selectedCategory === ""
                      ? "text-kc font-medium"
                      : "text-kc-muted hover:text-kc-dark"
                  }`}
                >
                  Todas
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === cat.slug ? "" : cat.slug
                      )
                    }
                    className={`text-xs text-left w-full py-1 transition-colors ${
                      selectedCategory === cat.slug
                        ? "text-kc font-medium"
                        : "text-kc-muted hover:text-kc-dark"
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">

          {/* Mobile search + filter toggle */}
          <div className="md:hidden flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-kc-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto"
                className="w-full border border-kc-line bg-kc-light pl-8 pr-3 py-2.5 text-xs focus:outline-none focus:border-kc"
              />
            </div>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-1.5 border border-kc-line bg-kc-light px-3 py-2 text-xs text-kc-muted relative"
            >
              <SlidersHorizontal size={13} />
              Filtros
              {activeFilters > 0 && (
                <span className="absolute -top-1 -right-1 bg-kc text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {/* Mobile filter panel */}
          {filtersOpen && (
            <div className="md:hidden border border-kc-line bg-kc-light p-4 mb-4 space-y-3">
              <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase">Categorias</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`text-[10px] tracking-[0.1em] border px-3 py-1.5 transition-colors ${
                    selectedCategory === ""
                      ? "border-kc bg-kc text-white"
                      : "border-kc-line text-kc-muted hover:border-kc"
                  }`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === cat.slug ? "" : cat.slug
                      )
                    }
                    className={`text-[10px] tracking-[0.1em] border px-3 py-1.5 transition-colors ${
                      selectedCategory === cat.slug
                        ? "border-kc bg-kc text-white"
                        : "border-kc-line text-kc-muted hover:border-kc"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {(selectedCategory || search.trim()) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-kc text-white px-2.5 py-1">
                  {categories.find((c) => c.slug === selectedCategory)?.name}
                  <button onClick={() => setSelectedCategory("")}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {search.trim() && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-kc text-white px-2.5 py-1">
                  &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch("")}>
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-kc-muted mb-2">Nenhum produto encontrado.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                }}
                className="text-xs text-kc underline underline-offset-2"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((product) => {
                const isNew =
                  Date.now() - new Date(product.created_at).getTime() <
                  THIRTY_DAYS;
                return (
                  <ProductCard key={product.id} product={product} isNew={isNew} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
