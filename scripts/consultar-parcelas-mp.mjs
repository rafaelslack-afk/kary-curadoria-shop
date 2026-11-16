// SOMENTE LEITURA: consulta no Mercado Pago (GET /v1/payments/{id}) as
// parcelas dos pedidos de cartão e mostra o resultado. Não grava nada — nem no
// Mercado Pago, nem no banco.
//
// Uso:
//   MERCADOPAGO_ACCESS_TOKEN_PRODUCTION=... node scripts/consultar-parcelas-mp.mjs <arquivo>
//
// <arquivo>: uma linha por pedido, "order_number<TAB>pagbank_charge_id". Gere a
// lista no SQL Editor do Supabase (cartão, últimos 60 dias) com:
//   select order_number || chr(9) || pagbank_charge_id from orders
//   where payment_method = 'credit_card' and pagbank_charge_id is not null
//     and created_at >= now() - interval '60 days'
//   order by order_number;
//
// Saída: tabela no terminal + bloco SQL de UPDATE comentado, para revisão.
// O SQL só deve ser executado depois de aprovado.

import { readFileSync } from "node:fs";

const [file] = process.argv.slice(2);
const token = process.env.MERCADOPAGO_ACCESS_TOKEN_PRODUCTION;
if (!file || !token) {
  console.error("Uso: MERCADOPAGO_ACCESS_TOKEN_PRODUCTION=... node scripts/consultar-parcelas-mp.mjs <arquivo>");
  process.exit(1);
}

const rows = readFileSync(file, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [orderNumber, paymentId] = l.split("\t");
    return { orderNumber: orderNumber?.trim(), paymentId: paymentId?.trim() };
  })
  .filter((r) => r.orderNumber && /^\d+$/.test(r.paymentId ?? ""));

const results = [];
for (const r of rows) {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${r.paymentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      results.push({ ...r, erro: `HTTP ${res.status}` });
      continue;
    }
    const p = await res.json();
    const valor = p.transaction_amount ?? null;
    const pago = p.transaction_details?.total_paid_amount ?? null;
    results.push({
      ...r,
      status: p.status,
      payment_type_id: p.payment_type_id ?? null,
      payment_method_id: p.payment_method_id ?? null,
      installments: p.installments ?? null,
      transaction_amount: valor,
      total_paid_amount: pago,
      // total pago pela cliente maior que o valor do pedido = parcelado com juros
      com_juros: valor != null && pago != null ? pago > valor + 0.005 : null,
    });
  } catch (err) {
    results.push({ ...r, erro: String(err) });
  }
  await new Promise((ok) => setTimeout(ok, 200)); // gentil com a API
}

console.table(results);

const updates = results.filter((r) => !r.erro && r.payment_type_id && Number.isInteger(r.installments));
console.log("\n-- SQL PROPOSTO (NÃO EXECUTAR sem aprovação). Só preenche pedidos ainda sem o dado:");
for (const r of updates) {
  console.log(
    `-- update orders set installments = ${r.installments}, payment_type = '${String(r.payment_type_id).replace(/'/g, "")}'` +
      ` where order_number = ${Number(r.orderNumber)} and installments is null and payment_type is null;`
  );
}
console.log(`\n${results.length} consultado(s), ${updates.length} com dado completo, ${results.filter((r) => r.erro).length} com erro.`);
