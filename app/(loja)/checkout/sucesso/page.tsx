"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Package, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OrderData {
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  prazo: number | null;
  total?: number;
  // boleto specific
  boletoLine?: string;
  boletoPdf?: string;
}

export default function SucessoPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isBoleto, setIsBoleto] = useState(false);
  const [boletoLine, setBoletoLine] = useState("");
  const [boletoPdf, setBoletoPdf] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Try boleto first
    const boletoRaw = sessionStorage.getItem("kvo-boleto");
    if (boletoRaw) {
      const data = JSON.parse(boletoRaw) as OrderData;
      setOrder(data);
      setIsBoleto(true);
      setBoletoLine(data.boletoLine ?? "");
      setBoletoPdf(data.boletoPdf ?? "");
      sessionStorage.removeItem("kvo-boleto");
      return;
    }

    const orderRaw = sessionStorage.getItem("kvo-order");
    if (orderRaw) {
      setOrder(JSON.parse(orderRaw) as OrderData);
      sessionStorage.removeItem("kvo-order");
    }
  }, []);

  function handleCopyBoleto() {
    navigator.clipboard.writeText(boletoLine).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-2xl font-medium text-kc-dark mb-4">Pedido confirmado</h1>
        <p className="text-sm text-kc-muted mb-6">Obrigada pela sua compra na Kary Curadoria!</p>
        <Link
          href="/produtos"
          className="inline-block bg-kc text-white text-[11px] tracking-[0.18em] uppercase px-6 py-3 hover:bg-kc-dark transition-colors"
        >
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">

      {/* Success icon */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-emerald-600" />
        </div>
        <p className="text-[10px] tracking-[0.24em] text-kc-muted mb-1 uppercase">
          Pedido #{order.orderNumber}
        </p>
        <h1 className="font-serif text-2xl font-medium text-kc-dark mb-2">
          {isBoleto ? "Pedido gerado!" : "Pedido confirmado!"}
        </h1>
        <p className="text-sm text-kc-muted">
          {isBoleto
            ? "Pague o boleto abaixo para confirmar seu pedido."
            : "Obrigada pela sua compra, " + (order.customerName?.split(" ")[0] || "cliente") + "!"}
        </p>
      </div>

      {/* Boleto block */}
      {isBoleto && boletoLine && (
        <div className="border border-amber-200 bg-amber-50 p-5 space-y-3 mb-6">
          <p className="text-[10px] tracking-[0.18em] text-amber-800 uppercase font-medium">
            Boleto bancário
          </p>
          <p className="text-[9px] text-amber-700">
            Vencimento em 3 dias úteis. Pague em qualquer banco, lotérica ou pelo seu app.
          </p>

          {/* Linha digitável */}
          <div className="flex items-center gap-2 bg-white border border-amber-200">
            <p className="flex-1 text-[10px] font-mono text-kc-dark px-3 py-2 break-all">
              {boletoLine}
            </p>
            <button
              onClick={handleCopyBoleto}
              className="shrink-0 px-3 py-2 border-l border-amber-200 text-[10px] text-amber-700 hover:bg-amber-100 transition-colors"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          {boletoPdf && (
            <a
              href={boletoPdf}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-amber-800 underline underline-offset-2"
            >
              <ExternalLink size={12} />
              Baixar PDF do boleto
            </a>
          )}
        </div>
      )}

      {/* Order summary card */}
      <div className="bg-kc-light border border-kc-line p-5 space-y-4 mb-6">
        <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase">Resumo do pedido</p>

        <div className="space-y-2 text-xs">
          {order.orderNumber && (
            <div className="flex justify-between">
              <span className="text-kc-muted">Número</span>
              <span className="text-kc-dark font-medium">#{order.orderNumber}</span>
            </div>
          )}
          {order.customerEmail && (
            <div className="flex justify-between">
              <span className="text-kc-muted">Confirmação enviada para</span>
              <span className="text-kc-dark">{order.customerEmail}</span>
            </div>
          )}
          {order.total && (
            <div className="flex justify-between">
              <span className="text-kc-muted">Total pago</span>
              <span className="text-kc font-medium">{formatCurrency(order.total)}</span>
            </div>
          )}
          {order.prazo && (
            <div className="flex justify-between">
              <span className="text-kc-muted">Prazo de entrega</span>
              <span className="text-kc-dark">
                Até {order.prazo} dia{order.prazo !== 1 ? "s" : ""} útil{order.prazo !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Tracking */}
        <div className="border-t border-kc-line pt-4 flex items-start gap-2.5">
          <Package size={14} className="text-kc-muted shrink-0 mt-0.5" />
          <p className="text-[11px] text-kc-muted leading-relaxed">
            Você receberá um e-mail com o código de rastreamento assim que seu pedido for despachado.
          </p>
        </div>
      </div>

      {/* Track order link */}
      <div className="border border-kc-line p-4 mb-6">
        <p className="text-xs font-medium text-kc-dark mb-1">Acompanhar meu pedido</p>
        <p className="text-[11px] text-kc-muted mb-3">
          Rastreie seu pedido a qualquer momento usando o número #{order.orderNumber}.
        </p>
        <Link
          href={`/rastrear?pedido=${order.orderNumber}`}
          className="text-[10px] tracking-[0.14em] text-kc uppercase underline underline-offset-2 hover:text-kc-dark transition-colors"
        >
          Rastrear pedido →
        </Link>
      </div>

      {/* CTA */}
      <div className="text-center space-y-3">
        <Link
          href="/produtos"
          className="inline-block bg-kc text-white text-[11px] tracking-[0.18em] uppercase px-8 py-3.5 hover:bg-kc-dark transition-colors"
        >
          Continuar comprando
        </Link>
        <div>
          <a
            href="https://wa.me/5511992169377"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-kc-muted hover:text-kc-dark transition-colors underline underline-offset-2"
          >
            Dúvidas? Fale conosco pelo WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
