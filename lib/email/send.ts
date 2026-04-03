import { createElement } from "react";
import { getResend } from "./resend";
import { OrderCreatedEmail } from "./templates/order-created";
import { PaymentConfirmedEmail } from "./templates/payment-confirmed";
import { OrderShippedEmail } from "./templates/order-shipped";
import { OrderCancelledEmail } from "./templates/order-cancelled";
import { LowStockAlertEmail } from "./templates/low-stock-alert";

const FROM = process.env.EMAIL_FROM
  ? process.env.EMAIL_FROM.includes("<")
    ? process.env.EMAIL_FROM
    : `Kary Curadoria <${process.env.EMAIL_FROM}>`
  : "Kary Curadoria <contato@karycuradoria.com.br>";
const ADMIN = process.env.EMAIL_ADMIN ?? "contato@karycuradoria.com.br";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? undefined;

// Resend v2 SDK não lança exceção em erro de API — retorna { data, error }.
// Esta helper lança se houver erro para que o caller possa capturar.
async function sendAndCheck(
  payload: Parameters<ReturnType<typeof getResend>["emails"]["send"]>[0]
) {
  const resend = getResend();
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    console.error("[email] Resend API error:", JSON.stringify(error));
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
  console.log("[email] Enviado com sucesso. ID:", data?.id);
  return data;
}

export interface EmailOrderItem {
  name: string;
  variant?: string;
  quantity: number;
  unit_price: number;
}

export interface SendOrderCreatedParams {
  to: string;
  orderNumber: string;
  customerName: string;
  items: EmailOrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod: string;
  pixCode?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
}

export interface SendPaymentConfirmedParams {
  to: string;
  orderNumber: string;
  customerName: string;
  items: EmailOrderItem[];
  total: number;
}

export interface SendOrderShippedParams {
  to: string;
  orderNumber: string;
  customerName: string;
  trackingCode: string;
  carrier?: string;
}

export interface SendOrderCancelledParams {
  to: string;
  orderNumber: string;
  customerName: string;
  total: number;
  reason?: string;
}

export interface LowStockItem {
  productName: string;
  variantLabel: string;
  sku: string;
  stock: number;
}

export async function sendOrderCreatedEmail(params: SendOrderCreatedParams) {
  console.log("[email] sendOrderCreatedEmail → from:", FROM, "to:", params.to);
  await sendAndCheck({
    from: FROM,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `Pedido #${params.orderNumber} confirmado — Kary Curadoria`,
    react: createElement(OrderCreatedEmail, params),
  });
}

export async function sendPaymentConfirmedEmail(params: SendPaymentConfirmedParams) {
  console.log("[email] sendPaymentConfirmedEmail → to:", params.to);
  await sendAndCheck({
    from: FROM,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `Pagamento aprovado — Pedido #${params.orderNumber} | Kary Curadoria`,
    react: createElement(PaymentConfirmedEmail, params),
  });
}

export async function sendOrderShippedEmail(params: SendOrderShippedParams) {
  console.log("[email] sendOrderShippedEmail → to:", params.to);
  await sendAndCheck({
    from: FROM,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `Pedido #${params.orderNumber} saiu para entrega — Kary Curadoria`,
    react: createElement(OrderShippedEmail, params),
  });
}

export async function sendOrderCancelledEmail(params: SendOrderCancelledParams) {
  console.log("[email] sendOrderCancelledEmail → to:", params.to);
  await sendAndCheck({
    from: FROM,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `Pedido #${params.orderNumber} cancelado`,
    react: createElement(OrderCancelledEmail, params),
  });
}

export async function sendLowStockAlertEmail(items: LowStockItem[]) {
  if (items.length === 0) return;
  console.log("[email] sendLowStockAlertEmail → to:", ADMIN);
  await sendAndCheck({
    from: FROM,
    to: ADMIN,
    replyTo: REPLY_TO,
    subject: `Alerta: ${items.length} variação(ões) com estoque baixo`,
    react: createElement(LowStockAlertEmail, { items }),
  });
}
