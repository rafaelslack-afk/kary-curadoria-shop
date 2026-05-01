"use client";

/**
 * InstallmentSelector — seletor customizado de parcelas.
 *
 * Exibe as opções de parcelamento com valores calculados localmente,
 * eliminando a confusão da tela de pré-seleção do MP Brick que mostra
 * taxas genéricas de mercado (com juros) antes de o cliente inserir o cartão.
 *
 * Parcelas 1x–3x: sem juros (configurado na conta MP).
 * Parcelas 4x–12x: com juros compostos à taxa de 1,99% a.m.
 */

interface InstallmentOption {
  n: number;
  label: string;
  interest: boolean;
  rate?: number;
}

const INSTALLMENTS: InstallmentOption[] = [
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

/** Fórmula de parcelas com juros compostos (Price). */
function calcInstallment(total: number, n: number, rate?: number): number {
  if (!rate) return total / n;
  return (total * (rate * Math.pow(1 + rate, n))) / (Math.pow(1 + rate, n) - 1);
}

interface Props {
  total: number;
  selected: number;
  onChange: (installments: number) => void;
}

export function InstallmentSelector({ total, selected, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-medium text-[#5C3317] mb-3">Número de parcelas</p>
      <div className="space-y-2">
        {INSTALLMENTS.map((item) => {
          const value = calcInstallment(total, item.n, item.rate);
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
              {/* Radio visual */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mr-3 ${
                  isSelected ? "border-[#A0622A]" : "border-gray-300"
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-[#A0622A]" />}
              </div>

              {/* Rótulo da parcela */}
              <span className="font-medium text-[#5C3317]">
                {item.label} de R$ {value.toFixed(2).replace(".", ",")}
              </span>

              {/* Badge sem juros / total com juros */}
              {item.n > 1 && (
                <span
                  className={`text-xs ml-2 font-medium ${
                    item.interest ? "text-gray-400" : "text-[#A0622A]"
                  }`}
                >
                  {item.interest
                    ? `total R$ ${totalValue.toFixed(2).replace(".", ",")}`
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
