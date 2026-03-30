// ── Mercado Pago client factory ───────────────────────────────────────────────
// Docs: https://www.mercadopago.com.br/developers/pt/docs
// SDK: https://github.com/mercadopago/sdk-nodejs
// ─────────────────────────────────────────────────────────────────────────────

import { MercadoPagoConfig, Payment } from "mercadopago";

export const MERCADOPAGO_ENV = process.env.MERCADOPAGO_ENV ?? "sandbox";

export function getAccessToken(): string {
  const token =
    MERCADOPAGO_ENV === "sandbox"
      ? process.env.MERCADOPAGO_ACCESS_TOKEN_SANDBOX
      : process.env.MERCADOPAGO_ACCESS_TOKEN_PRODUCTION;

  if (!token) {
    throw new Error(
      `MERCADOPAGO_ACCESS_TOKEN_${MERCADOPAGO_ENV.toUpperCase()} não configurado.`
    );
  }
  return token;
}

export function getMPClient(): MercadoPagoConfig {
  return new MercadoPagoConfig({
    accessToken: getAccessToken(),
    options: { timeout: 15000 },
  });
}

export function getMPPayment(): Payment {
  return new Payment(getMPClient());
}

// ── Response types (relevant fields only) ────────────────────────────────────

export interface MPPaymentResponse {
  id: number;
  status: string;           // "approved" | "pending" | "rejected" | "cancelled"
  status_detail: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;           // copia-e-cola PIX
      qr_code_base64?: string;    // QR Code PNG em base64
    };
  };
  transaction_details?: {
    external_resource_url?: string;  // URL do boleto PDF
  };
  barcode?: {
    content?: string;              // linha digitável do boleto
  };
}
