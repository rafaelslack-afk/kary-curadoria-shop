import Link from "next/link";
import { Instagram, Mail, MapPin, Shield } from "lucide-react";
import { buildWhatsAppUrl, INSTAGRAM_URL } from "@/lib/site";

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.716a.5.5 0 0 0 .608.625l5.926-1.51A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.956 0-3.792-.56-5.35-1.53l-.39-.24-4.04 1.03 1.03-3.95-.25-.41A9.941 9.941 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-kc-dark text-kc-cream/75">

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <div className="font-serif text-xl font-medium text-kc-cream tracking-[0.12em] leading-none mb-0.5">
              KARY
            </div>
            <div className="text-[9px] tracking-[0.28em] text-kc-muted mb-4">
              CURADORIA
            </div>
            <p className="text-xs leading-relaxed text-kc-cream/60 max-w-[200px]">
              Moda feminina com elegância e curadoria exclusiva no coração do Brás.
            </p>
          </div>

          {/* Redes Sociais e Contato */}
          <div>
            <h3 className="text-[10px] tracking-[0.22em] text-kc-muted uppercase mb-4">
              Redes Sociais
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs text-kc-cream/70 hover:text-kc-cream transition-colors"
                >
                  <Instagram size={14} strokeWidth={1.5} />
                  @karycuradoria
                </a>
              </li>
              <li>
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs text-kc-cream/70 hover:text-kc-cream transition-colors"
                >
                  <WhatsAppIcon size={14} />
                  +55 11 94022-4088
                </a>
              </li>
              <li>
                <a
                  href="mailto:contato@karycuradoria.com.br"
                  className="flex items-center gap-2.5 text-xs text-kc-cream/70 hover:text-kc-cream transition-colors"
                >
                  <Mail size={14} strokeWidth={1.5} />
                  contato@karycuradoria.com.br
                </a>
              </li>
            </ul>
          </div>

          {/* Loja Física */}
          <div>
            <h3 className="text-[10px] tracking-[0.22em] text-kc-muted uppercase mb-4">
              Loja Física
            </h3>
            <div className="flex items-start gap-2.5">
              <MapPin size={14} strokeWidth={1.5} className="text-kc-muted shrink-0 mt-0.5" />
              <address className="not-italic text-xs text-kc-cream/70 leading-relaxed">
                Rua Min. Firmino Whitaker, 49/55<br />
                Box 142 — Brás<br />
                São Paulo — SP
              </address>
            </div>
            <a
              href="https://maps.google.com/?q=Rua+Ministro+Firmino+Whitaker+49+Brás+São+Paulo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-[10px] tracking-[0.16em] text-kc-cream/70 hover:text-kc-cream transition-colors uppercase"
              style={{ border: "1px solid rgba(237,232,220,0.3)", padding: "8px 16px" }}
            >
              Ver no Mapa
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mt-8 pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

            {/* Nav Links */}
            <nav className="flex flex-wrap gap-4">
              {[
                { href: "#", label: "Sobre nós" },
                { href: "#", label: "Trocas e devoluções" },
                { href: "#", label: "Política de privacidade" },
                { href: "/rastrear", label: "Rastrear pedido" },
              ].map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-[10px] tracking-[0.1em] text-kc-cream/50 hover:text-kc-cream/90 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Payment badges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] text-kc-cream/40">
                <Shield size={11} strokeWidth={1.5} />
                Pagamento seguro
              </div>
              {["PIX", "CARTÃO", "BOLETO"].map((m) => (
                <span
                  key={m}
                  className="text-[8px] tracking-[0.1em] border border-white/15 text-kc-cream/40 px-2 py-1"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-kc-cream/30 tracking-wider mt-4">
            © 2026 Kary Curadoria · karycuradoria.com.br
          </p>
        </div>
      </div>
    </footer>
  );
}
