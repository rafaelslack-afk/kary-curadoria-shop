"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Warehouse, Search } from "lucide-react";
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
  const [items, setItems]             = useState<VariantStock[]>([]);
  const [loading, setLoading]         = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filter, setFilter]           = useState<FilterMode>("all");
  const [search, setSearch]           = useState("");

  async function fetchStock() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock?searched=1");
      if (res.ok) setItems(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function buscar() {
    setHasSearched(true);
    await fetchStock();
  }

  function limpar() {
    setSearch("");
    setFilter("all");
    setHasSearched(false);
    setItems([]);
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
  const zeroCount  = items.filter((i) => i.active && i.stock_qty === 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Estoque</h1>
      </div>

      {/* Barra de busca e filtros */}
      <div style={{
        background: '#F5F1EA',
        borderRadius: 10,
        padding: '16px',
        marginBottom: 20,
        border: '1px solid #EDE8DC'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          alignItems: 'end'
        }}>

          {/* Busca por produto / SKU */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              PRODUTO / SKU
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Buscar por produto, SKU, cor, tamanho..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #B89070',
                borderRadius: 6,
                fontSize: 13,
                color: '#5C3317',
                background: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Situação do estoque */}
          <div>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              SITUAÇÃO
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterMode)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #B89070',
                borderRadius: 6,
                fontSize: 13,
                color: '#5C3317',
                background: 'white',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">Todos</option>
              <option value="alert">⚠️ Alerta de mínimo</option>
              <option value="zero">❌ Zerado</option>
            </select>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 8, alignSelf: 'end' }}>
            <button
              onClick={buscar}
              style={{
                padding: '8px 20px',
                background: '#A0622A',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🔍 BUSCAR
            </button>

            {hasSearched && (
              <button
                onClick={limpar}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#B89070',
                  border: '1px solid #B89070',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                ✕ Limpar
              </button>
            )}
          </div>
        </div>

        {/* Contador */}
        {hasSearched && !loading && (
          <p style={{
            fontSize: 11,
            color: '#B89070',
            marginTop: 10,
            marginBottom: 0
          }}>
            {filtered.length} variação(ões) encontrada(s)
          </p>
        )}
      </div>

      {/* Alertas — só após busca */}
      {hasSearched && (alertCount > 0 || zeroCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span className="text-sm text-amber-700">
            {zeroCount > 0 && `${zeroCount} variação(ões) sem estoque. `}
            {alertCount > 0 && `${alertCount} variação(ões) abaixo do mínimo.`}
          </span>
        </div>
      )}

      {/* Conteúdo */}
      {!hasSearched ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Warehouse size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Selecione um produto ou situação e clique em Buscar para visualizar o estoque.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum resultado para os filtros aplicados.</p>
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
                const isZero  = item.stock_qty === 0;
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
