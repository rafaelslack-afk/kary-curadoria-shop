// Leitura dos pedidos de atacado (romaneio e admin). Server-only.
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";

export interface WholesaleOrderItem {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  sku: string | null;
  reference: string | null;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  price_overridden: boolean;
}

export interface WholesaleAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface WholesaleOrder {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  customer_name: string;
  store_name: string | null;
  document: string;
  email: string;
  phone: string;
  address_json: WholesaleAddress;
  notes: string | null;
  items_total: number;
  shipping_cost: number | null;
  total: number;
  pieces_count: number;
  romaneio_token: string;
  created_at: string;
  updated_at: string;
  items: WholesaleOrderItem[];
}

const ORDER_COLS =
  "id, order_number, status, payment_method, customer_name, store_name, document, email, phone, address_json, notes, items_total, shipping_cost, total, pieces_count, romaneio_token, created_at, updated_at";
const ITEM_COLS =
  "id, product_id, variant_id, sku, reference, product_name, color, size, quantity, unit_price, total_price, price_overridden";

function num(v: unknown): number {
  return Number(v ?? 0);
}

function normalize(order: Record<string, unknown>, items: Record<string, unknown>[]): WholesaleOrder {
  return {
    ...(order as unknown as WholesaleOrder),
    items_total: num(order.items_total),
    shipping_cost: order.shipping_cost == null ? null : num(order.shipping_cost),
    total: num(order.total),
    items: items
      .map((it) => ({
        ...(it as unknown as WholesaleOrderItem),
        unit_price: num(it.unit_price),
        total_price: num(it.total_price),
      }))
      .sort((a, b) => a.product_name.localeCompare(b.product_name, "pt-BR") || (a.color ?? "").localeCompare(b.color ?? "", "pt-BR")),
  };
}

async function loadBy(column: "id" | "romaneio_token", value: string): Promise<WholesaleOrder | null> {
  const db = createNoStoreAdminClient();
  const { data: order } = await db.from("wholesale_orders").select(ORDER_COLS).eq(column, value).maybeSingle();
  if (!order) return null;
  const { data: items } = await db.from("wholesale_order_items").select(ITEM_COLS).eq("order_id", order.id);
  return normalize(order, items ?? []);
}

// ── Só ADMIN: preço bruto e percentuais do pedido ───────────────────────────
// Carregador separado de propósito: o romaneio público usa loadBy (colunas sem
// base_unit_price nem discount_snapshot), então o bruto nunca chega a ele.
export interface WholesaleOrderItemAdmin extends WholesaleOrderItem {
  base_unit_price: number | null; // NULL em pedidos antigos
}

export interface WholesaleOrderAdmin extends Omit<WholesaleOrder, "items"> {
  discount_snapshot: { pix: number; credit_card: number } | null;
  items: WholesaleOrderItemAdmin[];
}

export async function getWholesaleOrderAdminById(id: string): Promise<WholesaleOrderAdmin | null> {
  const db = createNoStoreAdminClient();
  const { data: order } = await db
    .from("wholesale_orders")
    .select(`${ORDER_COLS}, discount_snapshot`)
    .eq("id", id)
    .maybeSingle();
  if (!order) return null;
  const { data: items } = await db
    .from("wholesale_order_items")
    .select(`${ITEM_COLS}, base_unit_price`)
    .eq("order_id", order.id);
  const base = normalize(order, items ?? []);
  const rawItems = (items ?? []) as Record<string, unknown>[];
  return {
    ...base,
    discount_snapshot: parseSnapshot((order as Record<string, unknown>).discount_snapshot),
    items: base.items.map((it) => {
      const raw = rawItems.find((r) => r.id === it.id);
      return { ...it, base_unit_price: raw?.base_unit_price == null ? null : num(raw.base_unit_price) };
    }),
  };
}

export function parseSnapshot(v: unknown): { pix: number; credit_card: number } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const pix = Number(o.pix);
  const card = Number(o.credit_card);
  return Number.isFinite(pix) && Number.isFinite(card) ? { pix, credit_card: card } : null;
}

export function getWholesaleOrderById(id: string) {
  return loadBy("id", id);
}

export function getWholesaleOrderByRomaneio(token: string) {
  // Tokens são base64url de 32 caracteres; qualquer outra coisa nem consulta
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return Promise.resolve(null);
  return loadBy("romaneio_token", token);
}
