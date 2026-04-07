import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductCard } from "@/components/loja/product-card";
import { BannerCarousel } from "@/components/loja/banner-carousel";
import { PrelaunchHome } from "@/components/loja/prelaunch-home";
import { buildWhatsAppUrl, INSTAGRAM_URL } from "@/lib/site";
import { formatLaunchDatePtBr, isStorePrelaunchActive } from "@/lib/store-launch";
import type { Product, Banner } from "@/types/database";

interface HomeSection {
  id: string;
  title: string;
  description: string;
  href: string;
  button_text: string;
  icon_type: string;
  order_index: number;
  active: boolean;
}

const FALLBACK_SECTIONS: HomeSection[] = [
  {
    id: "1",
    title: "Conjuntos de Linho",
    description: "Frescor e elegancia na fibra natural que mais respira",
    href: "/produtos?categoria=conjuntos-de-linho",
    button_text: "Ver Colecao ->",
    icon_type: "linen",
    order_index: 1,
    active: true,
  },
  {
    id: "2",
    title: "Alfaiataria Casual",
    description: "Cortes precisos para um estilo sofisticado sem esforco",
    href: "/produtos?categoria=alfaiataria-casual",
    button_text: "Ver Colecao ->",
    icon_type: "suit",
    order_index: 2,
    active: true,
  },
];

async function getHomeSections(): Promise<HomeSection[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("home_sections")
      .select("*")
      .eq("active", true)
      .order("order_index", { ascending: true });
    if (error || !data || data.length === 0) return FALLBACK_SECTIONS;
    return data as HomeSection[];
  } catch {
    return FALLBACK_SECTIONS;
  }
}

function SectionIcon({ type }: { type: string }) {
  if (type === "suit") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M12 4 L8 10 L8 28 L28 28 L28 10 L24 4" stroke="#A0622A" strokeWidth="1.2" fill="none" />
        <path d="M12 4 L14 10 L18 8 L22 10 L24 4" stroke="#A0622A" strokeWidth="1.2" fill="none" />
        <line x1="8" y1="16" x2="28" y2="16" stroke="#A0622A" strokeWidth="0.8" />
        <line x1="14" y1="22" x2="22" y2="22" stroke="#A0622A" strokeWidth="0.8" />
      </svg>
    );
  }
  if (type === "dress") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M13 4 L10 10 L6 28 L30 28 L26 10 L23 4" stroke="#A0622A" strokeWidth="1.2" fill="none" />
        <line x1="13" y1="4" x2="23" y2="4" stroke="#A0622A" strokeWidth="1.2" />
        <line x1="9" y1="16" x2="27" y2="16" stroke="#A0622A" strokeWidth="0.8" />
      </svg>
    );
  }
  if (type === "bag") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="12" width="24" height="18" rx="2" stroke="#A0622A" strokeWidth="1.2" />
        <path d="M13 12 Q13 6 18 6 Q23 6 23 12" stroke="#A0622A" strokeWidth="1.2" fill="none" />
        <line x1="6" y1="19" x2="30" y2="19" stroke="#A0622A" strokeWidth="0.8" />
      </svg>
    );
  }
  if (type === "star") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 4 L21 13 L31 13 L23 19 L26 28 L18 22 L10 28 L13 19 L5 13 L15 13 Z" stroke="#A0622A" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect x="10" y="4" width="16" height="28" rx="1" stroke="#A0622A" strokeWidth="1.2" />
      <line x1="10" y1="16" x2="26" y2="16" stroke="#A0622A" strokeWidth="0.8" />
      <path d="M10 8 Q6 10 6 16 Q6 24 10 28" stroke="#A0622A" strokeWidth="1" fill="none" />
      <path d="M26 8 Q30 10 30 16 Q30 24 26 28" stroke="#A0622A" strokeWidth="1" fill="none" />
    </svg>
  );
}

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
      .select("*, product_variants(stock_qty)")
      .eq("active", true)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(8);

    return (data ?? []).map((p) => ({
      ...p,
      total_stock: (p.product_variants as { stock_qty: number }[]).reduce(
        (sum: number, v: { stock_qty: number }) => sum + v.stock_qty,
        0
      ),
    }));
  } catch {
    return [];
  }
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function HomeCategories({ homeSections }: { homeSections: HomeSection[] }) {
  if (homeSections.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.26em] text-kc-muted">Explore</p>
      <h2 className="mb-6 font-serif text-[22px] font-medium text-kc-dark">
        Nossas Categorias
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {homeSections.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="group relative overflow-hidden border border-kc-line bg-kc-light p-8 text-center transition-colors hover:border-kc"
          >
            <div className="absolute left-0 right-0 top-0 h-0.5 origin-left scale-x-0 bg-kc transition-transform duration-300 group-hover:scale-x-100" />
            <div className="mb-4 flex justify-center">
              <SectionIcon type={s.icon_type} />
            </div>
            <h3 className="mb-2 font-serif text-[17px] font-medium tracking-wide text-kc-dark">
              {s.title}
            </h3>
            <p className="mb-4 text-[11px] leading-relaxed text-kc-muted">{s.description}</p>
            <span className="text-[10px] uppercase tracking-[0.18em] text-kc underline-offset-2 group-hover:underline">
              {s.button_text}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: "Kary Curadoria",
  image: "https://karycuradoria.com.br/og-image.jpg",
  url: "https://karycuradoria.com.br",
  telephone: "+55-11-94022-4088",
  email: "contato@karycuradoria.com.br",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Min. Firmino Whitaker, 49/55, Box 142",
    addressLocality: "São Paulo",
    addressRegion: "SP",
    postalCode: "03014-000",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -23.5435,
    longitude: -46.6291,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "17:00",
    },
  ],
  priceRange: "$$",
  currenciesAccepted: "BRL",
  paymentAccepted: "Cash, Credit Card, PIX",
};

export default async function Home() {
  if (isStorePrelaunchActive()) {
    return <PrelaunchHome launchLabel={formatLaunchDatePtBr()} />;
  }

  const [featured, banners, homeSections] = await Promise.all([
    getFeaturedProducts(),
    getActiveBanners(),
    getHomeSections(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <BannerCarousel banners={banners} />

      <section id="nossa-loja" className="max-w-7xl mx-auto px-6 py-10 scroll-mt-24">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border border-kc-line bg-kc-light p-8 md:p-10">
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.26em] text-kc-muted">Nossa Loja</p>
            <h2 className="mb-4 font-serif text-[24px] font-medium text-kc-dark">
              Kary Curadoria no coracao do Bras
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-kc-dark/80">
              A loja virtual nasce para ampliar o atendimento da nossa curadoria, mas a essencia
              continua a mesma: atendimento proximo, alfaiataria impecavel e pecas atemporais com
              excelente custo-beneficio.
            </p>
            <div className="mt-6 space-y-2 text-xs text-kc-muted">
              <p>Rua Min. Firmino Whitaker, 49/55</p>
              <p>Box 142, Bras, Sao Paulo - SP</p>
            </div>
          </div>

          <div className="flex flex-col justify-between border border-kc-line bg-kc-cream p-8 md:p-10">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-kc-muted">Atendimento</p>
              <p className="text-sm leading-relaxed text-kc-dark/80">
                Instagram e loja virtual trabalham juntos: descubra no Instagram, finalize com
                seguranca na loja e conte com nosso WhatsApp para um atendimento mais consultivo.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-kc px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-kc-dark"
              >
                Ver Instagram
              </a>
              <a
                href={buildWhatsAppUrl("Ola! Vim pelo site e quero falar com a Kary Curadoria.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border border-kc px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-kc transition-colors hover:bg-kc hover:text-white"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-6 h-px bg-kc-line" />

      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.26em] text-kc-muted">Destaques</p>
        <h2 className="mb-6 font-serif text-[22px] font-medium text-kc-dark">
          Pecas Selecionadas
        </h2>

        {featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
            {featured.map((product) => {
              const isNew =
                Date.now() - new Date(product.created_at).getTime() < THIRTY_DAYS;

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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { name: "Conjunto Linho Off-White Premium", price: 389 },
              { name: "Blazer Alfaiataria Caramelo", price: 459 },
              { name: "Conjunto Linho Terracota", price: 349, original: 420 },
              { name: "Calca Alfaiataria Creme", price: 289 },
            ].map((p) => (
              <div key={p.name} className="border border-kc-line bg-kc-light">
                <div className="flex aspect-[3/4] w-full items-center justify-center bg-kc-cream">
                  <span className="text-[9px] tracking-[0.18em] text-kc-muted opacity-40">FOTO</span>
                </div>
                <div className="p-3">
                  <h3 className="mb-1.5 font-serif text-[14px] font-medium leading-snug text-kc-dark">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    {p.original ? (
                      <span className="text-[11px] text-kc-muted line-through">R$ {p.original},00</span>
                    ) : null}
                    <span className="text-sm font-medium text-kc">R$ {p.price},00</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/produtos"
            className="inline-block bg-kc px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-kc-dark"
          >
            Ver Todos os Produtos
          </Link>
        </div>
      </section>

      {homeSections.length > 0 ? (
        <>
          <div className="mx-6 h-px bg-kc-line" />
          <HomeCategories homeSections={homeSections} />
        </>
      ) : null}

      <section className="border-t border-kc-line bg-kc-cream">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 px-6 py-6">
          {[
            { label: "PIX", desc: "Pagamento instantaneo" },
            { label: "CARTAO", desc: "Ate 3x sem juros" },
            { label: "BOLETO", desc: "Vence em 3 dias uteis" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center gap-2.5 text-kc-muted">
              <div className="border border-kc-line bg-kc-light px-3 py-1.5 text-[9px] font-medium tracking-[0.16em] text-kc-dark">
                {label}
              </div>
              <span className="hidden text-[10px] tracking-wide sm:block">{desc}</span>
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
