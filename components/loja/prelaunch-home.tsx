import { buildWhatsAppUrl, INSTAGRAM_URL } from "@/lib/site";

interface Props {
  launchLabel: string | null;
}

export function PrelaunchHome({ launchLabel }: Props) {
  return (
    <main className="min-h-screen bg-kc-cream text-kc-dark">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(160,98,42,0.12),_transparent_38%),linear-gradient(135deg,_rgba(92,51,23,0.05),_transparent_45%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="text-[10px] tracking-[0.32em] text-kc-muted uppercase mb-4">
              Lancamento em preparacao
            </p>
            <div className="mb-6">
              <div className="font-serif text-4xl md:text-6xl leading-none tracking-[0.14em] text-kc-dark">
                KARY
              </div>
              <div className="text-[11px] tracking-[0.42em] text-kc-muted mt-2 uppercase">
                Curadoria
              </div>
            </div>

            <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-5">
              Nossa loja virtual esta em fase final de construcao.
            </h1>
            <p className="text-sm md:text-base text-kc-dark/75 leading-relaxed max-w-2xl">
              Estamos preparando a experiencia online da Kary Curadoria com o mesmo cuidado da
              nossa loja fisica no Bras: moda feminina atemporal, alfaiataria impecavel e luxo
              silencioso.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="border border-kc-line bg-white/70 backdrop-blur-sm p-5">
                <p className="text-[10px] tracking-[0.24em] text-kc-muted uppercase mb-2">
                  Previsao de lancamento
                </p>
                <p className="font-serif text-xl text-kc-dark">
                  {launchLabel ?? "Data a ser divulgada em breve"}
                </p>
              </div>
              <div className="border border-kc-line bg-white/70 backdrop-blur-sm p-5">
                <p className="text-[10px] tracking-[0.24em] text-kc-muted uppercase mb-2">
                  Atendimento atual
                </p>
                <p className="text-sm text-kc-dark/80 leading-relaxed">
                  Enquanto isso, fale com a gente pelo Instagram ou WhatsApp e visite nossa loja
                  fisica no Bras.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-kc text-white text-[11px] tracking-[0.18em] px-6 py-3.5 uppercase hover:bg-kc-dark transition-colors"
              >
                Acompanhar no Instagram
              </a>
              <a
                href={buildWhatsAppUrl("Ola! Quero ser avisada quando a loja online da Kary Curadoria for lancada.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border border-kc text-kc text-[11px] tracking-[0.18em] px-6 py-3.5 uppercase hover:bg-kc hover:text-white transition-colors"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <div className="border border-kc-line bg-white/65 p-5">
              <p className="text-[10px] tracking-[0.24em] text-kc-muted uppercase mb-2">Loja fisica</p>
              <p className="text-sm text-kc-dark/80 leading-relaxed">
                Rua Min. Firmino Whitaker, 49/55
                <br />
                Box 142, Bras
                <br />
                Sao Paulo - SP
              </p>
            </div>
            <div className="border border-kc-line bg-white/65 p-5">
              <p className="text-[10px] tracking-[0.24em] text-kc-muted uppercase mb-2">Posicionamento</p>
              <p className="text-sm text-kc-dark/80 leading-relaxed">
                Pecas classicas, versateis e com caimento perfeito, sempre com curadoria e
                excelente custo-beneficio.
              </p>
            </div>
            <div className="border border-kc-line bg-white/65 p-5">
              <p className="text-[10px] tracking-[0.24em] text-kc-muted uppercase mb-2">Lembrete</p>
              <p className="text-sm text-kc-dark/80 leading-relaxed">
                A loja online ainda nao foi aberta ao publico. Em breve liberaremos o acesso
                completo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
