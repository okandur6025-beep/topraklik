/* Kod içindeki rehberler (icerik/rehberler/rehberler.py -> rehberler.json). Veritabanındaki eski rehberlerin önüne geçer. */
import R from "./rehberler.json";

export const REHBER = Object.fromEntries(R.map((r) => [r.slug, r]));
export const REHBER_LISTE = R;

function md(t, esc) {
  const satir = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, l) => `<a href="${l}">${a}</a>`);
  return String(t).split("\n\n").map((p) => {
    const ls = p.split("\n");
    if (ls.every((l) => l.startsWith("- "))) return `<ul>${ls.map((l) => `<li>${satir(l.slice(2))}</li>`).join("")}</ul>`;
    const ilk = ls.filter((l) => !l.startsWith("- ")), mad = ls.filter((l) => l.startsWith("- "));
    return (ilk.length ? `<p>${ilk.map(satir).join("<br>")}</p>` : "") + (mad.length ? `<ul>${mad.map((l) => `<li>${satir(l.slice(2))}</li>`).join("")}</ul>` : "");
  }).join("");
}

export function rehberSayfa(slug, { esc, page, html, SITE }) {
  const r = REHBER[slug];
  if (!r) return null;
  const ilgili = (r.ilgili || []).map((x) => (x.startsWith("/") ? [x, x === "/parsel-sorgu" ? "Parsel sorgulama" : x === "/ihaleler" ? "Güncel ihaleler" : x === "/urun" ? "Ürün rehberleri" : x.startsWith("/araclar/") ? "Hesaplama aracı" : x] : REHBER[x] ? [`/rehber/${x}`, REHBER[x].h1] : [`/rehber/${x}`, x.replace(/-/g, " ")]));
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/rehber">İhale ve tapu rehberleri</a> › ${esc(r.h1)}</div>
<div class="layout"><article><h1>${esc(r.h1)}</h1><p class="answer">${esc(r.cevap)}</p>
${r.bolumler.map(([b, t]) => `<h2>${esc(b)}</h2>${md(t, esc)}`).join("\n")}
<h2>Sık sorulan sorular</h2>${r.sss.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
<div class="src">Son güncelleme: Ekim 2026 · Kaynaklar: ${r.kaynak.map(([n, l]) => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(", ")}<br>Bu sayfa genel bilgilendirme amaçlıdır, hukuki danışmanlık değildir. Önemli kararlar öncesi avukata veya ilgili kuruma danışın.</div></article>
<aside><h3>İlgili sayfalar</h3>${ilgili.map(([l, t]) => `<a class="card" href="${esc(l)}"><b>${esc(t)}</b></a>`).join("")}<a class="card" href="/ihaleler"><b>Güncel tarla ve arsa ihaleleri →</b></a><a class="card" href="/araclar"><b>Hesaplama araçları →</b></a></aside></div>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "Article", headline: r.h1, description: r.desc, inLanguage: "tr", dateModified: "2026-10-27", author: { "@type": "Organization", name: "Topraklık" }, publisher: { "@type": "Organization", name: "Topraklık", url: SITE } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: r.sss.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }];
  return html(page({ title: `${r.title} · Topraklık`, description: r.desc, path: `/rehber/${slug}`, body, current: "/rehber", jsonld }), 200, 3600);
}
