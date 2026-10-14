// CPF e CNPJ do pedido de atacado: validação pelos dígitos verificadores.
// Puro e isomórfico (navegador e servidor). Sem logs: são dados pessoais.

function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function validarCPFAtacado(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export function validarCNPJ(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((s, w, i) => s + Number(c[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}

/** CPF (11 dígitos) ou CNPJ (14 dígitos) válido. */
export function validarDocumento(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length === 11) return validarCPFAtacado(c);
  if (c.length === 14) return validarCNPJ(c);
  return false;
}

export function formatarDocumento(value: string): string {
  const c = onlyDigits(value);
  if (c.length === 11) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}

/** Máscara enquanto digita: CPF até 11 dígitos, CNPJ a partir de 12. */
export function mascaraDocumento(value: string): string {
  const c = onlyDigits(value).slice(0, 14);
  if (c.length <= 11) {
    return c
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return c
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
