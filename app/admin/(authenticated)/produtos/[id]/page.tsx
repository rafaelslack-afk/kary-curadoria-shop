"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Save, Package2, Layers, RefreshCw, Upload, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, slugify } from "@/lib/utils";
import type { Category, ProductVariant, Color, Size, ProductType } from "@/types/database";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface VariantRow extends ProductVariant {
  _dirty?: boolean;
  _saving?: boolean;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function abbrev(name: string) {
  return name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function EditarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [fetching, setFetching]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [categories, setCategories]     = useState<Category[]>([]);
  const [allColors, setAllColors]       = useState<Color[]>([]);
  const [allSizes, setAllSizes]         = useState<Size[]>([]);

  // Produto
  const [productType, setProductType]   = useState<ProductType>("individual");
  const [name, setName]                 = useState("");
  const [slug, setSlug]                 = useState("");
  const [slugEdited, setSlugEdited]     = useState(false);
  const [description, setDescription]   = useState("");
  const [price, setPrice]               = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [costPrice, setCostPrice]       = useState("");
  const [categoryId, setCategoryId]     = useState("");
  const [skuBase, setSkuBase]           = useState("");
  const [active, setActive]             = useState(true);
  const [featured, setFeatured]         = useState(false);
  const [images, setImages]             = useState<string[]>([]);
  const [imagesUploading, setImagesUploading] = useState(false);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  // Dimensões
  const [weightG, setWeightG]     = useState("");
  const [lengthCm, setLengthCm]   = useState("");
  const [widthCm, setWidthCm]     = useState("");
  const [heightCm, setHeightCm]   = useState("");

  // Variantes existentes (individual)
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Grade — novas variantes a adicionar (individual)
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds]   = useState<string[]>([]);
  const [newGrid, setNewGrid] = useState<{
    colorId: string; colorName: string;
    sizeId: string; sizeName: string;
    sku: string; stock_qty: number; stock_min: number;
  }[]>([]);

  // Composição do conjunto (conjunto)
  const [variantOptions, setVariantOptions]     = useState<VariantOption[]>([]);
  const [variantsLoading, setVariantsLoading]   = useState(false);
  const [bundleSelection, setBundleSelection]   = useState<Record<string, number>>({});

  // ── Fetch inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then((r) => r.json()),
      fetch("/api/categories?active=true").then((r) => r.json()),
      fetch("/api/admin/colors").then((r) => r.json()),
      fetch("/api/admin/sizes").then((r) => r.json()),
    ])
      .then(([product, cats, colors, sizes]) => {
        setName(product.name ?? "");
        setSlug(product.slug ?? "");
        setSlugEdited(true); // não sobrescrever o slug carregado ao mudar o nome
        setDescription(product.description ?? "");
        setPrice(String(product.price ?? ""));
        setOriginalPrice(product.original_price ? String(product.original_price) : "");
        setCostPrice(product.cost_price ? String(product.cost_price) : "");
        setProductType(product.product_type ?? "individual");
        setCategoryId(product.category_id ?? "");
        setSkuBase(product.sku_base ?? "");
        setActive(product.active ?? true);
        setFeatured(product.featured ?? false);
        setImages(product.images ?? []);
        setWeightG(product.weight_g ? String(product.weight_g) : "");
        setLengthCm(product.length_cm ? String(product.length_cm) : "");
        setWidthCm(product.width_cm ? String(product.width_cm) : "");
        setHeightCm(product.height_cm ? String(product.height_cm) : "");
        setVariants(
          (product.product_variants ?? []).map((v: ProductVariant) => ({ ...v, _dirty: false }))
        );

        // Pré-selecionar bundle items
        if (product.product_type === "conjunto") {
          const sel: Record<string, number> = {};
          for (const item of product.product_bundle_items ?? []) {
            sel[item.variant_id] = item.quantity;
          }
          setBundleSelection(sel);
        }

        setCategories(Array.isArray(cats) ? cats : []);
        setAllColors(Array.isArray(colors) ? colors.filter((c: Color) => c.active) : []);
        setAllSizes(Array.isArray(sizes) ? sizes.filter((s: Size) => s.active) : []);
      })
      .catch(() => setError("Erro ao carregar produto."))
      .finally(() => setFetching(false));
  }, [id]);

  // Auto-fill slug quando nome muda (só se ainda não foi editado manualmente)
  useEffect(() => {
    if (!slugEdited && name) setSlug(slugify(name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Carrega variantes disponíveis quando produto é conjunto
  useEffect(() => {
    if (productType !== "conjunto") return;
    setVariantsLoading(true);
    fetch("/api/products?active=true&type=individual&with_variants=true")
      .then((r) => r.json())
      .then((products) => {
        const opts: VariantOption[] = [];
        for (const p of Array.isArray(products) ? products : []) {
          if (p.id === id) continue; // não incluir o próprio produto
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType]);

  // Regenera grade de novas variantes quando seleção muda
  useEffect(() => {
    const colors = allColors.filter((c) => selectedColorIds.includes(c.id));
    const sizes  = allSizes.filter((s) => selectedSizeIds.includes(s.id));

    setNewGrid((prev) => {
      const cells = [];
      for (const color of colors) {
        for (const size of sizes) {
          const existing = prev.find((c) => c.colorId === color.id && c.sizeId === size.id);
          const alreadyExists = variants.some((v) => v.color === color.name && v.size === size.name && v.active);
          if (alreadyExists) continue;
          const sku = skuBase ? `${skuBase}-${abbrev(color.name)}-${size.name}`.toUpperCase() : "";
          cells.push(existing ?? {
            colorId: color.id, colorName: color.name,
            sizeId: size.id,  sizeName: size.name,
            sku, stock_qty: 0, stock_min: 3,
          });
        }
      }
      return cells;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorIds, selectedSizeIds]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function toggleColor(cid: string) {
    setSelectedColorIds((prev) => prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]);
  }

  function toggleSize(sid: string) {
    setSelectedSizeIds((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);
  }

  function updateNewCell(
    colorId: string, sizeId: string,
    field: "sku" | "stock_qty" | "stock_min",
    value: string | number
  ) {
    setNewGrid((prev) => prev.map((c) => c.colorId === colorId && c.sizeId === sizeId ? { ...c, [field]: value } : c));
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

    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    const tooBig = files.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setError(`"${tooBig.name}" excede 4MB. Use JPG com qualidade 80% para reduzir o tamanho.`);
      if (imagesInputRef.current) imagesInputRef.current.value = "";
      return;
    }

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

  // ── Salvar produto ────────────────────────────────────────────────────────

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    // Validação para conjunto
    if (productType === "conjunto" && Object.keys(bundleSelection).length === 0) {
      setError("Selecione pelo menos um componente para o conjunto.");
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name, slug,
        description:    description || null,
        price:          parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        cost_price:     costPrice     ? parseFloat(costPrice)     : null,
        product_type:   productType,
        category_id:    categoryId || null,
        sku_base:       productType === "individual" ? (skuBase || null) : null,
        active, featured, images,
        weight_g:  weightG  ? parseInt(weightG)  : null,
        length_cm: lengthCm ? parseInt(lengthCm) : null,
        width_cm:  widthCm  ? parseInt(widthCm)  : null,
        height_cm: heightCm ? parseInt(heightCm) : null,
      };

      if (productType === "conjunto") {
        payload.bundle_items = Object.entries(bundleSelection).map(([variant_id, quantity]) => ({
          variant_id,
          quantity,
        }));
      }

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess("Produto atualizado!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Erro ao atualizar.");
      }
    } catch {
      setError("Erro ao atualizar produto.");
    } finally {
      setLoading(false);
    }
  }

  // ── Salvar estoque de variante existente ─────────────────────────────────

  async function saveVariantStock(variant: VariantRow) {
    setVariants((prev) => prev.map((v) => (v.id === variant.id ? { ...v, _saving: true } : v)));
    await fetch(`/api/products/${id}/variants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variant_id: variant.id, stock_qty: variant.stock_qty, stock_min: variant.stock_min }),
    });
    setVariants((prev) => prev.map((v) => v.id === variant.id ? { ...v, _dirty: false, _saving: false } : v));
  }

  // ── Ativar / Desativar variante ──────────────────────────────────────────

  async function toggleVariantActive(variant: VariantRow) {
    await fetch(`/api/products/${id}/variants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variant_id: variant.id, active: !variant.active }),
    });
    setVariants((prev) => prev.map((v) => (v.id === variant.id ? { ...v, active: !v.active } : v)));
  }

  // ── Excluir variante ─────────────────────────────────────────────────────

  async function deleteVariant(variant: VariantRow) {
    if (!confirm(`Excluir variante ${variant.sku || variant.size}? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/admin/products/${id}/variants/${variant.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Erro ao excluir variante.");
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== variant.id));
  }

  // ── Adicionar novas variantes da grade ──────────────────────────────────

  async function addNewVariants() {
    if (newGrid.length === 0) return;
    if (newGrid.some((c) => !c.sku.trim())) {
      setError("Preencha os SKUs de todas as novas variações.");
      return;
    }
    setLoading(true); setError("");
    try {
      for (const cell of newGrid) {
        await fetch(`/api/products/${id}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ size: cell.sizeName, color: cell.colorName, sku: cell.sku, stock_qty: cell.stock_qty, stock_min: cell.stock_min }),
        });
      }
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      setVariants((data.product_variants ?? []).map((v: ProductVariant) => ({ ...v })));
      setSelectedColorIds([]);
      setSelectedSizeIds([]);
      setNewGrid([]);
      setSuccess(`${newGrid.length} variação(ões) adicionada(s)!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Erro ao adicionar variações.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inputCls = "w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc";
  const labelCls = "block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5";

  if (fetching) {
    return <div className="text-center text-gray-400 py-12">Carregando...</div>;
  }

  const colorGroups      = Array.from(new Set(variants.map((v) => v.color ?? "Sem cor")));
  const sizeHeaders      = Array.from(new Set(variants.map((v) => v.size)));
  const selectedNewColors = allColors.filter((c) => selectedColorIds.includes(c.id));
  const selectedNewSizes  = allSizes.filter((s) => selectedSizeIds.includes(s.id));

  // Agrupar variantOptions por produto
  const productGroups = variantOptions.reduce<Record<string, { name: string; variants: VariantOption[] }>>(
    (acc, opt) => {
      if (!acc[opt.productId]) acc[opt.productId] = { name: opt.productName, variants: [] };
      acc[opt.productId].variants.push(opt);
      return acc;
    },
    {}
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Editar Produto</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/produtos")}>Voltar</Button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSaveProduct} className="space-y-6 max-w-4xl">

        {/* Informações Básicas */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-serif text-lg font-medium text-kc-dark">Informações Básicas</h2>

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
              <label className={labelCls}>Nome *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug (URL) *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                  required
                  className={`${inputCls} font-mono`}
                />
                <button
                  type="button"
                  title="Gerar do nome"
                  onClick={() => { setSlug(slugify(name)); setSlugEdited(false); }}
                  className="shrink-0 px-2.5 border border-gray-200 rounded text-gray-400 hover:text-kc hover:border-kc transition-colors"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
              <p className="text-[9px] text-gray-400 mt-0.5">
                {slugify(name) !== slug && name
                  ? <span className="text-amber-500">Slug diferente do nome atual</span>
                  : "Gerado automaticamente do nome"}
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Preço (R$) *</label>
              <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preço Original</label>
              <input type="number" step="0.01" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preço de Custo</label>
              <input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="180.00" className={inputCls} />
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
            <div>
              <label className={labelCls}>SKU Base</label>
              <input type="text" value={skuBase} onChange={(e) => setSkuBase(e.target.value.toUpperCase())} className={`${inputCls} font-mono`} />
            </div>
          )}

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-kc" />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-4 h-4 accent-kc" />
              Destaque
            </label>
          </div>
        </div>

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
              JPG, PNG ou WEBP · máx. 4MB por imagem · use JPG 80% para melhores resultados.
              A primeira imagem é a capa principal.
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
          <h2 className="font-serif text-lg font-medium text-kc-dark mb-3">Dimensões para Frete</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className={labelCls}>Peso (g)</label><input type="number" min="0" value={weightG} onChange={(e) => setWeightG(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Comprimento (cm)</label><input type="number" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Largura (cm)</label><input type="number" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Altura (cm)</label><input type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inputCls} /></div>
          </div>
        </div>

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
              <p className="text-sm text-gray-400">Nenhum produto individual com variantes ativas encontrado.</p>
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
                              id={`ve-${opt.variantId}`}
                              checked={isSelected}
                              onChange={() => toggleBundleVariant(opt.variantId)}
                              className="w-4 h-4 accent-kc shrink-0"
                            />
                            <label htmlFor={`ve-${opt.variantId}`} className="flex-1 cursor-pointer">
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

        <Button type="submit" loading={loading}>
          <Save size={14} className="mr-1.5" />
          Salvar Produto
        </Button>
      </form>

      {/* ── Variantes Existentes — apenas para individual ── */}
      {productType === "individual" && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6 max-w-4xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-lg font-medium text-kc-dark">Variações Existentes</h2>
              <span className="text-xs text-gray-400">
                {variants.filter((v) => v.active).reduce((s, v) => s + v.stock_qty, 0)} un. em estoque
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-5">Edite o estoque e salve individualmente. Desative variações sem estoque que não serão mais vendidas.</p>

            {variants.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma variação ainda. Use a grade abaixo para adicionar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left text-[11px] tracking-wider text-gray-500 uppercase">Cor</th>
                      {sizeHeaders.map((s) => (
                        <th key={s} className="border border-gray-200 px-3 py-2 text-center text-[11px] tracking-wider text-gray-500 uppercase min-w-[120px]">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colorGroups.map((colorName) => (
                      <tr key={colorName}>
                        <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 text-xs">{colorName}</td>
                        {sizeHeaders.map((sizeName) => {
                          const v = variants.find((x) => (x.color ?? "Sem cor") === colorName && x.size === sizeName);
                          if (!v) return <td key={sizeName} className="border border-gray-100 bg-gray-50" />;
                          return (
                            <td key={sizeName} className={cn("border border-gray-200 p-2", !v.active && "opacity-50 bg-gray-50")}>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-mono text-gray-400 truncate">{v.sku}</p>
                                <div className="flex gap-1">
                                  <input type="number" min="0" value={v.stock_qty} disabled={!v.active}
                                    onChange={(e) => setVariants((prev) => prev.map((x) => x.id === v.id ? { ...x, stock_qty: parseInt(e.target.value) || 0, _dirty: true } : x))}
                                    title="Estoque"
                                    className="w-1/2 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-kc disabled:bg-gray-100" />
                                  <input type="number" min="0" value={v.stock_min} disabled={!v.active}
                                    onChange={(e) => setVariants((prev) => prev.map((x) => x.id === v.id ? { ...x, stock_min: parseInt(e.target.value) || 0, _dirty: true } : x))}
                                    title="Mínimo"
                                    className="w-1/2 border border-gray-100 rounded px-2 py-1 text-xs bg-gray-50 focus:outline-none focus:border-kc disabled:bg-gray-100" />
                                </div>
                                <div className="flex gap-1">
                                  {v._dirty && (
                                    <button type="button" onClick={() => saveVariantStock(v)} disabled={v._saving}
                                      className="flex-1 text-[10px] bg-kc text-white rounded py-0.5 hover:bg-kc-dark transition-colors disabled:opacity-50">
                                      {v._saving ? "..." : "Salvar"}
                                    </button>
                                  )}
                                  <button type="button" onClick={() => toggleVariantActive(v)}
                                    className={cn("flex-1 text-[10px] rounded py-0.5 border transition-colors",
                                      v.active ? "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500" : "border-green-200 text-green-600 hover:bg-green-50"
                                    )}>
                                    {v.active ? "Desativar" : "Ativar"}
                                  </button>
                                  <button type="button" onClick={() => deleteVariant(v)}
                                    title="Excluir variante"
                                    className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
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
          </div>

          {/* ── Adicionar Novas Variações ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6 max-w-4xl">
            <h2 className="font-serif text-lg font-medium text-kc-dark mb-1">Adicionar Novas Variações</h2>
            <p className="text-xs text-gray-400 mb-5">Selecione combinações que ainda não existem no produto.</p>

            <div className="grid grid-cols-2 gap-6 mb-5">
              <div>
                <label className={labelCls}>Cores</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allColors.map((color) => {
                    const sel = selectedColorIds.includes(color.id);
                    return (
                      <button key={color.id} type="button" onClick={() => toggleColor(color.id)}
                        className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs transition-colors",
                          sel ? "border-kc bg-kc/5 text-kc-dark font-medium" : "border-gray-200 text-gray-600 hover:border-kc/50"
                        )}>
                        <span className="w-3 h-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: color.hex_code }} />
                        {color.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Tamanhos</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allSizes.map((size) => {
                    const sel = selectedSizeIds.includes(size.id);
                    return (
                      <button key={size.id} type="button" onClick={() => toggleSize(size.id)}
                        className={cn("w-10 h-10 border text-xs font-medium transition-colors rounded",
                          sel ? "border-kc bg-kc text-white" : "border-gray-200 text-gray-700 hover:border-kc"
                        )}>
                        {size.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {newGrid.length > 0 && (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-3 py-2 text-left text-[11px] tracking-wider text-gray-500 uppercase">Cor \ Tamanho</th>
                        {selectedNewSizes.map((s) => (
                          <th key={s.id} className="border border-gray-200 px-3 py-2 text-center text-[11px] tracking-wider text-gray-500 uppercase min-w-[140px]">{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNewColors.map((color) => (
                        <tr key={color.id}>
                          <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: color.hex_code }} />
                              {color.name}
                            </div>
                          </td>
                          {selectedNewSizes.map((size) => {
                            const cell = newGrid.find((c) => c.colorId === color.id && c.sizeId === size.id);
                            if (!cell) {
                              return (
                                <td key={size.id} className="border border-gray-100 bg-green-50 text-center">
                                  <span className="text-[10px] text-green-600">Já existe</span>
                                </td>
                              );
                            }
                            return (
                              <td key={size.id} className="border border-gray-200 p-2">
                                <div className="space-y-1.5">
                                  <input type="text" value={cell.sku}
                                    onChange={(e) => updateNewCell(color.id, size.id, "sku", e.target.value.toUpperCase())}
                                    placeholder="SKU"
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-kc" />
                                  <div className="flex gap-1">
                                    <input type="number" min="0" value={cell.stock_qty}
                                      onChange={(e) => updateNewCell(color.id, size.id, "stock_qty", parseInt(e.target.value) || 0)}
                                      title="Estoque"
                                      className="w-1/2 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-kc" />
                                    <input type="number" min="0" value={cell.stock_min}
                                      onChange={(e) => updateNewCell(color.id, size.id, "stock_min", parseInt(e.target.value) || 0)}
                                      title="Mínimo"
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
                <Button type="button" size="sm" loading={loading} onClick={addNewVariants}>
                  Adicionar {newGrid.length} variação{newGrid.length !== 1 ? "ões" : ""}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
