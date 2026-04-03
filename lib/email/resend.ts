import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    console.log("[resend] API Key prefix:", key ? key.substring(0, 8) : "(NÃO DEFINIDA)");
    if (!key) {
      throw new Error("RESEND_API_KEY não configurada.");
    }
    _resend = new Resend(key);
  }
  return _resend;
}
