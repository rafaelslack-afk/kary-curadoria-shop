import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductCard } from "@/components/loja/product-card";
import { BannerCarousel } from "@/components/loja/banner-carousel";
import { PrelaunchHome } from "@/components/loja/prelaunch-home";
import { buildWhatsAppUrl, INSTAGRAM_URL } from "@/lib/site";
import { formatLaunchDatePtBr, isStorePrelaunchActive } from "@/lib/store-launch";
import type { Product, Banner } from "@/types/database";

async function getActiveBanners(): Promise<Banner[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("banners")
      .select("id, title, subtitle, button_text, button_link, image_desktop, image_mobile, text_position, text_color, order_index")
      .eq("active", true)
      .order("order_index", { ascending: true });
    return (data ?? []) as Banner[];
  } catch {
    return [];
  }
}

async function getFeaturedProducts() {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(`*, product_variants(stock_qty)`)
      .eq("active", true)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(4);

    return (data ?? []).map((p) => ({
      ...p,
      total_stock: (p.product_variants as { stock_qty: number }[]).reduce(
        (sum: number, v: { stock_qty: number }) => sum + v.stock_qty,
        0
      ),
    }));
  } catch {
    return []; // banco acordando — mostra placeholders
  }
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export default async function Home() {
  if (isStorePrelaunchActive()) {
    return <PrelaunchHome launchLabel={formatLaunchDatePtBr()} />;
  }

  const [featured, banners] = await Promise.all([
    getFeaturedProducts(),
    getActiveBanners(),
  ]);

  return (
    <>
      {/* ── HERO / BANNER CAROUSEL ── */}
      <BannerCarousel banners={banners} />

      {/* ── CATEGORIAS ── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-[10px] tracking-[0.26em] text-kc-muted mb-1.5 uppercase">Explore</p>
        <h2 className="font-serif text-[22px] font-medium text-kc-dark mb-6">
          Nossas Categorias
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              href: "/produtos?categoria=conjuntos-de-linho",
              title: "Conjuntos de Linho",
              desc: "Frescor e elegância na fibra natural que mais respira",
              icon: (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect x="10" y="4" width="16" height="28" rx="1" stroke="#A0622A" strokeWidth="1.2" />
                  <line x1="10" y1="16" x2="26" y2="16" stroke="#A0622A" strokeWidth="0.8" />
                  <path d="M10 8 Q6 10 6 16 Q6 24 10 28" stroke="#A0622A" strokeWidth="1" fill="none" />
                  <path d="M26 8 Q30 10 30 16 Q30 24 26 28" stroke="#A0622A" strokeWidth="1" fill="none" />
                </svg>
              ),
            },
            {
              href: "/produtos?categoria=alfaiataria-casual",
              title: "Alfaiataria Casual",
              desc: "Cortes precisos para um estilo sofisticado sem esforço",
              icon: (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M12 4 L8 10 L8 28 L28 28 L28 10 L24 4" stroke="#A0622A" strokeWidth="1.2" fill="none" />
                  <path d="M12 4 L14 10 L18 8 L22 10 L24 4" stroke="#A0622A" strokeWidth="1.2" fill="none" />
                  <line x1="8" y1="16" x2="28" y2="16" stroke="#A0622A" strokeWidth="0.8" />
                  <line x1="14" y1="22" x2="22" y2="22" stroke="#A0622A" strokeWidth="0.8" />
                </svg>
              ),
            },
          ].map(({ href, title, desc, icon }) => (
            <Link
              key={href}
              href={href}
              className="group bg-kc-light border border-kc-line p-8 text-center relative overflow-hidden hover:border-kc transition-colors"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-kc scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className="flex justify-center mb-4">{icon}</div>
              <h3 className="font-serif text-[17px] font-medium text-kc-dark mb-2 tracking-wide">
                {title}
              </h3>
              <p className="text-[11px] text-kc-muted leading-relaxed mb-4">{desc}</p>
              <span className="text-[10px] tracking-[0.18em] text-kc uppercase group-hover:underline underline-offset-2">
                Ver Coleção →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="h-px bg-kc-line mx-6" />

      <section id="nossa-loja" className="max-w-7xl mx-auto px-6 py-10 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-stretch">
          <div className="bg-kc-light border border-kc-line p-8 md:p-10">
            <p className="text-[10px] tracking-[0.26em] text-kc-muted mb-1.5 uppercase">Nossa Loja</p>
            <h2 className="font-serif text-[24px] font-medium text-kc-dark mb-4">
              Kary Curadoria no coração do Brás
            </h2>
            <p className="text-sm text-kc-dark/80 leading-relaxed max-w-xl">
              A loja virtual nasce para ampliar o atendimento da nossa curadoria, mas a essência
              continua a mesma: atendimento próximo, alfaiataria impecável e peças atemporais com
              excelente custo-benefício.
            </p>
            <div className="mt-6 space-y-2 text-xs text-kc-muted">
              <p>Rua Min. Firmino Whitaker, 49/55</p>
              <p>Box 142, Brás, São Paulo - SP</p>
            </div>
          </div>

          <div className="bg-kc-cream border border-kc-line p-8 md:p-10 flex flex-col justify-between">
            <div>
              <p className="text-[10px] tracking-[0.22em] text-kc-muted uppercase mb-2">Atendimento</p>
              <p className="text-sm text-kc-dark/80 leading-relaxed">
                Instagram e loja virtual trabalham juntos: descubra no Instagram, finalize com
                segurança na loja e conte com nosso WhatsApp para um atendimento mais consultivo.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-kc text-white text-[10px] tracking-[0.18em] px-5 py-3 uppercase hover:bg-kc-dark transition-colors"
              >
                Ver Instagram
              </a>
              <a
                href={buildWhatsAppUrl("Olá! Vim pelo site e quero falar com a Kary Curadoria.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border border-kc text-kc text-[10px] tracking-[0.18em] px-5 py-3 uppercase hover:bg-kc hover:text-white transition-colors"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-kc-line mx-6" />

      {/* ── VITRINE ── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-[10px] tracking-[0.26em] text-kc-muted mb-1.5 uppercase">Destaques</p>
        <h2 className="font-serif text-[22px] font-medium text-kc-dark mb-6">
          Peças Selecionadas
        </h2>

        {featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((product) => {
              const isNew =
                Date.now() - new Date(product.created_at).getTime() <
                THIRTY_DAYS;
              return (
                <ProductCard
                  key={product.id}
                  product={product as Product & { total_stock: number }}
                  isNew={isNew}
                />
              );
            })}
          </div>
        ) : (
          // Placeholder se ainda não houver produtos cadastrados
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Conjunto Linho Off-White Premium", price: 389 },
              { name: "Blazer Alfaiataria Caramelo", price: 459 },
              { name: "Conjunto Linho Terracota", price: 349, original: 420 },
              { name: "Calça Alfaiataria Creme", price: 289 },
            ].map((p) => (
              <div key={p.name} className="bg-kc-light border border-kc-line">
                <div className="w-full aspect-[3/4] bg-kc-cream flex items-center justify-center">
                  <span className="text-[9px] tracking-[0.18em] text-kc-muted opacity-40">FOTO</span>
                </div>
                <div className="p-3">
                  <h3 className="font-serif text-[14px] font-medium text-kc-dark leading-snug mb-1.5">{p.name}</h3>
                  <div className="flex items-baseline gap-1.5">
                    {p.original && (
                      <span className="text-[11px] text-kc-muted line-through">R$ {p.original},00</span>
                    )}
                    <span className="text-sm font-medium text-kc">R$ {p.price},00</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-6">
          <Link
            href="/produtos"
            className="inline-block bg-kc text-white text-[10px] tracking-[0.2em] px-6 py-3 hover:bg-kc-dark transition-colors uppercase"
          >
            Ver Todos os Produtos
          </Link>
        </div>
      </section>

      {/* ── SELOS DE PAGAMENTO ── */}
      <section className="border-t border-kc-line bg-kc-cream">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-6">
          {[
            { label: "PIX", desc: "Pagamento instantâneo" },
            { label: "CARTÃO", desc: "Até 3x sem juros" },
            { label: "BOLETO", desc: "Vence em 3 dias úteis" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center gap-2.5 text-kc-muted">
              <div className="border border-kc-line bg-kc-light px-3 py-1.5 text-[9px] tracking-[0.16em] text-kc-dark font-medium">
                {label}
              </div>
              <span className="text-[10px] tracking-wide hidden sm:block">{desc}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-kc-muted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[10px] tracking-wide">Pagamento seguro via Mercado Pago</span>
          </div>
        </div>
      </section>
    </>
  );
}
