/**
 * Validações compartilhadas do projeto.
 * Fonte única da verdade — NÃO duplicar estas funções em outros arquivos.
 */

/**
 * Valida CPF brasileiro pelos dígitos verificadores.
 * Aceita o CPF com ou sem máscara — remove não-dígitos antes de validar.
 *
 * Debug logs temporários: ativar definindo NEXT_PUBLIC_DEBUG_CPF=1 no ambiente
 * ou editando o flag abaixo localmente.
 */
// TEMP: ligado enquanto investigamos rejeição de CPF em produção.
// Voltar para `false` (ou flag via env) após confirmar o fix.
const DEBUG_CPF = true;

export function validarCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");

  if (DEBUG_CPF) {
    console.log("[CPF Debug] raw input:", cpf);
    console.log("[CPF Debug] digits only:", c);
    console.log("[CPF Debug] length:", c.length);
  }

  if (c.length !== 11) {
    if (DEBUG_CPF) console.log("[CPF Debug] FAIL: length != 11");
    return false;
  }

  if (/^(\d)\1{10}$/.test(c)) {
    if (DEBUG_CPF) console.log("[CPF Debug] FAIL: repeated digits");
    return false;
  }

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(c[i]) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  const d1 = rev >= 10 ? 0 : rev;

  if (DEBUG_CPF) {
    console.log("[CPF Debug] d1 expected:", d1, "| actual:", parseInt(c[9]));
  }

  if (d1 !== parseInt(c[9])) {
    if (DEBUG_CPF) console.log("[CPF Debug] FAIL: d1 mismatch");
    return false;
  }

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(c[i]) * (11 - i);
  }
  rev = 11 - (sum % 11);
  const d2 = rev >= 10 ? 0 : rev;

  if (DEBUG_CPF) {
    console.log("[CPF Debug] d2 expected:", d2, "| actual:", parseInt(c[10]));
  }

  if (d2 !== parseInt(c[10])) {
    if (DEBUG_CPF) console.log("[CPF Debug] FAIL: d2 mismatch");
    return false;
  }

  if (DEBUG_CPF) console.log("[CPF Debug] PASS");
  return true;
}
