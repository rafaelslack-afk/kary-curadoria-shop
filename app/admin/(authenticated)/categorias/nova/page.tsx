"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types/database";

export default function NovaCategoriaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [prefix, setPrefix] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    fetch("/api/categories?active=true")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          parent_id: parentId || null,
          prefix: prefix.toUpperCase().trim() || null,
          active,
        }),
      });

      if (res.ok) {
        router.push("/admin/categorias");
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao criar categoria.");
      }
    } catch {
      setError("Erro ao criar categoria.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium text-kc-dark mb-6">
        Nova Categoria
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-gray-200 p-6 max-w-xl space-y-5"
      >
        {/* Nome */}
        <div>
          <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
            Nome da Categoria *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex: Conjuntos de Linho"
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc transition-colors"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
            Slug (URL) *
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            required
            placeholder="conjuntos-de-linho"
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-kc transition-colors"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            URL: /produtos?categoria={slug || "..."}
          </p>
        </div>

        {/* Prefixo SKU */}
        <div>
          <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
            Prefixo SKU (opcional)
          </label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
            placeholder="Ex: LIN, ALF, VES"
            maxLength={5}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-kc transition-colors"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Usado para gerar códigos: {prefix || "LIN"}-0001, {prefix || "LIN"}-0002...
          </p>
        </div>

        {/* Categoria Pai */}
        <div>
          <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
            Categoria Pai (opcional)
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc transition-colors"
          >
            <option value="">Nenhuma (categoria raiz)</option>
            {categories
              .filter((c) => !c.parent_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 accent-kc"
          />
          <label htmlFor="active" className="text-sm text-gray-600">
            Categoria ativa (visivel na loja)
          </label>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading}>
            Criar Categoria
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/categorias")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
