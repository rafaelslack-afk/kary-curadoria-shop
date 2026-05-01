"use client";

/**
 * InstallmentSelector — seletor customizado de parcelas.
 *
 * Dois modos de operação:
 *
 * 1. Estimativa local (mpPayerCosts ausente / null)
 *    Usado antes de o cliente digitar o cartão. Mostra 1x–3x sem juros e
 *    4x–12x com taxa de 1,99% a.m. (aproximação conservadora).
 *    Indica visualmente que são valores estimados.
 *
 * 2. Valores reais do MP (mpPayerCosts preenchido)
 *    Após detectar o BIN (6 primeiros dígitos do cartão), o CardTokenizerForm
 *    chama mp.getInstallments() e passa os payer_costs reais para este componente.
 *    Os valores exibidos passam a refletir exatamente o que será cobrado.
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface MpPayerCost {
  installments: number;
  installment_rate: number;   // 0 = sem juros
  installment_amount: number; // valor por parcela
  total_amount: number;       // total a pagar
}

interface InstallmentOption {
  n: number;
  label: string;
  interest: boolean;
  rate?: number; // só usado no modo estimativa
}

// ── Opções de estimativa local ─────────────────────────────────────────────────

const ESTIMATE_INSTALLMENTS: InstallmentOption[] = [
  { n: 1,  label: "À vista", interest: false },
  { n: 2,  label: "2x",      interest: false },
  { n: 3,  label: "3x",      interest: false },
  { n: 4,  label: "4x",      interest: true, rate: 0.0199 },
  { n: 5,  label: "5x",      interest: true, rate: 0.0199 },
  { n: 6,  label: "6x",      interest: true, rate: 0.0199 },
  { n: 7,  label: "7x",      interest: true, rate: 0.0199 },
  { n: 8,  label: "8x",      interest: true, rate: 0.0199 },
  { n: 9,  label: "9x",      interest: true, rate: 0.0199 },
  { n: 10, label: "10x",     interest: true, rate: 0.0199 },
  { n: 11, label: "11x",     interest: true, rate: 0.0199 },
  { n: 12, label: "12x",     interest: true, rate: 0.0199 },
];

/** Fórmula Price (juros compostos) para modo estimativa. */
function calcEstimate(total: number, n: number, rate?: number): number {
  if (!rate) return total / n;
  return (total * (rate * Math.pow(1 + rate, n))) / (Math.pow(1 + rate, n) - 1);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  total: number;
  selected: number;
  onChange: (installments: number) => void;
  /**
   * Quando preenchido, substitui a estimativa local pelos valores reais
   * retornados por mp.getInstallments() para o cartão digitado.
   */
  mpPayerCosts?: MpPayerCost[] | null;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function InstallmentSelector({ total, selected, onChange, mpPayerCosts }: Props) {
  const usingRealData = mpPayerCosts && mpPayerCosts.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#5C3317]">Número de parcelas</p>
        {/* Indicador de origem dos dados */}
        {usingRealData ? (
          <span className="text-[10px] text-[#A0622A] font-medium tracking-wide">
            ✓ valores do seu cartão
          </span>
        ) : (
          <span className="text-[10px] text-kc-muted">
            * estimativa — atualiza ao digitar o cartão
          </span>
        )}
      </div>

      <div className="space-y-2">
        {usingRealData
          ? /* ── Modo real: dados do MP ── */
            mpPayerCosts.map((cost) => {
              const isSelected = selected === cost.installments;
              const semJuros = cost.installment_rate === 0;
              const label =
                cost.installments === 1
                  ? "À vista"
                  : `${cost.installments}x`;

              return (
                <button
                  key={cost.installments}
                  type="button"
                  onClick={() => onChange(cost.installments)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? "border-[#A0622A] bg-[#F5F1EA]"
                      : "border-gray-200 bg-white hover:border-[#D9C9B8]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mr-3 ${
                      isSelected ? "border-[#A0622A]" : "border-gray-300"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#A0622A]" />}
                  </div>

                  <span className="font-medium text-[#5C3317]">
                    {label} de R$ {cost.installment_amount.toFixed(2).replace(".", ",")}
                  </span>

                  {cost.installments > 1 && (
                    <span
                      className={`text-xs ml-2 font-medium ${
                        semJuros ? "text-[#A0622A]" : "text-gray-400"
                      }`}
                    >
                      {semJuros
                        ? "sem juros"
                        : `total R$ ${cost.total_amount.toFixed(2).replace(".", ",")}`}
                    </span>
                  )}
                </button>
              );
            })
          : /* ── Modo estimativa: cálculo local ── */
            ESTIMATE_INSTALLMENTS.map((item) => {
              const value = calcEstimate(total, item.n, item.rate);
              const totalValue = value * item.n;
              const isSelected = selected === item.n;

              return (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => onChange(item.n)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? "border-[#A0622A] bg-[#F5F1EA]"
                      : "border-gray-200 bg-white hover:border-[#D9C9B8]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mr-3 ${
                      isSelected ? "border-[#A0622A]" : "border-gray-300"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#A0622A]" />}
                  </div>

                  <span className="font-medium text-[#5C3317]">
                    {item.label} de R$ {value.toFixed(2).replace(".", ",")}
                  </span>

                  {item.n > 1 && (
                    <span
                      className={`text-xs ml-2 font-medium ${
                        item.interest ? "text-gray-400" : "text-[#A0622A]"
                      }`}
                    >
                      {item.interest
                        ? `total R$ ${totalValue.toFixed(2).replace(".", ",")} *`
                        : "sem juros"}
                    </span>
                  )}
                </button>
              );
            })}
      </div>
    </div>
  );
}
