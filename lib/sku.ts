/**
 * Normaliza string para uso em SKU:
 * remove acentos, uppercase, espaços → hífens, remove especiais
 * Ex: "Off White" → "OFF-WHITE", "Único" → "UNICO"
 */
export function normalizeForSku(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove acentos
    .toUpperCase()
    .replace(/\s+/g, "-")              // espaços → hífen
    .replace(/[^A-Z0-9-]/g, "")       // remove especiais
    .replace(/-+/g, "-")              // hífens duplos
    .replace(/^-|-$/g, "")            // trim hífens
    .trim();
}

/**
 * Gera SKU da variação: [skuBase]-[COR]-[TAMANHO]
 * Ex: ("LIN-0001", "Off White", "M") → "LIN-0001-OFF-WHITE-M"
 */
export function generateVariantSku(
  skuBase: string,
  color: string,
  size: string
): string {
  return [skuBase, normalizeForSku(color), normalizeForSku(size)].join("-");
}
