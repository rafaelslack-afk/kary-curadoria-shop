"use client";

/**
 * MercadoPagoBrick — componente isolado e memoizado.
 *
 * Por que separado?
 * O Brick do MP inicializa dentro de um iframe e é muito custoso para recriar.
 * Isolá-lo em React.memo() garante que ele só remonta quando o `amount` muda
 * (via key={amount} no pai), não a cada re-render do checkout.
 *
 * O callback onFormSubmit é mantido em uma ref interna, então o Brick sempre
 * chama a versão mais recente sem precisar remontar.
 */

import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// ── Constantes MP ─────────────────────────────────────────────────────────────

const MP_ENV = process.env.NEXT_PUBLIC_MERCADOPAGO_ENV ?? "sandbox";
const MP_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
  (MP_ENV === "production"
    ? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PRODUCTION ?? ""
    : process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SANDBOX ?? "");

// ── Props ─────────────────────────────────────────────────────────────────────

interface MercadoPagoBrickProps {
  amount: number;
  email: string;
  cpf?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFormSubmit: (formData: any) => Promise<void>;
  submitting?: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

function MercadoPagoBrickInner({
  amount,
  email,
  cpf,
  onFormSubmit,
  submitting,
}: MercadoPagoBrickProps) {
  const [brickReady, setBrickReady] = useState(false);
  const [supportsPaymentRequest, setSupportsPaymentRequest] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controllerRef = useRef<any>(null);

  // Detecta suporte a Google Pay / Apple Pay (Payment Request API)
  useEffect(() => {
    if (typeof window !== "undefined" && "PaymentRequest" in window) {
      setSupportsPaymentRequest(true);
    }
  }, []);

  // Ref com o handler mais recente — sem causar re-render nem re-montar o Brick
  const onFormSubmitRef = useRef(onFormSubmit);
  // Atualiza a ref a cada render sem disparar efeitos
  useEffect(() => {
    onFormSubmitRef.current = onFormSubmit;
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Aguarda o SDK do Mercado Pago carregar no window
      let retries = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      while (!(window as any).MercadoPago && retries < 80) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (cancelled || !(window as any).MercadoPago) {
        console.warn("[MP Brick] SDK não encontrado após 8s.");
        return;
      }

      // 2. Aguarda o container estar no DOM
      retries = 0;
      while (!document.getElementById("paymentBrick_container") && retries < 20) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      if (cancelled || !document.getElementById("paymentBrick_container")) {
        console.error("[MP Brick] Container não encontrado.");
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mp = new (window as any).MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        const controller = await bricksBuilder.create(
          "payment",
          "paymentBrick_container",
          {
            initialization: {
              amount: parseFloat(amount.toFixed(2)),
              payer: {
                email,
                ...(cpf &&
                  cpf.replace(/\D/g, "").length === 11 && {
                    identification: { type: "CPF", number: cpf.replace(/\D/g, "") },
                  }),
              },
            },
            customization: {
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                // Google Pay e Apple Pay aparecem nativamente no Brick quando
                // o dispositivo/navegador suporta — evita digitação manual
                // no iframe (onde o autofill do Chrome é bloqueado).
                googlePay: "all",
                applePay: "all",
              },
              visual: {
                style: {
                  theme: "default",
                  customVariables: {
                    formBackgroundColor: "#F5F1EA",
                    baseColor: "#A0622A",
                    baseColorFirstVariant: "#5C3317",
                    fontSizeSmall: "12px",
                  },
                },
              },
            },
            callbacks: {
              onReady: () => {
                console.log("[MP Brick] Pronto — amount:", amount);
                if (!cancelled) setBrickReady(true);
              },
              onSubmit: async ({
                formData,
              }: {
                selectedPaymentMethod: string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formData: any;
              }) => {
                // Chama sempre o handler mais recente via ref
                await onFormSubmitRef.current(formData);
              },
              onError: (error: unknown) => {
                console.error("[MP Brick] Erro:", error);
              },
            },
          }
        );

        if (!cancelled) {
          controllerRef.current = controller;
        } else {
          controller.unmount();
        }
      } catch (err) {
        console.error("[MP Brick] Erro ao inicializar:", err);
      }
    })();

    // Cleanup: desmonta o Brick ao sair (remonte via key={amount} no pai)
    return () => {
      cancelled = true;
      if (controllerRef.current) {
        try { controllerRef.current.unmount(); } catch { /* ignore */ }
        controllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // INTENCIONAL: monta uma vez. O pai usa key={amount} para forçar remonte.

  return (
    <>
      {!brickReady && (
        <div className="flex items-center gap-2 text-xs text-kc-muted py-3">
          <Loader2 size={12} className="animate-spin" />
          Carregando formulário seguro…
        </div>
      )}
      {/* Container do iframe do Mercado Pago — sem autocomplete="off" */}
      <div id="paymentBrick_container" />

      {/* Dica orientativa para evitar digitação manual no iframe */}
      {brickReady && supportsPaymentRequest && (
        <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-[#F5F1EA] border border-[#A0622A]/20 rounded text-[11px] text-[#5C3317]/80 leading-relaxed">
          <span className="text-base leading-none">💡</span>
          <span>
            <strong className="text-[#5C3317]">Dica:</strong> use o botão Google Pay ou Apple Pay
            acima para pagar sem digitar os dados do cartão.
          </span>
        </div>
      )}

      {submitting && (
        <div className="flex items-center gap-2 text-xs text-kc-muted mt-2">
          <Loader2 size={12} className="animate-spin" />
          Processando pagamento…
        </div>
      )}
      <p className="text-[9px] text-kc-muted mt-2">
        Seus dados de cartão são tokenizados pelo Mercado Pago e nunca trafegam em nossos servidores.
      </p>
    </>
  );
}

// React.memo: só re-renderiza se amount, email, cpf ou submitting mudarem.
// onFormSubmit é estável (useCallback vazio no pai) — não causa re-render.
export default React.memo(MercadoPagoBrickInner);
