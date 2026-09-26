export const INSTAGRAM_URL = "https://instagram.com/karycuradoria";
export const WHATSAPP_NUMBER = "5511913187730";

export function buildWhatsAppUrl(message?: string): string {
  if (!message) {
    return `https://wa.me/${WHATSAPP_NUMBER}`;
  }

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Domínio público da loja (links enviados por WhatsApp apontam sempre para cá,
// inclusive quando gerados em preview).
export const SITE_URL = "https://karycuradoria.com.br";
