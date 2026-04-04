import { createElement } from "react";
import { render } from "@react-email/render";
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

// Pré-renderiza o componente React para HTML e envia via Resend.
// Evita depender do renderer interno do Resend SDK (que falha com o bundle do Next.js).
async function sendHtml(payload: {
  to: string;
  subject: string;
  bcc?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ReactElement<any>;
}) {
  const html = await render(payload.component);
  const resend = getResend();
  console.log("[email] Enviando para:", payload.to, "| assunto:", payload.subject, payload.bcc ? `| bcc: ${payload.bcc}` : "");
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: payload.to,
    bcc: payload.bcc,
    replyTo: REPLY_TO,
    subject: payload.subject,
    html,
  });
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
  await sendHtml({
    to: params.to,
    bcc: ADMIN,
    subject: `Pedido #${params.orderNumber} confirmado — Kary Curadoria`,
    component: createElement(OrderCreatedEmail, params),
  });
}

export async function sendPaymentConfirmedEmail(params: SendPaymentConfirmedParams) {
  await sendHtml({
    to: params.to,
    bcc: ADMIN,
    subject: `Pagamento aprovado — Pedido #${params.orderNumber} | Kary Curadoria`,
    component: createElement(PaymentConfirmedEmail, params),
  });
}

export async function sendOrderShippedEmail(params: SendOrderShippedParams) {
  await sendHtml({
    to: params.to,
    bcc: ADMIN,
    subject: `Pedido #${params.orderNumber} saiu para entrega — Kary Curadoria`,
    component: createElement(OrderShippedEmail, params),
  });
}

export async function sendOrderCancelledEmail(params: SendOrderCancelledParams) {
  await sendHtml({
    to: params.to,
    bcc: ADMIN,
    subject: `Pedido #${params.orderNumber} cancelado`,
    component: createElement(OrderCancelledEmail, params),
  });
}

export async function sendLowStockAlertEmail(items: LowStockItem[]) {
  if (items.length === 0) return;
  await sendHtml({
    to: ADMIN,
    subject: `Alerta: ${items.length} variação(ões) com estoque baixo`,
    component: createElement(LowStockAlertEmail, { items }),
  });
}
