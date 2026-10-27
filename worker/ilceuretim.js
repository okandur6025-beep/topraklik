/* TÜİK ilçe düzeyinde bitkisel üretim (ekilen alan, üretim). Veri TÜİK MEDAS'tan tarayıcıda alınıp /admin/ilce-uretim ucuna yüklenir. */

export const ILCE_SCHEMA = "CREATE TABLE IF NOT EXISTS ilce_uretim (il_slug TEXT, ilce_slug TEXT, ilce TEXT, urun TEXT, slug TEXT, alan REAL, uretim REAL, yil INTEGER, PRIMARY KEY (il_slug, ilce_slug, urun, yil))";

/* TÜİK ürün adı → Topraklık ürün sayfası. Sıra önemli: ilk eşleşen kullanılır. */
const ESLE = [
  [/durum buğdayı/i, "makarnalik-bugday"], [/^buğday/i, "bugday"], [/^arpa/i, "arpa"], [/^çavdar/i, "cavdar"], [/^yulaf/i, "yulaf"],
  [/tritikale/i, "tritikale"], [/mısır.*silaj/i, "silajlik-misir"], [/^mısır|mısır \(dane\)/i, "misir"], [/çeltik/i, "celtik"],
  [/^darı|kuş yemi/i, "dari"], [/karabuğday/i, "karabugday"], [/sorgum/i, "sorgum"], [/kaplıca|siyez/i, "siyez-bugdayi"],
  [/nohut/i, "nohut"], [/mercimek.*kırmızı/i, "kirmizi-mercimek"], [/mercimek.*yeşil/i, "yesil-mercimek"], [/fasulye.*kuru|kuru fasulye/i, "kuru-fasulye"],
  [/bakla.*kuru|kuru bakla/i, "bakla"], [/börülce.*kuru/i, "borulce"], [/maş/i, "mas-fasulyesi"],
  [/ayçiçeği.*çerez/i, "cerezlik-aycicegi"], [/ayçiçeği/i, "aycicegi"], [/kanola|kolza/i, "kanola"], [/soya/i, "soya"], [/yer ?fıstığı/i, "yerfistigi"],
  [/susam/i, "susam"], [/aspir/i, "aspir"], [/keten/i, "keten"], [/pamuk|kütlü/i, "pamuk"], [/şeker pancarı/i, "seker-pancari"], [/tütün/i, "tutun"],
  [/haşhaş/i, "hashas"], [/kenevir/i, "kenevir"], [/şerbetçi/i, "serbetciotu"], [/yonca/i, "yonca"], [/korunga/i, "korunga"], [/fiğ/i, "fig"],
  [/sudan otu/i, "sudan-otu"], [/hayvan pancarı/i, "hayvan-pancari"], [/italyan çimi|çim/i, "italyan-cimi"],
  [/patates/i, "patates"], [/soğan.*kuru|kuru soğan/i, "kuru-sogan"], [/sarımsak.*kuru|kuru sarımsak/i, "sarimsak"], [/anason/i, "anason"],
  [/çörek ?otu/i, "corek-otu"], [/kimyon/i, "kimyon"], [/kişniş/i, "kisnis"], [/rezene/i, "rezene"], [/safran/i, "safran"],
];
export const urunEsle = (ad) => (ESLE.find(([r]) => r.test(ad)) || [])[1] || null;

export async function ilceYukle(env, rows, slugify) {
  await env.DB.prepare(ILCE_SCHEMA).run();
  const temiz = rows.filter((r) => r.il && r.ilce && r.urun).map((r) => ({ il_slug: slugify(r.il), ilce_slug: slugify(r.ilce), ilce: r.ilce, urun: r.urun, slug: urunEsle(r.urun), alan: r.alan ?? null, uretim: r.uretim ?? null, yil: r.yil }));
  for (let i = 0; i < temiz.length; i += 2000) {
    await env.DB.prepare(`INSERT OR REPLACE INTO ilce_uretim (il_slug, ilce_slug, ilce, urun, slug, alan, uretim, yil) SELECT json_extract(value,'$.il_slug'), json_extract(value,'$.ilce_slug'), json_extract(value,'$.ilce'), json_extract(value,'$.urun'), json_extract(value,'$.slug'), json_extract(value,'$.alan'), json_extract(value,'$.uretim'), json_extract(value,'$.yil') FROM json_each(?1)`).bind(JSON.stringify(temiz.slice(i, i + 2000))).run();
  }
  return { yazilan: temiz.length, eslesen: temiz.filter((r) => r.slug).length };
}

const nf = (n) => Math.round(n).toLocaleString("tr-TR");

export async function ilceUrunleri(env, il, ilce) {
  try {
    const y = await env.DB.prepare("SELECT max(yil) y FROM ilce_uretim WHERE il_slug = ?1 AND ilce_slug = ?2").bind(il, ilce).first();
    if (!y?.y) return null;
    const rows = (await env.DB.prepare("SELECT urun, slug, alan, uretim FROM ilce_uretim WHERE il_slug = ?1 AND ilce_slug = ?2 AND yil = ?3 AND alan > 0 ORDER BY alan DESC LIMIT 25").bind(il, ilce, y.y).all()).results || [];
    return { yil: y.y, rows };
  } catch (e) { return null; }
}

export function ilceUrunHtml(d, ilceAd, esc) {
  if (!d?.rows?.length) return "";
  const top = d.rows.reduce((s, r) => s + (r.alan || 0), 0);
  return `<h2>${esc(ilceAd)} ilçesinde ne ekiliyor? (TÜİK ${d.yil})</h2>
<p>Tarla bitkilerinde ekilen alana göre ilk ${d.rows.length} ürün. Verim, ilçede o yıl dekar başına alınan ortalama üründür; kendi tarlanızın hesabında bu değeri kullanabilirsiniz.</p>
<table><thead><tr><th>Ürün</th><th>Ekilen alan</th><th>Üretim</th><th>Verim</th></tr></thead><tbody>${d.rows.map((r) => `<tr><td>${r.slug ? `<a href="/urun/${r.slug}">${esc(r.urun)}</a>` : esc(r.urun)}</td><td>${nf(r.alan)} da <small>(%${Math.max(1, Math.round((r.alan / top) * 100))})</small></td><td>${r.uretim ? nf(r.uretim) + " ton" : "—"}</td><td>${r.alan && r.uretim ? nf((r.uretim * 1000) / r.alan) + " kg/da" : "—"}</td></tr>`).join("")}</tbody></table>
<p class="src">Kaynak: TÜİK Bitkisel Üretim İstatistikleri, ilçe düzeyi (${d.yil}). Mahalle ve köy düzeyinde resmî üretim verisi yayınlanmamaktadır.</p>`;
}

/* Ürün sayfası için: bu ürünün ilçe verimleri (hesaplayıcıda "ilçemin verimi" seçimi) */
export async function urunIlceVerim(env, slug) {
  try {
    const y = await env.DB.prepare("SELECT max(yil) y FROM ilce_uretim WHERE slug = ?1").bind(slug).first();
    if (!y?.y) return null;
    const rows = (await env.DB.prepare("SELECT il_slug, ilce, sum(alan) alan, sum(uretim) uretim FROM ilce_uretim WHERE slug = ?1 AND yil = ?2 AND alan > 0 AND uretim > 0 GROUP BY il_slug, ilce_slug ORDER BY il_slug, ilce").bind(slug, y.y).all()).results || [];
    return { yil: y.y, rows: rows.map((r) => [r.il_slug, r.ilce, Math.round((r.uretim * 1000) / r.alan), Math.round(r.alan)]) };
  } catch (e) { return null; }
}
