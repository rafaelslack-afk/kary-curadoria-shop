"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Copy, MessageCircle, Plus, Printer, Save, Search, Trash2 } from "lucide-react";
import { STATUS_ATACADO } from "@/lib/atacado/status";
import { FORMAS_PAGAMENTO, type FormaPagamentoAtacado } from "@/lib/atacado/pricing";
import { mascaraDocumento } from "@/lib/atacado/documento";
import { romaneioUrl } from "@/lib/atacado/whatsapp";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Item {
  key: string; // id local (itens novos ainda não têm id no banco)
  product_id: string | null;
  variant_id: string | null;
  sku: string | null;
  reference: string | null;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  price_overridden: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: FormaPagamentoAtacado;
  customer_name: string;
  store_name: string | null;
  document: string;
  email: string;
  phone: string;
  address_json: { cep: string; logradouro: string; numero: string; complemento?: string; bairro: string; cidade: string; uf: string };
  notes: string | null;
  shipping_cost: number | null;
  romaneio_token: string;
  created_at: string;
}

type Sugestoes = Record<string, { pix: number; credit_card: number }>;

interface SearchProduct {
  id: string;
  name: string;
  reference: string | null;
  variants: { id: string; color: string; size: string; sku: string | null; suggested: { pix: number; credit_card: number } }[];
}

const input = "w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white";
const label = "block text-[11px] uppercase tracking-wide text-gray-500 mb-1";

let localKey = 0;
const nextKey = () => `novo-${++localKey}`;

export default function AtacadoPedidoAdminPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [sugestoes, setSugestoes] = useState<Sugestoes>({});
  const [shipping, setShipping] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Adicionar item
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<SearchProduct[]>([]);
  const [produtoSel, setProdutoSel] = useState<SearchProduct | null>(null);
  const [varianteSel, setVarianteSel] = useState("");
  const [qtdNova, setQtdNova] = useState(1);

  const applyLoaded = useCallback((data: { order: Order & { items: (Omit<Item, "key"> & { id: string })[]; shipping_cost: number | null }; sugestoes?: Sugestoes }) => {
    const { items: its, ...o } = data.order;
    setOrder(o);
    setItems(its.map((it) => ({ ...it, key: it.id })));
    setShipping(o.shipping_cost == null ? "" : String(o.shipping_cost));
    if (data.sugestoes) setSugestoes(data.sugestoes);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/pedidos/${params.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar.");
      applyLoaded(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id, applyLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  const itemsTotal = useMemo(
    () => Math.round(items.reduce((s, it) => s + it.unit_price * it.quantity, 0) * 100) / 100,
    [items]
  );
  const pieces = items.reduce((n, it) => n + it.quantity, 0);
  const shippingNum = shipping.trim() === "" ? 0 : Number(shipping.replace(",", ".")) || 0;
  const total = Math.round((itemsTotal + shippingNum) * 100) / 100;

  function patchOrder(p: Partial<Order>) {
    setOrder((o) => (o ? { ...o, ...p } : o));
  }
  function patchAddress(p: Partial<Order["address_json"]>) {
    setOrder((o) => (o ? { ...o, address_json: { ...o.address_json, ...p } } : o));
  }
  function patchItem(key: string, p: Partial<Item>) {
    setItems((its) => its.map((it) => (it.key === key ? { ...it, ...p } : it)));
  }

  function suggestedFor(it: Item, forma: FormaPagamentoAtacado): number | null {
    return it.variant_id && sugestoes[it.variant_id] ? sugestoes[it.variant_id][forma] : null;
  }

  // Trocar a forma de pagamento recalcula os preços sugeridos; preços editados
  // à mão só são sobrescritos se o admin confirmar.
  function changePayment(forma: FormaPagamentoAtacado) {
    if (!order || forma === order.payment_method) return;
    const temEditados = items.some((it) => it.price_overridden);
    const sobrescrever =
      temEditados &&
      window.confirm(
        "Alguns preços foram editados à mão. Sobrescrever também esses preços com o preço sugerido da nova forma de pagamento?\n\nOK = sobrescrever todos · Cancelar = manter os editados"
      );
    setItems((its) =>
      its.map((it) => {
        if (it.price_overridden && !sobrescrever) return it;
        const s = suggestedFor(it, forma);
        return s === null ? it : { ...it, unit_price: s, price_overridden: false };
      })
    );
    patchOrder({ payment_method: forma });
  }

  async function buscarProdutos() {
    if (busca.trim().length < 2) return;
    const res = await fetch(`/api/admin/atacado/produtos?q=${encodeURIComponent(busca.trim())}`, { cache: "no-store" });
    const data = await res.json();
    setResultados(data.products ?? []);
    setProdutoSel(null);
    setVarianteSel("");
  }

  function adicionarItem() {
    if (!order || !produtoSel) return;
    const v = produtoSel.variants.find((x) => x.id === varianteSel);
    if (!v || qtdNova < 1) return;
    setSugestoes((s) => ({ ...s, [v.id]: v.suggested }));
    const existente = items.find((it) => it.variant_id === v.id);
    if (existente) {
      patchItem(existente.key, { quantity: existente.quantity + qtdNova });
    } else {
      setItems((its) => [
        ...its,
        {
          key: nextKey(),
          product_id: produtoSel.id,
          variant_id: v.id,
          sku: v.sku,
          reference: produtoSel.reference,
          product_name: produtoSel.name,
          color: v.color,
          size: v.size,
          quantity: qtdNova,
          unit_price: v.suggested[order.payment_method],
          price_overridden: false,
        },
      ]);
    }
    setQtdNova(1);
    setVarianteSel("");
  }

  async function salvar() {
    if (!order) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/atacado/pedidos/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...order,
          shipping_cost: shipping.trim() === "" ? null : Number(shipping.replace(",", ".")),
          items: items.map((it) => {
            const rest: Partial<Item> = { ...it };
            delete rest.key; // id local, não vai para o servidor
            return rest;
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
      applyLoaded(data);
      setMsg("Pedido salvo.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Carregando…</p>;
  if (!order) return <p className="text-sm text-red-700">{error || "Pedido não encontrado."}</p>;

  const link = romaneioUrl(order.romaneio_token);
  const phoneDigits = order.phone.replace(/\D/g, "");
  const whatsCliente = `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}`;
  const a = order.address_json;

  return (
    <div className="max-w-5xl">
      <Link href="/admin/atacado" prefetch={false} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-kc-dark mb-4">
        <ChevronLeft size={16} /> Pedidos de atacado
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-medium text-kc-dark">{order.order_number}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm border border-gray-200 bg-white rounded-md px-3 py-2 hover:bg-gray-50">
            <Printer size={15} /> Imprimir romaneio
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(link).then(() => setMsg("Link do romaneio copiado."))}
            className="inline-flex items-center gap-1.5 text-sm border border-gray-200 bg-white rounded-md px-3 py-2 hover:bg-gray-50"
          >
            <Copy size={15} /> Copiar link do romaneio
          </button>
          <a href={whatsCliente} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-white rounded-md px-3 py-2" style={{ backgroundColor: "#25D366" }}>
            <MessageCircle size={15} /> WhatsApp da cliente
          </a>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg mb-4">{msg}</div>}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className={label}>Status</label>
          <select className={input} value={order.status} onChange={(e) => patchOrder({ status: e.target.value })}>
            {STATUS_ATACADO.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Forma de pagamento</label>
          <select className={input} value={order.payment_method} onChange={(e) => changePayment(e.target.value as FormaPagamentoAtacado)}>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Frete (R$)</label>
          <input className={input} inputMode="decimal" placeholder="a calcular" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Produto</th>
              <th className="text-left px-3 py-2 font-medium">Cor</th>
              <th className="text-left px-3 py-2 font-medium">Tam.</th>
              <th className="text-right px-3 py-2 font-medium">Qtd.</th>
              <th className="text-right px-3 py-2 font-medium">Unitário</th>
              <th className="text-right px-3 py-2 font-medium">Subtotal</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it) => {
              const sug = suggestedFor(it, order.payment_method);
              return (
                <tr key={it.key}>
                  <td className="px-3 py-2">
                    <p className="text-kc-dark">{it.product_name}</p>
                    {it.reference && <p className="text-[11px] text-gray-500">{it.reference}</p>}
                  </td>
                  <td className="px-3 py-2">{it.color}</td>
                  <td className="px-3 py-2">{it.size}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => patchItem(it.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                      className="w-16 border border-gray-200 rounded px-2 py-1 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.unit_price}
                      onChange={(e) => patchItem(it.key, { unit_price: Math.max(0, Number(e.target.value) || 0), price_overridden: true })}
                      className="w-24 border border-gray-200 rounded px-2 py-1 text-right"
                    />
                    {it.price_overridden && sug !== null && (
                      <p className="text-[10px] text-amber-700 mt-0.5">sugerido {formatCurrency(sug)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(it.unit_price * it.quantity)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setItems((its) => its.filter((x) => x.key !== it.key))}
                      aria-label="Remover item"
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Adicionar item */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className={`${input} pl-8`}
                placeholder="Adicionar item: buscar produto por nome ou referência"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscarProdutos())}
              />
            </div>
            <button type="button" onClick={buscarProdutos} className="text-sm border border-gray-200 rounded-md px-3 hover:bg-gray-50">
              Buscar
            </button>
          </div>
          {resultados.length > 0 && !produtoSel && (
            <ul className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setProdutoSel(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    {p.name} {p.reference && <span className="text-gray-500">· {p.reference}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {produtoSel && (
            <div className="flex flex-wrap items-end gap-2">
              <p className="text-sm text-kc-dark w-full">{produtoSel.name}</p>
              <select className={`${input} w-auto flex-1`} value={varianteSel} onChange={(e) => setVarianteSel(e.target.value)}>
                <option value="">Cor e tamanho…</option>
                {produtoSel.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.color} · {v.size} — {formatCurrency(v.suggested[order.payment_method])}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={qtdNova}
                onChange={(e) => setQtdNova(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="w-20 border border-gray-200 rounded-md px-2 py-2 text-sm"
                aria-label="Quantidade"
              />
              <button
                type="button"
                onClick={adicionarItem}
                disabled={!varianteSel}
                className="inline-flex items-center gap-1 text-sm bg-kc-dark text-white rounded-md px-3 py-2 disabled:opacity-40"
              >
                <Plus size={15} /> Adicionar
              </button>
              <button type="button" onClick={() => setProdutoSel(null)} className="text-sm text-gray-500 px-2 py-2">
                Trocar produto
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-3 text-sm space-y-1 max-w-xs ml-auto">
          <div className="flex justify-between"><span className="text-gray-500">Peças</span><span>{pieces}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Total sem frete</span><span>{formatCurrency(itemsTotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Frete</span><span>{shipping.trim() === "" ? "a calcular" : formatCurrency(shippingNum)}</span></div>
          <div className="flex justify-between font-semibold border-t border-gray-100 pt-1"><span>Total geral</span><span>{formatCurrency(total)}</span></div>
        </div>
      </div>

      {/* Dados da cliente */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <p className="text-sm font-medium text-kc-dark mb-3">Dados da cliente</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className={label}>Nome</label><input className={input} value={order.customer_name} onChange={(e) => patchOrder({ customer_name: e.target.value })} /></div>
          <div><label className={label}>Loja / razão social</label><input className={input} value={order.store_name ?? ""} onChange={(e) => patchOrder({ store_name: e.target.value })} /></div>
          <div><label className={label}>CPF/CNPJ</label><input className={input} value={mascaraDocumento(order.document)} onChange={(e) => patchOrder({ document: e.target.value.replace(/\D/g, "") })} /></div>
          <div><label className={label}>E-mail</label><input className={input} value={order.email} onChange={(e) => patchOrder({ email: e.target.value })} /></div>
          <div><label className={label}>Telefone</label><input className={input} value={order.phone} onChange={(e) => patchOrder({ phone: e.target.value })} /></div>
          <div><label className={label}>CEP</label><input className={input} value={a.cep} onChange={(e) => patchAddress({ cep: e.target.value })} /></div>
          <div className="md:col-span-2"><label className={label}>Endereço</label><input className={input} value={a.logradouro} onChange={(e) => patchAddress({ logradouro: e.target.value })} /></div>
          <div><label className={label}>Número</label><input className={input} value={a.numero} onChange={(e) => patchAddress({ numero: e.target.value })} /></div>
          <div><label className={label}>Complemento</label><input className={input} value={a.complemento ?? ""} onChange={(e) => patchAddress({ complemento: e.target.value })} /></div>
          <div><label className={label}>Bairro</label><input className={input} value={a.bairro} onChange={(e) => patchAddress({ bairro: e.target.value })} /></div>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <div><label className={label}>Cidade</label><input className={input} value={a.cidade} onChange={(e) => patchAddress({ cidade: e.target.value })} /></div>
            <div><label className={label}>UF</label><input className={input} maxLength={2} value={a.uf} onChange={(e) => patchAddress({ uf: e.target.value.toUpperCase() })} /></div>
          </div>
          <div className="md:col-span-2"><label className={label}>Observações</label><textarea className={input} rows={3} value={order.notes ?? ""} onChange={(e) => patchOrder({ notes: e.target.value })} /></div>
        </div>
      </div>

      <div className="flex justify-end sticky bottom-4">
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-kc text-white rounded-md px-5 py-2.5 text-sm shadow-md hover:bg-kc-dark disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Salvando…" : "Salvar pedido"}
        </button>
      </div>
    </div>
  );
}
