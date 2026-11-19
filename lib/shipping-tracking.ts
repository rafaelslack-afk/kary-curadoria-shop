// Helper isomórfico para link de rastreamento externo conforme a transportadora.
// Sem imports de servidor — seguro para componentes "use client" (/rastrear,
// /admin/pedidos/[id]) e para o template de e-mail (order-shipped.tsx).

export function isJetExpressService(shippingService?: string | null): boolean {
  if (!shippingService) return false;
  const normalized = shippingService.toLowerCase();
  return normalized.includes("j&t") || normalized.includes("standard");
}

export function getExternalTrackingInfo(
  trackingCode: string,
  shippingService?: string | null
): { url: string; label: string } {
  const code = encodeURIComponent(trackingCode.trim());
  if (isJetExpressService(shippingService)) {
    return {
      url: `https://melhorrastreio.com.br/rastreio/${code}`,
      label: "Rastrear no Melhor Rastreio",
    };
  }
  return {
    url: `https://rastreamento.correios.com.br/app/index.php?objeto=${code}`,
    label: "Rastrear nos Correios",
  };
}
