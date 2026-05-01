import { CreditCard, Truck, ShieldCheck, Clock } from "lucide-react";

const benefits = [
  { icon: CreditCard, text: "3x sem juros" },
  { icon: Truck,      text: "Frete grátis SP acima de R$ 400" },
  { icon: ShieldCheck,text: "Troca garantida" },
  { icon: Clock,      text: "Entrega para todo Brasil" },
];

export function BenefitsBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-0 px-5 py-3.5 bg-[#F5F1EA] border border-[#D9D3C7] rounded-lg">
      {benefits.map(({ icon: Icon, text }, i) => (
        <div key={text} className="flex items-center">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-[#A0622A] shrink-0" />
            <span className="text-[13px] font-medium text-[#5C3317] whitespace-nowrap">
              {text}
            </span>
          </div>
          {i < benefits.length - 1 && (
            <div className="hidden md:block w-px h-[18px] bg-[#D9D3C7] mx-5" />
          )}
        </div>
      ))}
    </div>
  );
}
