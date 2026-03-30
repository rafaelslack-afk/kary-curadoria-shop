"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product, Category } from "@/types/database";

interface ProductWithCategory extends Product {
  categories: Category | null;
}

export default function ProdutosPage() {
  const [products, setProducts]       = useState<ProductWithCategory[]>([]);
  const [loading, setLoading]         = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const [toggling, setToggling]       = useState<string | null>(null); // id do produto em loading

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(product: ProductWithCategory) {
    setToggling(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => p.id === product.id ? { ...p, active: !p.active } : p)
        );
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(product: ProductWithCategory) {
    if (!confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleteError("");
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      const d = await res.json();
      setDeleteError(d.error ?? "Erro ao excluir produto.");
    }
  }

  function hasDimensions(product: Product): boolean {
    return !!(
      product.weight_g &&
      product.length_cm &&
      product.width_cm &&
      product.height_cm
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">
          Produtos
        </h1>
        <Link href="/admin/produtos/novo">
          <Button size="sm">
            <Plus size={14} className="mr-1.5" />
            Novo Produto
          </Button>
        </Link>
      </div>

      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-2">
          <span className="text-sm text-red-700">{deleteError}</span>
          <button onClick={() => setDeleteError("")} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Alerts */}
      {products.filter((p) => !hasDimensions(p) && p.active).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <span className="text-sm text-amber-700">
            {products.filter((p) => !hasDimensions(p) && p.active).length}{" "}
            produto(s) ativo(s) sem dimensoes para calculo de frete.
          </span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Nenhum produto cadastrado ainda.</p>
          <Link href="/admin/produtos/novo">
            <Button size="sm">
              <Plus size={14} className="mr-1.5" />
              Criar Primeiro Produto
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Produto
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Categoria
                </th>
                <th className="text-right text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Preco
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Status
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Frete
                </th>
                <th className="text-right text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-sm text-gray-900">
                        {product.name}
                      </span>
                      {product.featured && (
                        <span className="ml-2 text-[9px] tracking-wider bg-kc/10 text-kc px-1.5 py-0.5 rounded uppercase">
                          Destaque
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        SKU: {product.sku_base || "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {product.categories?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.original_price && (
                      <span className="text-xs text-gray-400 line-through mr-1">
                        {formatCurrency(product.original_price)}
                      </span>
                    )}
                    <span className="text-sm font-medium text-kc">
                      {formatCurrency(product.price)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(product)}
                      disabled={toggling === product.id}
                      title={product.active ? "Clique para desativar" : "Clique para ativar"}
                      className={cn(
                        "inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full transition-opacity cursor-pointer",
                        toggling === product.id && "opacity-50 cursor-wait",
                        product.active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {toggling === product.id ? "..." : product.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasDimensions(product) ? (
                      <span className="text-green-500 text-xs">OK</span>
                    ) : (
                      <span className="text-amber-500 text-xs flex items-center justify-center gap-1">
                        <AlertTriangle size={12} />
                        Sem dim.
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/produtos/${product.id}`}>
                        <button className="p-1.5 text-gray-400 hover:text-kc transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
