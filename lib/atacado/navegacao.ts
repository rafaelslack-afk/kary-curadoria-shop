// Estado de navegação do catálogo de atacado (categoria, busca e rolagem), para
// "Voltar ao catálogo" / "Continuar escolhendo" devolverem a lojista ao ponto
// onde ela estava. Só sessionStorage + URL: nada vai ao servidor. Client-only.
const KEY = "kvo-atacado-catalogo";
const FLAG = "kvo-atacado-restaurar";

interface EstadoCatalogo {
  qs: string; // ex.: "categoria=linho&busca=conjunto" (sem "?")
  scrollY: number;
}

function ler(): EstadoCatalogo {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<EstadoCatalogo>;
      return { qs: typeof p.qs === "string" ? p.qs : "", scrollY: Number(p.scrollY) || 0 };
    }
  } catch {
    /* sessionStorage indisponível: volta ao catálogo "do zero" */
  }
  return { qs: "", scrollY: 0 };
}

export function salvarCatalogo(parcial: Partial<EstadoCatalogo>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...ler(), ...parcial }));
  } catch {
    /* ignora */
  }
}

/** URL do catálogo com a categoria e a busca em que a lojista estava. */
export function hrefCatalogo(): string {
  const { qs } = ler();
  return qs ? `/atacado?${qs}` : "/atacado";
}

/** Chamado pelos botões "voltar": o catálogo restaura a rolagem ao abrir. */
export function marcarRestauracao() {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    /* ignora */
  }
}

/** Rolagem a restaurar (uma vez) ou null quando o catálogo abre do zero. */
export function consumirRestauracao(): number | null {
  try {
    if (sessionStorage.getItem(FLAG) !== "1") return null;
    sessionStorage.removeItem(FLAG);
    return ler().scrollY;
  } catch {
    return null;
  }
}
