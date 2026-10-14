"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Copy, RefreshCw, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const AVISO_MAX = 250;
const input = "w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white";
const label = "block text-[11px] uppercase tracking-wide text-gray-500 mb-1";

interface Config {
  descontos: { pix: number; credit_card: number };
  minimoPecas: number;
  whatsapp: string;
  aviso: { ativo: boolean; texto: string };
  link: string | null;
}

export default function AtacadoConfigPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/atacado/config", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Erro ao carregar.");
        setCfg(d);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  async function salvar() {
    if (!cfg) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/atacado/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao salvar.");
      setCfg(d);
      setMsg("Configurações salvas. Já valem no catálogo.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function novoLink() {
    if (!window.confirm("Gerar um novo link? O link atual deixa de funcionar na hora, inclusive para quem já está com ele aberto.")) return;
    setGerando(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/atacado/config/novo-link", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao gerar o link.");
      setCfg((c) => (c ? { ...c, link: d.link } : c));
      setMsg("Novo link gerado. O link anterior não funciona mais.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGerando(false);
    }
  }

  if (!cfg) return <p className="text-sm text-gray-500">{error || "Carregando…"}</p>;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/atacado" prefetch={false} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-kc-dark mb-4">
        <ChevronLeft size={16} /> Pedidos de atacado
      </Link>
      <h1 className="text-2xl font-serif font-medium text-kc-dark mb-6">Configurações do atacado</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg mb-4">{msg}</div>}

      {/* Link secreto */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <p className="text-sm font-medium text-kc-dark mb-2">Link secreto do catálogo</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className={cn(input, "font-mono text-xs")} readOnly value={cfg.link ?? "Nenhum link configurado"} />
          <button
            type="button"
            disabled={!cfg.link}
            onClick={() => cfg.link && navigator.clipboard.writeText(cfg.link).then(() => setMsg("Link copiado."))}
            className="inline-flex items-center justify-center gap-1.5 text-sm border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
          >
            <Copy size={15} /> Copiar link
          </button>
          <button
            type="button"
            onClick={novoLink}
            disabled={gerando}
            className="inline-flex items-center justify-center gap-1.5 text-sm border border-red-200 text-red-700 rounded-md px-3 py-2 hover:bg-red-50 disabled:opacity-40"
          >
            <RefreshCw size={15} /> {gerando ? "Gerando…" : "Gerar novo link"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Quem abre o link fica com acesso por 30 dias. Gerar um novo link derruba o acesso de todos os links anteriores.</p>
      </div>

      {/* Preço e pedido */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Desconto no PIX (%)</label>
          <input
            className={input}
            type="number"
            min={0}
            max={99}
            step="0.5"
            value={cfg.descontos.pix}
            onChange={(e) => setCfg({ ...cfg, descontos: { ...cfg.descontos, pix: Number(e.target.value) } })}
          />
        </div>
        <div>
          <label className={label}>Desconto no cartão (%)</label>
          <input
            className={input}
            type="number"
            min={0}
            max={99}
            step="0.5"
            value={cfg.descontos.credit_card}
            onChange={(e) => setCfg({ ...cfg, descontos: { ...cfg.descontos, credit_card: Number(e.target.value) } })}
          />
        </div>
        <div>
          <label className={label}>Mínimo de peças por pedido</label>
          <input
            className={input}
            type="number"
            min={1}
            value={cfg.minimoPecas}
            onChange={(e) => setCfg({ ...cfg, minimoPecas: Math.floor(Number(e.target.value)) })}
          />
        </div>
        <div>
          <label className={label}>WhatsApp do atacado (DDI + DDD + número)</label>
          <input className={input} inputMode="numeric" value={cfg.whatsapp} onChange={(e) => setCfg({ ...cfg, whatsapp: e.target.value.replace(/\D/g, "") })} />
        </div>
        <p className="sm:col-span-2 text-xs text-gray-500">
          Os percentuais nunca aparecem para a cliente: o catálogo mostra só o preço final de atacado.
        </p>
      </div>

      {/* Aviso de novidades */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-kc-dark">Aviso de lançamentos e novidades</p>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            {cfg.aviso.ativo ? "Ligado" : "Desligado"}
            <button
              type="button"
              role="switch"
              aria-checked={cfg.aviso.ativo}
              onClick={() => setCfg({ ...cfg, aviso: { ...cfg.aviso, ativo: !cfg.aviso.ativo } })}
              className={cn("relative w-11 h-6 rounded-full transition-colors", cfg.aviso.ativo ? "bg-[#A0622A]" : "bg-gray-300")}
            >
              <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform", cfg.aviso.ativo && "translate-x-5")} />
            </button>
          </label>
        </div>
        <textarea
          className={input}
          rows={3}
          maxLength={AVISO_MAX}
          value={cfg.aviso.texto}
          onChange={(e) => setCfg({ ...cfg, aviso: { ...cfg.aviso, texto: e.target.value } })}
        />
        <p className="text-xs text-gray-500 text-right">
          {cfg.aviso.texto.length}/{AVISO_MAX}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-kc text-white rounded-md px-5 py-2.5 text-sm hover:bg-kc-dark disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
