"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Loader2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PixData {
  orderId: string;
  qrCode: string | null;        // base64 puro
  qrCodeText: string | null;    // copia-e-cola
  expiresAt: string | null;
  total: number;
  orderNumber: number;
}

const POLL_INTERVAL = 5000;
const PIX_TIMEOUT = 30 * 60;

// ── Componente interno (usa useSearchParams — precisa de Suspense pai) ────────

function PixContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlOrderId = searchParams.get("order_id");

  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PIX_TIMEOUT);
  const [status, setStatus] = useState<"pending" | "paid" | "expired">("pending");
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Fonte primária: sessionStorage (tem QR code)
    const raw = sessionStorage.getItem("kvo-pix");
    if (raw) {
      try {
        const data = JSON.parse(raw) as PixData;
        setPixData(data);
        if (data.expiresAt) {
          const remaining = Math.floor(
            (new Date(data.expiresAt).getTime() - Date.now()) / 1000
          );
          setTimeLeft(Math.max(remaining, 0));
        }
        return;
      } catch {
        // sessionStorage corrompido — continua para o fallback
      }
    }

    // 2. Fallback: order_id da URL → buscar via API
    if (!urlOrderId) {
      setLoadError(true);
      return;
    }

    fetch(`/api/orders/${urlOrderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error || !d.id) {
          setLoadError(true);
          return;
        }
        setPixData({
          orderId: d.id,
          qrCode: d.qr_code_base64 ?? null,
          qrCodeText: d.qr_code ?? null,
          expiresAt: null,
          total: d.total ?? 0,
          orderNumber: d.orderNumber,
        });
        setTimeLeft(PIX_TIMEOUT);
      })
      .catch(() => setLoadError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOrderId]);

  // Countdown
  useEffect(() => {
    if (!pixData || status !== "pending") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setStatus("expired"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pixData, status]);

  // Polling a cada 5s → redireciona quando status = 'paid'
  useEffect(() => {
    if (!pixData || status !== "pending") return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/orders/${pixData.orderId}?t=${Date.now()}`,
          { cache: "no-store" }
        );
        const d = await res.json();
        console.log("[PIX polling] status recebido:", d.status);
        if (d.status === "paid") {
          setStatus("paid");
          sessionStorage.removeItem("kvo-pix");
          sessionStorage.setItem("kvo-order", JSON.stringify({
            orderId: pixData.orderId,
            orderNumber: pixData.orderNumber,
            customerName: "",
            customerEmail: "",
            prazo: d.prazo ?? null,
            total: pixData.total,
          }));
          setTimeout(() => router.push("/checkout/sucesso"), 1500);
        }
      } catch { /* erros de rede — próximo ciclo tenta novamente */ }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pixData, status, router]);

  // Para timers quando resolvido
  useEffect(() => {
    if (status !== "pending") {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [status]);

  function handleCopy() {
    if (!pixData?.qrCodeText) return;
    navigator.clipboard.writeText(pixData.qrCodeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── Carregando ──
  if (!pixData && !loadError) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-kc-muted" size={24} />
      </div>
    );
  }

  // ── Pedido não encontrado ──
  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="font-serif text-2xl font-medium text-kc-dark">
          Pedido não encontrado
        </h1>
        <p className="text-sm text-kc-muted">
          Se você acabou de confirmar o pedido, verifique seu e-mail ou entre em
          contato pelo WhatsApp para obter o código PIX.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <a
            href="https://wa.me/5511992169377"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-kc text-white text-[11px] tracking-[0.18em] uppercase px-6 py-3 hover:bg-kc-dark transition-colors"
          >
            WhatsApp
          </a>
          <a
            href="/produtos"
            className="inline-block border border-kc-line text-kc-dark text-[11px] tracking-[0.18em] uppercase px-6 py-3 hover:bg-kc-light transition-colors"
          >
            Continuar comprando
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12 text-center">

      {/* Pago */}
      {status === "paid" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h1 className="font-serif text-2xl font-medium text-kc-dark">
            Pagamento confirmado!
          </h1>
          <p className="text-sm text-kc-muted">Redirecionando…</p>
        </div>
      )}

      {/* Expirado */}
      {status === "expired" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <Clock size={28} className="text-red-500" />
          </div>
          <h1 className="font-serif text-2xl font-medium text-kc-dark">PIX expirado</h1>
          <p className="text-sm text-kc-muted">
            O QR Code expirou. Faça um novo pedido para tentar novamente.
          </p>
          <a
            href="/carrinho"
            className="inline-block bg-kc text-white text-[11px] tracking-[0.18em] uppercase px-6 py-3 hover:bg-kc-dark transition-colors mt-2"
          >
            Voltar ao carrinho
          </a>
        </div>
      )}

      {/* Pendente */}
      {status === "pending" && pixData && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] tracking-[0.26em] text-kc-muted mb-1 uppercase">
              Pedido #{pixData.orderNumber}
            </p>
            <h1 className="font-serif text-2xl font-medium text-kc-dark">Pague via PIX</h1>
            {pixData.total > 0 && (
              <p className="text-sm text-kc-muted mt-1">
                Total:{" "}
                <span className="font-medium text-kc">{formatCurrency(pixData.total)}</span>
              </p>
            )}
          </div>

          {/* Timer */}
          <div
            className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 border ${
              timeLeft < 120
                ? "border-red-300 text-red-600 bg-red-50"
                : "border-kc-line text-kc-muted"
            }`}
          >
            <Clock size={14} />
            Expira em {formatTime(timeLeft)}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="border border-kc-line p-4 bg-white inline-block">
              {pixData.qrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${pixData.qrCode}`}
                  alt="QR Code PIX"
                  width={200}
                  height={200}
                  style={{ width: 200, height: 200 }}
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-kc-cream">
                  <p className="text-xs text-kc-muted text-center px-4">
                    QR Code não disponível.<br />Use o código abaixo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Copia e cola */}
          {pixData.qrCodeText ? (
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.16em] text-kc-muted uppercase">
                Ou copie o código PIX
              </p>
              <div className="flex items-center gap-2 border border-kc-line bg-kc-light">
                <p className="flex-1 text-[10px] text-kc-dark px-3 py-2.5 truncate font-mono">
                  {pixData.qrCodeText}
                </p>
                <button
                  onClick={handleCopy}
                  className="shrink-0 px-3 py-2.5 border-l border-kc-line hover:bg-kc-cream transition-colors flex items-center gap-1.5 text-[10px] text-kc-muted"
                >
                  {copied ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
              Código PIX não disponível. Entre em contato pelo WhatsApp para receber o código.
            </div>
          )}

          {/* Instruções */}
          <div className="text-left space-y-2 bg-kc-light border border-kc-line p-4">
            <p className="text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-3">
              Como pagar
            </p>
            {[
              "Abra o app do seu banco",
              "Escolha pagar via QR Code ou Pix Copia e Cola",
              "Escaneie o QR Code ou cole o código",
              "Confirme o pagamento no valor exato",
              "Aguarde a confirmação automática nesta página",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-kc text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-kc-dark">{s}</p>
              </div>
            ))}
          </div>

          {/* Polling indicator */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-kc-muted">
            <Loader2 size={11} className="animate-spin" />
            Verificando pagamento automaticamente…
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página exportada — envolve em Suspense (exigido pelo useSearchParams) ─────

export default function PixPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-kc-muted" size={24} />
        </div>
      }
    >
      <PixContent />
    </Suspense>
  );
}
