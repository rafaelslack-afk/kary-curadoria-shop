export const META_PIXEL_ID = '969990458816538';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq: (...args: any[]) => void;
  }
}

// options.eventID: deduplicação com a futura Conversions API (hoje só no Purchase).
export function pixelEvent(
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>,
  options?: { eventID: string }
) {
  if (!event || typeof event !== 'string') return;
  if (typeof window !== 'undefined' && window.fbq) {
    if (options) window.fbq('track', event, params, options);
    else window.fbq('track', event, params);
  }
}

export interface PixelContents {
  content_ids: string[];
  contents: { id: string; quantity: number; item_price: number }[];
  content_type: 'product';
}

// content_ids/contents de um carrinho, com os IDs do catálogo da Meta
// (g:id = produto + cor). Tamanhos diferentes da mesma cor somam no mesmo item.
export function pixelCartContents(
  items: { catalogId?: string; sku: string; quantity: number; price: number }[]
): PixelContents {
  const byId = new Map<string, { id: string; quantity: number; item_price: number }>();
  for (const item of items) {
    const id = item.catalogId ?? item.sku; // itens antigos do carrinho: SKU da variante
    const current = byId.get(id);
    if (current) current.quantity += item.quantity;
    else byId.set(id, { id, quantity: item.quantity, item_price: Number(item.price) });
  }
  const contents = Array.from(byId.values());
  return { content_ids: contents.map((c) => c.id), contents, content_type: 'product' };
}
