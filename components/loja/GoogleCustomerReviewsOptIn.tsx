"use client";

/**
 * GoogleCustomerReviewsOptIn — snippet oficial do Google Customer Reviews
 * (Avaliações do Consumidor), vinculado ao Merchant ID 5767707063.
 *
 * Carregado SOMENTE na página de confirmação de pedido, e somente pelo
 * chamador quando o pedido está de fato pago (ver checagens em
 * app/(loja)/checkout/sucesso/page.tsx). Este componente não decide
 * elegibilidade — apenas renderiza o opt-in com os dados recebidos.
 *
 * "products" é omitido de propósito — a Kary não possui código GTIN/EAN
 * nos produtos. Preencher com dado falso violaria a política do programa.
 */

import { useEffect } from "react";

const GOOGLE_MERCHANT_ID = 5767707063;
const SCRIPT_ID = "google-survey-optin-script";

interface Props {
  orderId: string; // order_number
  email: string;
  estimatedDeliveryDate: string; // YYYY-MM-DD
}

export function GoogleCustomerReviewsOptIn({
  orderId,
  email,
  estimatedDeliveryDate,
}: Props) {
  useEffect(() => {
    // Não duplicar o script se já existir
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // @ts-expect-error - API externa do Google
    window.renderOptIn = function () {
      // @ts-expect-error - API externa do Google
      window.gapi.load("surveyoptin", function () {
        // @ts-expect-error - API externa do Google
        window.gapi.surveyoptin.render({
          merchant_id: GOOGLE_MERCHANT_ID,
          order_id: orderId,
          email,
          delivery_country: "BR",
          estimated_delivery_date: estimatedDeliveryDate,
        });
      });
    };

    return () => {
      // Cleanup ao desmontar — remove o script se o componente sair da
      // árvore (evita reexecução indevida em navegação client-side)
      const el = document.getElementById(SCRIPT_ID);
      if (el) el.remove();
    };
  }, [orderId, email, estimatedDeliveryDate]);

  return null; // componente sem UI própria
}
