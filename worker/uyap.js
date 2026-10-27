/* UYAP e-Satış taşınmaz ilanları (ilan.gov.tr üzerinden, kaynak kodu "UYAP").
   Liste başlıkları bilgi taşımaz; her ilanın metni bir kez okunur, tarla/arsa/bağ-bahçe olanlar kaydedilir.
   Aynı satış ilan.gov.tr icra ilanlarında (bik) da varsa yeni kayıt açılmaz, o kayıt ada/parsel ve tarihlerle zenginleştirilir. */
import { ihaleYukle, ihaleSema } from "./ihale.js";

const API = "https://www.ilan.gov.tr/api/api/services/app/";
const H = { "content-type": "application/json-patch+json", accept: "text/plain", "x-request-origin": "IGT-UI", "x-requested-with": "XMLHttpRequest", origin: "https://www.ilan.gov.tr", referer: "https://www.ilan.gov.tr/ilan/tum-ilanlar", "user-agent": "Mozilla/5.0 (compatible; TopraklikBot/1.0; +https://topraklik.com)" };
const KELIME = "A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû";

const num = (s) => parseFloat(String(s || "").replace(/\./g, "").replace(",", ".")) || null;
const tarih = (g, a, y, s) => `${y}-${a}-${g}${s ? "T" + s : ""}`;
const buyuk = (t) => String(t || "").toLocaleLowerCase("tr").replace(/(^|[\s(-])\S/g, (c) => c.toLocaleUpperCase("tr"));

/* Satış yapan birim + dosya no → iki kaynağı eşleştirmek için anahtar */
export function satisAnahtari(yer, dosya, slugify) {
  const m = String(dosya || "").match(/(\d{4})\s*\/\s*(\d+)/);
  if (!m) return null;
  const y = String(yer || "").trim();
  const ilk = slugify(y.split(/[\s(]/)[0] || "");
  const no = (y.match(/\s(\d+)\.\s/) || [])[1] || "";
  return `${ilk}${no ? "-" + no : ""}-${m[1]}-${m[2]}`;
}

export function uyapCoz(a, html, { IL_AD, slugify }) {
  const t = String(html || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ");
  const oz = t.slice(Math.max(0, t.search(/NO'LU TAŞINMAZIN/i)), Math.max(0, t.search(/NO'LU TAŞINMAZIN/i)) + 2500) || t.slice(0, 2500);
  const nit = oz.match(new RegExp(`(?:tapuda|tapu kaydında|tapu kaydı)\\s*["'“”?]*\\s*([${KELIME}\\- ]{3,40}?)["'“”?]*\\s*(?:nitelikli|niteliğinde|nitelikte|vasıflı|vasfında|olarak)`, "i"))
    || oz.match(new RegExp(`([${KELIME}]{3,20})\\s+(?:vasfında|vasıflı|nitelikli|niteliğinde)`, "i"));
  const nitelik = nit ? nit[1].trim() : "";
  let cins = null;
  if (/tarla|tarım arazi|çayır|mera/i.test(nitelik)) cins = "Tarla";
  else if (/zeytin/i.test(nitelik)) cins = "Zeytinlik";
  else if (/bağ|bahçe|fındık|meyve/i.test(nitelik)) cins = "Bağ-Bahçe";
  else if (/arsa/i.test(nitelik)) cins = "Arsa";
  if (!cins) return { ilgili: false, nitelik };
  const il_slug0 = slugify(a.addressCityName || "");
  const yer = oz.match(new RegExp(`([${KELIME}]+)\\s+İl(?:i|\\b)[,\\s]+([${KELIME}]+)\\s+İlçe(?:si)?\\b[,\\s]+(.{2,40}?)\\s+(?:Mahallesi|Mahalle\\s*/\\s*Köy|Mahalle|Köyü|Mah\\.?|Mh\\.?)`, "i"));
  const il_slug = yer && IL_AD[slugify(yer[1])] ? slugify(yer[1]) : il_slug0;
  let ilce = yer ? buyuk(yer[2]) : "";
  if (!ilce) { const b = (a.title || "").match(/^([^\s(]+)/); ilce = b && slugify(b[1]) !== il_slug ? buyuk(b[1]) : "Merkez"; }
  const mahalle = yer ? buyuk(yer[3].replace(/[,.]$/, "")) + (/köy/i.test(yer[0]) && !/mahalle/i.test(yer[0]) ? " Köyü" : " Mahallesi") : null;
  const ap = oz.match(/(\d+)\s*ada[,\s]*(?:no'?lu\s*)?(\d+)\s*(?:no'?lu\s*)?parsel/i);
  const m2m = oz.match(/([\d.]+(?:,\d+)?)\s*m(?:2|²)/i);
  const kiy = t.match(/Kıymeti\s*:\s*([\d.]+,\d{2})/i);
  const kdv = t.match(/KDV Oranı\s*:\s*%\s*(\d+)/i);
  const a1 = t.match(/1\.\s*Artırma Başlangıç Tarih ve Saati\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}:\d{2})/i);
  const a2 = t.match(/2\.\s*Artırma Başlangıç Tarih ve Saati\s*:\s*\d{2}\/\d{2}\/\d{4}[\s\S]{0,200}?Bitiş Tarih ve Saati\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const miras = /SADECE MALİK OLAN MİRASÇILAR/i.test(t);
  const dosya = ((a.title || "").match(/(\d{4}\/\d+)/) || [])[1] || null;
  const birim = (a.title || "").replace(/\s*\d{4}\/\d+.*$/, "").trim();
  if (!a1) return { ilgili: false, nitelik, neden: "tarih yok" };
  return {
    ilgili: true,
    kayit: {
      id: "uyap" + a.id, ilan_id: String(a.id), il: IL_AD[il_slug] || buyuk(a.addressCityName), il_slug, ilce, mahalle, ada: ap?.[1] || null, parsel: ap?.[2] || null,
      cins, imar: null, m2: m2m ? num(m2m[1]) : null, bedel: kiy ? num(kiy[1]) : null, teminat: kiy ? Math.round(num(kiy[1]) * 0.1) : null,
      tarih: tarih(a1[1], a1[2], a1[3], a1[4]), bitis: a2 ? tarih(a2[1], a2[2], a2[3]) : null, yer: birim,
      usul: (miras ? "1. artırma yalnızca mirasçı malikler arasında (7589 sayılı Kanun); 2. artırma herkese açık. " : "") + "UYAP e-Satış elektronik açık artırma" + (kdv ? ` · KDV %${kdv[1]}` : ""),
      hisse: null, amac: null, tasinmaz_no: null, link: "https://www.ilan.gov.tr" + a.urlStr, foto: 0, nitelik: buyuk(nitelik), dosya,
    },
  };
}

async function liste(skip) {
  const r = await fetch(API + "Ad/AdsByFilter", { method: "POST", headers: H, body: JSON.stringify({ keys: { as: ["UYAP"], txv: [74119] }, skipCount: skip, maxResultCount: 20 }) });
  if (!r.ok) throw new Error("ilan.gov.tr liste " + r.status);
  return (await r.json()).result || {};
}
async function detay(id) {
  const r = await fetch(`${API}AdDetail/GetAdDetail?id=${id}`, { headers: H });
  if (!r.ok) throw new Error("ilan.gov.tr detay " + r.status);
  return (await r.json()).result || {};
}

/* Bir çağrıda en fazla `butce` dış istek yapar. Durum: durum tablosunda 'uyap' anahtarı. */
export async function uyapAdim(env, { IL_AD, slugify, butce = 18 } = {}) {
  await ihaleSema(env);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS uyap_gorulen (id TEXT PRIMARY KEY, ilgili INTEGER, nitelik TEXT, at TEXT)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS durum (k TEXT PRIMARY KEY, v TEXT)").run();
  const dr = await env.DB.prepare("SELECT v FROM durum WHERE k = 'uyap'").first();
  const d = dr ? JSON.parse(dr.v) : { skip: 0, tur: 0 };
  let istek = 0, okunan = 0, eklenen = 0, zengin = 0;
  const gorulen = [], kayitlar = [];
  while (istek < butce) {
    const res = await liste(d.skip); istek++;
    const ads = res.ads || [];
    if (!ads.length) { d.skip = 0; d.tur++; break; }
    const ids = ads.map((a) => String(a.id));
    const var_ = new Set(((await env.DB.prepare(`SELECT id FROM uyap_gorulen WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all()).results || []).map((r) => r.id));
    const yeni = ads.filter((a) => !var_.has(String(a.id)));
    let bitti = true;
    for (const a of yeni) {
      if (istek >= butce) { bitti = false; break; }
      const dt = await detay(a.id); istek++; okunan++;
      const c = uyapCoz(a, dt.content, { IL_AD, slugify });
      gorulen.push({ id: String(a.id), ilgili: c.ilgili ? 1 : 0, nitelik: (c.nitelik || "").slice(0, 60) });
      if (c.ilgili) kayitlar.push(c.kayit);
    }
    if (bitti) d.skip += 20; else break;
  }
  const now = new Date().toISOString();
  if (gorulen.length) await env.DB.prepare("INSERT OR IGNORE INTO uyap_gorulen (id, ilgili, nitelik, at) SELECT json_extract(value,'$.id'), json_extract(value,'$.ilgili'), json_extract(value,'$.nitelik'), ?2 FROM json_each(?1)").bind(JSON.stringify(gorulen), now).run();
  if (kayitlar.length) {
    // icra (bik) kaydı varsa onu zenginleştir, yoksa yeni kayıt
    const anahtarli = kayitlar.map((k) => ({ ...k, anahtar: satisAnahtari(k.yer, k.dosya, slugify) }));
    const bikler = ((await env.DB.prepare("SELECT id, yer, dosya, il_slug FROM ihale WHERE kaynak = 'bik' AND aktif = 1 AND il_slug IN (SELECT DISTINCT json_extract(value,'$.il_slug') FROM json_each(?1))").bind(JSON.stringify(anahtarli)).all()).results || []);
    const bikMap = new Map(bikler.map((b) => [satisAnahtari(b.yer, b.dosya, slugify), b.id]));
    const yeniler = [], guncel = [];
    for (const k of anahtarli) { const bid = k.anahtar && bikMap.get(k.anahtar); if (bid) guncel.push({ ...k, bid }); else yeniler.push(k); }
    if (yeniler.length) { await ihaleYukle(env, { kaynak: "uyap", tip: "satis", items: yeniler }, slugify); eklenen = yeniler.length; }
    if (guncel.length) {
      await env.DB.prepare(`UPDATE ihale SET ada = COALESCE(ada, (SELECT json_extract(value,'$.ada') FROM json_each(?1) WHERE json_extract(value,'$.bid') = ihale.id)),
        parsel = COALESCE(parsel, (SELECT json_extract(value,'$.parsel') FROM json_each(?1) WHERE json_extract(value,'$.bid') = ihale.id)),
        mahalle = COALESCE(mahalle, (SELECT json_extract(value,'$.mahalle') FROM json_each(?1) WHERE json_extract(value,'$.bid') = ihale.id)),
        teminat = COALESCE(teminat, (SELECT json_extract(value,'$.teminat') FROM json_each(?1) WHERE json_extract(value,'$.bid') = ihale.id)),
        bitis = COALESCE((SELECT json_extract(value,'$.bitis') FROM json_each(?1) WHERE json_extract(value,'$.bid') = ihale.id), bitis),
        usul = COALESCE((SELECT json_extract(value,'$.usul') FROM json_each(?1) WHERE json_extract(value,'$.bid') = ihale.id), usul)
        WHERE id IN (SELECT json_extract(value,'$.bid') FROM json_each(?1))`).bind(JSON.stringify(guncel)).run();
      zengin = guncel.length;
    }
  }
  await env.DB.prepare("INSERT OR REPLACE INTO durum (k, v) VALUES ('uyap', ?1)").bind(JSON.stringify(d)).run();
  return { istek, okunan, eklenen, zengin, ...d };
}
