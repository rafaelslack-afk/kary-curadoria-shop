// ============================================================
// KVO — Kary Vendas Online
// TypeScript Types — Gerados do Schema do Banco de Dados
// ============================================================

// ---- Enums / Union Types ----

export type ProductType = "individual" | "conjunto";

export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export type InventoryType = "entrada" | "saida" | "ajuste" | "importacao";

export type SalesChannel = "online" | "physical";

export type CouponType = "percent" | "fixed";

export type NfStatus = "emitida" | "cancelada";

// ---- Endereço (JSON) ----

export interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

// ---- Categorias ----

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  prefix: string | null;
  active: boolean;
  created_at: string;
}

export interface CategoryInsert {
  name: string;
  slug: string;
  parent_id?: string | null;
  prefix?: string | null;
  active?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  parent_id?: string | null;
  prefix?: string | null;
  active?: boolean;
}

// ---- Cores ----

export interface Color {
  id: string;
  name: string;
  hex_code: string;
  active: boolean;
}

export interface ColorInsert {
  name: string;
  hex_code: string;
  active?: boolean;
}

export interface ColorUpdate {
  name?: string;
  hex_code?: string;
  active?: boolean;
}

// ---- Tamanhos ----

export interface Size {
  id: string;
  name: string;
  order_index: number;
  active: boolean;
}

export interface SizeInsert {
  name: string;
  order_index?: number;
  active?: boolean;
}

export interface SizeUpdate {
  name?: string;
  order_index?: number;
  active?: boolean;
}

// ---- Produtos ----

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  cost_price: number | null;         // Preço de custo do item
  product_type: ProductType;         // 'individual' | 'conjunto'
  category_id: string | null;
  images: string[];
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  sku_base: string | null;           // Somente para individual
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  original_price?: number | null;
  cost_price?: number | null;
  product_type?: ProductType;
  category_id?: string | null;
  images?: string[];
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  sku_base?: string | null;
  active?: boolean;
  featured?: boolean;
}

export interface ProductUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  original_price?: number | null;
  cost_price?: number | null;
  product_type?: ProductType;
  category_id?: string | null;
  images?: string[];
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  sku_base?: string | null;
  active?: boolean;
  featured?: boolean;
}

// ---- Itens do Conjunto (Bundle) ----

export interface ProductBundleItem {
  id: string;
  bundle_product_id: string;
  variant_id: string;
  quantity: number;
  created_at: string;
}

export interface ProductBundleItemInsert {
  bundle_product_id: string;
  variant_id: string;
  quantity: number;
}

export interface ProductBundleItemWithVariant extends ProductBundleItem {
  product_variants: ProductVariant | null;
}

export interface ProductWithBundleItems extends Product {
  product_variants: ProductVariant[];
  product_bundle_items: ProductBundleItemWithVariant[];
}

// ---- Variações de Produto ----

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  sku: string;
  stock_qty: number;
  stock_min: number;
  active: boolean;
  images: string[] | null;
  created_at: string;
}

export interface ProductVariantInsert {
  product_id: string;
  size: string;
  color?: string | null;
  sku: string;
  stock_qty?: number;
  stock_min?: number;
  active?: boolean;
  images?: string[] | null;
}

export interface ProductVariantUpdate {
  size?: string;
  color?: string | null;
  sku?: string;
  stock_qty?: number;
  stock_min?: number;
  active?: boolean;
  images?: string[] | null;
}

// ---- Banners ----

export type TextPosition = "left" | "center" | "right";
export type TextColor    = "light" | "dark";

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  image_desktop: string | null;
  image_mobile: string | null;
  text_position: TextPosition;
  text_color: TextColor;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BannerInsert {
  title?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  image_desktop?: string | null;
  image_mobile?: string | null;
  text_position?: TextPosition;
  text_color?: TextColor;
  order_index?: number;
  active?: boolean;
}

export interface BannerUpdate extends BannerInsert {}

// ---- Clientes ----

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  address_json: Address | null;
  auth_user_id: string | null;
  created_at: string;
}

export interface CustomerInsert {
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  address_json?: Address | null;
  auth_user_id?: string | null;
}
