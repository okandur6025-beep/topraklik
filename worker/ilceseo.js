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

export function emsalTablo(v, ilceAd, ilAd, esc) {
  if (!v.emsal.length) return "";
  return `<h2>${esc(ilceAd)} arazi değerleri: ihale emsalleri</h2>
<p>Son 12 ayda Topraklık'ın derlediği icra, mahkeme ve hazine satış ihalelerinin <b>muhammen bedellerine</b> göre metrekare değerleri. Hisseli satışlarda satılan hisse alanı esas alınmış, aynı parselin birden çok ilanı tek sayılmıştır. Arsa değerleri konuma ve imara göre çok değiştiği için dönüm karşılığı verilmemiştir.</p>
<div class="tablo-kap"><table><thead><tr><th>Taşınmaz</th><th>Ortanca m² değeri</th><th>Değerlerin yarısı</th><th>Dönüm başına (ortanca)</th><th>Parsel sayısı</th></tr></thead><tbody>
${v.emsal.map((e) => `<tr><td>${esc(e.cins)}${e.kapsam === "il" ? `<small> · ${esc(ilAd)} geneli</small>` : ""}</td><td><b>${nf(e.med)} TL</b></td><td>${nf(e.p25)}–${nf(e.p75)} TL</td><td>${e.cins === "Arsa" ? "—" : nf(e.med * 1000) + " TL"}</td><td>${nf(e.n)}</td></tr>`).join("")}
</tbody></table></div>
<p class="note"><b>Önemli:</b> Muhammen bedel, ihaleden önce bilirkişi veya komisyonun belirlediği değerdir; gerçek satış fiyatı ihalede oluşur ve piyasa fiyatından farklı olabilir. Bu tablo kesin piyasa değeri değil, bölgedeki ihale değerleri hakkında fikir vermek içindir. İlçede en az 5 farklı parsel bulunmayan taşınmaz türlerinde il geneli gösterilmiştir.</p>`;
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
