import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "contato@karycuradoria.com.br";

  console.log("[test-email] key prefix:", key ? key.substring(0, 8) : "NÃO DEFINIDA");
  console.log("[test-email] from:", from);

  if (!key) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY não definida" });
  }

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: `Kary Curadoria <${from.includes("<") ? from.match(/<(.+)>/)?.[1] ?? from : from}>`,
      to: "rafael.slack@gmail.com",
      subject: "Teste e-mail — Kary Curadoria",
      html: "<p>E-mail de teste da Kary Curadoria. Se chegou, o Resend está funcionando.</p>",
    });
    console.log("[test-email] resultado:", JSON.stringify(result));
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[test-email] erro:", msg);
    return NextResponse.json({ ok: false, error: msg });
  }
}
