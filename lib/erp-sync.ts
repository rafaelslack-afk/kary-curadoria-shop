// Normalizacao de tamanho usada na montagem/validacao de SKU do fluxo ERP.
//
// O ERP envia size com acentos (ex: "UNICO" chega como "\u00daNICO"), mas os
// SKUs no Supabase sao sempre sem acento (ex: BD48-NUDE-UNICO). Sem essa
// normalizacao, o size bruto do ERP quebra o casamento de SKU e gera falso
// not_found.
export function normalizeSize(size: string): string {
  return size
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacriticos (acentos, til, cedilha)
    .toUpperCase()
    .trim();
}
