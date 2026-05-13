import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  ShieldCheck,
  RefreshCw,
  MapPin,
  MessageCircle,
  Mail,
  X,
  ChevronRight,
  AlertTriangle,
  Check,
  Info,
} from "lucide-react";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Trocas e Devoluções",
  description:
    "Conheça a política completa de trocas e devoluções da Kary Curadoria. Prazos, condições de frete por região e procedimentos detalhados para sua tranquilidade.",
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
    text: "7 dias corridos após o recebimento para desistir da compra, conforme o CDC.",
  },
  {
    icon: ShieldCheck,
    title: "Defeito de Fabricação",
    text: "30 dias corridos após o recebimento para acionar troca ou reembolso. Kary Curadoria arca com todos os fretes.",
  },
  {
    icon: RefreshCw,
    title: "Troca de Tamanho ou Cor",
    text: "7 dias corridos após o recebimento para solicitar troca. Consulte as condições de frete por região.",
  },
  {
    icon: MapPin,
    title: "Troca na Loja Física",
    text: "7 dias corridos após o recebimento. Traga o produto até nossa loja no Brás e troque sem complicação.",
  },
];

const tableRows = [
  {
    situacao: "Arrependimento (CDC)",
    prazo: "7 dias corridos do recebimento",
    freteEnvio: "Cliente paga",
    freteReenvio: "Cliente paga",
    regiao: "Todas",
    resolucao: "Reembolso integral do produto",
  },
  {
    situacao: "Defeito de fabricação",
    prazo: "30 dias corridos do recebimento",
    freteEnvio: "Kary paga",
    freteReenvio: "Kary paga",
    regiao: "Todas",
    resolucao: "Troca ou reembolso integral",
  },
  {
    situacao: "Troca de tamanho ou cor",
    prazo: "7 dias corridos do recebimento",
    freteEnvio: "Cliente paga",
    freteReenvio: "Cliente paga 50%",
    regiao: "Sul / Sudeste / Centro-Oeste",
    resolucao: "Troca ou crédito na loja",
  },
  {
    situacao: "Troca de tamanho ou cor",
    prazo: "7 dias corridos do recebimento",
    freteEnvio: "Cliente paga",
    freteReenvio: "Cliente paga integralmente",
    regiao: "Norte / Nordeste",
    resolucao: "Troca ou crédito na loja",
  },
  {
    situacao: "Troca + upgrade ≥ R$ 180",
    prazo: "7 dias corridos do recebimento",
    freteEnvio: "Cliente paga",
    freteReenvio: "Kary paga",
    regiao: "Todas",
    resolucao: "Troca + envio do novo pedido",
  },
  {
    situacao: "Troca presencial (Brás)",
    prazo: "7 dias corridos do recebimento",
    freteEnvio: "Sem frete",
    freteReenvio: "Sem frete",
    regiao: "—",
    resolucao: "Troca ou crédito na loja",
  },
];

const steps = [
  {
    n: 1,
    title: "Solicite por e-mail",
    text: "Entre em contato pelo e-mail contato@karycuradoria.com.br informando seu nome completo, número do pedido, as peças a serem trocadas, o motivo da solicitação e qualquer observação que considere relevante.",
  },
  {
    n: 2,
    title: "Confirme seus dados",
    text: "Após o contato, nossa equipe irá confirmar os dados do seu endereço e as instruções para envio.",
  },
  {
    n: 3,
    title: "Embale e poste",
    text: "Envie o produto com a etiqueta original fixada, sem sinais de uso, sem odor e sem alterações. Você tem 5 dias corridos a partir da aprovação da troca pela Kary para realizar a postagem nos Correios.",
  },
  {
    n: 4,
    title: "Aguarde a análise",
    text: "Após recebermos o produto, nossa equipe verificará se todas as condições de devolução foram cumpridas.",
  },
  {
    n: 5,
    title: "Receba a resolução",
    text: "Confirmadas as condições, realizamos a troca ou o reembolso em até 5 dias úteis.",
  },
];

const condicoesProduto = [
  "O produto deve ser enviado com a etiqueta original fixada, sem sinais de uso, sem odor e sem ter sido lavado. O consumidor é responsável por danos causados por má utilização.",
  "Após o recebimento, nossa equipe realizará a verificação do produto. Confirmadas as condições, providenciaremos a troca, crédito ou reembolso conforme as regras desta política.",
  "As peças devolvidas não poderão ter sofrido qualquer alteração como bainhas, ajustes laterais, ajustes de altura ou modificações de qualquer outra natureza.",
];

const condicoesGerais = [
  "Produto devolvido sem comunicação prévia, fora do prazo ou com ausência de itens e acessórios que o acompanham será reenviado ao consumidor sem aviso prévio.",
  "Todos os produtos passarão por análise prévia. Constatado defeito ou descumprimento das condições de devolução, o produto será reenviado ao cliente.",
  "O prazo de 5 dias corridos para postagem é contado a partir da data de aprovação da troca pela Kary Curadoria, não da data de recebimento do pedido.",
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
                {[
                  "Situação",
                  "Prazo",
                  "Frete Envio (cliente→Kary)",
                  "Frete Reenvio (Kary→cliente)",
                  "Região",
                  "Resolução",
                ].map((col) => (
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
                  <td className="px-5 py-4 text-[#5C3317]/70 whitespace-nowrap">{row.prazo}</td>
                  <td className="px-5 py-4 text-[#5C3317]/70">{row.freteEnvio}</td>
                  <td className="px-5 py-4 text-[#5C3317]/70">{row.freteReenvio}</td>
                  <td className="px-5 py-4 text-[#5C3317]/70">{row.regiao}</td>
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

      {/* ── DEVOLUÇÃO INVOLUNTÁRIA PELOS CORREIOS ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2
          className="font-serif text-2xl md:text-3xl font-medium text-[#5C3317] mb-8"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Devolução Involuntária pelos Correios
        </h2>

        <div
          style={{
            backgroundColor: "#FFF3CD",
            borderLeft: "4px solid #A0622A",
            borderRadius: 8,
            padding: 16,
          }}
          className="flex gap-4"
        >
          <AlertTriangle
            size={20}
            strokeWidth={1.75}
            className="text-[#A0622A] shrink-0 mt-0.5"
          />
          <p className="text-sm text-[#5C3317]/80 leading-relaxed">
            Caso o pedido seja devolvido pelos Correios com status de{" "}
            <strong>&ldquo;endereço inválido&rdquo;</strong>,{" "}
            <strong>&ldquo;destinatário desconhecido&rdquo;</strong>,{" "}
            <strong>&ldquo;mudou-se&rdquo;</strong>,{" "}
            <strong>&ldquo;proprietário não encontrado&rdquo;</strong>,{" "}
            <strong>&ldquo;aguardando retirada&rdquo;</strong> ou situação semelhante, os custos
            com a postagem de reenvio serão de responsabilidade do consumidor.
            <br />
            <br />
            O pagamento do novo frete deverá ser realizado via PIX ou link de pagamento enviado
            pela nossa equipe.
          </p>
        </div>
      </section>

      {/* ── CONDIÇÕES DO PRODUTO PARA TROCA ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2
          className="font-serif text-2xl md:text-3xl font-medium text-[#5C3317] mb-8"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Condições do Produto para Troca
        </h2>

        <div className="bg-white/70 border border-[#A0622A]/15 rounded-xl p-7">
          <ul className="space-y-4">
            {condicoesProduto.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#A0622A]/10 flex items-center justify-center mt-0.5">
                  <Check size={11} strokeWidth={2.5} className="text-[#A0622A]" />
                </span>
                <span className="text-sm text-[#5C3317]/75 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CONDIÇÕES GERAIS ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2
          className="font-serif text-2xl md:text-3xl font-medium text-[#5C3317] mb-8"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Condições Gerais
        </h2>

        <div className="bg-white/70 border border-[#A0622A]/15 rounded-xl p-7">
          <ul className="space-y-4">
            {condicoesGerais.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#A0622A]/10 flex items-center justify-center mt-0.5">
                  <Info size={11} strokeWidth={2.5} className="text-[#A0622A]" />
                </span>
                <span className="text-sm text-[#5C3317]/75 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
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
