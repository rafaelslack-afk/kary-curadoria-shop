// Itens dos eventos de conversão em formato neutro, convertidos para o
// formato de cada plataforma. O id é SEMPRE o g:id do catálogo da Meta
// (lib/meta-catalog.ts), o mesmo usado no catálogo do TikTok.
//
// Sem imports de servidor: usado por componentes "use client" e por rotas.

export interface TrackingItem {
  id: string;        // g:id do catálogo (produto + cor)
  name: string;
  price: number;
  quantity: number;
}

export interface TikTokContent {
  content_id: string;
  content_type: "product";
  content_name: string;
  price: number;
  quantity: number;
}

// Itens do carrinho → TrackingItem. Tamanhos da mesma cor somam no mesmo
// item, como em pixelCartContents (lib/pixel.ts). Nunca lança: é chamada no
// caminho do pagamento (checkout) e, em caso de erro, devolve lista vazia.
export function cartTrackingItems(
  items: { catalogId?: string; sku: string; productName: string; quantity: number; price: number }[]
): TrackingItem[] {
  try {
    return groupCartItems(items);
  } catch {
    return [];
  }
}

function groupCartItems(
  items: { catalogId?: string; sku: string; productName: string; quantity: number; price: number }[]
): TrackingItem[] {
  const byId = new Map<string, TrackingItem>();
  for (const item of items) {
    const id = item.catalogId ?? item.sku;
    const current = byId.get(id);
    if (current) current.quantity += item.quantity;
    else byId.set(id, { id, name: item.productName, price: Number(item.price), quantity: item.quantity });
  }
  return Array.from(byId.values());
}

export function tiktokContents(items: TrackingItem[]): TikTokContent[] {
  return items.map((i) => ({
    content_id: i.id,
    content_type: "product",
    content_name: i.name,
    price: Number(i.price),
    quantity: i.quantity,
  }));
}

// Properties do TikTok, iguais no navegador e no servidor.
export interface TikTokProperties {
  currency: "BRL";
  value: number;
  content_type: "product";
  contents: TikTokContent[];
  order_id?: string;
}

export function tiktokProperties(
  items: TrackingItem[],
  value: number,
  orderId?: string
): TikTokProperties {
  return {
    currency: "BRL",
    value: Math.round(Number(value) * 100) / 100,
    content_type: "product",
    contents: tiktokContents(items),
    ...(orderId ? { order_id: orderId } : {}),
  };
}

// event_id da compra: o mesmo no navegador (página de confirmação) e no
// servidor (webhook / cartão aprovado), para a deduplicação.
export function purchaseEventId(orderId: string): string {
  return `purchase_${orderId}`;
}
