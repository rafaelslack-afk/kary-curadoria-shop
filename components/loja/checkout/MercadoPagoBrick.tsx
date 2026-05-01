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
import { Loader2, AlertCircle } from "lucide-react";

// ── Constantes MP ─────────────────────────────────────────────────────────────

const MP_ENV = process.env.NEXT_PUBLIC_MERCADOPAGO_ENV ?? "sandbox";
const MP_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
  (MP_ENV === "production"
    ? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PRODUCTION ?? ""
    : process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SANDBOX ?? "");

// ── Mapeamento de status_detail do MP → mensagens amigáveis ──────────────────
//
// O MP retorna `status_detail` como código de rejeição.
// O backend envia esse código no campo `status_detail` da resposta 402.
// Mapeamos aqui para exibir mensagem contextual dentro do Brick.

const MP_REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number:
    "Número do cartão inválido. Verifique os dados e tente novamente.",
  cc_rejected_bad_filled_date:
    "Data de validade incorreta. Verifique e tente novamente.",
  cc_rejected_bad_filled_security_code:
    "Código de segurança (CVV) incorreto.",
  cc_rejected_bad_filled_other:
    "Dados do cartão incorretos. Verifique e tente novamente.",
  cc_rejected_insufficient_funds:
    "Saldo insuficiente. Tente outro cartão ou pague com PIX.",
  cc_rejected_high_risk:
    "Pagamento não autorizado pelo banco. Tente outro cartão ou use PIX.",
  cc_rejected_call_for_authorize:
    "Seu banco solicitou autorização. Entre em contato com o banco ou use PIX.",
  cc_rejected_card_disabled:
    "Cartão bloqueado ou inativo. Use outro cartão ou pague com PIX.",
  cc_rejected_card_error:
    "Erro no cartão. Verifique os dados ou use outro cartão.",
  cc_rejected_duplicated_payment:
    "Pagamento duplicado detectado. Aguarde alguns minutos e tente novamente.",
  cc_rejected_max_attempts:
    "Limite de tentativas atingido. Tente novamente em alguns minutos ou use PIX.",
  rejected_by_bank:
    "Pagamento recusado pelo banco. Entre em contato com seu banco ou use PIX.",
  rejected_insufficient_data:
    "Dados insuficientes para processar. Preencha todos os campos do cartão.",
};

function getRejectionMessage(statusDetail?: string | null): string {
  if (!statusDetail) return "Pagamento recusado. Verifique os dados ou escolha outro método.";
  return (
    MP_REJECTION_MESSAGES[statusDetail] ??
    "Pagamento recusado. Verifique os dados ou escolha outro método de pagamento."
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MercadoPagoBrickProps {
  amount: number;
  email: string;
  cpf?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFormSubmit: (formData: any) => Promise<void>;
  submitting?: boolean;
  /**
   * Mensagem de erro de pagamento recusado passada pelo checkout após
   * receber 402 do backend. Exibida inline no Brick sem desmontar o iframe.
   */
  paymentError?: string | null;
}

// ── Componente ────────────────────────────────────────────────────────────────

function MercadoPagoBrickInner({
  amount,
  email,
  cpf,
  onFormSubmit,
  submitting,
  paymentError,
}: MercadoPagoBrickProps) {
  const [brickReady, setBrickReady] = useState(false);
  const [supportsPaymentRequest, setSupportsPaymentRequest] = useState(false);
  // Erros internos do SDK do Brick (inicialização, validação de formulário)
  const [brickSdkError, setBrickSdkError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controllerRef = useRef<any>(null);

  // Detecta suporte a Google Pay / Apple Pay (Payment Request API)
  useEffect(() => {
    if (typeof window !== "undefined" && "PaymentRequest" in window) {
      setSupportsPaymentRequest(true);
    }
  }, []);

  // Limpa o erro de SDK quando o usuário começa a preencher novamente
  // (onReady do Brick já sinaliza que está pronto para nova tentativa)
  const clearSdkError = () => setBrickSdkError(null);

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
                // Boleto e ATM (lotérica) desabilitados — PIX está no botão
                // separado do checkout, não precisa aparecer aqui também.
                ticket: "none",
                atm: "none",
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
                if (!cancelled) {
                  setBrickReady(true);
                  setBrickSdkError(null); // limpa erro de SDK ao ficar pronto
                }
              },
              onSubmit: async ({
                formData,
              }: {
                selectedPaymentMethod: string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formData: any;
              }) => {
                // DEBUG: logar o formData completo ANTES de enviar para a API,
                // para identificar a causa real de rejeições do MP (CPF, token etc).
                console.log("[MP Brick] formData completo:", JSON.stringify(formData, null, 2));
                console.log("[MP Brick] identification:", formData?.payer?.identification);

                // Sanitiza CPF — remove qualquer máscara que o Brick tenha repassado
                if (formData?.payer?.identification?.number) {
                  formData.payer.identification.number =
                    String(formData.payer.identification.number).replace(/\D/g, "");
                }

                // Limpa erro anterior antes de nova tentativa
                setBrickSdkError(null);

                // Chama sempre o handler mais recente via ref
                await onFormSubmitRef.current(formData);
              },
              onError: (error: unknown) => {
                // Erros de SDK / validação do iframe do MP
                console.error("[MP Brick] Erro SDK:", error);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mpErr = error as any;
                const cause = mpErr?.cause ?? mpErr?.message ?? "";
                // Só expõe ao usuário se for erro crítico (falha de SDK, não apenas aviso)
                if (mpErr?.type === "critical" || mpErr?.type === "non_critical") {
                  const msg = getRejectionMessage(typeof cause === "string" ? cause : undefined);
                  if (!cancelled) setBrickSdkError(msg);
                }
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

  // Mensagem de erro mais relevante a exibir (prioridade: erro do backend > erro de SDK)
  const errorToShow = paymentError ?? brickSdkError;

  return (
    <>
      {!brickReady && (
        <div className="flex items-center gap-2 text-xs text-kc-muted py-3">
          <Loader2 size={12} className="animate-spin" />
          Carregando formulário seguro…
        </div>
      )}

      {/* Container do iframe do Mercado Pago — sem autocomplete="off" */}
      <div id="paymentBrick_container" onClick={clearSdkError} />

      {/* Mensagem de erro inline — pagamento recusado ou erro de SDK */}
      {errorToShow && (
        <div className="mt-3 flex items-start gap-2.5 px-3 py-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-red-700 text-sm font-medium leading-snug">{errorToShow}</p>
            <p className="text-red-500 text-xs mt-1">
              Corrija os dados acima ou escolha outro método de pagamento.
            </p>
          </div>
        </div>
      )}

      {/* Dica orientativa para evitar digitação manual no iframe */}
      {brickReady && supportsPaymentRequest && !errorToShow && (
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

// React.memo: só re-renderiza se amount, email, cpf, submitting ou paymentError mudarem.
// O iframe do Brick não remonta — apenas o JSX ao redor é atualizado.
export default React.memo(MercadoPagoBrickInner);
