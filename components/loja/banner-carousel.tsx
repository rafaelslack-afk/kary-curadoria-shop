"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/types/database";

interface BannerCarouselProps {
  banners: Banner[];
}

function FallbackHero() {
  return (
    <section className="border-b border-kc-line bg-kc-light">
      <div className="mx-auto max-w-7xl px-6 py-16 text-center md:py-20">
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
      </div>
    </section>
  );
}

function positionClasses(position: Banner["text_position"]) {
  if (position === "left") {
    return {
      content: "justify-start md:justify-start",
      text: "text-left",
    };
  }

  if (position === "right") {
    return {
      content: "justify-start md:justify-end",
      text: "text-left md:text-right",
    };
  }

  return {
    content: "justify-start md:justify-center",
    text: "text-left md:text-center",
  };
}

function SlideWrapper({
  href,
  label,
  children,
}: {
  href?: string | null;
  label: string;
  children: ReactNode;
}) {
  if (!href) {
    return <div className="absolute inset-0">{children}</div>;
  }

  return (
    <Link href={href} className="absolute inset-0 block" aria-label={label}>
      {children}
    </Link>
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
      className="relative w-full overflow-hidden aspect-[4/5] min-h-[420px] max-h-[78svh] md:h-[420px] md:min-h-0 md:max-h-none md:aspect-auto lg:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((banner, idx) => {
        const layout = positionClasses(banner.text_position);
        const textColor =
          banner.text_color === "dark"
            ? "text-kc-dark"
            : "text-white";
        const buttonClass =
          banner.text_color === "dark"
            ? "bg-kc-dark text-white hover:bg-kc"
            : "bg-white text-kc-dark hover:bg-kc-cream";
        const label = banner.title ?? banner.button_text ?? "Ver banner";
        const desktopSrc = banner.image_desktop ?? banner.image_mobile ?? "";
        const mobileSrc = banner.image_mobile ?? "";

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
            <SlideWrapper href={banner.button_link} label={label}>
              {mobileSrc ? (
                <Image
                  src={mobileSrc}
                  alt={banner.title ?? "Banner"}
                  fill
                  className="object-cover object-top md:hidden"
                  priority={idx === 0}
                  quality={95}
                  sizes="(max-width: 767px) 100vw, 0px"
                />
              ) : null}

              {desktopSrc ? (
                <Image
                  src={desktopSrc}
                  alt={banner.title ?? "Banner"}
                  fill
                  className={`object-cover object-top ${mobileSrc ? "hidden md:block" : ""}`}
                  priority={idx === 0}
                  quality={95}
                  sizes={mobileSrc ? "(max-width: 767px) 0px, 100vw" : "100vw"}
                />
              ) : (
                <div className="absolute inset-0 bg-kc-cream" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent md:bg-gradient-to-r md:from-black/40 md:via-black/10 md:to-transparent" />

              {(banner.title || banner.subtitle || banner.button_text) && (
                <div
                  className={`absolute inset-0 flex items-end px-5 pb-6 md:items-center md:px-10 lg:px-14 ${layout.content}`}
                >
                  <div
                    className={`w-full max-w-[14rem] min-[420px]:max-w-[16rem] md:max-w-[30rem] lg:max-w-[36rem] ${layout.text} ${textColor}`}
                  >
                    {banner.title ? (
                      <h2 className="font-serif text-[clamp(2rem,8vw,3rem)] leading-[0.96] md:text-[42px] lg:text-[52px]">
                        {banner.title}
                      </h2>
                    ) : null}

                    {banner.subtitle ? (
                      <p className="mt-3 hidden text-sm leading-relaxed opacity-90 min-[360px]:block md:text-base">
                        {banner.subtitle}
                      </p>
                    ) : null}

                    {banner.button_text ? (
                      <span
                        className={`mt-5 inline-flex items-center justify-center px-5 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors md:px-6 md:py-3.5 ${buttonClass}`}
                      >
                        {banner.button_text}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </SlideWrapper>
          </div>
        );
      })}

      {total > 1 ? (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 md:flex"
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
            className="absolute right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 md:flex"
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
      ) : null}

      {total > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => go(idx)}
              className={`rounded-full transition-all ${
                idx === current
                  ? "h-2 w-5 bg-white"
                  : "h-2 w-2 bg-white/55 hover:bg-white/80"
              }`}
              aria-label={`Ir para banner ${idx + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
