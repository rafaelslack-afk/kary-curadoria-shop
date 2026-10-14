"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MessageCircle, Trash2, Truck } from "lucide-react";
import { useAtacadoConfig, useMounted } from "@/components/atacado/AtacadoProvider";
import { SeletorPagamento, useFormaPagamento } from "@/components/atacado/SeletorPagamento";
import { useAtacadoCart, MAX_QTD_POR_ITEM, type AtacadoCartItem } from "@/lib/atacado/cart-store";
import { precoAtacado } from "@/lib/atacado/pricing";
import { mascaraDocumento, validarDocumento } from "@/lib/atacado/documento";
import { sortSizes } from "@/lib/atacado/types";
import { formatCurrency, cn } from "@/lib/utils";

interface Grupo {
  productId: string;
  slug: string;
  name: string;
  reference: string | null;
  image: string | null;
  items: AtacadoCartItem[];
}

const inputCls =
  "w-full border border-kc-line bg-white rounded-lg px-3 py-2.5 text-sm text-kc-dark placeholder:text-kc-muted focus:outline-none focus:border-kc";
const labelCls = "block text-[11px] tracking-[0.12em] uppercase text-kc-muted mb-1";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export function PedidoAtacado() {
  const mounted = useMounted();
  const { regra, minimoPecas } = useAtacadoConfig();
  const forma = useFormaPagamento();
  const items = useAtacadoCart((s) => s.items);
  const setQuantity = useAtacadoCart((s) => s.setQuantity);
  const removeProduct = useAtacadoCart((s) => s.removeProduct);
  const clear = useAtacadoCart((s) => s.clear);

  const [form, setForm] = useState({
    nome: "",
    documento: "",
    loja: "",
    email: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    observacoes: "",
  });
  const [aceite, setAceite] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState<{ orderNumber: string; whatsappUrl: string } | null>(null);

  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, Grupo>();
    for (const it of items) {
      const g = map.get(it.productId) ?? {
        productId: it.productId,
        slug: it.slug,
        name: it.name,
        reference: it.reference,
        image: it.image,
        items: [],
      };
      g.items.push(it);
      map.set(it.productId, g);
    }
    return Array.from(map.values());
  }, [items]);

  const unit = (it: AtacadoCartItem) => precoAtacado(it.retailPrice, it.size, forma, regra);
  const pieces = items.reduce((n, it) => n + it.quantity, 0);
  const total = Math.round(items.reduce((s, it) => s + unit(it) * it.quantity, 0) * 100) / 100;
  const faltam = Math.max(0, minimoPecas - pieces);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function buscarCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`/api/cep?cep=${d}`);
      if (!res.ok) return;
      const data = await res.json();
      setForm((f) => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        cidade: data.cidade || f.cidade,
        uf: data.estado || f.uf,
      }));
    } finally {
      setCepLoading(false);
    }
  }

  function validar(): string {
    if (form.nome.trim().length < 3) return "Informe o nome completo.";
    if (!validarDocumento(form.documento)) return "CPF ou CNPJ inválido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "E-mail inválido.";
    if (form.telefone.replace(/\D/g, "").length < 10) return "Telefone inválido.";
    if (form.cep.replace(/\D/g, "").length !== 8) return "CEP inválido.";
    if (!form.logradouro.trim() || !form.numero.trim() || !form.bairro.trim() || !form.cidade.trim() || !/^[A-Za-z]{2}$/.test(form.uf.trim())) {
      return "Preencha o endereço completo.";
    }
    if (!aceite) return "É preciso concordar com as condições de compra no atacado.";
    return "";
  }

  async function enviar() {
    setErro("");
    const msg = validar();
    if (msg) return setErro(msg);
    if (faltam > 0) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/atacado/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formaPagamento: forma,
          aceite,
          // Só variante e quantidade: o preço é calculado no servidor
          items: items.map((it) => ({ variantId: it.variantId, quantity: it.quantity })),
          cliente: {
            nome: form.nome,
            documento: form.documento,
            loja: form.loja,
            email: form.email,
            telefone: form.telefone,
            observacoes: form.observacoes,
            endereco: {
              cep: form.cep,
              logradouro: form.logradouro,
              numero: form.numero,
              complemento: form.complemento,
              bairro: form.bairro,
              cidade: form.cidade,
              uf: form.uf,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível enviar o pedido.");
        return;
      }
      setEnviado({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl });
      clear();
      window.scrollTo({ top: 0 });
      // Tenta abrir o WhatsApp direto; se o navegador bloquear, fica o botão
      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-4" strokeWidth={1.5} />
        <p className="text-xs tracking-[0.2em] uppercase text-kc-muted mb-1">Pedido {enviado.orderNumber}</p>
        <h1 className="font-serif text-3xl text-kc-dark mb-3">Pedido enviado!</h1>
        <p className="text-sm text-kc-dark/70 mb-8">
          Envie a mensagem no WhatsApp para a nossa equipe confirmar o pedido e calcular o frete.
        </p>
        <a
          href={enviado.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle size={18} />
          Abrir WhatsApp
        </a>
        <div className="mt-6">
          <Link href="/atacado" prefetch={false} className="text-sm text-kc underline underline-offset-2">
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-kc-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-kc-dark mb-3">Seu pedido está vazio</h1>
        <Link href="/atacado" prefetch={false} className="text-sm text-kc underline underline-offset-2">
          Ver o catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      <h1 className="font-serif text-3xl sm:text-4xl text-kc-dark mb-4">Meu pedido</h1>
      <div className="mb-6">
        <SeletorPagamento />
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
        {/* Itens agrupados por produto */}
        <div className="space-y-4">
          {grupos.map((g) => {
            const cores = Array.from(new Set(g.items.map((i) => i.color)));
            const tamanhos = sortSizes(g.items.map((i) => i.size));
            const subtotal = g.items.reduce((s, it) => s + unit(it) * it.quantity, 0);
            const pecas = g.items.reduce((n, it) => n + it.quantity, 0);
            // Preço unitário por tamanho (plus size tem outro preço)
            const precos = tamanhos.map((t) => ({ t, p: unit(g.items.find((i) => i.size === t)!) }));
            return (
              <div key={g.productId} className="bg-white border border-kc-line rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="w-16 h-20 rounded bg-kc-cream overflow-hidden shrink-0">
                    {g.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.image} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/atacado/produto/${g.slug}`} prefetch={false} className="text-sm text-kc-dark hover:text-kc line-clamp-2">
                      {g.name}
                    </Link>
                    {g.reference && <p className="text-[10px] tracking-[0.12em] text-kc-muted">REF. {g.reference}</p>}
                    <p className="text-xs text-kc-dark/70 mt-1">
                      {precos.map(({ t, p }) => `${t}: ${formatCurrency(p)}`).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(g.productId)}
                    aria-label={`Remover ${g.name}`}
                    className="self-start p-1.5 text-kc-muted hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Grade cor × tamanho */}
                <div className="mt-3 overflow-x-auto">
                  <table className="text-sm w-full">
                    <thead>
                      <tr className="text-[11px] text-kc-muted">
                        <th className="text-left font-normal py-1 pr-2">Cor</th>
                        {tamanhos.map((t) => (
                          <th key={t} className="font-normal py-1 px-1 text-center">
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cores.map((c) => (
                        <tr key={c} className="border-t border-kc-line">
                          <td className="py-1.5 pr-2 text-kc-dark whitespace-nowrap">{c}</td>
                          {tamanhos.map((t) => {
                            const it = g.items.find((i) => i.color === c && i.size === t);
                            return (
                              <td key={t} className="py-1.5 px-1 text-center">
                                {it ? (
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={MAX_QTD_POR_ITEM}
                                    value={it.quantity}
                                    onChange={(e) => setQuantity(it.variantId, Math.floor(Number(e.target.value) || 0))}
                                    aria-label={`Quantidade ${c} ${t}`}
                                    className="w-14 h-8 text-center border border-kc-line rounded-md text-sm text-kc-dark focus:outline-none focus:border-kc"
                                  />
                                ) : (
                                  <span className="text-kc-muted">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-kc-dark/70">{pecas} {pecas === 1 ? "peça" : "peças"}</span>
                  <span className="font-medium text-kc-dark">{formatCurrency(subtotal)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo + dados */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <div className="bg-white border border-kc-line rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-kc-dark/70">Total de peças</span>
              <span className="text-kc-dark font-medium">{pieces}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-kc-dark/70">Total sem frete</span>
              <span className="text-kc font-semibold text-base">{formatCurrency(total)}</span>
            </div>
            <p className="flex items-center gap-2 text-xs text-kc-dark/70 pt-2 border-t border-kc-line">
              <Truck size={14} className="shrink-0" />
              Frete calculado pela nossa equipe após o envio do pedido.
            </p>
          </div>

          <div className="bg-white border border-kc-line rounded-lg p-4 space-y-3">
            <p className="text-xs tracking-[0.14em] uppercase text-kc-dark font-medium">Seus dados</p>
            <div>
              <label className={labelCls}>Nome completo</label>
              <input className={inputCls} value={form.nome} onChange={(e) => set("nome", e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className={labelCls}>CPF ou CNPJ</label>
              <input
                className={inputCls}
                value={form.documento}
                onChange={(e) => set("documento", mascaraDocumento(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelCls}>Nome da loja / razão social (opcional)</label>
              <input className={inputCls} value={form.loja} onChange={(e) => set("loja", e.target.value)} autoComplete="organization" />
            </div>
            <div>
              <label className={labelCls}>E-mail</label>
              <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input
                className={inputCls}
                value={form.telefone}
                onChange={(e) => set("telefone", maskPhone(e.target.value))}
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label className={labelCls}>CEP</label>
                <input
                  className={inputCls}
                  value={form.cep}
                  onChange={(e) => {
                    const v = maskCep(e.target.value);
                    set("cep", v);
                    if (v.replace(/\D/g, "").length === 8) buscarCep(v);
                  }}
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </div>
              {cepLoading && <Loader2 size={18} className="animate-spin text-kc-muted mb-3" />}
            </div>
            <div>
              <label className={labelCls}>Endereço</label>
              <input className={inputCls} value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} autoComplete="address-line1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Número</label>
                <input className={inputCls} value={form.numero} onChange={(e) => set("numero", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Complemento</label>
                <input className={inputCls} value={form.complemento} onChange={(e) => set("complemento", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Bairro</label>
              <input className={inputCls} value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_72px] gap-2">
              <div>
                <label className={labelCls}>Cidade</label>
                <input className={inputCls} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>UF</label>
                <input
                  className={inputCls}
                  value={form.uf}
                  maxLength={2}
                  onChange={(e) => set("uf", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Observações (opcional)</label>
              <textarea
                className={cn(inputCls, "resize-none")}
                rows={3}
                maxLength={1000}
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
              />
            </div>

            {/* Condições do atacado */}
            <div className="rounded-lg bg-kc-light border border-kc-line p-3 text-xs text-kc-dark/80 leading-relaxed">
              Compras no atacado são para revenda: não há troca por tamanho, cor ou arrependimento. A troca é aceita
              somente por defeito de fabricação, comunicado em até 30 dias do recebimento, com vídeo obrigatório da
              abertura da embalagem.
            </div>
            <label className="flex items-start gap-2 text-sm text-kc-dark cursor-pointer">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 accent-[#A0622A]" />
              <span>
                Li e concordo com as{" "}
                <a
                  href="/trocas-e-devolucoes#vendas-em-atacado"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-kc underline underline-offset-2"
                >
                  condições de compra no atacado
                </a>
              </span>
            </label>

            {faltam > 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Pedido mínimo de {minimoPecas} peças. {faltam === 1 ? "Falta 1 peça" : `Faltam ${faltam} peças`}.
              </p>
            )}
            {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

            <button
              type="button"
              onClick={enviar}
              disabled={faltam > 0 || enviando}
              className="w-full bg-kc-dark text-white rounded-lg py-3.5 text-sm tracking-[0.12em] uppercase hover:bg-kc transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 size={16} className="animate-spin" />}
              Enviar pedido pelo WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
