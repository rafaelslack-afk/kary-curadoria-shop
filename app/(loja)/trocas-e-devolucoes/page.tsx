import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  ShieldCheck,
  RefreshCw,
  Store,
  MessageCircle,
  Mail,
  X,
  ChevronRight,
} from "lucide-react";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Trocas e Devoluções",
  description:
    "Conheça a política de trocas e devoluções da Kary Curadoria. Seu direito garantido com transparência e agilidade.",
  openGraph: {
    title: "Trocas e Devoluções | Kary Curadoria",
    description: "Política de trocas e devoluções da Kary Curadoria.",
    url: "https://karycuradoria.com.br/trocas-e-devolucoes",
  },
};

// ── Dados ─────────────────────────────────────────────────────────────────────

const cards = [
  {
    icon: Clock,
    title: "Direito de Arrependimento",
    text: "7 dias após o recebimento para desistir da compra, conforme o CDC.",
  },
  {
    icon: ShieldCheck,
    title: "Defeito de Fabricação",
    text: "30 dias para acionar troca ou reembolso em caso de defeito.",
  },
  {
    icon: RefreshCw,
    title: "Troca de Tamanho ou Cor",
    text: "15 dias após o recebimento para solicitar troca.",
  },
  {
    icon: Store,
    title: "Troca na Loja Física",
    text: "Traga o produto até nossa loja no Brás e troque sem complicação.",
  },
];

const tableRows = [
  {
    situacao: "Arrependimento (CDC)",
    prazo: "7 dias do recebimento",
    frete: "Cliente envia, Kary reembolsa o frete",
    resolucao: "Reembolso integral",
  },
  {
    situacao: "Defeito de fabricação",
    prazo: "30 dias do recebimento",
    frete: "Kary arca com o frete de retorno",
    resolucao: "Troca ou reembolso integral",
  },
  {
    situacao: "Troca de tamanho ou cor",
    prazo: "15 dias do recebimento",
    frete: "Cliente responsável pelo envio",
    resolucao: "Crédito na loja Kary Curadoria",
  },
  {
    situacao: "Troca presencial na loja",
    prazo: "15 dias do recebimento",
    frete: "Sem frete",
    resolucao: "Troca ou crédito na loja",
  },
];

const steps = [
  {
    n: 1,
    title: "Entre em contato",
    text: "Fale conosco pelo WhatsApp (11) 94022-4088 ou pelo e-mail contato@karycuradoria.com.br informando o número do seu pedido e o motivo da solicitação.",
  },
  {
    n: 2,
    title: "Aguarde a aprovação",
    text: "Nossa equipe analisará sua solicitação em até 2 dias úteis e retornará com as instruções para envio.",
  },
  {
    n: 3,
    title: "Envie o produto",
    text: "Embale o produto com cuidado, com etiqueta original e sem sinais de uso. Envie pelos Correios com o código de rastreio.",
  },
  {
    n: 4,
    title: "Receba a resolução",
    text: "Após recebermos e conferirmos o produto, realizamos a troca ou o reembolso em até 5 dias úteis.",
  },
];

const semDireito = [
  "Produtos íntimos (calcinha, sutiã, meia-calça)",
  "Peças em promoção com desconto acima de 50%",
  "Produtos com etiqueta removida",
  "Produtos com sinais de uso, perfume ou maquiagem",
  "Produtos danificados pelo mau uso do cliente",
];

// ── Página ────────────────────────────────────────────────────────────────────

export default function TrocasEDevolucoesPage() {
  return (
    <main className="bg-[#EDE8DC] min-h-screen">

      {/* ── HERO ── */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="text-[10px] tracking-[0.28em] text-[#A0622A] uppercase mb-4">
          Kary Curadoria
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-medium text-[#5C3317] leading-tight mb-5"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Trocas e Devoluções
        </h1>
        <p className="text-base text-[#5C3317]/70 max-w-xl mx-auto leading-relaxed">
          Sua satisfação é nossa prioridade. Conheça nossa política e saiba como proceder.
        </p>
        <div className="mt-8 h-px bg-[#A0622A]/20 max-w-xs mx-auto" />
      </section>

      {/* ── CARDS RESUMO ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="bg-white/70 border border-[#A0622A]/15 rounded-xl p-6 flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-[#A0622A]/10 flex items-center justify-center shrink-0">
                <Icon size={18} strokeWidth={1.5} className="text-[#A0622A]" />
              </div>
              <div>
                <h3
                  className="font-serif text-[#5C3317] text-base font-medium mb-1.5 leading-snug"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                >
                  {title}
                </h3>
                <p className="text-sm text-[#5C3317]/65 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TABELA DE POLÍTICAS ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2
          className="font-serif text-2xl md:text-3xl font-medium text-[#5C3317] mb-8"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Nossa Política em Detalhes
        </h2>

        <div className="overflow-x-auto rounded-xl border border-[#A0622A]/15">
          <table className="w-full text-sm bg-white/70">
            <thead>
              <tr className="border-b border-[#A0622A]/15">
                {["Situação", "Prazo", "Frete", "Resolução"].map((col) => (
                  <th
                    key={col}
                    className="text-left text-[10px] tracking-[0.18em] text-[#A0622A] uppercase px-5 py-4 font-medium"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#A0622A]/10 last:border-0 ${
                    i % 2 === 1 ? "bg-[#F5F1EA]/50" : ""
                  }`}
                >
                  <td className="px-5 py-4 font-medium text-[#5C3317]">{row.situacao}</td>
                  <td className="px-5 py-4 text-[#5C3317]/70">{row.prazo}</td>
                  <td className="px-5 py-4 text-[#5C3317]/70">{row.frete}</td>
                  <td className="px-5 py-4 text-[#5C3317]/70">{row.resolucao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PASSO A PASSO ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2
          className="font-serif text-2xl md:text-3xl font-medium text-[#5C3317] mb-10"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Como Solicitar sua Troca ou Devolução
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {steps.map(({ n, title, text }) => (
            <div key={n} className="flex gap-5">
              <div className="shrink-0 w-10 h-10 rounded-full border-2 border-[#A0622A] flex items-center justify-center">
                <span
                  className="text-[#A0622A] font-serif text-base font-medium"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                >
                  {n}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-[#5C3317] mb-1.5">{title}</h3>
                <p className="text-sm text-[#5C3317]/65 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ITENS SEM DIREITO A TROCA ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2
          className="font-serif text-2xl md:text-3xl font-medium text-[#5C3317] mb-8"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Itens Sem Direito a Troca
        </h2>

        <div className="bg-white/70 border border-[#A0622A]/15 rounded-xl p-7">
          <ul className="space-y-3">
            {semDireito.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#A0622A]/10 flex items-center justify-center mt-0.5">
                  <X size={11} strokeWidth={2.5} className="text-[#A0622A]" />
                </span>
                <span className="text-sm text-[#5C3317]/75 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-[#F5F1EA]">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2
            className="font-serif text-2xl md:text-3xl font-medium text-[#5C3317] mb-4"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Ficou com dúvidas?
          </h2>
          <p className="text-sm text-[#5C3317]/65 max-w-md mx-auto leading-relaxed mb-10">
            Nossa equipe está pronta para te ajudar. Fale com a gente pelo WhatsApp ou e-mail.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/5511940224088"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#5C3317] text-[#EDE8DC] text-[11px] tracking-[0.2em] uppercase px-8 py-4 hover:bg-[#A0622A] transition-colors"
            >
              <MessageCircle size={14} strokeWidth={1.5} />
              WhatsApp
            </a>
            <a
              href="mailto:contato@karycuradoria.com.br"
              className="inline-flex items-center gap-2.5 border border-[#5C3317] text-[#5C3317] text-[11px] tracking-[0.2em] uppercase px-8 py-4 hover:bg-[#5C3317] hover:text-[#EDE8DC] transition-colors"
            >
              <Mail size={14} strokeWidth={1.5} />
              E-mail
            </a>
          </div>

          <div className="mt-12 pt-8 border-t border-[#A0622A]/20">
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-[#A0622A] hover:text-[#5C3317] transition-colors uppercase"
            >
              Continuar comprando
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
