/* İlçe sayfaları için özgün veri: güncel ihaleler, ihale bedellerinden m² değerleri (emsal), diğer ilçeler, SSS.
 * Emsal, ihalelerin muhammen (bilirkişi/komisyon) bedellerinden hesaplanır; piyasa satış fiyatı değildir ve öyle sunulmaz. */

import { URUN } from "./urun.js";
const urunAdi = (r) => (r.slug && URUN[r.slug] ? URUN[r.slug].ad.replace(/\s*\(.*?\)\s*/g, " ").trim() : r.urun.replace(/\s*\(.*?\)\s*/g, " ").replace(/,.*$/, "").trim()).toLocaleLowerCase("tr");
const bugunTR = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const nf = (n, d = 0) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const ARAZI = ["Tarla", "Arsa", "Bağ-Bahçe", "Zeytinlik"];

function yuzdelik(a, p) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }

async function q(env, sql, ...b) { try { return (await env.DB.prepare(sql).bind(...b).all()).results || []; } catch (e) { return []; } }

/* m² değeri: satılan alan (hisse varsa hisse alanı) üzerinden; uç değerler (%5–%95 dışı) atılır */
function emsalHesapla(rows) {
  const g = {}, gorulen = new Set();
  for (const r of rows) {
    /* aynı parselin farklı hisseleri ya da tekrar ilanları tek sayılır */
    const k = r.ada && r.parsel ? `${r.ilce_slug}|${r.ada}|${r.parsel}|${r.cins}` : null;
    if (k) { if (gorulen.has(k)) continue; gorulen.add(k); }
    const alan = r.hisse_m2 || r.m2;
    if (!alan || !r.bedel || alan < 50) continue;
    const v = r.bedel / alan;
    if (!isFinite(v) || v <= 0) continue;
    (g[r.cins] ||= []).push(v);
  }
  const out = [];
  for (const c of ARAZI) {
    let a = g[c] || [];
    if (a.length >= 6) { const lo = yuzdelik(a, 0.05), hi = yuzdelik(a, 0.95); a = a.filter((v) => v >= lo && v <= hi); }
    if (a.length) out.push({ cins: c, n: a.length, med: yuzdelik(a, 0.5), p25: yuzdelik(a, 0.25), p75: yuzdelik(a, 0.75) });
  }
  return out;
}

export async function ilceVeri(env, ilSlug, ilceSlug) {
  const bugun = bugunTR(), yilOnce = new Date(Date.now() - 365 * 864e5).toISOString();
  const [ihaleler, sayilar, ilceEmsal, ilEmsal, digerleri] = await Promise.all([
    q(env, "SELECT * FROM ihale WHERE aktif = 1 AND bitis >= ?1 AND il_slug = ?2 AND ilce_slug = ?3 ORDER BY (dogrulandi = 1) DESC, tarih LIMIT 6", bugun, ilSlug, ilceSlug),
    q(env, "SELECT kaynak, tip, cins, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 AND il_slug = ?2 AND ilce_slug = ?3 GROUP BY kaynak, tip, cins", bugun, ilSlug, ilceSlug),
    q(env, "SELECT cins, m2, hisse_m2, bedel, ada, parsel, ilce_slug FROM ihale WHERE tip = 'satis' AND il_slug = ?1 AND ilce_slug = ?2 AND ilk_gorulme >= ?3 AND bedel > 0 AND cins IN ('Tarla','Arsa','Bağ-Bahçe','Zeytinlik')", ilSlug, ilceSlug, yilOnce),
    q(env, "SELECT cins, m2, hisse_m2, bedel, ada, parsel, ilce_slug FROM ihale WHERE tip = 'satis' AND il_slug = ?1 AND ilk_gorulme >= ?2 AND bedel > 0 AND cins IN ('Tarla','Arsa','Bağ-Bahçe','Zeytinlik')", ilSlug, yilOnce),
    q(env, "SELECT ilce, ilce_slug, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 AND il_slug = ?2 AND ilce_slug != ?3 GROUP BY ilce_slug ORDER BY n DESC LIMIT 12", bugun, ilSlug, ilceSlug),
  ]);
  const top = (f) => sayilar.filter(f).reduce((s, r) => s + r.n, 0);
  const em = emsalHesapla(ilceEmsal), emIl = emsalHesapla(ilEmsal);
  /* ilçede en az 3 ilan yoksa o cins için il geneli gösterilir (açıkça belirtilerek) */
  const emsal = ARAZI.map((c) => { const a = em.find((x) => x.cins === c); if (a && a.n >= 5) return { ...a, kapsam: "ilce" }; const b = emIl.find((x) => x.cins === c); return b && b.n >= 5 ? { ...b, kapsam: "il" } : null; }).filter(Boolean);
  return {
    ihaleler, digerleri, emsal,
    sayi: { toplam: top(() => true), icra: top((r) => r.kaynak !== "milliemlak"), hazineSatis: top((r) => r.kaynak === "milliemlak" && r.tip === "satis"), hazineKira: top((r) => r.kaynak === "milliemlak" && r.tip === "kira"), tarla: top((r) => r.cins === "Tarla"), arsa: top((r) => r.cins === "Arsa") },
  };
}

export function emsalTablo(v, ilceAd, ilAd, esc, ilMi = false) {
  if (!v.emsal.length) return "";
  return `<h2>${esc(ilceAd)}${ilMi ? " geneli" : ""} arazi değerleri: ihale emsalleri</h2>
<p>Son 12 ayda Topraklık'ın derlediği icra, mahkeme ve hazine satış ihalelerinin <b>muhammen bedellerine</b> göre metrekare değerleri. Hisseli satışlarda satılan hisse alanı esas alınmış, aynı parselin birden çok ilanı tek sayılmıştır. Arsa değerleri konuma ve imara göre çok değiştiği için dönüm karşılığı verilmemiştir.</p>
<div class="tablo-kap"><table><thead><tr><th>Taşınmaz</th><th>Ortanca m² değeri</th><th>Değerlerin yarısı</th><th>Dönüm başına (ortanca)</th><th>Parsel sayısı</th></tr></thead><tbody>
${v.emsal.map((e) => `<tr><td>${esc(e.cins)}${e.kapsam === "il" && !ilMi ? `<small> · ${esc(ilAd)} geneli</small>` : ""}</td><td><b>${nf(e.med)} TL</b></td><td>${nf(e.p25)}–${nf(e.p75)} TL</td><td>${e.cins === "Arsa" ? "—" : nf(e.med * 1000) + " TL"}</td><td>${nf(e.n)}</td></tr>`).join("")}
</tbody></table></div>
<p class="note"><b>Önemli:</b> Muhammen bedel, ihaleden önce bilirkişi veya komisyonun belirlediği değerdir; gerçek satış fiyatı ihalede oluşur ve piyasa fiyatından farklı olabilir. Bu tablo kesin piyasa değeri değil, bölgedeki ihale değerleri hakkında fikir vermek içindir.${ilMi ? " En az 5 farklı parseli olan taşınmaz türleri gösterilmiştir." : " İlçede en az 5 farklı parsel bulunmayan taşınmaz türlerinde il geneli gösterilmiştir."}</p>`;
}

export function ilceOzet(v, ilceAd, ilAd, uretim, esc) {
  const p = [];
  if (v.sayi.toplam) p.push(`${esc(ilceAd)} ilçesinde şu an <b>${nf(v.sayi.toplam)}</b> aktif ihale var: ${[v.sayi.icra ? `${nf(v.sayi.icra)} icra ve mahkeme satışı` : "", v.sayi.hazineSatis ? `${nf(v.sayi.hazineSatis)} hazine satışı` : "", v.sayi.hazineKira ? `${nf(v.sayi.hazineKira)} hazine kiralaması` : ""].filter(Boolean).join(", ")}.`);
  else p.push(`${esc(ilceAd)} ilçesinde şu an aktif arazi ihalesi bulunmuyor; yeni ilanlar her gün kontrol ediliyor.`);
  const t = v.emsal.find((e) => e.cins === "Tarla"), a = v.emsal.find((e) => e.cins === "Arsa");
  if (t) p.push(`İhale bedellerine göre tarlaların ortanca m² değeri <b>${nf(t.med)} TL</b>${t.kapsam === "il" ? ` (${esc(ilAd)} geneli)` : ""}${a ? `, arsaların <b>${nf(a.med)} TL</b>${a.kapsam === "il" ? ` (${esc(ilAd)} geneli)` : ""}` : ""}.`);
  const ur = [...new Set((uretim?.rows || []).map(urunAdi))].slice(0, 3);
  if (ur.length) p.push(`TÜİK ${uretim.yil} verisine göre ilçede ekim alanı en büyük ürünler: ${ur.join(", ")}.`);
  return `<p class="answer">${p.join(" ")}</p>`;
}

export function ilceSss(v, ilceAd, ilAd, uretim) {
  const t = v.emsal.find((e) => e.cins === "Tarla");
  const ur = [...new Set((uretim?.rows || []).map(urunAdi))].slice(0, 3);
  return [
    [`${ilceAd} ilçesinde icradan satılık tarla var mı?`, v.sayi.tarla ? `Evet. Şu an ${ilceAd} ilçesinde ${v.sayi.tarla} aktif tarla ihalesi var${v.sayi.arsa ? `, ayrıca ${v.sayi.arsa} arsa ilanı bulunuyor` : ""}. Güncel liste Topraklık'ın ${ilceAd} ihaleleri sayfasında; her ilanda kaynağa bağlantı, bedel, alan ve artırma tarihleri yer alır.` : `Şu an ${ilceAd} ilçesinde aktif tarla ihalesi görünmüyor. İlanlar her gün kontrol edilir; ${ilAd} genelindeki ihalelere de bakabilirsiniz.`],
    [`${ilceAd} ilçesinde tarlanın m² fiyatı ne kadar?`, t ? `Son 12 aydaki ihalelerin muhammen bedellerine göre ortanca değer m² başına yaklaşık ${nf(t.med)} TL${t.kapsam === "il" ? ` (${ilAd} geneli, ${t.n} parsel)` : ` (${t.n} parsel)`}. Bu, piyasa satış fiyatı değil ihale öncesi belirlenen değerdir; gerçek fiyat konuma, yola, suya ve imar durumuna göre değişir.` : `Bu ilçe için yeterli sayıda ihale emsali henüz yok. Değer konuma, yola, suya ve imar durumuna göre çok değişir; yerel emlakçılara ve tapu müdürlüğündeki satış kayıtlarına danışın.`],
    [`${ilceAd} ilçesinde en çok ne ekiliyor?`, ur.length ? `TÜİK ${uretim.yil} ilçe verisine göre ekim alanı en büyük ürünler ${ur.join(", ")}. Ürünlerin dekar başına verimi ve tahmini kazancı ürün sayfalarında ilçe verimiyle hesaplanabilir.` : `İlçe bazında üretim verisi için TÜİK Bitkisel Üretim İstatistiklerine bakılabilir; ${ilAd} genelinde yetişen ürünler sayfada listelenmiştir.`],
    [`${ilceAd} ilçesindeki bir tarlanın sınırını nasıl görürüm?`, `Topraklık'ın 3B parsel sorgu aracında ${ilAd}, ${ilceAd} ve mahalleyi seçip tapudaki ada ve parsel numarasını girin. Parsel sınırı, yüzölçümü, niteliği, rakımı ve yaklaşık eğimi uydu görüntüsü üzerinde gösterilir.`],
  ];
}

/* ---------- İl sayfası ve il/ilçe ihale listeleri için ---------- */

export async function ilVeri(env, ilSlug) {
  const bugun = bugunTR(), yilOnce = new Date(Date.now() - 365 * 864e5).toISOString();
  const [ihaleler, sayilar, emsalRows, ilceler, uretim] = await Promise.all([
    q(env, "SELECT * FROM ihale WHERE aktif = 1 AND bitis >= ?1 AND il_slug = ?2 ORDER BY (dogrulandi = 1) DESC, tarih LIMIT 6", bugun, ilSlug),
    q(env, "SELECT kaynak, tip, cins, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 AND il_slug = ?2 GROUP BY kaynak, tip, cins", bugun, ilSlug),
    q(env, "SELECT cins, m2, hisse_m2, bedel, ada, parsel, ilce, ilce_slug FROM ihale WHERE tip = 'satis' AND il_slug = ?1 AND ilk_gorulme >= ?2 AND bedel > 0 AND cins IN ('Tarla','Arsa','Bağ-Bahçe','Zeytinlik')", ilSlug, yilOnce),
    q(env, "SELECT ilce, ilce_slug, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 AND il_slug = ?2 GROUP BY ilce_slug ORDER BY n DESC LIMIT 15", bugun, ilSlug),
    q(env, "SELECT urun, slug, sum(alan) alan, sum(uretim) uretim, yil FROM ilce_uretim WHERE il_slug = ?1 AND yil = (SELECT max(yil) FROM ilce_uretim WHERE il_slug = ?1) AND alan > 0 GROUP BY urun ORDER BY alan DESC LIMIT 10", ilSlug),
  ]);
  const top = (f) => sayilar.filter(f).reduce((s, r) => s + r.n, 0);
  const emsal = emsalHesapla(emsalRows).filter((e) => e.n >= 5).map((e) => ({ ...e, kapsam: "il" }));
  /* ilçelere göre tarla değeri: en az 5 farklı parsel olan ilçeler */
  const grup = {};
  for (const r of emsalRows) (grup[r.ilce_slug] ||= []).push(r);
  const ilceTarla = Object.entries(grup).map(([slug, rs]) => { const t = emsalHesapla(rs).find((e) => e.cins === "Tarla"); return t && t.n >= 5 ? { slug, ilce: rs[0].ilce, med: t.med, n: t.n } : null; }).filter(Boolean).sort((a, b) => b.med - a.med);
  return {
    ihaleler, ilceler, emsal, ilceTarla, uretim: uretim.length ? { yil: uretim[0].yil, rows: uretim } : null,
    sayi: { toplam: top(() => true), icra: top((r) => r.kaynak !== "milliemlak"), hazineSatis: top((r) => r.kaynak === "milliemlak" && r.tip === "satis"), hazineKira: top((r) => r.kaynak === "milliemlak" && r.tip === "kira"), tarla: top((r) => r.cins === "Tarla"), arsa: top((r) => r.cins === "Arsa"), konut: top((r) => r.cins === "Konut") },
  };
}

const ilceAdi = (t) => String(t || "").toLocaleLowerCase("tr").replace(/(^|[\s-])\S/g, (c) => c.toLocaleUpperCase("tr"));

export function ilOzet(v, ilAd, esc) {
  const p = [];
  if (v.sayi.toplam) p.push(`${esc(ilAd)} genelinde şu an <b>${nf(v.sayi.toplam)}</b> aktif ihale var: ${[v.sayi.icra ? `${nf(v.sayi.icra)} icra ve mahkeme satışı` : "", v.sayi.hazineSatis ? `${nf(v.sayi.hazineSatis)} hazine satışı` : "", v.sayi.hazineKira ? `${nf(v.sayi.hazineKira)} hazine kiralaması` : ""].filter(Boolean).join(", ")}.`);
  else p.push(`${esc(ilAd)} genelinde şu an aktif arazi ihalesi bulunmuyor; yeni ilanlar her gün kontrol ediliyor.`);
  if (v.ilceler.length) p.push(`En çok ilan ${v.ilceler.slice(0, 3).map((d) => `${esc(ilceAdi(d.ilce))} (${d.n})`).join(", ")} ilçelerinde.`);
  const t = v.emsal.find((e) => e.cins === "Tarla");
  if (t) p.push(`Son 12 ayın ihale bedellerine göre tarlaların ortanca m² değeri <b>${nf(t.med)} TL</b>.`);
  const ur = [...new Set((v.uretim?.rows || []).map(urunAdi))].slice(0, 3);
  if (ur.length) p.push(`TÜİK ${v.uretim.yil} verisine göre ilde ekim alanı en büyük ürünler: ${ur.join(", ")}.`);
  return `<p class="answer">${p.join(" ")}</p>`;
}

export function ilceTarlaTablo(v, ilAd, ilSlug, esc) {
  if (v.ilceTarla.length < 2) return "";
  return `<h2>${esc(ilAd)} ilçelerine göre tarla değerleri</h2>
<p>Son 12 ayda en az 5 farklı tarla parseli ihaleye çıkan ilçelerde, muhammen bedele göre ortanca m² değeri. İlçe adına dokunarak o ilçenin ayrıntılı sayfasına geçebilirsiniz.</p>
<div class="tablo-kap"><table><thead><tr><th>İlçe</th><th>Ortanca m² değeri</th><th>Dönüm başına</th><th>Parsel sayısı</th></tr></thead><tbody>
${v.ilceTarla.slice(0, 15).map((e) => `<tr><td><a href="/il/${esc(ilSlug)}/${esc(e.slug)}">${esc(ilceAdi(e.ilce))}</a></td><td><b>${nf(e.med)} TL</b></td><td>${nf(e.med * 1000)} TL</td><td>${nf(e.n)}</td></tr>`).join("")}
</tbody></table></div>
<p class="note">Muhammen bedel bilirkişi veya komisyonun belirlediği değerdir; piyasa satış fiyatı değildir. Konum, yol, su ve imar durumu fiyatı belirgin biçimde değiştirir.</p>`;
}

export function ilUretimHtml(v, ilAd, esc) {
  const d = v.uretim;
  if (!d?.rows?.length) return "";
  return `<h2>${esc(ilAd)} ilinde ne ekiliyor? (TÜİK ${d.yil})</h2>
<p>Tarla bitkilerinde ilçelerin toplam ekim alanına göre ilk ${d.rows.length} ürün. Verim, ilde dekar başına alınan ortalama üründür.</p>
<div class="tablo-kap"><table><thead><tr><th>Ürün</th><th>Ekilen alan</th><th>Üretim</th><th>Verim</th></tr></thead><tbody>${d.rows.map((r) => `<tr><td>${r.slug ? `<a href="/urun/${r.slug}">${esc(r.urun)}</a>` : esc(r.urun)}</td><td>${nf(r.alan)} da</td><td>${r.uretim ? nf(r.uretim) + " ton" : "—"}</td><td>${r.alan && r.uretim ? nf((r.uretim * 1000) / r.alan) + " kg/da" : "—"}</td></tr>`).join("")}</tbody></table></div>
<p class="src">Kaynak: TÜİK Bitkisel Üretim İstatistikleri, ilçe verilerinin il toplamı (${d.yil}).</p>`;
}

export function ilSss(v, ilAd) {
  const t = v.emsal.find((e) => e.cins === "Tarla");
  const ur = [...new Set((v.uretim?.rows || []).map(urunAdi))].slice(0, 4);
  const ilk = v.ilceler.slice(0, 3).map((d) => ilceAdi(d.ilce));
  return [
    [`${ilAd} ilinde icradan satılık tarla var mı?`, v.sayi.tarla ? `Evet. Şu an ${ilAd} genelinde ${v.sayi.tarla} aktif tarla ihalesi var${v.sayi.arsa ? `, ayrıca ${v.sayi.arsa} arsa ilanı bulunuyor` : ""}${ilk.length ? `. En çok ilan ${ilk.join(", ")} ilçelerinde` : ""}. Her ilanda bedel, alan, hisse durumu ve artırma tarihleri yer alır.` : `Şu an ${ilAd} genelinde aktif tarla ihalesi görünmüyor. İlanlar her gün UYAP e-Satış, ilan.gov.tr ve Milli Emlak'tan kontrol edilir.`],
    [`${ilAd} ilinde tarlanın m² fiyatı ne kadar?`, t ? `Son 12 aydaki ihalelerin muhammen bedellerine göre ${ilAd} genelinde ortanca değer m² başına yaklaşık ${nf(t.med)} TL (${t.n} parsel); değerlerin yarısı ${nf(t.p25)}–${nf(t.p75)} TL arasında. Bu, piyasa satış fiyatı değil ihale öncesi belirlenen değerdir; ilçeler arasında büyük fark olabilir.` : `Bu il için yeterli sayıda ihale emsali henüz yok. Değer ilçeye, yola, suya ve imar durumuna göre çok değişir; tapu müdürlüğündeki satış kayıtlarına ve yerel emlakçılara danışın.`],
    [`${ilAd} ilinde en çok ne ekiliyor?`, ur.length ? `TÜİK ${v.uretim.yil} verisine göre ${ilAd} ilinde ekim alanı en büyük tarla ürünleri ${ur.join(", ")}. Ürün sayfalarında ilçe verimiyle dekar başına tahmini kazanç hesaplanabilir.` : `İl bazında üretim bilgisi TÜİK Bitkisel Üretim İstatistiklerinde yayımlanır; ilde yetişen ürünler sayfada listelenmiştir.`],
    [`${ilAd} ilindeki bir tarlanın sınırını nasıl görürüm?`, `Topraklık'ın 3B parsel sorgu aracında ${ilAd}, ilçe ve mahalleyi seçip tapudaki ada ve parsel numarasını girin. Parsel sınırı, yüzölçümü, niteliği, rakımı ve yaklaşık eğimi uydu görüntüsü üzerinde gösterilir.`],
  ];
}

/* İhale listesi (il veya ilçe, filtresiz ilk sayfa) için ek bölüm: emsal tablosu ve SSS */
export async function listeEk(env, f, ilAd, ilceAd, esc) {
  if (f.ilce) {
    const v = await ilceVeri(env, f.il, f.ilce);
    const sss = ilceSss(v, ilceAd, ilAd, null).filter((_, i) => i !== 2);
    return { html: `${emsalTablo(v, ilceAd, ilAd, esc)}<h2>Sık sorulan sorular</h2>${sss.map(([s, c]) => `<details><summary>${esc(s)}</summary><p>${esc(c)}</p></details>`).join("")}${v.digerleri.length ? `<h2>${esc(ilAd)} ilindeki diğer ilçelerin ihaleleri</h2><p class="chips">${v.digerleri.map((d) => `<a class="tag" href="/ihaleler/${esc(f.il)}/${esc(d.ilce_slug)}">${esc(ilceAdi(d.ilce))} · ${d.n}</a>`).join(" ")}</p>` : ""}`, sss };
  }
  const v = await ilVeri(env, f.il);
  const sss = ilSss(v, ilAd).filter((_, i) => i !== 2);
  return { html: `${emsalTablo(v, ilAd, ilAd, esc, true)}${ilceTarlaTablo(v, ilAd, f.il, esc)}<h2>Sık sorulan sorular</h2>${sss.map(([s, c]) => `<details><summary>${esc(s)}</summary><p>${esc(c)}</p></details>`).join("")}${v.ilceler.length ? `<h2>${esc(ilAd)} ilçelerine göre ihaleler</h2><p class="chips">${v.ilceler.map((d) => `<a class="tag" href="/ihaleler/${esc(f.il)}/${esc(d.ilce_slug)}">${esc(ilceAdi(d.ilce))} · ${d.n}</a>`).join(" ")}</p>` : ""}`, sss };
}
