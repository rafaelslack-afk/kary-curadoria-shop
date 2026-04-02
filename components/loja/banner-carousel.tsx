"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/types/database";

interface BannerCarouselProps {
  banners: Banner[];
}

// Fallback hero when no banners are active
function FallbackHero() {
  return (
    <section className="bg-kc-light border-b border-kc-line">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 text-center">
        <p className="text-[10px] tracking-[0.3em] text-kc-muted mb-5 uppercase">
          Nova Coleção &middot; Outono 2026
        </p>
        <h1 className="font-serif text-4xl md:text-[52px] font-medium text-kc-dark leading-tight mb-5">
          Elegância que
          <br />
          nunca{" "}
          <em className="italic text-kc" style={{ fontStyle: "italic" }}>
            sai de moda
          </em>
        </h1>
        <p className="text-sm text-kc-muted leading-relaxed max-w-md mx-auto mb-8 tracking-wide">
          Conjuntos de linho e alfaiataria casual com acabamento impecável.
          Do dia a dia ao evento especial.
        </p>
        <Link
          href="/produtos"
          className="inline-block bg-kc text-white text-[11px] tracking-[0.2em] px-8 py-4 hover:bg-kc-dark transition-colors uppercase"
        >
          Ver Coleção
        </Link>
        <div className="flex items-center justify-center gap-5 mt-6">
          <span className="text-[10px] text-kc-muted tracking-wider">
            Frete grátis acima de R$&nbsp;299
          </span>
          <span className="w-px h-3 bg-kc-line" />
          <span className="text-[10px] text-kc-muted tracking-wider">Troca grátis</span>
          <span className="w-px h-3 bg-kc-line" />
          <span className="text-[10px] text-kc-muted tracking-wider">Parcelamento sem juros</span>
        </div>
      </div>
    </section>
  );
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = banners.length;

  const go = useCallback(
    (idx: number) => {
      setCurrent(((idx % total) + total) % total);
    },
    [total]
  );

  const next = useCallback(() => go(current + 1), [current, go]);
  const prev = useCallback(() => go(current - 1), [current, go]);

  // Auto-play
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setTimeout(next, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, paused, total, next]);

  if (total === 0) return <FallbackHero />;

  return (
    <section
      className="relative w-full overflow-hidden h-[380px] md:h-[420px] lg:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {banners.map((banner, idx) => {
        const imgSrc = banner.image_desktop ?? "";

        const Wrapper = banner.button_link
          ? ({ children }: { children: React.ReactNode }) => (
              <Link href={banner.button_link!} className="absolute inset-0 block group" aria-label={banner.title ?? "Ver banner"}>
                {children}
              </Link>
            )
          : ({ children }: { children: React.ReactNode }) => (
              <div className="absolute inset-0 group">{children}</div>
            );

        return (
          <div
            key={banner.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: idx === current ? 1 : 0, zIndex: idx === current ? 1 : 0 }}
            aria-hidden={idx !== current}
          >
            <Wrapper>
              {/* Imagens */}
              {imgSrc ? (
                <>
                  {banner.image_mobile && (
                    <Image
                      src={banner.image_mobile}
                      alt={banner.title ?? "Banner"}
                      fill
                      className="object-cover object-top md:hidden"
                      priority={idx === 0}
                      sizes="100vw"
                    />
                  )}
                  <Image
                    src={imgSrc}
                    alt={banner.title ?? "Banner"}
                    fill
                    className={`object-cover object-top ${banner.image_mobile ? "hidden md:block" : ""}`}
                    priority={idx === 0}
                    sizes="100vw"
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-kc-cream" />
              )}

              {/* Overlay com título — visível apenas no hover */}
              {banner.title && (
                <div className="absolute inset-0 flex items-end justify-center pb-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                  <span className="bg-black/60 text-white text-sm tracking-wide px-5 py-2 rounded-full backdrop-blur-sm">
                    {banner.title}
                  </span>
                </div>
              )}

              {/* Cursor pointer quando clicável */}
              {banner.button_link && (
                <div className="absolute inset-0 cursor-pointer" />
              )}
            </Wrapper>
          </div>
        );
      })}

      {/* Prev / Next arrows — only when multiple banners */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            aria-label="Banner anterior"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            aria-label="Próximo banner"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Bullet dots */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => go(idx)}
              className={`rounded-full transition-all ${
                idx === current
                  ? "w-5 h-2 bg-white"
                  : "w-2 h-2 bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Ir para banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
