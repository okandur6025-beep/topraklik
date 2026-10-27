/* ilan.gov.tr (Basın İlan Kurumu) icra ve mahkeme satış ilanları: tarla ve arsa.
   Worker zamanlı görevi her gün tüm listeyi parça parça tarar. */
import { ihaleYukle, ihaleSema } from "./ihale.js";

const API = "https://www.ilan.gov.tr/api/api/services/app/";
const H = { "content-type": "application/json-patch+json", accept: "text/plain", "x-request-origin": "IGT-UI", "x-requested-with": "XMLHttpRequest", origin: "https://www.ilan.gov.tr", referer: "https://www.ilan.gov.tr/ilan/tum-ilanlar", "user-agent": "Mozilla/5.0 (compatible; TopraklikBot/1.0; +https://topraklik.com)" };
export const BIK_KAT = [[95, "Tarla"], [102, "Arsa"]]; // ilan.gov.tr kategori (txv) kimlikleri

const num = (s) => parseFloat(String(s || "").replace(/[^\d,]/g, "").replace(",", ".")) || null;
const tarihISO = (s) => { const m = String(s || "").match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?/); return m ? `${m[3]}-${m[2]}-${m[1]}${m[4] ? "T" + m[4] : ""}` : ""; };
const gunEkle = (iso, g) => new Date(Date.parse(iso.slice(0, 10)) + g * 864e5).toISOString().slice(0, 10);
const buyuk = (t) => String(t || "").charAt(0).toLocaleUpperCase("tr") + String(t || "").slice(1);

export function bikCevir(a, kat, IL_AD, slugify) {
  const f = Object.fromEntries((a.adTypeFilters || []).map((x) => [x.key, x.value]));
  const il_slug = slugify(a.addressCityName || "");
  const il = IL_AD[il_slug] || buyuk((a.addressCityName || "").toLocaleLowerCase("tr"));
  const title = a.title || "";
  let ilce = "", m2 = null, nitelik = "";
  const ilAd = IL_AD[il_slug];
  if (ilAd && title.startsWith(ilAd + " ")) {
    const rest = title.slice(ilAd.length + 1);
    const m = rest.match(/^(.+?)['’]\S*\s+([\d.,]+)\s*m²\s+(.+?)\s+(?:icradan|mahkemeden|satış memurluğundan|ortaklığın giderilmesi)/i);
    if (m) { ilce = m[1].trim(); m2 = num(m[2].replace(/\./g, "")); nitelik = m[3].trim(); }
  }
  if (!m2) { const mm = title.match(/([\d.]+)\s*m²/); if (mm) m2 = num(mm[1].replace(/\./g, "")); }
  let mahalle = null;
  const mk = ilce.match(/^(\S+)\s+(.+?(?:Köyü|Mahallesi|Mah\.|Beldesi|Mevkii))$/i);
  if (mk) { ilce = mk[1]; mahalle = mk[2]; }
  ilce = buyuk(ilce);
  if (!ilce) ilce = a.addressCountyName && a.addressCountyName !== "Merkez" ? a.addressCountyName : "Merkez";
  let cins = kat;
  if (kat === "Tarla") cins = /zeytin/i.test(nitelik) ? "Zeytinlik" : /bağ|bahçe/i.test(nitelik) ? "Bağ-Bahçe" : "Tarla";
  const tarih = tarihISO(f["Birinci Satış Günü"]);
  return {
    id: "bik" + a.id, ilan_id: String(a.id), il, il_slug, ilce, mahalle, ada: null, parsel: null, cins, imar: null, m2,
    bedel: num(f["Muhammen Bedeli"]), teminat: null, tarih, bitis: tarih ? gunEkle(tarih, 7) : null,
    yer: a.advertiserName, usul: /mahkeme/i.test(title) ? "Mahkeme kararıyla satış (ortaklığın giderilmesi vb.)" : "İcra yoluyla satış (2004 sayılı İİK)",
    hisse: null, amac: null, tasinmaz_no: a.adNo, link: "https://www.ilan.gov.tr" + a.urlStr, foto: 0, nitelik: buyuk(nitelik) || null, dosya: f["Dosya No"] || null, baslik: title,
  };
}

async function sayfa(txv, skip) {
  const r = await fetch(API + "Ad/AdsByFilter", { method: "POST", headers: H, body: JSON.stringify({ keys: { ats: [2], txv: [txv] }, skipCount: skip, maxResultCount: 20 }) });
  if (!r.ok) throw new Error("ilan.gov.tr " + r.status);
  return (await r.json()).result || {};
}

async function durumOku(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS durum (k TEXT PRIMARY KEY, v TEXT)").run();
  const r = await env.DB.prepare("SELECT v FROM durum WHERE k = 'bik'").first();
  return r ? JSON.parse(r.v) : null;
}
const durumYaz = (env, d) => env.DB.prepare("INSERT OR REPLACE INTO durum (k, v) VALUES ('bik', ?1)").bind(JSON.stringify(d)).run();

/* Bir çağrıda en fazla `sayfaSayisi` sayfa (20 ilan) işler. Günde bir kez baştan başlar. */
export async function bikAdim(env, { IL_AD, slugify, sayfaSayisi = 12, zorla = false } = {}) {
  await ihaleSema(env);
  const gun = new Date().toISOString().slice(0, 10);
  let d = await durumOku(env);
  if (!d || d.gun !== gun || zorla) d = { gun, ki: 0, skip: 0, baslangic: new Date().toISOString(), bitti: false, toplam: 0 };
  if (d.bitti) return { durum: "bugün tamamlandı", ...d };
  const items = [];
  for (let i = 0; i < sayfaSayisi && d.ki < BIK_KAT.length; i++) {
    const [txv, kat] = BIK_KAT[d.ki];
    const res = await sayfa(txv, d.skip);
    const ads = res.ads || [];
    for (const a of ads) items.push(bikCevir(a, kat, IL_AD, slugify));
    d.skip += 20;
    if (ads.length < 20 || d.skip >= (res.numFound || 0)) { d.ki++; d.skip = 0; }
  }
  const temiz = items.filter((x) => x.tarih);
  if (temiz.length) await ihaleYukle(env, { kaynak: "bik", tip: "satis", items: temiz }, slugify);
  d.toplam += temiz.length;
  let kalkan = 0;
  if (d.ki >= BIK_KAT.length) {
    const r = await env.DB.prepare("UPDATE ihale SET aktif = 0 WHERE kaynak = 'bik' AND aktif = 1 AND guncel < ?1").bind(d.baslangic).run();
    kalkan = r.meta?.changes || 0; d.bitti = true;
    await env.DB.prepare("INSERT INTO runs (at, job, log) VALUES (?1, 'ihale-bik', ?2)").bind(new Date().toISOString(), `toplam ${d.toplam}, kalkan ${kalkan}`).run();
  }
  await durumYaz(env, d);
  return { bu_adim: temiz.length, kalkan, ...d };
}

/* Detay sayfası için ilan metnini getirir (önbellekli). */
export async function bikDetay(ilanId, ctx) {
  const url = `${API}AdDetail/GetAdDetail?id=${encodeURIComponent(ilanId)}`;
  const cache = caches.default, key = new Request("https://topraklik.com/_onbellek/bik/" + ilanId);
  let r = await cache.match(key);
  if (!r) {
    const o = await fetch(url, { headers: H });
    if (!o.ok) return null;
    const j = await o.json();
    const t = String(j.result?.content || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/@page[^}]*}|p\s*{[^}]*}/g, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
    r = new Response(JSON.stringify({ metin: t.slice(0, 6000) }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=86400" } });
    ctx?.waitUntil?.(cache.put(key, r.clone()));
  }
  const { metin } = await r.json();
  const ap = metin.match(/(\d+)\s*ada[,\s]*(\d+)\s*parsel/i);
  const mah = metin.match(/([A-ZÇĞİÖŞÜa-zçğıöşü.\s]{3,40}?)\s+(Mahallesi|Köyü|Mah\.)/);
  return { metin, ada: ap?.[1], parsel: ap?.[2], mahalle: mah ? (mah[1].trim().split(/\s+/).slice(-2).join(" ") + " " + mah[2]).replace("Mah.", "Mahallesi") : null };
}
