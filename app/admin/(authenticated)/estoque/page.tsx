"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariantStock {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  color: string | null;
  stock_qty: number;
  stock_min: number;
  active: boolean;
  product_name: string;
}

type FilterMode = "all" | "alert" | "zero";

export default function EstoquePage() {
  const [items, setItems] = useState<VariantStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStock();
  }, []);

  async function fetchStock() {
    try {
      const res = await fetch("/api/admin/stock");
      if (res.ok) setItems(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const filtered = items
    .filter((i) => i.active)
    .filter((i) => {
      if (filter === "alert") return i.stock_qty <= i.stock_min;
      if (filter === "zero") return i.stock_qty === 0;
      return true;
    })
    .filter((i) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        i.product_name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.size.toLowerCase().includes(q) ||
        (i.color ?? "").toLowerCase().includes(q)
      );
    });

  const alertCount = items.filter((i) => i.active && i.stock_qty <= i.stock_min && i.stock_qty > 0).length;
  const zeroCount = items.filter((i) => i.active && i.stock_qty === 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Estoque</h1>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: "all", label: "Todos" },
            { key: "alert", label: `Alerta (${alertCount})` },
            { key: "zero", label: `Zerado (${zeroCount})` },
          ] as { key: FilterMode; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-colors",
                filter === key
                  ? "bg-white text-kc-dark shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por produto, SKU, cor, tamanho..."
          className="flex-1 min-w-48 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-kc"
        />
      </div>

      {/* Alertas */}
      {(alertCount > 0 || zeroCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span className="text-sm text-amber-700">
            {zeroCount > 0 && `${zeroCount} variação(ões) sem estoque. `}
            {alertCount > 0 && `${alertCount} variação(ões) abaixo do mínimo.`}
          </span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Warehouse size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {search || filter !== "all" ? "Nenhum resultado para os filtros aplicados." : "Nenhuma variação cadastrada."}
          </p>
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
                  Cor
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Tamanho
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  SKU
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Estoque
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Mínimo
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isZero = item.stock_qty === 0;
                const isAlert = !isZero && item.stock_qty <= item.stock_min;
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/produtos/${item.product_id}`}
                        className="text-sm text-kc hover:underline font-medium"
                      >
                        {item.product_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.color ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block border border-gray-200 rounded text-xs font-medium text-gray-700 px-2 py-0.5">
                        {item.size}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.sku}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-block font-semibold text-sm",
                          isZero ? "text-red-600" : isAlert ? "text-amber-600" : "text-gray-800"
                        )}
                      >
                        {item.stock_qty}
                        {isZero && (
                          <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded uppercase tracking-wide">
                            Zero
                          </span>
                        )}
                        {isAlert && (
                          <AlertTriangle size={12} className="inline ml-1 text-amber-500" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-400">{item.stock_min}</td>
                    <td className="px-4 py-3 text-center">
                      {isZero ? (
                        <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          Sem estoque
                        </span>
                      ) : isAlert ? (
                        <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                          Baixo
                        </span>
                      ) : (
                        <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-right">
            {filtered.length} variação{filtered.length !== 1 ? "ões" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
