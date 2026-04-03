import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createElement } from "react";
import { render } from "@react-email/render";
import { OrderCreatedEmail } from "@/lib/email/templates/order-created";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.RESEND_API_KEY;
  const fromEnv = process.env.EMAIL_FROM ?? "contato@karycuradoria.com.br";
  const from = fromEnv.includes("<") ? fromEnv : `Kary Curadoria <${fromEnv}>`;

  if (!key) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY não definida" });
  }

  const resend = new Resend(key);
  const results: Record<string, unknown> = { from, keyPrefix: key.substring(0, 8) };

  // Teste 1: HTML simples
  try {
    const r = await resend.emails.send({
      from,
      to: "rafael.slack@gmail.com",
      subject: "[Teste HTML] Kary Curadoria",
      html: "<p>Teste HTML simples</p>",
    });
    results.html = { data: r.data, error: r.error };
  } catch (e) {
    results.html = { thrown: String(e) };
  }

  // Teste 2: render do template para HTML via @react-email/render
  let renderedHtml: string | undefined;
  try {
    const component = createElement(OrderCreatedEmail, {
      orderNumber: "999",
      customerName: "Teste",
      items: [{ name: "Produto Teste", variant: "M", quantity: 1, unit_price: 199 }],
      subtotal: 199,
      shippingCost: 25,
      discount: 0,
      total: 224,
      paymentMethod: "pix",
      pixCode: "00020126580014br.gov.bcb.pix",
    });
    renderedHtml = await render(component);
    results.renderHtml = `ok (${renderedHtml.length} chars)`;
  } catch (e) {
    results.renderHtml = { thrown: String(e) };
    return NextResponse.json(results);
  }

  // Teste 3: enviar com HTML pré-renderizado
  try {
    const r = await resend.emails.send({
      from,
      to: "rafael.slack@gmail.com",
      subject: "[Teste Template] Kary Curadoria",
      html: renderedHtml,
    });
    results.templateEmail = { data: r.data, error: r.error };
  } catch (e) {
    results.templateEmail = { thrown: String(e) };
  }

  return NextResponse.json(results);
}
