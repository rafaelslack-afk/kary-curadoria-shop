"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  today: number;
  last7: number;
  last30: number;
  handoffPct30: number;
  monthInputTokens: number;
  monthOutputTokens: number;
  monthCostUsd: number;
}

interface ConversationRow {
  id: string;
  page_origin: string | null;
  message_count: number;
  handed_off_whatsapp: boolean;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
  preview: string;
}

interface MessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools_used: { tools?: { name: string; input: unknown }[]; error?: boolean } | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export default function ChatbotAdminPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [history, setHistory] = useState<MessageRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/chatbot", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar.");
      setEnabled(data.enabled);
      setStats(data.stats);
      setConversations(data.conversations ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle() {
    if (enabled === null) return;
    setToggling(true);
    setError("");
    try {
      const res = await fetch("/api/admin/chatbot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
      setEnabled(data.enabled);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setToggling(false);
    }
  }

  async function openConversation(c: ConversationRow) {
    setSelected(c);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/chatbot/${c.id}`, { cache: "no-store" });
      const data = await res.json();
      setHistory(data.messages ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  const cards = stats
    ? [
        { label: "Conversas hoje", value: String(stats.today) },
        { label: "Últimos 7 dias", value: String(stats.last7) },
        { label: "Últimos 30 dias", value: String(stats.last30) },
        { label: "Encaminhadas ao WhatsApp (30d)", value: `${stats.handoffPct30}%` },
        {
          label: "Tokens no mês",
          value: `${(stats.monthInputTokens / 1000).toFixed(1)}k in / ${(stats.monthOutputTokens / 1000).toFixed(1)}k out`,
        },
        { label: "Custo estimado no mês", value: `US$ ${stats.monthCostUsd.toFixed(4)}` },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Bot size={22} className="text-kc-muted" strokeWidth={1.5} />
          <h1 className="text-2xl font-serif font-medium text-kc-dark">Assistente Virtual</h1>
        </div>

        {enabled !== null && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <span className="text-sm text-kc-dark">{enabled ? "Ligado" : "Desligado"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={toggle}
              disabled={toggling}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors disabled:opacity-50",
                enabled ? "bg-[#A0622A]" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                  enabled && "translate-x-5"
                )}
              />
            </button>
          </label>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">{c.label}</p>
            <p className="text-xl font-medium text-kc-dark">{c.value}</p>
          </div>
        ))}
      </div>
      {stats && (
        <p className="text-[11px] text-gray-400 -mt-4 mb-6">
          Custo estimado com os preços do Claude Haiku 4.5 (US$ 1/MTok entrada, US$ 5/MTok saída).
        </p>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-kc-dark">Conversas recentes</h2>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">Carregando…</p>
        ) : conversations.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Nenhuma conversa ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openConversation(c)}
                  className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-kc-dark truncate">{c.preview || "(sem mensagem)"}</p>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(c.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                    <span>{c.message_count} msg</span>
                    {c.page_origin && <span className="truncate">{c.page_origin}</span>}
                    {c.handed_off_whatsapp && (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <MessageCircle size={11} /> WhatsApp
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-serif text-base font-medium text-kc-dark">Conversa</h2>
                <p className="text-[11px] text-gray-400">
                  {formatDate(selected.created_at)} · {selected.input_tokens + selected.output_tokens} tokens
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-3">
              {historyLoading && <p className="text-sm text-gray-400">Carregando…</p>}
              {history.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line",
                      m.role === "user" ? "bg-[#A0622A] text-white" : "bg-gray-100 text-kc-dark"
                    )}
                  >
                    {m.content}
                    {m.role === "assistant" && m.tools_used?.tools && m.tools_used.tools.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-gray-500">
                        Ferramentas: {m.tools_used.tools.map((t) => t.name).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
