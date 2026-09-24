"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductCard {
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  products?: ProductCard[];
  whatsappUrl?: string;
}

const SESSION_KEY = "kvo-chat-session";
const CONVERSATION_KEY = "kvo-chat-conversation";
const MESSAGES_KEY = "kvo-chat-messages";
// Convite: exibido no máximo uma vez por sessão e nunca depois que o chat
// já foi aberto nesta sessão.
const INVITE_SHOWN_KEY = "kvo-chat-invite-shown";
const OPENED_KEY = "kvo-chat-opened";
const INVITE_DELAY_MS = 6000;
const INVITE_TEXT = "Oi! Quer ajuda para encontrar a peça ideal ou montar um look? 👋";

const WELCOME =
  "Oi! Sou a assistente virtual da Kary Curadoria. Posso te ajudar a encontrar peças, montar um look ou tirar dúvidas de tamanho e entrega.";

const SUGGESTIONS = ["Montar um look", "Tem no meu tamanho?", "Como funciona a troca?"];

// O widget não aparece no checkout nem na recuperação de carrinho. O /admin
// tem layout próprio e nunca monta este componente; fica na lista por garantia.
const HIDDEN_PREFIXES = ["/checkout", "/retomar", "/admin"];

const serif = { fontFamily: "Cormorant Garamond, Georgia, serif" } as const;
const jost = { fontFamily: "Jost, sans-serif" } as const;

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* sessionStorage indisponível — a conversa segue só em memória */
  }
}

function getSessionId(): string {
  const existing = readStorage(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeStorage(SESSION_KEY, id);
  return id;
}

export function ChatWidget() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [maxChars, setMaxChars] = useState(500);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    fetch("/api/chat/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setEnabled(d.enabled === true);
        if (typeof d.max_input_chars === "number") setMaxChars(d.max_input_chars);
      })
      .catch(() => setEnabled(false));

    const saved = readStorage(MESSAGES_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved) as ChatMessage[]);
      } catch {
        /* ignora histórico local corrompido */
      }
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Convite após 6s na página (sem abrir o painel sozinho)
  useEffect(() => {
    if (!enabled || hidden || open) return;
    if (readStorage(INVITE_SHOWN_KEY) || readStorage(OPENED_KEY)) return;
    const timer = setTimeout(() => {
      setShowInvite(true);
      writeStorage(INVITE_SHOWN_KEY, "1");
    }, INVITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, hidden, open]);

  if (!enabled || hidden) return null;

  function openChat() {
    setShowInvite(false);
    writeStorage(OPENED_KEY, "1");
    setOpen(true);
  }

  function pushMessages(next: ChatMessage[]) {
    setMessages(next);
    writeStorage(MESSAGES_KEY, JSON.stringify(next));
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const withUser: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    pushMessages(withUser);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: getSessionId(),
          conversation_id: readStorage(CONVERSATION_KEY) ?? undefined,
          message: trimmed,
          page: pathname,
        }),
      });
      const data = await res.json();
      if (data.conversation_id) writeStorage(CONVERSATION_KEY, data.conversation_id);

      pushMessages([
        ...withUser,
        {
          role: "assistant",
          text:
            data.reply ??
            "Tive um problema para responder agora. Tente de novo em instantes.",
          products: Array.isArray(data.products) ? data.products : [],
          whatsappUrl: data.whatsapp_url ?? undefined,
        },
      ]);
    } catch {
      pushMessages([
        ...withUser,
        { role: "assistant", text: "Não consegui me conectar agora. Tente de novo em instantes." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Botão flutuante — canto inferior ESQUERDO para não sobrepor o
          WhatsApp (inferior direito) nem o cupom (borda direita). */}
      {!open && (
        <button
          type="button"
          onClick={openChat}
          aria-label="Abrir assistente virtual"
          className="fixed bottom-6 left-4 sm:left-6 z-50 flex items-center gap-2 rounded-full bg-[#A0622A] text-white pl-3 pr-4 py-3 shadow-[0_4px_14px_rgba(92,51,23,0.28)] hover:bg-[#8A5324] transition-colors"
          style={jost}
        >
          <span aria-hidden className="kvo-chat-pulse pointer-events-none absolute inset-0 rounded-full" />
          <MessageCircle size={18} strokeWidth={1.75} />
          <span className="text-xs tracking-wide">Assistente Kary</span>
        </button>
      )}

      {/* Convite — ancorado acima do botão, à esquerda; largura limitada
          para não alcançar o botão do WhatsApp no canto direito. */}
      {!open && showInvite && (
        <div
          className="kvo-chat-invite fixed bottom-[84px] left-4 sm:left-6 z-50 w-[min(240px,calc(100vw-160px))] rounded-2xl rounded-bl-sm bg-white border border-[#D9C9B8] shadow-[0_4px_16px_rgba(92,51,23,0.18)]"
          style={jost}
        >
          <button
            type="button"
            onClick={openChat}
            className="block w-full text-left text-[13px] leading-snug text-[#5C3317] pl-3.5 pr-8 py-3"
          >
            {INVITE_TEXT}
          </button>
          <button
            type="button"
            onClick={() => setShowInvite(false)}
            aria-label="Fechar convite do assistente"
            className="absolute top-1.5 right-1.5 p-1 rounded-full text-[#B89070] hover:text-[#5C3317] hover:bg-[#F5F1EA] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Assistente virtual Kary Curadoria"
          className="fixed inset-0 z-[10000] flex flex-col bg-[#F5F1EA] sm:inset-auto sm:bottom-6 sm:left-6 sm:w-[380px] sm:h-[580px] sm:max-h-[calc(100vh-48px)] sm:rounded-xl sm:border sm:border-[#D9C9B8] sm:shadow-2xl sm:overflow-hidden"
          style={jost}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#A0622A] text-white shrink-0">
            <div>
              <p className="text-lg leading-tight" style={serif}>Assistente Kary</p>
              <p className="text-[10px] tracking-[0.14em] uppercase text-white/80">Assistente virtual</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <Bubble role="assistant" text={WELCOME} />

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-xs text-[#A0622A] border border-[#A0622A]/40 bg-white rounded-full px-3 py-1.5 hover:bg-[#A0622A] hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <Bubble role={m.role} text={m.text} />

                {m.products && m.products.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {m.products.map((p) => (
                      <div key={p.slug} className="bg-white border border-[#D9C9B8] rounded-lg overflow-hidden flex flex-col">
                        <div className="aspect-[3/4] bg-[#EDE8DC]">
                          {p.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                        <div className="p-2 flex flex-col gap-1 flex-1">
                          <p className="text-[11px] text-[#5C3317] leading-snug line-clamp-2">{p.name}</p>
                          <p className="text-xs font-medium text-[#A0622A]">{formatCurrency(p.price)}</p>
                          <Link
                            href={`/produtos/${p.slug}`}
                            className="mt-auto text-center text-[10px] tracking-[0.12em] uppercase bg-[#A0622A] text-white rounded py-1.5 hover:bg-[#5C3317] transition-colors"
                          >
                            Ver peça
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {m.whatsappUrl && (
                  <a
                    href={m.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#25D366" }}
                  >
                    <MessageCircle size={15} />
                    Falar com a consultora no WhatsApp
                  </a>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-1.5 text-xs text-[#B89070]" aria-live="polite">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89070] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89070] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89070] animate-bounce" />
                </span>
                digitando...
              </div>
            )}
          </div>

          {/* Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="shrink-0 border-t border-[#D9C9B8] bg-white px-3 pt-3 pb-2"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                maxLength={maxChars}
                rows={1}
                placeholder="Escreva sua mensagem"
                aria-label="Mensagem para o assistente"
                className="flex-1 resize-none border border-[#D9C9B8] rounded-lg px-3 py-2 text-sm text-[#5C3317] placeholder:text-[#B89070] focus:outline-none focus:border-[#A0622A] max-h-28"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Enviar mensagem"
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[#A0622A] text-white disabled:opacity-40 hover:bg-[#5C3317] transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-[#B89070] text-center mt-2 leading-snug">
              Assistente virtual. Pode cometer erros; confirme detalhes na página do produto.
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-line text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
          isUser
            ? "bg-[#A0622A] text-white rounded-br-sm"
            : "bg-white text-[#5C3317] border border-[#D9C9B8] rounded-bl-sm"
        }`}
      >
        {text}
      </p>
    </div>
  );
}
