"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/types/database";

interface BannerCarouselProps {
  banners: Banner[];
}

function getTextAlign(position: Banner["text_position"]) {
  switch (position) {
    case "left":
      return "items-center justify-start text-left";
    case "right":
      return "items-center justify-end text-right";
    default:
      return "items-center justify-center text-center";
  }
}

function getTextPalette(color: Banner["text_color"]) {
  if (color === "dark") {
    return {
      eyebrow: "text-kc-dark/70",
      title: "text-kc-dark",
      body: "text-kc-dark/80",
      button: "bg-kc text-white",
      overlay: "bg-gradient-to-r from-white/75 via-white/35 to-transparent",
    };
  }

  return {
    eyebrow: "text-white/80",
    title: "text-white",
    body: "text-white/90",
    button: "bg-white text-kc-dark",
    overlay: "bg-gradient-to-r from-black/45 via-black/20 to-transparent",
  };
}

function FallbackHero() {
  return (
    <section className="bg-kc-light border-b border-kc-line">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 text-center">
        <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-kc-muted">
          Nova Colecao - Outono 2026
        </p>
        <h1 className="mb-5 font-serif text-4xl font-medium leading-tight text-kc-dark md:text-[52px]">
          Elegancia que
          <br />
          nunca{" "}
          <em className="italic text-kc" style={{ fontStyle: "italic" }}>
            sai de moda
          </em>
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed tracking-wide text-kc-muted">
          Conjuntos de linho e alfaiataria casual com acabamento impecavel.
          Do dia a dia ao evento especial.
        </p>
        <Link
          href="/produtos"
          className="inline-block bg-kc px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-kc-dark"
        >
          Ver Colecao
        </Link>
        <div className="mt-6 flex items-center justify-center gap-5">
          <span className="text-[10px] tracking-wider text-kc-muted">
            Frete gratis acima de R$ 299
          </span>
          <span className="h-3 w-px bg-kc-line" />
          <span className="text-[10px] tracking-wider text-kc-muted">
            Troca gratis
          </span>
          <span className="h-3 w-px bg-kc-line" />
          <span className="text-[10px] tracking-wider text-kc-muted">
            Parcelamento sem juros
          </span>
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
      className="relative h-[380px] w-full overflow-hidden md:h-[420px] lg:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((banner, idx) => {
        const imgSrc = banner.image_desktop ?? "";
        const hasContent = Boolean(
          banner.title || banner.subtitle || banner.button_text
        );
        const palette = getTextPalette(banner.text_color);
        const textAlign = getTextAlign(banner.text_position);

        const Wrapper = banner.button_link
          ? ({ children }: { children: React.ReactNode }) => (
              <Link
                href={banner.button_link!}
                className="absolute inset-0 block group"
                aria-label={banner.title ?? "Ver banner"}
              >
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
            style={{
              opacity: idx === current ? 1 : 0,
              zIndex: idx === current ? 1 : 0,
            }}
            aria-hidden={idx !== current}
          >
            <Wrapper>
              {imgSrc ? (
                <>
                  {banner.image_mobile && (
                    <Image
                      src={banner.image_mobile}
                      alt={banner.title ?? "Banner"}
                      fill
                      className="object-cover object-top md:hidden"
                      priority={idx === 0}
                      quality={95}
                      sizes="100vw"
                    />
                  )}
                  <Image
                    src={imgSrc}
                    alt={banner.title ?? "Banner"}
                    fill
                    className={`object-cover object-top ${
                      banner.image_mobile ? "hidden md:block" : ""
                    }`}
                    priority={idx === 0}
                    quality={95}
                    sizes="100vw"
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-kc-cream" />
              )}

              {hasContent && (
                <>
                  <div className={`absolute inset-0 ${palette.overlay}`} />
                  <div className="absolute inset-0">
                    <div
                      className={`mx-auto flex h-full max-w-7xl px-6 ${textAlign}`}
                    >
                      <div className="w-full max-w-[560px] py-8 md:py-10">
                        {banner.subtitle && (
                          <p
                            className={`mb-3 text-[10px] uppercase tracking-[0.28em] ${palette.eyebrow}`}
                          >
                            {banner.subtitle}
                          </p>
                        )}
                        {banner.title && (
                          <h2
                            className={`font-serif text-3xl leading-tight md:text-4xl lg:text-5xl ${palette.title}`}
                          >
                            {banner.title}
                          </h2>
                        )}
                        {banner.button_text && (
                          <span
                            className={`mt-5 inline-flex items-center px-5 py-3 text-[10px] uppercase tracking-[0.2em] ${palette.button}`}
                          >
                            {banner.button_text}
                          </span>
                        )}
                        {banner.button_link && banner.title && (
                          <p
                            className={`mt-4 text-[11px] tracking-[0.18em] uppercase ${palette.body}`}
                          >
                            Toque para acessar
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {banner.button_link && (
                <div className="absolute inset-0 cursor-pointer" />
              )}
            </Wrapper>
          </div>
        );
      })}

      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
            aria-label="Banner anterior"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
            aria-label="Proximo banner"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => go(idx)}
              className={`rounded-full transition-all ${
                idx === current
                  ? "h-2 w-5 bg-white"
                  : "h-2 w-2 bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Ir para banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
