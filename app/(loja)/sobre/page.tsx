import type { Metadata } from "next";
import Link from "next/link";
import { Star, Heart, MapPin, RefreshCw, MessageCircle } from "lucide-react";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Sobre Nós",
  description:
    "Conheça a Kary Curadoria — mais de 30 anos de experiência em moda feminina no Brás, São Paulo. Curadoria especializada para cada cliente.",
  openGraph: {
    title: "Sobre Nós | Kary Curadoria",
    description:
      "Mais de 30 anos de moda feminina. Uma curadoria feita para você.",
    url: "https://karycuradoria.com.br/sobre",
  },
};

// ── Dados ─────────────────────────────────────────────────────────────────────

const stats = [
  {
    number: "+30",
    label: "Anos de experiência no mercado de moda e confecções",
  },
  {
    number: "100%",
    label: "Peças selecionadas com curadoria especializada no Brás, SP",
  },
  {
    number: "1 a 1",
    label: "Atendimento personalizado para cada cliente, online e presencial",
  },
];

const valores = [
  {
    icon: Star,
    title: "Qualidade Acima de Tudo",
    text: "Selecionamos apenas peças que passariam no nosso próprio guarda-roupa.",
  },
  {
    icon: Heart,
    title: "Atendimento Humano",
    text: "Cada cliente é única. Nosso atendimento reflete isso — próximo, atencioso e sem pressão.",
  },
  {
    icon: MapPin,
    title: "Raízes no Brás",
    text: "Estar no maior polo de moda do Brasil nos dá acesso ao melhor do mercado antes de todo mundo.",
  },
  {
    icon: RefreshCw,
    title: "Moda que Faz Sentido",
    text: "Peças clássicas, elegantes e versáteis. Moda que não passa de moda.",
  },
];

// ── Página ────────────────────────────────────────────────────────────────────

export default function SobrePage() {
  return (
    <main className="bg-[#EDE8DC] min-h-screen">

      {/* ── HERO ── */}
      <section
        className="relative py-24 px-6 text-center"
        style={{ backgroundColor: "#D9D3C7" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.28em] text-[#A0622A] uppercase mb-4">
            Kary Curadoria
          </p>
          <h1
            className="font-serif text-4xl md:text-6xl font-medium text-[#5C3317] leading-tight mb-6"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Sobre a Kary Curadoria
          </h1>
          <p
            className="text-base md:text-lg text-[#5C3317]/70 max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Três décadas de moda. Uma curadoria feita especialmente para você.
          </p>
          <div className="mt-10 h-px bg-[#A0622A]/25 max-w-xs mx-auto" />
        </div>
      </section>

      {/* ── SEÇÃO 1 — Nossa História ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Texto */}
          <div>
            <p className="text-[10px] tracking-[0.25em] text-[#A0622A] uppercase mb-3">
              Nossa História
            </p>
            <h2
              className="font-serif text-3xl md:text-4xl font-medium text-[#5C3317] mb-6 leading-tight"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              Do Brás para o Brasil
            </h2>
            <div
              className="space-y-4 text-[#5C3317]/75 text-sm leading-relaxed"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              <p>
                A Kary Curadoria nasceu de uma paixão construída ao longo de mais de 30 anos
                no coração do maior polo de moda do Brasil — o Brás, em São Paulo.
              </p>
              <p>
                Com décadas de experiência no mercado de confecções, nossa equipe conhece
                cada detalhe do universo da moda feminina: os tecidos, os fornecedores,
                os cortes que valorizam, as peças que duram — e, acima de tudo, o que
                cada mulher realmente quer encontrar quando está em busca do look perfeito.
              </p>
              <p>
                Essa expertise é o que transforma nossa loja em algo além de um e-commerce:
                somos uma curadoria viva, selecionada a dedo para oferecer o melhor da
                moda clássica e elegante.
              </p>
            </div>
          </div>

          {/* Elemento decorativo */}
          <div className="flex items-center justify-center">
            <div className="relative w-72 h-72 flex items-center justify-center">
              {/* Círculo externo */}
              <div className="absolute inset-0 rounded-full border border-[#A0622A]/20" />
              {/* Círculo médio */}
              <div className="absolute inset-6 rounded-full border border-[#A0622A]/15" />
              {/* Conteúdo central */}
              <div className="relative text-center px-8">
                <p
                  className="font-serif text-6xl font-medium text-[#A0622A] leading-none"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                >
                  30
                </p>
                <div className="h-px bg-[#A0622A]/30 my-3 mx-4" />
                <p
                  className="text-[10px] tracking-[0.22em] text-[#5C3317]/60 uppercase leading-relaxed"
                  style={{ fontFamily: "Jost, sans-serif" }}
                >
                  anos de<br />experiência
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SEÇÃO 2 — Números ── */}
      <section className="py-16 px-6" style={{ backgroundColor: "#A0622A" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/15">
          {stats.map(({ number, label }) => (
            <div
              key={number}
              className="bg-[#A0622A] px-8 py-10 text-center"
            >
              <p
                className="font-serif text-5xl md:text-6xl font-medium text-white mb-4 leading-none"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
              >
                {number}
              </p>
              <p
                className="text-white/75 text-xs leading-relaxed max-w-[180px] mx-auto"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SEÇÃO 3 — Nossa Curadoria ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#F5F1EA" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.25em] text-[#A0622A] uppercase mb-3">
            Nossa Filosofia
          </p>
          <h2
            className="font-serif text-3xl md:text-4xl font-medium text-[#5C3317] mb-10 leading-tight"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            O Que é a Nossa Curadoria?
          </h2>
          <div
            className="space-y-5 text-[#5C3317]/70 text-sm leading-relaxed text-left max-w-2xl mx-auto"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            <p>
              Curadoria não é apenas selecionar roupas — é entender quem vai vesti-las.
            </p>
            <p>
              Na Kary Curadoria, cada peça passa por um filtro criterioso antes de chegar
              até você: qualidade do tecido, caimento, versatilidade, atemporalidade e,
              principalmente, a capacidade de fazer cada mulher se sentir bem com o que veste.
            </p>
            <p>
              Não trabalhamos com tendências passageiras. Trabalhamos com estilo. Com peças
              que compõem guarda-roupas reais, que transitam do dia a dia ao trabalho, do
              casual ao sofisticado — sempre com elegância e personalidade.
            </p>
          </div>

          {/* Citação decorativa */}
          <div className="mt-12 border-l-2 border-[#A0622A]/40 pl-6 text-left max-w-md mx-auto">
            <p
              className="font-serif text-xl text-[#5C3317] italic leading-relaxed"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              &ldquo;Cada peça tem uma história.<br />Encontre a sua.&rdquo;
            </p>
            <p
              className="mt-2 text-[10px] tracking-[0.2em] text-[#A0622A] uppercase"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              — Kary Curadoria
            </p>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 4 — Valores ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-[10px] tracking-[0.25em] text-[#A0622A] uppercase mb-3">
            Nossos Valores
          </p>
          <h2
            className="font-serif text-3xl md:text-4xl font-medium text-[#5C3317] leading-tight"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            O Que Nos Move
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {valores.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="bg-white/70 border border-[#A0622A]/15 rounded-xl p-6 flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-[#A0622A]/10 flex items-center justify-center shrink-0">
                <Icon size={18} strokeWidth={1.5} className="text-[#A0622A]" />
              </div>
              <div>
                <h3
                  className="font-serif text-[#5C3317] text-base font-medium mb-2 leading-snug"
                  style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm text-[#5C3317]/65 leading-relaxed"
                  style={{ fontFamily: "Jost, sans-serif" }}
                >
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SEÇÃO 5 — Onde Estamos ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#F5F1EA" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          {/* Texto */}
          <div>
            <p className="text-[10px] tracking-[0.25em] text-[#A0622A] uppercase mb-3">
              Loja Física
            </p>
            <h2
              className="font-serif text-3xl md:text-4xl font-medium text-[#5C3317] mb-6 leading-tight"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              Venha nos Visitar
            </h2>
            <p
              className="text-sm text-[#5C3317]/70 leading-relaxed mb-8"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              Nossa loja física fica no coração do Brás, um dos maiores e mais tradicionais
              polos de moda da América Latina. Um lugar onde a moda acontece todos os dias —
              e onde você pode encontrar pessoalmente as peças que chamaram sua atenção online.
            </p>
            <a
              href="https://wa.me/5511940224088"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#5C3317] text-[#EDE8DC] text-[11px] tracking-[0.2em] uppercase px-7 py-3.5 hover:bg-[#A0622A] transition-colors"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              <MessageCircle size={14} strokeWidth={1.5} />
              Fale pelo WhatsApp
            </a>
          </div>

          {/* Card de endereço */}
          <div className="bg-white/80 border border-[#A0622A]/15 rounded-xl p-8">
            <p
              className="text-[10px] tracking-[0.22em] text-[#A0622A] uppercase mb-6"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              Nosso Endereço
            </p>
            <ul className="space-y-4">
              {[
                {
                  emoji: "📍",
                  lines: ["Rua Min. Firmino Whitaker, 49/55", "Box 142 — Brás, São Paulo / SP"],
                },
                { emoji: "📱", lines: ["WhatsApp: (11) 94022-4088"] },
                { emoji: "📧", lines: ["contato@karycuradoria.com.br"] },
                { emoji: "📸", lines: ["@karycuradoria"] },
              ].map(({ emoji, lines }) => (
                <li key={emoji} className="flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5 shrink-0">{emoji}</span>
                  <div>
                    {lines.map((line) => (
                      <p
                        key={line}
                        className="text-sm text-[#5C3317]/80 leading-relaxed"
                        style={{ fontFamily: "Jost, sans-serif" }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* ── SEÇÃO 6 — CTA Final ── */}
      <section className="py-20 px-6" style={{ backgroundColor: "#A0622A" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-serif text-3xl md:text-4xl font-medium text-white mb-4 leading-tight"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Conheça Nossa Coleção
          </h2>
          <p
            className="text-white/75 text-sm leading-relaxed mb-10"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Cada peça tem uma história. Encontre a sua.
          </p>
          <Link
            href="/produtos"
            className="inline-flex items-center gap-2 bg-white text-[#A0622A] text-[11px] tracking-[0.22em] uppercase px-10 py-4 hover:bg-[#EDE8DC] transition-colors font-medium"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Ver Coleção
          </Link>
        </div>
      </section>

    </main>
  );
}
