"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, AlertTriangle, Package, Search, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyShortLinkButton } from "@/components/admin/CopyShortLinkButton";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product, Category } from "@/types/database";

interface ProductWithCategory extends Product {
  categories: Category | null;
}

export default function ProdutosPage() {
  const [products, setProducts]       = useState<ProductWithCategory[]>([]);
  const [loading, setLoading]         = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toggling, setToggling]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [categorias, setCategorias]   = useState<Category[]>([]);

  const [filtros, setFiltros] = useState({
    busca: '',
    categoria: '',
    status: '',
    codigo: '',
    destaque: '',
    atacado: ''
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busca: '',
    categoria: '',
    status: '',
    codigo: '',
    destaque: '',
    atacado: ''
  });
  // Toggle de atacado na linha: produto em gravação e confirmação "Atualizado"
  const [togglingAtacado, setTogglingAtacado] = useState<string | null>(null);
  const [atacadoOk, setAtacadoOk] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategorias(data ?? []));
  }, []);

  async function fetchProducts() {
    setLoading(true);
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

  // Liga/desliga a peça na área de atacado (não afeta o varejo)
  async function handleToggleAtacado(product: ProductWithCategory) {
    const enabled = product.atacado_enabled === false;
    setTogglingAtacado(product.id);
    setAtacadoOk(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atacado_enabled: enabled }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => p.id === product.id ? { ...p, atacado_enabled: enabled } : p)
        );
        setAtacadoOk(product.id);
        setTimeout(() => setAtacadoOk((cur) => (cur === product.id ? null : cur)), 2500);
      }
    } finally {
      setTogglingAtacado(null);
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

  const temFiltrosAtivos =
    filtrosAplicados.busca !== '' ||
    filtrosAplicados.categoria !== '' ||
    filtrosAplicados.status !== '' ||
    filtrosAplicados.codigo !== '' ||
    filtrosAplicados.destaque !== '' ||
    filtrosAplicados.atacado !== '';

  async function aplicarFiltros() {
    setFiltrosAplicados({ ...filtros });
    setHasSearched(true);
    await fetchProducts();
  }

  function limparFiltros() {
    const vazio = { busca: '', categoria: '', status: '', codigo: '', destaque: '', atacado: '' };
    setFiltros(vazio);
    setFiltrosAplicados(vazio);
    setHasSearched(false);
    setProducts([]);
  }

  const produtosFiltrados = products.filter(produto => {
    if (filtrosAplicados.busca) {
      const busca = filtrosAplicados.busca.toLowerCase();
      const nomeMatch = produto.name?.toLowerCase().includes(busca);
      const descMatch = produto.description?.toLowerCase().includes(busca);
      if (!nomeMatch && !descMatch) return false;
    }

    if (filtrosAplicados.categoria) {
      if (produto.categories?.slug !== filtrosAplicados.categoria)
        return false;
    }

    if (filtrosAplicados.status === 'ativo' && !produto.active)
      return false;
    if (filtrosAplicados.status === 'inativo' && produto.active)
      return false;

    if (filtrosAplicados.codigo) {
      const cod = filtrosAplicados.codigo.toLowerCase();
      if (!produto.sku_base?.toLowerCase().includes(cod))
        return false;
    }

    if (filtrosAplicados.destaque === 'sim' && !produto.featured)
      return false;
    if (filtrosAplicados.destaque === 'nao' && produto.featured)
      return false;

    // Atacado: ausente conta como ativado, igual ao default do banco
    if (filtrosAplicados.atacado === 'ativado' && produto.atacado_enabled === false)
      return false;
    if (filtrosAplicados.atacado === 'desativado' && produto.atacado_enabled !== false)
      return false;

    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">
          Produtos
        </h1>
        <Link prefetch={false} href="/admin/produtos/novo">
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

      {/* Alerts — só exibe após busca */}
      {hasSearched && products.filter((p) => !hasDimensions(p) && p.active).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <span className="text-sm text-amber-700">
            {products.filter((p) => !hasDimensions(p) && p.active).length}{" "}
            produto(s) ativo(s) sem dimensoes para calculo de frete.
          </span>
        </div>
      )}

      {/* Filtros */}
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

          {/* Nome / Descrição */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              NOME / DESCRIÇÃO
            </label>
            <input
              type="text"
              placeholder="Ex: conjunto linho..."
              value={filtros.busca}
              onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
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

          {/* Categoria */}
          <div>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              CATEGORIA
            </label>
            <select
              value={filtros.categoria}
              onChange={e => setFiltros(f => ({ ...f, categoria: e.target.value }))}
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
              <option value="">Todas</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              STATUS
            </label>
            <select
              value={filtros.status}
              onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}
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
              <option value="">Todos</option>
              <option value="ativo">✅ Ativo</option>
              <option value="inativo">❌ Inativo</option>
            </select>
          </div>

          {/* Destaque */}
          <div>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              DESTAQUE
            </label>
            <select
              value={filtros.destaque}
              onChange={e => setFiltros(f => ({ ...f, destaque: e.target.value }))}
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
              <option value="">Todos</option>
              <option value="sim">⭐ Sim</option>
              <option value="nao">— Não</option>
            </select>
          </div>

          {/* Atacado */}
          <div>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              ATACADO
            </label>
            <select
              value={filtros.atacado}
              onChange={e => setFiltros(f => ({ ...f, atacado: e.target.value }))}
              aria-label="Filtrar por atacado"
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
              <option value="">Todos</option>
              <option value="ativado">Ativados</option>
              <option value="desativado">Desativados</option>
            </select>
          </div>

          {/* Código / Referência */}
          <div>
            <label style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#5C3317',
              display: 'block',
              marginBottom: 4
            }}>
              CÓDIGO / REF.
            </label>
            <input
              type="text"
              placeholder="Ex: FS12, CON-0001"
              value={filtros.codigo}
              onChange={e => setFiltros(f => ({ ...f, codigo: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
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

          {/* Botões */}
          <div style={{ display: 'flex', gap: 8, alignSelf: 'end' }}>
            <button
              onClick={aplicarFiltros}
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

            {(hasSearched || temFiltrosAtivos) && (
              <button
                onClick={limparFiltros}
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

        {/* Contador de resultados */}
        {hasSearched && !loading && (
          <p style={{
            fontSize: 11,
            color: '#B89070',
            marginTop: 10,
            marginBottom: 0
          }}>
            {produtosFiltrados.length} produto(s) encontrado(s)
          </p>
        )}
      </div>

      {/* Conteúdo */}
      {!hasSearched ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Use os filtros acima para buscar produtos.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum produto encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full">
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
                  Atacado
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
              {produtosFiltrados.map((product) => (
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
                      {product.erp_sync_enabled === false && (
                        <span
                          className="ml-2 inline-flex items-center gap-0.5 text-[9px] tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase"
                          title="Estoque independente do ERP — gerenciado manualmente"
                        >
                          <Unlink size={9} />
                          Fornecedor
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
                    {(() => {
                      const on = product.atacado_enabled !== false;
                      const busy = togglingAtacado === product.id;
                      return (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            aria-label={`Atacado: ${product.name}`}
                            title={on ? "Aparece no catálogo de atacado — clique para desativar" : "Não aparece no catálogo de atacado — clique para ativar"}
                            onClick={() => handleToggleAtacado(product)}
                            disabled={busy}
                            className={cn(
                              "relative w-9 h-5 rounded-full transition-colors",
                              on ? "bg-[#A0622A]" : "bg-gray-200",
                              busy && "opacity-50 cursor-wait"
                            )}
                          >
                            <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform", on && "translate-x-4")} />
                          </button>
                          {atacadoOk === product.id && (
                            <span className="text-[9px] text-green-600">Atualizado</span>
                          )}
                        </div>
                      );
                    })()}
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
                      {product.sku_base && <CopyShortLinkButton skuBase={product.sku_base} />}
                      <Link prefetch={false} href={`/admin/produtos/${product.id}`}>
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
          </div>{/* /overflow-x-auto */}
        </div>
      )}
    </div>
  );
}
