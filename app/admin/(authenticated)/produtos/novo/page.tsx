"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Package2, Layers, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";
import { generateVariantSku } from "@/lib/sku";
import type { Category, Color, Size, ProductType } from "@/types/database";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface GridCell {
  colorId: string;
  colorName: string;
  sizeId: string;
  sizeName: string;
  sku: string;
  stock_qty: number;
  stock_min: number;
}

interface VariantOption {
  variantId: string;
  productId: string;
  productName: string;
  color: string | null;
  size: string;
  sku: string;
}

async function uploadProductImages(files: File[]): Promise<string[]> {
  const body = new FormData();
  for (const file of files) {
    body.append("files", file);
  }

  const res = await fetch("/api/admin/products/upload", {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Falha no upload das imagens.");
  }

  const data = await res.json();
  return Array.isArray(data.urls) ? data.urls : [];
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function NovoProdutoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [allColors, setAllColors] = useState<Color[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [slugEdited, setSlugEdited] = useState(false);
  const skuBaseEdited = useRef(false);

  // Produto
  const [productType, setProductType] = useState<ProductType>("individual");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [skuBase, setSkuBase] = useState("");
  const [skuBaseLoading, setSkuBaseLoading] = useState(false);
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imagesUploading, setImagesUploading] = useState(false);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  // Dimensões
  const [weightG, setWeightG] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");

  // Grade cor × tamanho (individual)
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [grid, setGrid] = useState<GridCell[]>([]);

  // Composição do conjunto (conjunto)
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  // variantId → quantity (0 = not selected)
  const [bundleSelection, setBundleSelection] = useState<Record<string, number>>({});

  // ── Fetch inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/categories?active=true").then((r) => r.json()),
      fetch("/api/admin/colors").then((r) => r.json()),
      fetch("/api/admin/sizes").then((r) => r.json()),
    ]).then(([cats, colors, sizes]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setAllColors(Array.isArray(colors) ? colors.filter((c: Color) => c.active) : []);
      setAllSizes(Array.isArray(sizes) ? sizes.filter((s: Size) => s.active) : []);
    }).catch(() => {});
  }, []);

  // Carrega variantes disponíveis para seleção no conjunto
  useEffect(() => {
    if (productType !== "conjunto") return;
    setVariantsLoading(true);
    fetch("/api/products?active=true&type=individual&with_variants=true")
      .then((r) => r.json())
      .then((products) => {
        const opts: VariantOption[] = [];
        for (const p of Array.isArray(products) ? products : []) {
          for (const v of p.product_variants ?? []) {
            if (!v.active) continue;
            opts.push({
              variantId:   v.id,
              productId:   p.id,
              productName: p.name,
              color:       v.color,
              size:        v.size,
              sku:         v.sku,
            });
          }
        }
        setVariantOptions(opts);
      })
      .catch(() => {})
      .finally(() => setVariantsLoading(false));
  }, [productType]);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  // Auto-gera sku_base ao selecionar categoria (se não foi editado manualmente)
  useEffect(() => {
    if (!categoryId || skuBaseEdited.current || productType === "conjunto") return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat?.prefix) return;

    setSkuBaseLoading(true);
    fetch(`/api/admin/sku/next?prefix=${encodeURIComponent(cat.prefix)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.skuBase && !skuBaseEdited.current) setSkuBase(d.skuBase);
      })
      .catch(() => {})
      .finally(() => setSkuBaseLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, categories]);

  // Regenera a grade quando cores/tamanhos selecionados mudam
  useEffect(() => {
    const colors = allColors.filter((c) => selectedColorIds.includes(c.id));
    const sizes = allSizes.filter((s) => selectedSizeIds.includes(s.id));

    setGrid((prev) => {
      const cells: GridCell[] = [];
      for (const color of colors) {
        for (const size of sizes) {
          const existing = prev.find(
            (c) => c.colorId === color.id && c.sizeId === size.id
          );
          const sku = skuBase ? generateVariantSku(skuBase, color.name, size.name) : "";
          cells.push(
            existing
              ? { ...existing, sku: existing.sku || sku }
              : { colorId: color.id, colorName: color.name, sizeId: size.id, sizeName: size.name, sku, stock_qty: 0, stock_min: 3 }
          );
        }
      }
      return cells;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorIds, selectedSizeIds]);

  // Regenera SKUs quando skuBase muda
  useEffect(() => {
    if (!skuBase) return;
    setGrid((prev) =>
      prev.map((cell) => ({
        ...cell,
        sku: generateVariantSku(skuBase, cell.colorName, cell.sizeName),
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuBase]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function toggleColor(id: string) {
    setSelectedColorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSize(id: string) {
    setSelectedSizeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function updateCell(
    colorId: string,
    sizeId: string,
    field: "sku" | "stock_qty" | "stock_min",
    value: string | number
  ) {
    setGrid((prev) =>
      prev.map((c) =>
        c.colorId === colorId && c.sizeId === sizeId ? { ...c, [field]: value } : c
      )
    );
  }

  function toggleBundleVariant(variantId: string) {
    setBundleSelection((prev) => {
      if (variantId in prev) {
        const next = { ...prev };
        delete next[variantId];
        return next;
      }
      return { ...prev, [variantId]: 1 };
    });
  }

  function setBundleQty(variantId: string, qty: number) {
    setBundleSelection((prev) => ({ ...prev, [variantId]: Math.max(1, qty) }));
  }

  async function handleImagesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setImagesUploading(true);
    setError("");

    try {
      const uploaded = await uploadProductImages(files);
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImagesUploading(false);
      if (imagesInputRef.current) {
        imagesInputRef.current.value = "";
      }
    }
  }

  function removeImageAt(index: number) {
    setImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function makePrimaryImage(index: number) {
    setImages((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (productType === "individual") {
      if (grid.length === 0) {
        setError("Selecione pelo menos uma cor e um tamanho para gerar variações.");
        return;
      }
      if (grid.some((c) => !c.sku.trim())) {
        setError("Preencha os SKUs de todas as variações.");
        return;
      }
    } else {
      const selected = Object.keys(bundleSelection);
      if (selected.length === 0) {
        setError("Selecione pelo menos um componente para o conjunto.");
        return;
      }
    }

    setLoading(true);
    try {
      const basePayload = {
        name,
        slug,
        description:    description || null,
        price:          parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        cost_price:     costPrice     ? parseFloat(costPrice)     : null,
        product_type:   productType,
        category_id:    categoryId || null,
        active,
        featured,
        weight_g:   weightG   ? parseInt(weightG)   : null,
        length_cm:  lengthCm  ? parseInt(lengthCm)  : null,
        width_cm:   widthCm   ? parseInt(widthCm)   : null,
        height_cm:  heightCm  ? parseInt(heightCm)  : null,
        images,
      };

      const payload =
        productType === "individual"
          ? {
              ...basePayload,
              sku_base: skuBase || null,
              variants: grid.map((c) => ({
                size:      c.sizeName,
                color:     c.colorName,
                sku:       c.sku,
                stock_qty: c.stock_qty,
                stock_min: c.stock_min,
              })),
            }
          : {
              ...basePayload,
              bundle_items: Object.entries(bundleSelection).map(([variant_id, quantity]) => ({
                variant_id,
                quantity,
              })),
            };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/admin/produtos");
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao criar produto.");
      }
    } catch {
      setError("Erro ao criar produto.");
    } finally {
      setLoading(false);
    }
  }

  // ── Estilos ───────────────────────────────────────────────────────────────

  const inputCls =
    "w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc";
  const labelCls =
    "block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5";

  const selectedColors = allColors.filter((c) => selectedColorIds.includes(c.id));
  const selectedSizes  = allSizes.filter((s) => selectedSizeIds.includes(s.id));

  // Agrupar variantOptions por produto
  const productGroups = variantOptions.reduce<Record<string, { name: string; variants: VariantOption[] }>>(
    (acc, opt) => {
      if (!acc[opt.productId]) acc[opt.productId] = { name: opt.productName, variants: [] };
      acc[opt.productId].variants.push(opt);
      return acc;
    },
    {}
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium text-kc-dark mb-6">Novo Produto</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">

        {/* Informações Básicas */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-serif text-lg font-medium text-kc-dark mb-2">Informações Básicas</h2>

          {/* Tipo de Mercadoria */}
          <div>
            <label className={labelCls}>Tipo de Mercadoria</label>
            <div className="flex gap-3">
              {(["individual", "conjunto"] as ProductType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProductType(t)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded border text-sm transition-colors ${
                    productType === t
                      ? "border-kc bg-kc/5 text-kc-dark font-medium"
                      : "border-gray-200 text-gray-500 hover:border-kc/40"
                  }`}
                >
                  {t === "individual" ? <Package2 size={15} /> : <Layers size={15} />}
                  {t === "individual" ? "Individual" : "Conjunto"}
                </button>
              ))}
            </div>
            {productType === "conjunto" && (
              <p className="text-[11px] text-amber-600 mt-1.5">
                Conjuntos não têm SKU próprio — o estoque é controlado pelos componentes individuais selecionados.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome do Produto *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Ex: Conjunto Linho Off-White" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug (URL) *</label>
              <input type="text" value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                required className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Preço (R$) *</label>
              <input type="number" step="0.01" min="0" value={price}
                onChange={(e) => setPrice(e.target.value)} required placeholder="389.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preço Original</label>
              <input type="number" step="0.01" min="0" value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)} placeholder="420.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preço de Custo</label>
              <input type="number" step="0.01" min="0" value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)} placeholder="180.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* SKU Base — apenas para Individual */}
          {productType === "individual" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>
                  Código Base
                  {skuBaseLoading && (
                    <span className="ml-2 text-[9px] text-kc-muted animate-pulse">gerando...</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={skuBase}
                    onChange={(e) => {
                      skuBaseEdited.current = true;
                      setSkuBase(e.target.value.toUpperCase());
                    }}
                    placeholder="LIN-0001"
                    className={`${inputCls} font-mono`}
                  />
                  {skuBase && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono bg-kc/10 text-kc px-1.5 py-0.5 rounded">
                      {skuBase}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  Preview: {skuBase || "LIN-0001"}-COR-TAM
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-kc" />
              Produto ativo
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-4 h-4 accent-kc" />
              Destaque
            </label>
          </div>
        </div>

        {/* Imagens */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-serif text-lg font-medium text-kc-dark mb-2">Imagens</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => imagesInputRef.current?.click()}
              disabled={imagesUploading}
              className="inline-flex items-center gap-2 border border-kc text-kc text-[11px] tracking-[0.14em] uppercase px-4 py-2.5 hover:bg-kc hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <Upload size={14} />
              {imagesUploading ? "Enviando..." : "Enviar imagens"}
            </button>
            <input
              ref={imagesInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImagesSelected}
            />
            <p className="text-[11px] text-gray-400">
              JPG, PNG ou WEBP. A primeira imagem continua sendo a capa principal.
            </p>
          </div>

          <label className={labelCls}>URLs das imagens</label>
          <textarea
            value={images.join("\n")}
            onChange={(e) =>
              setImages(
                e.target.value
                  .split(/\r?\n/)
                  .map((line) => line.trim())
                  .filter(Boolean)
              )
            }
            rows={5}
            placeholder={"https://...\nhttps://..."}
            className={`${inputCls} resize-none font-mono text-xs`}
          />
          <p className="text-[11px] text-gray-400 mt-2">
            Use uma URL por linha. A primeira imagem vira a capa da vitrine e da PDP.
          </p>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800 space-y-1">
            <p>Referencia produto: 1200x1600px no formato 3:4.</p>
            <p>Referencia banner da marca: desktop 1920x600px e mobile 768x900px.</p>
            <p>A segunda imagem fica como apoio visual e pode aparecer no hover do catalogo.</p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {images.map((src, index) => (
                <div key={`${src}-${index}`} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <div className="aspect-[3/4] bg-gray-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm hover:text-kc transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={`Mover imagem ${index + 1} para a esquerda`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === images.length - 1}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm hover:text-kc transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={`Mover imagem ${index + 1} para a direita`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImageAt(index)}
                      className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm hover:text-red-500 transition-colors"
                      aria-label={`Remover imagem ${index + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="px-3 py-2 text-[10px] text-gray-500 space-y-2">
                    <div>{index === 0 ? "Capa principal" : index === 1 ? "Capa secundaria" : `Imagem ${index + 1}`}</div>
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => makePrimaryImage(index)}
                        className="text-kc hover:text-kc-dark transition-colors underline underline-offset-2"
                      >
                        Definir como capa principal
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dimensões */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-serif text-lg font-medium text-kc-dark mb-1">Dimensões para Frete</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div><label className={labelCls}>Peso (g)</label><input type="number" min="0" value={weightG} onChange={(e) => setWeightG(e.target.value)} placeholder="350" className={inputCls} /></div>
            <div><label className={labelCls}>Comprimento (cm)</label><input type="number" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} placeholder="30" className={inputCls} /></div>
            <div><label className={labelCls}>Largura (cm)</label><input type="number" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} placeholder="25" className={inputCls} /></div>
            <div><label className={labelCls}>Altura (cm)</label><input type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="5" className={inputCls} /></div>
          </div>
        </div>

        {/* ── INDIVIDUAL: Grade Cor × Tamanho ── */}
        {productType === "individual" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-serif text-lg font-medium text-kc-dark mb-1">Grade de Variações</h2>
            <p className="text-xs text-gray-400 mb-5">Selecione as cores e tamanhos para gerar a grade automaticamente.</p>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Cores */}
              <div>
                <label className={labelCls}>Cores disponíveis</label>
                {allColors.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhuma cor cadastrada. <a href="/admin/cores" className="text-kc underline">Cadastrar →</a></p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {allColors.map((color) => {
                      const selected = selectedColorIds.includes(color.id);
                      return (
                        <button key={color.id} type="button" onClick={() => toggleColor(color.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs transition-colors ${
                            selected ? "border-kc bg-kc/5 text-kc-dark font-medium" : "border-gray-200 text-gray-600 hover:border-kc/50"
                          }`}>
                          <span className="w-3 h-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: color.hex_code }} />
                          {color.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tamanhos */}
              <div>
                <label className={labelCls}>Tamanhos disponíveis</label>
                {allSizes.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum tamanho cadastrado. <a href="/admin/tamanhos" className="text-kc underline">Cadastrar →</a></p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {allSizes.map((size) => {
                      const selected = selectedSizeIds.includes(size.id);
                      return (
                        <button key={size.id} type="button" onClick={() => toggleSize(size.id)}
                          className={`w-10 h-10 border text-xs font-medium transition-colors rounded ${
                            selected ? "border-kc bg-kc text-white" : "border-gray-200 text-gray-700 hover:border-kc"
                          }`}>
                          {size.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Grade gerada */}
            {grid.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left text-[11px] tracking-wider text-gray-500 uppercase">Cor \ Tamanho</th>
                      {selectedSizes.map((s) => (
                        <th key={s.id} className="border border-gray-200 px-3 py-2 text-center text-[11px] tracking-wider text-gray-500 uppercase min-w-[140px]">{s.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedColors.map((color) => (
                      <tr key={color.id}>
                        <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: color.hex_code }} />
                            {color.name}
                          </div>
                        </td>
                        {selectedSizes.map((size) => {
                          const cell = grid.find((c) => c.colorId === color.id && c.sizeId === size.id);
                          if (!cell) return <td key={size.id} className="border border-gray-200" />;
                          return (
                            <td key={size.id} className="border border-gray-200 p-2">
                              <div className="space-y-1.5">
                                <input type="text" value={cell.sku}
                                  onChange={(e) => updateCell(color.id, size.id, "sku", e.target.value.toUpperCase())}
                                  placeholder="SKU"
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-kc" />
                                <div className="flex gap-1">
                                  <input type="number" min="0" value={cell.stock_qty}
                                    onChange={(e) => updateCell(color.id, size.id, "stock_qty", parseInt(e.target.value) || 0)}
                                    title="Estoque inicial" placeholder="Estoque"
                                    className="w-1/2 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-kc" />
                                  <input type="number" min="0" value={cell.stock_min}
                                    onChange={(e) => updateCell(color.id, size.id, "stock_min", parseInt(e.target.value) || 0)}
                                    title="Estoque mínimo (alerta)"
                                    className="w-1/2 border border-gray-100 rounded px-2 py-1 text-xs bg-gray-50 focus:outline-none focus:border-kc" />
                                </div>
                                <p className="text-[9px] text-gray-400 text-center">Estoque / Mínimo</p>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedColorIds.length > 0 && selectedSizeIds.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded mt-2">
                Selecione pelo menos um tamanho para gerar a grade.
              </p>
            )}
            {selectedColorIds.length === 0 && selectedSizeIds.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded mt-2">
                Selecione pelo menos uma cor para gerar a grade.
              </p>
            )}
          </div>
        )}

        {/* ── CONJUNTO: Composição ── */}
        {productType === "conjunto" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-serif text-lg font-medium text-kc-dark mb-1">Composição do Conjunto</h2>
            <p className="text-xs text-gray-400 mb-5">
              Selecione as variantes individuais que compõem este conjunto e defina a quantidade de cada uma.
            </p>

            {variantsLoading ? (
              <p className="text-sm text-gray-400 animate-pulse">Carregando variantes...</p>
            ) : Object.keys(productGroups).length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center">
                <Layers size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  Nenhum produto individual com variantes encontrado.{" "}
                  <a href="/admin/produtos/novo" className="text-kc underline">Criar produto individual →</a>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(productGroups).map(([pid, group]) => (
                  <div key={pid} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5">
                      <p className="text-sm font-medium text-kc-dark">{group.name}</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.variants.map((opt) => {
                        const isSelected = opt.variantId in bundleSelection;
                        return (
                          <div key={opt.variantId}
                            className={`flex items-center gap-4 px-4 py-2.5 transition-colors ${isSelected ? "bg-kc/3" : "hover:bg-gray-50"}`}
                          >
                            <input
                              type="checkbox"
                              id={`v-${opt.variantId}`}
                              checked={isSelected}
                              onChange={() => toggleBundleVariant(opt.variantId)}
                              className="w-4 h-4 accent-kc shrink-0"
                            />
                            <label htmlFor={`v-${opt.variantId}`} className="flex-1 cursor-pointer">
                              <span className="text-sm text-gray-700">
                                {[opt.color, opt.size].filter(Boolean).join(" / ")}
                              </span>
                              <span className="ml-2 text-[11px] font-mono text-gray-400">{opt.sku}</span>
                            </label>
                            {isSelected && (
                              <div className="flex items-center gap-2 shrink-0">
                                <label className="text-xs text-gray-500">Qtd:</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={bundleSelection[opt.variantId]}
                                  onChange={(e) => setBundleQty(opt.variantId, parseInt(e.target.value) || 1)}
                                  className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-kc"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {Object.keys(bundleSelection).length > 0 && (
                  <p className="text-xs text-kc font-medium">
                    {Object.keys(bundleSelection).length} componente(s) selecionado(s)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={loading}>Criar Produto</Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/produtos")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
