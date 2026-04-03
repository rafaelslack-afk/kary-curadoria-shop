import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createElement } from "react";
import { OrderCreatedEmail } from "@/lib/email/templates/order-created";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.RESEND_API_KEY;
  const fromEnv = process.env.EMAIL_FROM ?? "contato@karycuradoria.com.br";
  const from = fromEnv.includes("<") ? fromEnv : `Kary Curadoria <${fromEnv}>`;

  console.log("[test-email] key prefix:", key ? key.substring(0, 8) : "NÃO DEFINIDA");
  console.log("[test-email] from:", from);

  if (!key) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY não definida" });
  }

  const resend = new Resend(key);

  // Teste 1: HTML simples
  const r1 = await resend.emails.send({
    from,
    to: "rafael.slack@gmail.com",
    subject: "[Teste HTML] Kary Curadoria",
    html: "<p>Teste com HTML simples — funcionou!</p>",
  });
  console.log("[test-email] HTML result:", JSON.stringify(r1));

  // Teste 2: React template
  const r2 = await resend.emails.send({
    from,
    to: "rafael.slack@gmail.com",
    subject: "[Teste React] Pedido #999 — Kary Curadoria",
    react: createElement(OrderCreatedEmail, {
      orderNumber: "999",
      customerName: "Cliente Teste",
      items: [{ name: "Produto Teste", variant: "M", quantity: 1, unit_price: 199 }],
      subtotal: 199,
      shippingCost: 25,
      discount: 0,
      total: 224,
      paymentMethod: "pix",
      pixCode: "00020126580014br.gov.bcb.pix0136teste",
    }),
  });
  console.log("[test-email] React result:", JSON.stringify(r2));

  return NextResponse.json({
    html: { data: r1.data, error: r1.error },
    react: { data: r2.data, error: r2.error },
    from,
    keyPrefix: key.substring(0, 8),
  });
}
