// Testa o link curto /p/<ref> de uma lista de produtos, como navegador e como
// o crawler da Meta.
//
// Uso:
//   node scripts/testar-links-curtos.mjs <arquivo-com-refs> [base-url]
//
// <arquivo-com-refs>: uma linha por produto, "SKU_BASE<TAB>slug" (o slug é
// opcional; se vier, confere que o redirect leva à página certa). Gere a lista
// no SQL Editor do Supabase com:
//   select sku_base || chr(9) || slug from products
//   where active and sku_base is not null order by sku_base;
// base-url: padrão https://karycuradoria.com.br

import { readFileSync } from "node:fs";

const [file, base = "https://karycuradoria.com.br"] = process.argv.slice(2);
if (!file) {
  console.error("Uso: node scripts/testar-links-curtos.mjs <arquivo-com-refs> [base-url]");
  process.exit(1);
}

const BROWSER_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const BOT_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const rows = readFileSync(file, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [ref, slug] = l.split("\t");
    return { ref: ref.trim(), slug: slug?.trim() };
  });

async function check({ ref, slug }) {
  const url = `${base}/p/${encodeURIComponent(ref)}`;
  const problems = [];

  const nav = await fetch(url, { redirect: "manual", headers: { "user-agent": BROWSER_UA } });
  const loc = nav.headers.get("location") ?? "";
  if (nav.status !== 302) problems.push(`navegador: status ${nav.status}`);
  else {
    const dest = new URL(loc, base);
    if (!dest.pathname.startsWith("/produtos/")) problems.push(`navegador: destino ${dest.pathname}`);
    if (slug && dest.pathname !== `/produtos/${slug}`) problems.push(`navegador: slug diferente (${dest.pathname})`);
    if (dest.searchParams.get("utm_source") !== "link_curto" || dest.searchParams.get("utm_medium") !== "dm")
      problems.push("navegador: sem utm");
  }

  const bot = await fetch(url, { redirect: "manual", headers: { "user-agent": BOT_UA } });
  const html = bot.status === 200 ? await bot.text() : "";
  if (bot.status !== 200) problems.push(`crawler: status ${bot.status}`);
  else {
    if (!/property="og:image" content="https:\/\//.test(html)) problems.push("crawler: sem og:image");
    if (!/property="og:title" content="[^"]+"/.test(html)) problems.push("crawler: sem og:title");
  }

  return { ref, ok: problems.length === 0, problems, outcome: nav.headers.get("x-link-curto") };
}

const results = [];
const CONCURRENCY = 4;
for (let i = 0; i < rows.length; i += CONCURRENCY) {
  const batch = await Promise.all(
    rows.slice(i, i + CONCURRENCY).map((r) =>
      check(r).catch((err) => ({ ref: r.ref, ok: false, problems: [`erro: ${err.message}`] }))
    )
  );
  results.push(...batch);
}

const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} links curtos OK em ${base}`);
for (const f of failed) console.log(`FALHOU ${f.ref}: ${f.problems.join("; ")}`);
process.exit(failed.length ? 1 : 0);
