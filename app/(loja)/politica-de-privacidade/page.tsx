import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Saiba como a Kary Curadoria coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
  openGraph: {
    title: "Política de Privacidade | Kary Curadoria",
    url: "https://karycuradoria.com.br/politica-de-privacidade",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const serif = { fontFamily: "Cormorant Garamond, Georgia, serif" } as const;
const jost  = { fontFamily: "Jost, sans-serif" } as const;

function SectionTitle({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2
      className="font-serif text-xl md:text-2xl font-medium text-[#5C3317] mt-12 mb-4 flex items-baseline gap-2.5"
      style={serif}
    >
      <span className="text-[#A0622A] text-base font-normal" style={jost}>{n}.</span>
      {children}
    </h2>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-3" style={jost}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-[#5C3317]/70 leading-relaxed">
          <span className="mt-2 w-1 h-1 rounded-full bg-[#A0622A] shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-[#5C3317]/70 leading-relaxed space-y-3" style={jost}>
      {children}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="bg-[#EDE8DC] min-h-screen">

      {/* ── HERO ── */}
      <section className="max-w-[800px] mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-[10px] tracking-[0.28em] text-[#A0622A] uppercase mb-4" style={jost}>
          Kary Curadoria
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-medium text-[#5C3317] leading-tight mb-4"
          style={serif}
        >
          Política de Privacidade
        </h1>
        <p className="text-xs text-[#A0622A]/80 tracking-wide mb-6" style={jost}>
          Última atualização: abril de 2026
        </p>
        <p className="text-sm text-[#5C3317]/65 leading-relaxed max-w-xl mx-auto" style={jost}>
          A Kary Curadoria está comprometida com a privacidade e a proteção dos seus dados pessoais.
          Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações,
          em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>
        <div className="mt-8 h-px bg-[#A0622A]/20 max-w-xs mx-auto" />
      </section>

      {/* ── DOCUMENTO ── */}
      <section className="max-w-[800px] mx-auto px-6 pb-20">

        {/* 1. Controlador dos Dados */}
        <SectionTitle n="1">Controlador dos Dados</SectionTitle>
        <Prose>
          <p>
            <strong className="text-[#5C3317] font-medium">Kary Curadoria</strong><br />
            Rua Min. Firmino Whitaker, 49/55 — Box 142<br />
            Brás, São Paulo / SP — CEP 03027-000<br />
            E-mail:{" "}
            <a href="mailto:contato@karycuradoria.com.br" className="text-[#A0622A] hover:underline">
              contato@karycuradoria.com.br
            </a>
            <br />
            WhatsApp:{" "}
            <a href="https://wa.me/5511940224088" target="_blank" rel="noopener noreferrer" className="text-[#A0622A] hover:underline">
              (11) 94022-4088
            </a>
          </p>
          <p>
            Para questões relacionadas à privacidade e aos seus dados pessoais, entre em contato
            diretamente pelos canais acima.
          </p>
        </Prose>

        {/* 2. Quais Dados Coletamos */}
        <SectionTitle n="2">Quais Dados Coletamos</SectionTitle>
        <Prose>
          <p>Coletamos apenas os dados necessários para a prestação dos nossos serviços:</p>
        </Prose>

        <p className="text-[11px] tracking-[0.18em] text-[#A0622A] uppercase mt-5 mb-1" style={jost}>
          Dados fornecidos por você
        </p>
        <BulletList items={[
          "Nome completo",
          "E-mail",
          "Telefone / WhatsApp",
          "CPF (apenas quando necessário para emissão de nota fiscal ou boleto)",
          "Endereço de entrega (CEP, logradouro, número, complemento, cidade, estado)",
        ]} />

        <p className="text-[11px] tracking-[0.18em] text-[#A0622A] uppercase mt-5 mb-1" style={jost}>
          Dados gerados automaticamente
        </p>
        <BulletList items={[
          "Dados de navegação (páginas visitadas, tempo de sessão, origem do acesso)",
          "Informações do dispositivo (tipo, sistema operacional, navegador)",
          "Endereço IP",
          "Cookies e tecnologias similares",
        ]} />

        <p className="text-[11px] tracking-[0.18em] text-[#A0622A] uppercase mt-5 mb-1" style={jost}>
          Dados de transação
        </p>
        <BulletList items={[
          "Histórico de pedidos",
          "Itens adicionados ao carrinho",
          "Método de pagamento escolhido (não armazenamos dados de cartão — processados exclusivamente pelo Mercado Pago)",
        ]} />

        {/* 3. Como Utilizamos */}
        <SectionTitle n="3">Como Utilizamos Seus Dados</SectionTitle>
        <Prose>
          <p>Seus dados são utilizados para:</p>
        </Prose>
        <BulletList items={[
          "Processar e entregar seus pedidos",
          "Enviar confirmações e atualizações de pedido por e-mail",
          "Calcular frete e prazo de entrega",
          "Emitir nota fiscal quando solicitado",
          "Responder dúvidas e solicitações de suporte",
          "Enviar comunicações de marketing (somente com seu consentimento)",
          "Recuperar carrinhos abandonados mediante contato via WhatsApp ou e-mail",
          "Melhorar a experiência da plataforma com base em dados de navegação",
          "Cumprir obrigações legais e regulatórias",
        ]} />

        {/* 4. Compartilhamento */}
        <SectionTitle n="4">Compartilhamento de Dados</SectionTitle>
        <Prose>
          <p>
            Não vendemos nem alugamos seus dados a terceiros. Compartilhamos apenas com parceiros
            essenciais para a prestação dos nossos serviços:
          </p>
        </Prose>
        <BulletList items={[
          "Mercado Pago: processamento de pagamentos (Pix, cartão, boleto)",
          "Correios: entrega dos pedidos (nome e endereço de entrega)",
          "Supabase: infraestrutura de banco de dados (servidores seguros)",
          "Google Analytics: análise de navegação de forma anonimizada",
          "Resend: envio de e-mails transacionais",
        ]} />
        <Prose>
          <p className="mt-3">
            Todos os parceiros operam sob suas próprias políticas de privacidade e estão em
            conformidade com a LGPD.
          </p>
        </Prose>

        {/* 5. Cookies */}
        <SectionTitle n="5">Cookies e Tecnologias de Rastreamento</SectionTitle>
        <Prose>
          <p>Utilizamos cookies para:</p>
        </Prose>
        <BulletList items={[
          "Manter itens no carrinho de compras",
          "Manter sua sessão ativa após login",
          "Analisar o comportamento de navegação (Google Analytics — dados anonimizados)",
          "Melhorar a performance do site",
        ]} />
        <Prose>
          <p className="mt-3">
            Você pode desativar os cookies nas configurações do seu navegador. A desativação pode
            afetar algumas funcionalidades do site, como o carrinho de compras.
          </p>
        </Prose>

        {/* 6. Armazenamento e Segurança */}
        <SectionTitle n="6">Armazenamento e Segurança</SectionTitle>
        <Prose>
          <p>
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (SSL/TLS)
            e em repouso. Adotamos medidas técnicas e organizacionais adequadas para proteger suas
            informações contra acesso não autorizado, perda ou destruição.
          </p>
          <p>
            Dados de pedidos são mantidos pelo período mínimo exigido pela legislação fiscal
            brasileira (5 anos). Dados de marketing são mantidos até que você solicite a exclusão.
          </p>
        </Prose>

        {/* 7. Seus Direitos */}
        <SectionTitle n="7">Seus Direitos como Titular dos Dados</SectionTitle>
        <Prose>
          <p>Conforme a LGPD, você tem direito a:</p>
        </Prose>
        <BulletList items={[
          "Confirmação: saber se tratamos seus dados",
          "Acesso: receber cópia dos seus dados",
          "Correção: corrigir dados incompletos ou desatualizados",
          "Anonimização ou exclusão: solicitar a remoção dos seus dados quando não forem mais necessários",
          "Portabilidade: receber seus dados em formato estruturado",
          "Revogação do consentimento: retirar seu consentimento para marketing a qualquer momento",
          "Oposição: opor-se ao tratamento de dados",
        ]} />
        <Prose>
          <p className="mt-3">
            Para exercer qualquer direito, entre em contato pelo e-mail{" "}
            <a href="mailto:contato@karycuradoria.com.br" className="text-[#A0622A] hover:underline">
              contato@karycuradoria.com.br
            </a>{" "}
            com o assunto <em>&ldquo;Privacidade — [seu direito]&rdquo;</em>. Responderemos em até
            15 dias úteis.
          </p>
        </Prose>

        {/* 8. Menores de Idade */}
        <SectionTitle n="8">Menores de Idade</SectionTitle>
        <Prose>
          <p>
            Nossos serviços não são direcionados a menores de 18 anos. Não coletamos
            intencionalmente dados de menores. Se você acredita que coletamos dados de um menor,
            entre em contato para que possamos excluí-los imediatamente.
          </p>
        </Prose>

        {/* 9. Alterações */}
        <SectionTitle n="9">Alterações nesta Política</SectionTitle>
        <Prose>
          <p>
            Podemos atualizar esta política periodicamente. Alterações significativas serão
            comunicadas por e-mail ou por aviso em destaque no site. A data de &ldquo;última
            atualização&rdquo; no topo desta página indica quando a versão atual foi publicada.
            O uso continuado da plataforma após as alterações implica aceitação da nova política.
          </p>
        </Prose>

        {/* 10. Contato */}
        <SectionTitle n="10">Fale Conosco</SectionTitle>
        <Prose>
          <p>
            Dúvidas sobre esta política ou sobre seus dados pessoais? Entre em contato:
          </p>
        </Prose>

        {/* Card de contato */}
        <div
          className="mt-6 rounded-xl border border-[#A0622A]/15 p-7"
          style={{ backgroundColor: "#F5F1EA" }}
        >
          <ul className="space-y-3 mb-7">
            {[
              { emoji: "📧", text: "contato@karycuradoria.com.br", href: "mailto:contato@karycuradoria.com.br" },
              { emoji: "📱", text: "(11) 94022-4088", href: "https://wa.me/5511940224088" },
              { emoji: "📍", text: "Rua Min. Firmino Whitaker, 49/55 — Box 142, Brás, São Paulo / SP", href: null },
            ].map(({ emoji, text, href }) => (
              <li key={emoji} className="flex items-start gap-3">
                <span className="text-base shrink-0 leading-none mt-0.5">{emoji}</span>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-sm text-[#A0622A] hover:text-[#5C3317] transition-colors leading-relaxed"
                    style={jost}
                  >
                    {text}
                  </a>
                ) : (
                  <span className="text-sm text-[#5C3317]/70 leading-relaxed" style={jost}>
                    {text}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <a
            href="https://wa.me/5511940224088"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#5C3317] text-[#EDE8DC] text-[11px] tracking-[0.2em] uppercase px-7 py-3.5 hover:bg-[#A0622A] transition-colors"
            style={jost}
          >
            <MessageCircle size={14} strokeWidth={1.5} />
            Falar pelo WhatsApp
          </a>
        </div>

        {/* Divisor final */}
        <div className="mt-16 h-px bg-[#A0622A]/15" />
        <p className="mt-5 text-[11px] text-[#5C3317]/40 text-center leading-relaxed" style={jost}>
          © {new Date().getFullYear()} Kary Curadoria. Todos os direitos reservados.<br />
          Esta política é regida pela legislação brasileira — LGPD (Lei nº 13.709/2018).
        </p>

      </section>
    </main>
  );
}
