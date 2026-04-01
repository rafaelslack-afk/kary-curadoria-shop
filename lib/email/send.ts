import { createElement } from "react";
import { getResend } from "./resend";
import { OrderCreatedEmail } from "./templates/order-created";
import { PaymentConfirmedEmail } from "./templates/payment-confirmed";
import { OrderShippedEmail } from "./templates/order-shipped";
import { OrderCancelledEmail } from "./templates/order-cancelled";
import { LowStockAlertEmail } from "./templates/low-stock-alert";

const FROM = process.env.EMAIL_FROM ?? "contato@karycuradoria.com.br";
const ADMIN = process.env.EMAIL_ADMIN ?? "contato@karycuradoria.com.br";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Send functions ───────────────────────────────────────────────────────────

export async function sendOrderCreatedEmail(params: SendOrderCreatedParams) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Pedido #${params.orderNumber} recebido — Kary Curadoria`,
    react: createElement(OrderCreatedEmail, params),
  });
}

export async function sendPaymentConfirmedEmail(params: SendPaymentConfirmedParams) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Pagamento aprovado — Pedido #${params.orderNumber}`,
    react: createElement(PaymentConfirmedEmail, params),
  });
}

export async function sendOrderShippedEmail(params: SendOrderShippedParams) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Seu pedido #${params.orderNumber} foi enviado!`,
    react: createElement(OrderShippedEmail, params),
  });
}

export async function sendOrderCancelledEmail(params: SendOrderCancelledParams) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Pedido #${params.orderNumber} cancelado`,
    react: createElement(OrderCancelledEmail, params),
  });
}

export async function sendLowStockAlertEmail(items: LowStockItem[]) {
  if (items.length === 0) return;
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `⚠ Alerta: ${items.length} variação(ões) com estoque baixo`,
    react: createElement(LowStockAlertEmail, { items }),
  });
}
