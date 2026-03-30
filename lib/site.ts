export const INSTAGRAM_URL = "https://instagram.com/karycuradoria";
export const WHATSAPP_NUMBER = "5511940224088";

export function buildWhatsAppUrl(message?: string): string {
  if (!message) {
    return `https://wa.me/${WHATSAPP_NUMBER}`;
  }

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
