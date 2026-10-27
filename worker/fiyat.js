/* Gerçek piyasa fiyatları
   - TOBB borsa fiyatları (borsa.tobb.org.tr): son 60 gündeki işlemlerin ağırlıklı ortalaması → üreticinin borsada sattığı fiyat
   - İzmir Büyükşehir hal fiyatları (openapi.izmir.bel.tr): günlük toptan fiyat → bilgi amaçlı gösterilir */

const TOBB = "https://borsa.tobb.org.tr/";
export const BORSA = {
  bugday: [[1, 813], [1, 814], [1, 812], [1, 808], [1, 809], [1, 835]],
  "makarnalik-bugday": [[1, 807]],
  arpa: [[1, 802], [1, 804], [1, 805], [1, 102]],
  misir: [[1, 601], [1, 830], [1, 604]],
  celtik: [[1, 403]],
  cavdar: [[1, 301], [1, 826], [1, 827]],
  yulaf: [[1, 801], [1, 828], [1, 829]],
  dari: [[1, 501]],
  aycicegi: [[4, 602]],
  kanola: [[4, 402]],
  soya: [[4, 501]],
  nohut: [[3, 704], [3, 701]],
  "kirmizi-mercimek": [[3, 601]],
  "yesil-mercimek": [[3, 609], [3, 608]],
  "kuru-fasulye": [[3, 502], [3, 508], [3, 501]],
  barbunya: [[3, 509]],
  bakla: [[3, 301]],
  patates: [[8, 101], [8, 102]],
  zeytin: [[8, 303]],
  "antep-fistigi": [[9, 903]],
  ceviz: [[9, 801]],
  findik: [[9, 911], [9, 904]],
  incir: [[9, 502]],
  uzum: [[9, 912]],
  pamuk: [[12, 313], [12, 312], [12, 307]],
  kimyon: [[16, 201]],
};
export const HAL = {
  domates: ["DOMATES SALKIM", "DOMATES SERA", "DOMATES PEMBE", "DOMATES BEEF"], "salcalik-domates": ["DOMATES SALÇALIK"],
  biber: ["BİBER SİVRİ", "BİBER ÇARLİSTON", "BİBER DOLMA"], patlican: ["PATLICAN"], hiyar: ["SALATALIK"], kabak: ["KABAK TAZE"],
  karpuz: ["KARPUZ"], kavun: ["KAVUN"], patates: ["PATATES"], "kuru-sogan": ["SOĞAN KURU"], sarimsak: ["SARIMSAK"], havuc: ["HAVUÇ"],
  lahana: ["LAHANA BEYAZ"], ispanak: ["ISPANAK"], pirasa: ["PIRASA"], "karnabahar-brokoli": ["KARNABAHAR", "BROKOLI"],
  "taze-fasulye": ["FASULYE"], barbunya: ["BARBUNYA TAZE"], borulce: ["BORULCE"], bamya: ["BAMYA"], enginar: ["ENGINAR", "ENGİNAR"],
  elma: ["ELMA"], armut: ["ARMUT"], ayva: ["AYVA"], kiraz: ["KİRAZ", "KIRAZ"], visne: ["VİŞNE", "VISNE"], kayisi: ["KAYISI"],
  seftali: ["ŞEFTALI", "NEKTARIN"], erik: ["ERİK"], nar: ["NAR"], incir: ["INCIR"], uzum: ["ÜZÜM"], portakal: ["PORTAKAL"],
  mandalina: ["MANDALİNA"], limon: ["LİMON"], muz: ["MUZ YERLI"], cilek: ["CILEK", "ÇİLEK"], kivi: ["KIVI"],
  "trabzon-hurmasi": ["CENNET ELMASI", "TRABZON HURMASI"], avokado: ["AVAKADO", "AVOKADO"],
};

export const FIYAT_SCHEMA = "CREATE TABLE IF NOT EXISTS fiyat (urun TEXT, kaynak TEXT, deger REAL, en_az REAL, en_cok REAL, islem INTEGER, tarih TEXT, detay TEXT, guncel TEXT, PRIMARY KEY (urun, kaynak))";
const num = (s) => parseFloat(String(s).replace(/\./g, "").replace(",", ".")) || 0;
const norm = (s) => String(s).toLocaleUpperCase("tr").replace(/\s+/g, " ").trim();
const tarihISO = (s) => { const m = String(s).match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };

async function borsaUrun(kodlar) {
  const satirlar = [];
  let birim = "";
  for (const [ana, alt] of kodlar) {
    const r = await fetch(`${TOBB}fiyat_urun3.php?ana_kod=${ana}&alt_kod=${alt}`, { headers: { "user-agent": "Mozilla/5.0 (compatible; TopraklikBot/1.0; +https://topraklik.com)" } });
    const t = await r.text();
    const bm = t.match(/-\s*([A-ZİĞÜŞÖÇ]+)\s*<\/(?:h\d|b|strong|div|p|span)/); if (bm && !birim) birim = bm[1];
    for (const tr of t.split(/<tr[\s>]/i).slice(1)) {
      const c = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
      if (c.length < 8 || !/\d{2}\.\d{2}\.\d{4}/.test(c[1])) continue;
      satirlar.push({ borsa: c[0].replace(/ TICARET BORSASI$/i, ""), tarih: tarihISO(c[1]), en_az: num(c[2]), en_cok: num(c[3]), ort: num(c[4]), miktar: num(c[5]), tutar: num(c[7]) });
    }
  }
  return { satirlar, birim };
}

function ozetle(satirlar, gun = 60) {
  const sinir = new Date(Date.now() - gun * 864e5).toISOString().slice(0, 10);
  const s = satirlar.filter((x) => x.tarih >= sinir && x.ort > 0 && x.miktar > 0);
  if (!s.length) return null;
  const mik = s.reduce((a, x) => a + x.miktar, 0), tut = s.reduce((a, x) => a + (x.tutar || x.ort * x.miktar), 0);
  return { deger: Math.round((tut / mik) * 100) / 100, en_az: Math.min(...s.map((x) => x.en_az || x.ort)), en_cok: Math.max(...s.map((x) => x.en_cok || x.ort)), islem: s.length, tarih: s.map((x) => x.tarih).sort().pop(), detay: s.sort((a, b) => b.miktar - a.miktar).slice(0, 6).map((x) => ({ b: x.borsa, o: x.ort, t: x.tarih })) };
}

async function yaz(env, urun, kaynak, o) {
  await env.DB.prepare("INSERT OR REPLACE INTO fiyat (urun, kaynak, deger, en_az, en_cok, islem, tarih, detay, guncel) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
    .bind(urun, kaynak, o.deger, o.en_az, o.en_cok, o.islem, o.tarih, JSON.stringify(o.detay || []), new Date().toISOString()).run();
}

/* Her çağrıda en fazla `adet` borsa ürünü işler (ücretsiz plandaki işlem sınırları için). parca: 0,1,2… */
export async function fiyatAdim(env, parca, adet = 5) {
  await env.DB.prepare(FIYAT_SCHEMA).run();
  const keys = Object.keys(BORSA), out = {};
  const dilim = keys.slice(parca * adet, parca * adet + adet);
  for (const k of dilim) {
    try {
      const { satirlar, birim } = await borsaUrun(BORSA[k]);
      const o = ozetle(satirlar);
      if (o && (!birim || birim === "KG")) { await yaz(env, k, "borsa", o); out[k] = o.deger; } else out[k] = "veri yok";
    } catch (e) { out[k] = "hata: " + e.message; }
  }
  if (parca * adet + adet >= keys.length) out.hal = await halTopla(env);
  return { parca, toplam_parca: Math.ceil(keys.length / adet), out };
}

export async function halTopla(env) {
  for (let geri = 0; geri < 5; geri++) {
    const g = new Date(Date.now() - geri * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    const r = await fetch(`https://openapi.izmir.bel.tr/api/ibb/halfiyatlari/sebzemeyve/${g}`);
    if (!r.ok) continue;
    let d; try { d = await r.json(); } catch (e) { continue; }
    const list = (d.HalFiyatListesi || []).filter((x) => x.Birim === "KG" && x.OrtalamaUcret > 0).map((x) => ({ ad: norm(x.MalAdi), o: x.OrtalamaUcret, a: x.AsgariUcret, z: x.AzamiUcret }));
    if (!list.length) continue;
    let n = 0;
    for (const [urun, adlar] of Object.entries(HAL)) {
      const es = list.filter((x) => adlar.some((a) => x.ad.startsWith(norm(a))));
      if (!es.length) continue;
      const deger = Math.round((es.reduce((s, x) => s + x.o, 0) / es.length) * 100) / 100;
      await yaz(env, urun, "hal", { deger, en_az: Math.min(...es.map((x) => x.a)), en_cok: Math.max(...es.map((x) => x.z)), islem: es.length, tarih: g, detay: es.map((x) => ({ b: x.ad, o: x.o })) });
      n++;
    }
    return { tarih: g, urun: n };
  }
  return { hata: "hal verisi bulunamadı" };
}

export async function urunFiyat(env, slug) {
  try { return (await env.DB.prepare("SELECT * FROM fiyat WHERE urun = ?1").bind(slug).all()).results || []; } catch (e) { return []; }
}
