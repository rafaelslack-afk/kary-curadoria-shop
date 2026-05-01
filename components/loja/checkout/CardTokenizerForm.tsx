"use client";

/**
 * CardTokenizerForm — formulário de cartão com tokenização via MP Core Methods.
 *
 * Diferente do Payment Brick (que renderiza tudo dentro de um iframe cross-origin),
 * este componente usa mp.fields para montar apenas os campos sensíveis como iframes
 * individuais (número do cartão, validade, CVV), mantendo o restante da UI sob nosso
 * controle: nome no cartão, seletor de parcelas, botão de pagamento.
 *
 * Vantagens:
 * - Seletor de parcelas 100% nosso (valores corretos, sem estimativas genéricas)
 * - Layout responsivo e consistente em desktop e mobile
 * - Nenhuma tela de pré-seleção com valores incorretos
 * - Token MP gerado sem expor dados sensíveis ao servidor
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, CreditCard, Lock } from "lucide-react";
import { InstallmentSelector, type MpPayerCost } from "./InstallmentSelector";

// ── Constante MP ──────────────────────────────────────────────────────────────

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";

// ── Estilos injetados nos campos seguros (via API do MP, não via CSS externo) ──
// Os campos seguros são iframes — o MP expõe esta API de estilos para customização.
// O padding aqui precisa espelhar o dos inputs normais (px-3 py-2.5) porque
// o container div não transmite padding ao iframe filho.
const FIELD_STYLE = {
  color: "#1f2937",
  fontSize: "14px",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  padding: "10px 12px",
  "::placeholder": { color: "#9ca3af" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  amount: number;
  email: string;
  cpf?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFormSubmit: (formData: any) => Promise<void>;
  submitting?: boolean;
  paymentError?: string | null;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CardTokenizerForm({
  amount,
  email,
  cpf,
  onFormSubmit,
  submitting,
  paymentError,
}: Props) {
  const [ready, setReady] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [issuerId, setIssuerId] = useState("");
  // Parcelas reais do MP (preenchido após BIN detection); null = usa estimativa local
  const [mpPayerCosts, setMpPayerCosts] = useState<MpPayerCost[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mpRef = useRef<any>(null);

  // Refs com valores mais recentes — evitam closures stale nos callbacks
  const cardholderNameRef = useRef(cardholderName);
  const selectedInstallmentsRef = useRef(selectedInstallments);
  const paymentMethodIdRef = useRef(paymentMethodId);
  const issuerIdRef = useRef(issuerId);
  const cpfRef = useRef(cpf);
  const emailRef = useRef(email);
  const onFormSubmitRef = useRef(onFormSubmit);
  const amountRef = useRef(amount);

  // Sincroniza refs a cada render (sem re-montar campos)
  useEffect(() => { cardholderNameRef.current = cardholderName; }, [cardholderName]);
  useEffect(() => { selectedInstallmentsRef.current = selectedInstallments; }, [selectedInstallments]);
  useEffect(() => { paymentMethodIdRef.current = paymentMethodId; }, [paymentMethodId]);
  useEffect(() => { issuerIdRef.current = issuerId; }, [issuerId]);
  useEffect(() => { cpfRef.current = cpf; }, [cpf]);
  useEffect(() => { emailRef.current = email; }, [email]);
  useEffect(() => { amountRef.current = amount; }, [amount]);
  useEffect(() => { onFormSubmitRef.current = onFormSubmit; });

  // ── Inicialização dos campos seguros ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Aguarda SDK carregar no window
      let retries = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      while (!(window as any).MercadoPago && retries < 80) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (cancelled || !(window as any).MercadoPago) {
        console.warn("[CardTokenizer] SDK não carregou após 8s.");
        return;
      }

      // 2. Aguarda containers no DOM
      retries = 0;
      while (!document.getElementById("mp-card-number") && retries < 20) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      if (cancelled || !document.getElementById("mp-card-number")) {
        console.error("[CardTokenizer] Containers não encontrados.");
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mp = new (window as any).MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
        mpRef.current = mp;

        // Monta cada campo seguro no seu container div
        const cardNumber = mp.fields
          .create("cardNumber", { placeholder: "0000 0000 0000 0000", style: FIELD_STYLE })
          .mount("mp-card-number");

        mp.fields
          .create("expirationDate", { placeholder: "MM/AA", mode: "short", style: FIELD_STYLE })
          .mount("mp-expiration-date");

        mp.fields
          .create("securityCode", { placeholder: "CVV", style: FIELD_STYLE })
          .mount("mp-security-code");

        // Detecção de bandeira, emissor e parcelas reais via BIN (6 primeiros dígitos)
        cardNumber.on("binChange", async ({ bin }: { bin: string }) => {
          if (cancelled) return;
          if (!bin) {
            setPaymentMethodId("");
            setIssuerId("");
            setMpPayerCosts(null);
            return;
          }
          try {
            // 1. Identifica a bandeira do cartão
            const { results } = await mp.getPaymentMethods({ bin });
            if (!results?.length || cancelled) return;
            const method = results[0];
            setPaymentMethodId(method.id);

            // 2. Identifica o emissor (banco)
            const issuers = await mp.getIssuers({ paymentMethodId: method.id, bin });
            if (!cancelled && issuers?.length) {
              setIssuerId(String(issuers[0].id));
            }

            // 3. Busca as parcelas reais para este cartão e valor — substitui estimativa
            const installmentsData = await mp.getInstallments({
              amount: String(amountRef.current.toFixed(2)),
              bin,
              paymentTypeId: "credit_card",
            });
            if (cancelled) return;
            const payerCosts: MpPayerCost[] = (
              installmentsData?.[0]?.payer_costs ?? []
            ).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => ({
                installments: c.installments as number,
                installment_rate: c.installment_rate as number,
                installment_amount: c.installment_amount as number,
                total_amount: c.total_amount as number,
              })
            );
            if (payerCosts.length > 0) {
              setMpPayerCosts(payerCosts);
              // Se a parcela selecionada não existe nas opções reais, volta para 1x
              setSelectedInstallments((prev) =>
                payerCosts.some((c) => c.installments === prev) ? prev : 1
              );
            }
          } catch {
            /* falha silenciosa — mantém estimativa local */
          }
        });

        if (!cancelled) {
          console.log("[CardTokenizer] Campos seguros montados.");
          setReady(true);
        }
      } catch (err) {
        console.error("[CardTokenizer] Erro ao inicializar campos:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Monta uma vez — parent usa key={amount} para forçar remonte se valor mudar

  // ── Submit — tokeniza e chama handler do checkout ─────────────────────────
  const handlePay = useCallback(async () => {
    setFormError(null);

    const name = cardholderNameRef.current.trim();
    if (!name) {
      setFormError("Informe o nome impresso no cartão.");
      return;
    }
    if (!paymentMethodIdRef.current) {
      setFormError("Aguarde a detecção do cartão — verifique o número digitado.");
      return;
    }

    setTokenizing(true);
    try {
      const mp = mpRef.current;
      const cpfDigits = (cpfRef.current ?? "").replace(/\D/g, "");

      // Tokeniza os dados do cartão (campos seguros → MP servers → token opaco)
      const token = await mp.fields.createCardToken({
        cardholderName: name,
        identificationType: "CPF",
        identificationNumber: cpfDigits,
      });

      console.log("[CardTokenizer] Token gerado:", token.id.slice(0, 12) + "...");
      console.log("[CardTokenizer] payment_method_id:", paymentMethodIdRef.current);
      console.log("[CardTokenizer] installments:", selectedInstallmentsRef.current);

      await onFormSubmitRef.current({
        token: token.id,
        issuer_id: issuerIdRef.current || undefined,
        payment_method_id: paymentMethodIdRef.current,
        installments: selectedInstallmentsRef.current,
        payer: {
          email: emailRef.current,
          identification: { type: "CPF", number: cpfDigits },
        },
      });
    } catch (err) {
      console.error("[CardTokenizer] Erro na tokenização:", err);
      setFormError("Verifique os dados do cartão e tente novamente.");
    } finally {
      setTokenizing(false);
    }
  }, []);

  const errorToShow = paymentError ?? formError;
  const isSubmitting = submitting || tokenizing;

  return (
    <div className="space-y-5">
      {/* Loader enquanto campos seguros montam */}
      {!ready && (
        <div className="flex items-center gap-2 text-xs text-kc-muted py-3">
          <Loader2 size={12} className="animate-spin" />
          Carregando formulário seguro…
        </div>
      )}

      {/* Conteúdo — invisible até ready para evitar layout shift */}
      <div className={!ready ? "invisible" : ""}>

        {/* ── Seletor de parcelas ──
            Usa valores reais do MP (mpPayerCosts) quando o BIN foi detectado,
            ou estimativa local enquanto o cartão não foi digitado. */}
        <InstallmentSelector
          total={amount}
          selected={selectedInstallments}
          onChange={setSelectedInstallments}
          mpPayerCosts={mpPayerCosts}
        />

        {/* ── Dados do cartão ── */}
        <div className="space-y-4 mt-6">
          <p className="text-[10px] tracking-[0.18em] text-kc-muted uppercase flex items-center gap-1.5">
            <Lock size={10} />
            Dados do cartão
          </p>

          {/* Número do cartão — campo seguro MP */}
          <div>
            <label className="block text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-1.5">
              Número do cartão <span className="text-kc">*</span>
            </label>
            <div
              id="mp-card-number"
              className="w-full border border-kc-line bg-white overflow-hidden"
              style={{ height: "44px" }}
            />
          </div>

          {/* Nome no cartão — campo normal (não é dado sensível) */}
          <div>
            <label className="block text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-1.5">
              Nome impresso no cartão <span className="text-kc">*</span>
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              placeholder="COMO APARECE NO CARTÃO"
              autoComplete="cc-name"
              className="w-full border border-kc-line bg-white px-3 py-2.5 text-sm text-kc-dark placeholder-kc-muted/50 focus:outline-none focus:border-kc"
            />
          </div>

          {/* Validade + CVV — campos seguros MP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-1.5">
                Validade <span className="text-kc">*</span>
              </label>
              <div
                id="mp-expiration-date"
                className="w-full border border-kc-line bg-white overflow-hidden"
                style={{ height: "44px" }}
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.16em] text-kc-muted uppercase mb-1.5">
                CVV <span className="text-kc">*</span>
              </label>
              <div
                id="mp-security-code"
                className="w-full border border-kc-line bg-white overflow-hidden"
                style={{ height: "44px" }}
              />
            </div>
          </div>
        </div>

        {/* ── Erro ── */}
        {errorToShow && (
          <div className="mt-4 flex items-start gap-2.5 px-3 py-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-red-700 text-sm font-medium leading-snug">{errorToShow}</p>
              <p className="text-red-500 text-xs mt-1">
                Corrija os dados acima ou escolha outro método de pagamento.
              </p>
            </div>
          </div>
        )}

        {/* ── Botão pagar ── */}
        <button
          type="button"
          onClick={handlePay}
          disabled={isSubmitting}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-kc text-white text-[11px] tracking-[0.18em] uppercase py-4 hover:bg-kc-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Processando…
            </>
          ) : (
            <>
              <CreditCard size={13} />
              Pagar com cartão
            </>
          )}
        </button>

        <p className="text-[9px] text-kc-muted mt-2 text-center">
          Dados do cartão tokenizados pelo Mercado Pago. Nunca trafegam em nossos servidores.
        </p>
      </div>
    </div>
  );
}
