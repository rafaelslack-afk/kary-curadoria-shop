'use client'

import { Suspense, useEffect, useRef } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { CONSENT_STORAGE_KEY, DEFAULT_CONSENT } from '@/lib/tracking/consent'
import { IDENTITY_STORAGE_KEY } from '@/lib/tracking/events'

const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID

// Cookie de primeira parte com o ttclid do anúncio, lido pelo servidor nos
// eventos da Events API (inclusive a compra confirmada pelo webhook).
const TTCLID_COOKIE = 'ttclid'
const TTCLID_MAX_AGE = 7 * 24 * 60 * 60 // 7 dias

function persistTtclid() {
  try {
    const ttclid = new URLSearchParams(window.location.search).get('ttclid')
    if (!ttclid || ttclid.length > 500) return
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie =
      `${TTCLID_COOKIE}=${encodeURIComponent(ttclid)}; Max-Age=${TTCLID_MAX_AGE}; Path=/; SameSite=Lax${secure}`
  } catch { /* nunca quebra a página */ }
}

// Page view nas trocas de rota do App Router. A primeira carga já é contada
// pelo ttq.page() do snippet, então o primeiro render é ignorado.
function RouteChangeTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirst = useRef(true)

  useEffect(() => {
    persistTtclid()
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    window.ttq?.page()
  }, [pathname, searchParams])

  return null
}

export default function TikTokPixel() {
  if (!PIXEL_ID) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TikTok Pixel] NEXT_PUBLIC_TIKTOK_PIXEL_ID ausente — pixel não carregado.')
    }
    return null
  }

  return (
    <>
      {/* Snippet oficial do TikTok, com o ID vindo do ambiente. Antes do
          ttq.page(): consentimento (lib/tracking/consent.ts) e identify da
          cliente já identificada nesta sessão (hashes SHA-256). */}
      <Script id="tiktok-pixel" strategy="afterInteractive">
        {`
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
            ttq.load(${JSON.stringify(PIXEL_ID)});
            try {
              var consent = localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)}) || ${JSON.stringify(DEFAULT_CONSENT)};
              if (consent === "pending") ttq.holdConsent();
              else if (consent === "denied") ttq.revokeConsent();
            } catch (e) {}
            try {
              var id = JSON.parse(sessionStorage.getItem(${JSON.stringify(IDENTITY_STORAGE_KEY)}) || "null");
              if (id) ttq.identify({ email: id.email, phone_number: id.phone, external_id: id.external_id });
            } catch (e) {}
            ttq.page();
          }(window, document, 'ttq');
        `}
      </Script>
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  )
}
