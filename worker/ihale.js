/* Gerçek ihale ilanları: Milli Emlak (hazine) satış ve kira ilanları.
   Veri, Türkiye IP'si gerektirdiği için kullanıcının bilgisayarındaki tarayıcıdan toplanır
   ve /admin/ihale-yukle ucuna gönderilir. */

import { listeEk } from "./ilceseo.js";
import { metinCoz, asama, aralik, gunAy } from "./ilanmetin.js";

export const IHALE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ihale (id TEXT PRIMARY KEY, kaynak TEXT, tip TEXT, ilan_id TEXT, il TEXT, il_slug TEXT, ilce TEXT, ilce_slug TEXT, mahalle TEXT, ada TEXT, parsel TEXT, cins TEXT, imar TEXT, m2 REAL, bedel REAL, teminat REAL, tarih TEXT, yer TEXT, usul TEXT, hisse TEXT, amac TEXT, tasinmaz_no TEXT, link TEXT, foto INTEGER, aktif INTEGER DEFAULT 1, ilk_gorulme TEXT, guncel TEXT)`,
  `CREATE INDEX IF NOT EXISTS ihale_liste ON ihale (aktif, tarih)`,
  `CREATE INDEX IF NOT EXISTS ihale_il ON ihale (il_slug, ilce_slug)`,
];
const COLS = ["id", "kaynak", "tip", "ilan_id", "il", "il_slug", "ilce", "ilce_slug", "mahalle", "ada", "parsel", "cins", "imar", "m2", "bedel", "teminat", "tarih", "yer", "usul", "hisse", "amac", "tasinmaz_no", "link", "foto", "bitis", "nitelik", "dosya", "satis_turu", "kdv", "takvim", "hisse_m2", "dogrulandi"];
const EK_KOLON = ["bitis TEXT", "nitelik TEXT", "dosya TEXT", "satis_turu TEXT", "kdv INTEGER", "takvim TEXT", "hisse_m2 REAL", "dogrulandi INTEGER"];
/* İlan metninden doğrulanmış alanlar, liste verisiyle (ör. BİK başlığı) ezilmez */
const KORU = ["m2", "bedel", "bitis", "hisse", "hisse_m2", "kdv", "takvim", "teminat"];
export const SATIS_TURU = { icra: "İcra dairesi", sulh: "Sulh hukuk (ortaklığın giderilmesi)", mahkeme: "Diğer mahkeme satışı", iflas: "İflas dairesi", hazine: "Hazine (Milli Emlak)" };
export function satisTuru(yer, kaynak) {
  if (kaynak === "milliemlak") return "hazine";
  const y = String(yer || "").toLocaleLowerCase("tr");
  if (/iflas/.test(y)) return "iflas";
  if (/sulh/.test(y)) return "sulh";
  if (/icra/.test(y)) return "icra";
  return "mahkeme";
}
export const SATIS_TURU_SQL = "UPDATE ihale SET satis_turu = CASE WHEN kaynak = 'milliemlak' THEN 'hazine' WHEN yer LIKE '%İFLAS%' OR yer LIKE '%iflas%' OR yer LIKE '%İflas%' THEN 'iflas' WHEN yer LIKE '%SULH%' OR yer LIKE '%sulh%' THEN 'sulh' WHEN yer LIKE '%İCRA%' OR yer LIKE '%icra%' OR yer LIKE '%İcra%' THEN 'icra' ELSE 'mahkeme' END WHERE satis_turu IS NULL";
const AKTIF = "aktif = 1 AND bitis >= ?1";
export const KAYNAK = { milliemlak: { ad: "Milli Emlak", tur: "Hazine", uzun: "Milli Emlak (hazine)" }, bik: { ad: "ilan.gov.tr", tur: "İcra", uzun: "İcra ve mahkeme satışları (ilan.gov.tr)" }, uyap: { ad: "ilan.gov.tr", tur: "İcra", uzun: "UYAP e-Satış (ilan.gov.tr)" } };
const ICRA = (k) => k === "bik" || k === "uyap";
const TIP = { satis: "Satış", kira: "Kiralama" };
const CORS_ORIGINS = ["https://www.milliemlak.gov.tr", "https://milliemlak.gov.tr"];

export function ihaleCors(req) {
  const o = req.headers.get("origin") || "";
  return CORS_ORIGINS.includes(o) ? { "access-control-allow-origin": o, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, x-admin-key", "access-control-max-age": "86400", vary: "origin" } : {};
}

/* POST {kaynak, tip, baslangic, son, items:[...]} */
export async function ihaleSema(env) {
  for (const s of IHALE_SCHEMA) await env.DB.prepare(s).run();
  for (const k of EK_KOLON) { try { await env.DB.prepare(`ALTER TABLE ihale ADD COLUMN ${k}`).run(); } catch (e) { /* zaten var */ } }
}
export async function ihaleYukle(env, body, slugify) {
  const { kaynak, tip, baslangic, son, items = [] } = body;
  if (!KAYNAK[kaynak] || !TIP[tip]) throw new Error("kaynak/tip geçersiz");
  await ihaleSema(env);
  const now = new Date().toISOString();
  const rows = items.map((x) => ({ ...x, kaynak, tip, il_slug: x.il_slug || slugify(x.il || ""), ilce_slug: slugify(x.ilce || ""), bitis: x.bitis || (x.tarih || "").slice(0, 10), satis_turu: satisTuru(x.yer, kaynak) }));
  const sel = COLS.map((c) => `json_extract(value, '$.${c}')`).join(", ");
  const upd = COLS.filter((c) => c !== "id").map((c) => (c === "dogrulandi" ? "dogrulandi = coalesce(excluded.dogrulandi, dogrulandi)" : KORU.includes(c) ? `${c} = CASE WHEN dogrulandi = 1 AND excluded.dogrulandi IS NULL THEN coalesce(${c}, excluded.${c}) ELSE excluded.${c} END` : `${c} = excluded.${c}`)).join(", ");
  let n = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const part = rows.slice(i, i + 400);
    await env.DB.prepare(`INSERT INTO ihale (${COLS.join(", ")}, aktif, ilk_gorulme, guncel) SELECT ${sel}, 1, ?2, ?2 FROM json_each(?1) WHERE true ON CONFLICT(id) DO UPDATE SET ${upd}, aktif = 1, guncel = ?2`).bind(JSON.stringify(part), now).run();
    n += part.length;
  }
  let kalkan = 0;
  if (son && baslangic) {
    const r = await env.DB.prepare("UPDATE ihale SET aktif = 0 WHERE kaynak = ?1 AND tip = ?2 AND aktif = 1 AND guncel < ?3").bind(kaynak, tip, baslangic).run();
    kalkan = r.meta?.changes || 0;
    await env.DB.prepare("INSERT INTO runs (at, job, log) VALUES (?1, ?2, ?3)").bind(now, `ihale-${kaynak}-${tip}`, `toplam ${n}, kalkan ${kalkan}`).run().catch(() => {});
  }
  return { yazilan: n, kalkan };
}

const bugun = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const nf = (n) => (n == null ? "—" : Math.round(n).toLocaleString("tr-TR"));
const tl = (n) => (n ? nf(n) + " TL" : "—");
const trTarih = (t) => { if (!t) return "—"; const [d, s] = t.split("T"); const [y, m, g] = d.split("-"); return `${+g} ${["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][+m - 1]} ${y}${s ? " · " + s.slice(0, 5) : ""}`; };
const kalan = (t) => { const d = Math.round((Date.parse(t.slice(0, 10)) - Date.parse(bugun())) / 864e5); return d < 0 ? "ihale tarihi geçti" : d === 0 ? "bugün" : d === 1 ? "yarın" : `${d} gün kaldı`; };
/* İlan metninden doğrulanmış alanlar */
export function dogrulanmis(metin) {
  const f = metinCoz(metin);
  const o = { dogrulandi: 1 };
  if (f.m2) o.m2 = f.m2;
  if (f.kiymet) { o.bedel = f.kiymet; o.teminat = Math.round(f.kiymet * 0.1); }
  if (f.hisse) o.hisse = f.hisse;
  if (f.hisse_m2) o.hisse_m2 = f.hisse_m2;
  if (f.kdv != null) o.kdv = f.kdv;
  if (f.takvim) { o.takvim = JSON.stringify(f.takvim); const son = (f.takvim.a2 || f.takvim.a1); if (son) o.bitis = son.bit.slice(0, 10); }
  if (f.ada && f.parsel) { o.ada = f.ada; o.parsel = f.parsel; }
  return { alan: o, ham: f };
}
export async function dogrulamaYaz(env, id, o) {
  const k = ["m2", "bedel", "teminat", "hisse", "hisse_m2", "kdv", "takvim", "bitis"].filter((c) => o[c] != null);
  await env.DB.prepare(`UPDATE ihale SET ${k.map((c, i) => `${c} = ?${i + 2}`).join(", ")}${k.length ? ", " : ""}dogrulandi = 1, aktif = CASE WHEN ${o.bitis ? `?${k.length + 2} >= date('now')` : "1"} THEN 1 ELSE aktif END WHERE id = ?1`).bind(id, ...k.map((c) => o[c]), ...(o.bitis ? [o.bitis] : [])).run();
}
const satilanM2 = (x) => x.hisse_m2 || x.m2;
const hisseli = (x) => !!(x.hisse && x.kaynak !== "milliemlak" && /\d+\s*\/\s*\d+/.test(x.hisse));
const TUR_KISA = { icra: "İcra dairesi", sulh: "Sulh hukuk", mahkeme: "Mahkeme satışı", iflas: "İflas dairesi", hazine: "Hazine" };
const turEtiket = (x) => (x.kaynak === "milliemlak" ? `Hazine ${TIP[x.tip] === "Kiralama" ? "kiralama" : "satış"}` : TUR_KISA[x.satis_turu] || "İcra satışı");
const dekar = (m2) => (m2 >= 1000 ? ` (${(m2 / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dönüm)` : "");

export const IHALE_CSS = `.ih-dugmeler{display:flex;flex-wrap:wrap;gap:8px}.ih-3b{background:#2E5130!important;color:#fff!important;border-color:#2E5130!important}
.paylas{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0 14px;font-size:13.5px}.paylas span{font-weight:800;color:var(--muted);margin-right:2px}.paylas a,.paylas button{border:1px solid var(--line);background:var(--card);color:var(--ink);font:700 13px Manrope,system-ui,sans-serif;border-radius:999px;padding:7px 12px;text-decoration:none;cursor:pointer}.paylas .pw{background:#25D366;border-color:#25D366;color:#fff}.paylas .pt{background:#229ED9;border-color:#229ED9;color:#fff}
.ilist{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.ic{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:6px}
.ic h3{margin:0;font-size:17px;line-height:1.3}.ic h3 a{color:var(--ink);text-decoration:none}.ic h3 a:hover{color:var(--green)}
.ic .yer{font-size:14px;color:var(--muted)}.ic .fiyat{font-size:21px;font-weight:800;color:var(--green)}
.ic dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:4px 0;font-size:14px}.ic dt{color:var(--muted)}.ic dd{margin:0;font-weight:600}
.ic .alt{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:8px}
.btn{display:inline-block;border-radius:9px;padding:8px 12px;font-weight:700;font-size:14px;text-decoration:none;border:1px solid var(--green);color:var(--green);background:none;cursor:pointer;font-family:inherit}
.btn.dolu{background:var(--green);color:#fff}
.tag.hisse{background:#FBE9D6;color:#8A4A12}
.gun{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:2px 9px;background:var(--soft);color:var(--gold)}
.filt{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px;margin:0 0 18px}
.filt label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:var(--muted)}
.filt select,.filt input{font:600 15px inherit;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);width:100%}
.filt .btn{align-self:end;padding:9px 12px}
.sayfa{display:flex;gap:8px;justify-content:center;margin:22px 0}
.ozet{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}.ozet span{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:14px}.ozet b{font-size:17px;color:var(--green)}`;

export function kart(x, esc) {
  const sm = satilanM2(x), birim = sm && x.bedel && x.tip !== "kira" ? x.bedel / sm : 0, h = hisseli(x);
  const baslik = `${x.cins || "Taşınmaz"} · ${x.m2 ? `${nf(sm)} m²${h ? " hisse" : dekar(sm)}` : "alan ilanda"}`;
  return `<div class="ic"><div><span class="tag">${esc(turEtiket(x))}</span>${h ? `<span class="tag hisse">Hisseli</span>` : ""}<span class="gun">${esc(asama(x, bugun()).metin)}</span></div>
<h3><a href="/ihaleler/ilan/${esc(x.id)}">${esc(baslik)}</a></h3>
<div class="yer">${esc([x.il + " / " + x.ilce, x.mahalle || x.nitelik].filter(Boolean).join(" · "))}</div>
<div class="fiyat">${x.bedel ? tl(x.bedel) : "Bedel ilanda"}${x.tip === "kira" && x.bedel ? ` <small style="font-size:13px;color:var(--muted)">yıllık</small>` : ""}</div>
<dl>${h && x.m2 ? `<dt>Toplam alan</dt><dd>${nf(x.m2)} m²</dd>` : ""}${x.ada ? `<dt>Ada / parsel</dt><dd>${esc(x.ada)} / ${esc(x.parsel || "—")}</dd>` : ""}${birim ? `<dt>m² fiyatı</dt><dd>${nf(birim)} TL</dd>` : ""}${x.teminat ? `<dt>Teminat</dt><dd>${tl(x.teminat)}</dd>` : ""}${x.dosya ? `<dt>Dosya</dt><dd>${esc(x.dosya)}</dd>` : ""}${(() => { let tk = null; try { tk = JSON.parse(x.takvim || "null"); } catch {} return tk ? `${tk.a1 ? `<dt>1. artırma</dt><dd>${esc(aralik(tk.a1))}</dd>` : ""}${tk.a2 ? `<dt>2. artırma</dt><dd>${esc(aralik(tk.a2))}</dd>` : ""}` : `<dt>${ICRA(x.kaynak) ? "1. satış" : "İhale"}</dt><dd>${esc(trTarih(x.tarih))}</dd>`; })()}${x.amac ? `<dt>Amaç</dt><dd>${esc(x.amac)}</dd>` : ""}</dl>
<div class="alt"><a class="btn dolu" href="/ihaleler/ilan/${esc(x.id)}">Detay</a><a class="btn" href="${esc(x.link)}" target="_blank" rel="noopener nofollow">${esc(KAYNAK[x.kaynak]?.ad || "Kaynak")}'ta gör</a></div></div>`;
}

async function secenekler(env) {
  const r = (await env.DB.prepare(`SELECT il, il_slug, ilce, ilce_slug, cins, tip, kaynak, count(*) n FROM ihale WHERE ${AKTIF} GROUP BY il_slug, ilce_slug, cins, tip, kaynak`).bind(bugun()).all()).results || [];
  return r;
}

export async function ihaleListe(env, url, ctx, sabit = {}) {
  const { esc, page, html } = ctx;
  const q = (k) => sabit[k] ?? (url.searchParams.get(k) || "");
  const f = { il: q("il"), ilce: q("ilce"), tur: q("tur"), kaynak: q("kaynak"), tip: q("tip"), cins: q("cins"), max: q("max"), min_m2: q("min_m2"), sira: q("sira") || "tarih" };
  const sayfa = Math.max(1, parseInt(url.searchParams.get("sayfa") || "1", 10) || 1), N = 30;
  let rows = [], opts = [];
  try {
    opts = await secenekler(env);
    const w = [AKTIF], b = [bugun()];
    const add = (sql, v) => { b.push(v); w.push(sql.replace("?", "?" + b.length)); };
    if (f.il) add("il_slug = ?", f.il);
    if (f.ilce) add("ilce_slug = ?", f.ilce);
    if (f.kaynak === "icra") w.push("kaynak IN ('bik', 'uyap')"); else if (f.kaynak) add("kaynak = ?", f.kaynak);
    if (SATIS_TURU[f.tur]) add("satis_turu = ?", f.tur);
    if (f.tip) add("tip = ?", f.tip);
    if (f.cins) add("cins = ?", f.cins);
    if (+f.max) add("bedel <= ?", +f.max);
    if (+f.min_m2) add("m2 >= ?", +f.min_m2);
    const ord = { tarih: "tarih ASC", ucuz: "bedel ASC", buyuk: "m2 DESC", m2fiyat: "bedel / m2 ASC", yeni: "ilk_gorulme DESC" }[f.sira] || "tarih ASC";
    rows = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${w.join(" AND ")} ORDER BY ${ord} LIMIT ${N + 1} OFFSET ${(sayfa - 1) * N}`).bind(...b).all()).results || [];
  } catch (e) { var dbHata = true; }
  const dbHataVar = () => typeof dbHata !== "undefined";
  const more = rows.length > N; rows = rows.slice(0, N);
  const ils = {}, ilces = {}, cinsler = {};
  let topS = 0, topK = 0, topI = 0;
  for (const o of opts) {
    ils[o.il_slug] = o.il; if (o.il_slug === f.il) ilces[o.ilce_slug] = o.ilce; cinsler[o.cins] = 1;
    if ((!f.il || o.il_slug === f.il) && (!f.ilce || o.ilce_slug === f.ilce)) { if (ICRA(o.kaynak)) topI += o.n; else if (o.tip === "satis") topS += o.n; else topK += o.n; }
  }
  const ilAd = ils[f.il] || "", ilceAd = ilces[f.ilce] || "";
  const opt = (obj, v, bos) => `<option value="">${bos}</option>` + Object.entries(obj).sort((a, c) => a[1].localeCompare(c[1], "tr")).map(([k, t]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(t)}</option>`).join("");
  const form = `<form class="filt" method="get" action="/ihaleler">
<label>İl<select name="il" onchange="this.form.ilce&&(this.form.ilce.value='');this.form.submit()">${opt(ils, f.il, "Tüm iller")}</select></label>
<label>İlçe<select name="ilce"${f.il ? "" : " disabled"}>${opt(ilces, f.ilce, f.il ? "Tüm ilçeler" : "Önce il seçin")}</select></label>
<label>Satış türü<select name="tur">${opt(SATIS_TURU, f.tur, "Hepsi")}</select></label>
<label>İlan türü<select name="tip">${opt(TIP, f.tip, "Satış ve kira")}</select></label>
<label>Taşınmaz cinsi<select name="cins">${opt(Object.fromEntries(Object.keys(cinsler).map((c) => [c, c])), f.cins, "Hepsi")}</select></label>
<label>En fazla bedel (TL)<input name="max" type="number" min="0" step="10000" value="${esc(f.max)}" placeholder="örn. 1000000"></label>
<label>En az alan (m²)<input name="min_m2" type="number" min="0" step="100" value="${esc(f.min_m2)}" placeholder="örn. 5000"></label>
<label>Sıralama<select name="sira">${opt({ tarih: "İhale tarihi yakın", ucuz: "Bedel düşük", m2fiyat: "m² fiyatı düşük", buyuk: "Alan büyük", yeni: "Yeni eklenen" }, f.sira, "İhale tarihi yakın")}</select></label>
<button class="btn dolu" type="submit">İlanları göster</button></form>`;
  const yer = ilceAd ? `${ilAd} ${ilceAd}` : ilAd;
  const ayYil = new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
  const TUR_SOZ = { icra: "icradan", sulh: "ortaklığın giderilmesi (sulh hukuk) satışıyla", iflas: "iflastan", mahkeme: "mahkemeden", hazine: "hazineden (Milli Emlak)" };
  const ts = TUR_SOZ[f.tur];
  const CINS_SOZ = { Tarla: "tarlalar", Arsa: "arsalar", "Bağ-Bahçe": "bağ ve bahçeler", Zeytinlik: "zeytinlikler", Konut: "evler ve daireler", "İşyeri": "işyerleri", Bina: "binalar" };
  const neler = CINS_SOZ[f.cins] || "tarla, arsa, ev ve işyerleri";
  const h1 = ts ? `${yer || "Türkiye'de"} ${ts} satılık ${neler}` : yer ? `${yer} icradan satılık ${neler}, hazine ihaleleri` : `İcradan satılık ${neler}, hazine ihaleleri`;
  const kisaNe = CINS_SOZ[f.cins] || "tarla, arsa ve evler";
  const baslikSeo = ts ? `${yer || "Türkiye'de"} ${ts} satılık ${kisaNe} (${ayYil})` : yer ? `${ilceAd || ilAd} icradan satılık ${kisaNe} (${ayYil})` : `İcradan satılık ${kisaNe}, hazine ihaleleri (${ayYil})`;
  const pathBase = sabit.il ? `/ihaleler/${sabit.il}${sabit.ilce ? "/" + sabit.ilce : ""}` : "/ihaleler";
  const qs = (p) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(f)) if (v && !sabit[k] && !(k === "sira" && v === "tarih")) u.set(k, v); if (p > 1) u.set("sayfa", p); const s = u.toString(); return pathBase + (s ? "?" + s : ""); };
  const sade = sayfa === 1 && !f.tur && !f.kaynak && !f.tip && !f.cins && !f.max && !f.min_m2 && f.sira === "tarih";
  let ek = null;
  if (sade && f.il && ilAd && !dbHataVar()) { try { ek = await listeEk(env, f, ilAd, ilceAd || "", esc); } catch (e) {} }
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/ihaleler">İhaleler</a>${ilAd ? ` › <a href="/ihaleler/${esc(f.il)}">${esc(ilAd)}</a>` : ""}${ilceAd ? ` › ${esc(ilceAd)}` : ""}</div>
<h1>${esc(h1)}</h1>
<p class="lead">İcra ve mahkeme satışlarındaki tarla, arsa, ev ve işyerleri (UYAP e-Satış ve ilan.gov.tr) ile Milli Emlak'ın hazine satış ve kiralama ihaleleri her gün güncellenir. Bedel, alan, hisse, KDV ve artırma tarihleri ilanın tam metninden okunur. Her ilan kaynağına bağlıdır; teklif vermeden önce ilanın aslını ve şartnamesini mutlaka kontrol edin.</p>
${ilceAd ? `<p><a href="/il/${esc(f.il)}/${esc(f.ilce)}">${esc(ilceAd)} hakkında: arazi değerleri, ne ekilir, mahalleler →</a></p>` : ""}${yer && (topS + topK + topI) ? `<p><b>${esc(yer)}</b> için şu an <b>${nf(topI)}</b> icra ve mahkeme satışı, <b>${nf(topS)}</b> hazine satış ve <b>${nf(topK)}</b> hazine kiralama ilanı var. İlanlar her gün kaynağından kontrol edilir.</p>` : ""}
<div class="ozet"><span>İcra / mahkeme <b>${nf(topI)}</b></span><span>Hazine satış <b>${nf(topS)}</b></span><span>Hazine kiralama <b>${nf(topK)}</b></span></div>
${form}
${rows.length ? `<div class="ilist">${rows.map((x) => kart(x, esc)).join("")}</div>` : `<p class="note">${opts.length ? "Bu filtreye uygun güncel ilan yok. Filtreleri genişletin." : "İlanlar ilk kez yükleniyor; kısa süre içinde burada olacak."}</p>`}
<div class="sayfa">${sayfa > 1 ? `<a class="btn" href="${esc(qs(sayfa - 1))}">← Önceki</a>` : ""}${more ? `<a class="btn" href="${esc(qs(sayfa + 1))}">Sonraki →</a>` : ""}</div>
${ek ? ek.html : ""}
<p class="chips"><b>İhale takvimi:</b> <a class="tag" href="/ihaleler/bu-hafta">Bu hafta sonuçlananlar</a> ${takvimAylari().map(([k, ad]) => `<a class="tag" href="/ihaleler/takvim/${k}">${ad}</a>`).join(" ")}</p>
<p class="note">İcra ihaleleri UYAP e-Satış üzerinden e-Devlet ile girilerek yapılır. Katılmayı öğrenmek için <a href="/rehber/icra-ihalesine-nasil-girilir">icra ihalesi rehberine</a>, hazine arazisi kiralamak için <a href="/rehber/hazine-arazisi-kiralama">hazine arazisi kiralama rehberine</a> bakın.</p>`;
  const desc = yer ? `${yer} icradan satılık ${neler} ile Milli Emlak hazine arazi satış ve kiralama ihaleleri: muhammen bedel, satış tarihi, ada parsel.` : "Türkiye genelinde icradan ve mahkemeden satılık tarla, arsa, ev ve işyerleri ile hazine (Milli Emlak) arazi satış ve kiralama ihaleleri; il ve ilçeye göre arama.";
  const jsonld = ek?.sss?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: ek.sss.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } : null;
  return html(page({ title: `${baslikSeo} · Topraklık`, description: desc, path: pathBase, body, current: "/ihaleler", jsonld }), 200, 900, dbHataVar());
}

const sl = (t) => String(t || "").replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function paylas(metin, link, esc) {
  const t = encodeURIComponent(metin + "\n" + link), u = encodeURIComponent(link);
  return `<div class="paylas" data-link="${esc(link)}"><span>Paylaş:</span><a class="pw" href="https://wa.me/?text=${t}" target="_blank" rel="noopener" data-olay="paylas:whatsapp">WhatsApp</a><a class="pt" href="https://t.me/share/url?url=${u}&text=${encodeURIComponent(metin)}" target="_blank" rel="noopener" data-olay="paylas:telegram">Telegram</a><a class="pf" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" data-olay="paylas:facebook">Facebook</a><a class="px" href="https://x.com/intent/post?text=${t}" target="_blank" rel="noopener" data-olay="paylas:x">X</a><button type="button" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.parentNode.dataset.link);this.textContent='Kopyalandı ✓'">Bağlantıyı kopyala</button></div>`;
}
export async function ihaleDetay(env, id, ctx) {
  const { esc, page, html, IL_URUN } = ctx;
  let x = null;
  try { x = await env.DB.prepare("SELECT * FROM ihale WHERE id = ?1").bind(id).first(); } catch (e) {}
  if (!x) return null;
  /* bitişinden 30 günden fazla geçmiş ilan: kalıcı olarak ilçenin ihale listesine yönlendir */
  if (x.bitis && x.bitis.slice(0, 10) < gunEkle(bugun(), -30) && x.il_slug) return new Response(null, { status: 301, headers: { location: `https://topraklik.com/ihaleler/${x.il_slug}${x.ilce_slug ? "/" + x.ilce_slug : ""}`, "cache-control": "public, max-age=86400" } });
  const icra = ICRA(x.kaynak);
  let ek = null, dg = null;
  if (icra && ctx.bikDetay) { try { ek = await ctx.bikDetay(x.ilan_id, ctx.exec); } catch (e) {} }
  if (ek) { x.ada = x.ada || ek.ada; x.parsel = x.parsel || ek.parsel; x.mahalle = x.mahalle || ek.mahalle; }
  if (ek?.metin) {
    dg = dogrulanmis(ek.metin);
    const ilk = x.dogrulandi;
    Object.assign(x, dg.alan);
    if (x.bitis >= bugun()) x.aktif = 1;
    if (ilk !== 1) { const p = dogrulamaYaz(env, id, dg.alan).catch(() => {}); ctx.exec?.waitUntil ? ctx.exec.waitUntil(p) : await p; }
  }
  const as = asama(x, bugun());
  const gecti = !x.aktif || as.kod === "bitti";
  const h = hisseli(x), sm = satilanM2(x);
  const birim = sm && x.bedel && x.tip !== "kira" ? x.bedel / sm : 0;
  let tk = null; try { tk = JSON.parse(x.takvim || "null"); } catch {}
  const mahAd = x.mahalle ? String(x.mahalle).toLocaleLowerCase("tr").replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr")).replace(new RegExp("^" + String(x.ilce || "").replace(/[.*+?^${}()|[\]\\]/g, "") + "\\s+", "i"), "") : "";
  const baslik = (icra ? `${x.il} ${x.ilce} ${mahAd} ${x.ada ? x.ada + "/" + x.parsel : ""} ${x.m2 ? (h ? nf(sm) + " m² hisseli" : nf(x.m2) + " m²") : ""} ${(x.cins || "taşınmaz").toLocaleLowerCase("tr")} icradan satılık` : `${x.il} ${x.ilce} ${x.mahalle || ""} ${x.ada}/${x.parsel} ${x.cins || "taşınmaz"} ${TIP[x.tip]?.toLocaleLowerCase("tr")} ihalesi`).replace(/\s+/g, " ");
  const benzer = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${AKTIF} AND il_slug = ?2 AND id != ?3 ORDER BY tarih LIMIT 6`).bind(bugun(), x.il_slug, id).all()).results || [];
  const urunler = (IL_URUN?.(x.il_slug) || []).filter((u) => u.durum === "yaygin").slice(0, 10);
  const satir = (a, b) => (b ? `<tr><th>${a}</th><td>${b}</td></tr>` : "");
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/ihaleler">İhaleler</a> › <a href="/ihaleler/${esc(x.il_slug)}">${esc(x.il)}</a> › <a href="/ihaleler/${esc(x.il_slug)}/${esc(x.ilce_slug)}">${esc(x.ilce)}</a> › ${esc(x.ada)}/${esc(x.parsel)}</div>
<div class="layout"><article><h1>${esc(baslik.charAt(0).toUpperCase() + baslik.slice(1))}</h1>
${gecti ? `<p class="note"><b>Bu ihalenin tarihi geçti veya ilan yayından kalktı.</b> Güncel ilanlar için <a href="/ihaleler/${esc(x.il_slug)}">${esc(x.il)} ihalelerine</a> bakın.</p>` : `<p class="answer"><b>${esc([x.il, x.ilce, mahAd].filter(Boolean).join(" / "))}:</b> ${h ? `${nf(x.m2)} m² ${esc((x.cins || "taşınmaz").toLocaleLowerCase("tr"))} içindeki ${nf(sm)} m²'lik hisse` : `${x.m2 ? nf(x.m2) + " m² " : ""}${esc((x.cins || "taşınmaz").toLocaleLowerCase("tr"))}`} ${x.kaynak === "milliemlak" ? (x.tip === "kira" ? "hazine kiralama ihalesine çıkıyor" : "hazine satış ihalesine çıkıyor") : "icradan satılıyor"}.${x.bedel ? ` ${x.tip === "kira" ? "Yıllık kira bedeli" : "Muhammen bedel"} ${tl(x.bedel)}.` : ""} ${esc(as.metin)}.</p>${h ? `<p class="note"><b>Dikkat, hisseli satış:</b> Satılan, taşınmazın tamamı değil ${esc(x.hisse)} oranındaki hissedir (yaklaşık ${nf(sm)} m²). Hisseli taşınmazda kullanım, bölme ve satış için diğer hissedarlarla anlaşmak gerekir. Ayrıntılar için <a href="/rehber/hisseli-tapu-nedir">hisseli tapu rehberine</a> bakın.</p>` : ""}`}
<table><tbody>
${satir("İlan türü", esc(`${KAYNAK[x.kaynak]?.tur || ""} ${TIP[x.tip] || ""}`))}
${satir("Satış türü", esc(SATIS_TURU[x.satis_turu] || ""))}
${satir("Konum", esc([x.il, x.ilce, mahAd].filter(Boolean).join(" / ")))}
${satir("Ada / parsel", esc(`${x.ada} / ${x.parsel}`))}
${satir("Cinsi", esc(x.cins))}
${satir(h ? "Toplam yüzölçümü" : "Yüzölçümü", x.m2 ? `${nf(x.m2)} m²${dekar(x.m2)}` : "")}
${h ? satir("Satılan hisse", `${esc(x.hisse)} · ${nf(sm)} m²`) : ""}
${satir(x.tip === "kira" ? "Yıllık kira bedeli" : "Muhammen (tahmini) bedel", x.bedel ? tl(x.bedel) : "")}
${satir(h ? "Hissenin m² fiyatı" : "m² fiyatı", birim ? nf(birim) + " TL" : "")}
${satir("KDV", x.kdv != null ? (x.kdv ? `%${x.kdv}` : "Yok") : "")}
${satir(icra ? "Teminat (kıymetin %10'u)" : "Geçici teminat", x.teminat ? tl(x.teminat) : "")}
${tk ? `${satir("1. artırma", tk.a1 ? esc(aralik(tk.a1)) + " · " + esc(tk.a1.bas.slice(11, 16)) : "")}${satir("2. artırma", tk.a2 ? esc(aralik(tk.a2)) + " · " + esc(tk.a2.bas.slice(11, 16)) : "")}` : satir(icra ? "1. satış günü" : "İhale tarihi", esc(trTarih(x.tarih)))}
${satir("Şu anki durum", `<b>${esc(as.metin)}</b>`)}
${satir("Nitelik", esc(x.nitelik))}
${satir("Dosya no", esc(x.dosya))}
${satir(icra ? "Satışı yapan" : "İhalenin yapılacağı yer", esc(x.yer))}
${satir("İhale usulü", esc(x.usul))}
${satir("İmar durumu", esc(x.imar))}
${x.kaynak === "milliemlak" ? satir("Hazine hissesi", esc(x.hisse)) : ""}
${satir("Kiralama amacı", esc(x.amac))}
${satir(icra ? "İlan no" : "Taşınmaz no", esc(x.tasinmaz_no))}
</tbody></table>
<p class="ih-dugmeler"><a class="btn dolu" href="${esc(x.link)}" target="_blank" rel="noopener nofollow">İlanın aslını ${esc(KAYNAK[x.kaynak]?.ad)}'ta aç</a>${x.ada && x.parsel && x.mahalle ? ` <a class="btn ih-3b" href="/parsel-sorgu?il=${esc(sl(x.il))}&ilce=${esc(sl(x.ilce))}&mahalle=${esc(sl(String(x.mahalle).replace(/\s+(mahallesi|mah\.?|köyü|koyu)$/i, "")))}&ada=${esc(x.ada)}&parsel=${esc(x.parsel)}">3B parselde gör</a>` : ""}</p>
${paylas(`${baslik} · Topraklık'ta incele`, `https://topraklik.com/ihaleler/ilan/${x.id}`, esc)}
${ek?.metin ? `<h2>İlan metni</h2><details><summary>İlanın tam metnini göster</summary><p style="white-space:pre-line;font-size:14.5px">${esc(ek.metin)}</p></details>` : ""}
<h2>İhaleye nasıl katılınır?</h2>
${icra ? `<p>İcra ve mahkeme satışları UYAP e-Satış portalında elektronik açık artırmayla yapılır. e-Devlet ile esatis.uyap.gov.tr adresine girip ilandaki dosyayı bulur, muhammen bedelin %10'u kadar teminatı yatırarak teklif verirsiniz. İlk artırmada en az muhammen bedelin %50'si istenir; alıcı çıkmazsa ikinci artırma yapılır.</p><p>Adım adım anlatım için <a href="/rehber/icra-ihalesine-nasil-girilir">icra ihalesine nasıl girilir</a>, toplam maliyet için <a href="/araclar/icra-ihalesi-maliyet-hesaplama">icra ihalesi maliyet hesaplama</a> aracına bakın.</p>` : `<p>Hazine taşınmaz ihaleleri 2886 sayılı Devlet İhale Kanunu'na göre yapılır. Katılmak için ihale saatinden önce geçici teminatı yatırıp, kimlik ve tebligat adresi belgeleriyle ihaleyi yapan Milli Emlak müdürlüğüne başvurursunuz. Ayrıntılar ilanın şartnamesinde yazar; bazı ihalelerde ilk ödeme peşin, kalanı taksitle ödenebilir.</p>
<p>Kiralama ihaleleri için <a href="/rehber/hazine-arazisi-kiralama">hazine arazisi kiralama rehberine</a>, bölgedeki diğer hazine ilanları için <a href="/ihaleler?kaynak=milliemlak">Milli Emlak ihalelerine</a> bakın.</p>`}
${urunler.length ? `<h2>${esc(x.il)} ilinde yaygın yetişen ürünler</h2><p class="chips">${urunler.map((u) => `<a class="tag" href="/urun/${u.urun}">${esc(u.ad)}</a>`).join("")}</p><p>Arazide ne ekebileceğinizi ve tahmini kazancı <a href="/il/${esc(x.il_slug)}">${esc(x.il)} sayfasından</a> ve ürün rehberlerindeki hesaplayıcıdan görebilirsiniz.</p>` : ""}
<div class="src">Kaynak: <a href="${esc(x.link)}" target="_blank" rel="noopener nofollow">${x.kaynak === "uyap" ? "UYAP e-Satış ilanı, ilan.gov.tr" : icra ? "Basın İlan Kurumu, ilan.gov.tr" : "T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Milli Emlak Genel Müdürlüğü"}</a> · Topraklık'ta ilk görülme: ${esc((x.ilk_gorulme || "").slice(0, 10))} · son kontrol: ${esc((x.guncel || "").slice(0, 10))}<br>Bilgiler kaynaktan otomatik alınır; teklif vermeden önce ilanın aslını ve şartnamesini kontrol edin.</div></article>
<aside><h3>${esc(x.il)} ilindeki diğer ihaleler</h3>${benzer.length ? benzer.map((b) => `<a class="card" href="/ihaleler/ilan/${esc(b.id)}"><b>${esc(b.cins || "Taşınmaz")}${b.m2 ? ` · ${nf(satilanM2(b))} m²${hisseli(b) ? " hisse" : ""}` : ""}</b><span>${esc(b.ilce)}${b.bedel ? " · " + tl(b.bedel) : ""} · ${esc(asama(b, bugun()).metin)}</span></a>`).join("") : `<p>Şu an başka ilan yok.</p>`}<a class="card" href="/ihaleler/${esc(x.il_slug)}"><b>Tüm ${esc(x.il)} ihaleleri →</b></a></aside></div>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "RealEstateListing", name: baslik, url: `https://topraklik.com/ihaleler/ilan/${x.id}`, datePosted: (x.ilk_gorulme || "").slice(0, 10), ...(x.bedel ? { offers: { "@type": "Offer", price: x.bedel, priceCurrency: "TRY" } } : {}) }];
  const seoBas = (() => { const alan = x.m2 ? (h ? `${nf(sm)} m² hisseli` : `${nf(x.m2)} m²`) : ""; const ne = `${alan} ${(x.cins || "taşınmaz").toLocaleLowerCase("tr")} ${icra ? "icradan satılık" : x.tip === "kira" ? "hazine kiralama ihalesi" : "hazine satış ihalesi"}`.trim(); const mk = mahAd.replace(/\s+(Mahallesi|Köyü)$/i, ""); for (const a of [`${x.ilce} ${mk} ${ne} (${x.il})`, `${x.ilce} ${mk} ${ne}`, `${x.ilce} ${ne} (${x.il})`, `${x.ilce} ${ne}`]) { const t = a.replace(/\s+/g, " ").trim(); if (t.length <= 64) return t; } return `${x.ilce} ${ne}`; })();
  return html(page({ title: `${seoBas} · Topraklık`, description: `${[x.il, x.ilce, mahAd].filter(Boolean).join(" ")}${x.ada ? ` ${x.ada} ada ${x.parsel} parsel` : ""}${x.m2 ? `, ${h ? nf(sm) + " m² hisse" : nf(x.m2) + " m²"}` : ""} ${(x.cins || "taşınmaz").toLocaleLowerCase("tr")}.${x.bedel ? ` ${x.tip === "kira" ? "Yıllık kira" : "Muhammen bedel"} ${tl(x.bedel)}.` : ""} ${as.metin}.`.replace(/\s+/g, " "), path: `/ihaleler/ilan/${x.id}`, body, current: "/ihaleler", jsonld, noindex: gecti }), 200, 1800);
}

export async function ihaleKutusu(env, { il, ilce, limit = 5 }, esc) {
  try {
    const w = [AKTIF, "il_slug = ?2"], b = [bugun(), il];
    if (ilce) { w.push("ilce_slug = ?3"); b.push(ilce); }
    const rows = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${w.join(" AND ")} ORDER BY tarih LIMIT ${limit}`).bind(...b).all()).results || [];
    const n = (await env.DB.prepare(`SELECT count(*) n FROM ihale WHERE ${w.join(" AND ")}`).bind(...b).first())?.n || 0;
    if (!n) return "";
    return `<h3>Güncel hazine ihaleleri (${n})</h3>${rows.map((x) => `<a class="card" href="/ihaleler/ilan/${esc(x.id)}"><b>${esc(x.cins || "Taşınmaz")}${x.m2 ? ` · ${nf(x.m2)} m²` : ""}</b><span>${esc(x.ilce)} · ${x.bedel ? tl(x.bedel) : ""} · ${esc(trTarih(x.tarih).split(" · ")[0])}</span></a>`).join("")}<a class="card" href="/ihaleler/${esc(il)}${ilce ? "/" + esc(ilce) : ""}"><b>Tümünü gör →</b></a>`;
  } catch (e) { return ""; }
}

export async function ihaleAnaSayfa(env) {
  try {
    const rows = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${AKTIF} AND tip = 'satis' AND cins IN ('Tarla','Arazi','Bağ-Bahçe') ORDER BY tarih LIMIT 6`).bind(bugun()).all()).results || [];
    const n = (await env.DB.prepare(`SELECT kaynak, tip, count(*) n FROM ihale WHERE ${AKTIF} GROUP BY kaynak, tip`).bind(bugun()).all()).results || [];
    return { rows, sayi: n.reduce((o, r) => { const k = ICRA(r.kaynak) ? "icra" : r.tip; o[k] = (o[k] || 0) + r.n; return o; }, {}) };
  } catch (e) { return { rows: [], sayi: {} }; }
}
export const anaKart = (x, esc) => { const h = hisseli(x), sm = satilanM2(x); return `<a class="tk-item" href="/ihaleler/ilan/${esc(x.id)}" style="text-decoration:none"><span class="tk-cat">${esc(turEtiket(x))}${h ? " · Hisseli" : ""}</span><span style="font-weight:800;color:var(--ink,#26261E)">${esc(x.cins || "Taşınmaz")}${x.m2 ? ` · ${nf(sm)} m²${h ? " hisse" : dekar(sm)}` : ""}</span><span style="color:var(--muted,#6C6858);font-size:14px">${esc(x.il)} / ${esc(x.ilce)}</span><span style="font-weight:800;color:var(--green,#2E5130);font-size:18px">${x.bedel ? tl(x.bedel) : ""}</span><span class="tk-meta">${esc(asama(x, bugun()).metin)}</span></a>`; };

export async function ihaleSitemap(env) {
  try {
    const ils = (await env.DB.prepare(`SELECT DISTINCT il_slug, ilce_slug FROM ihale WHERE ${AKTIF}`).bind(bugun()).all()).results || [];
    const ids = (await env.DB.prepare(`SELECT id FROM ihale WHERE ${AKTIF}`).bind(bugun()).all()).results || [];
    const out = new Set(["/ihaleler", "/ihaleler/takvim", "/ihaleler/bu-hafta", ...takvimAylari(3).map(([k]) => `/ihaleler/takvim/${k}`)]);
    for (const r of ils) { out.add(`/ihaleler/${r.il_slug}`); out.add(`/ihaleler/${r.il_slug}/${r.ilce_slug}`); }
    return [...out, ...ids.map((r) => `/ihaleler/ilan/${r.id}`)];
  } catch (e) { return ["/ihaleler"]; }
}

/* ---------- İhale takvimi: bu hafta ve aylık sayfalar ---------- */
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
function gunEkle(d, n) { const t = new Date(d.slice(0, 10) + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
const gunYaz = (d) => `${+d.slice(8, 10)} ${AYLAR[+d.slice(5, 7) - 1]}`;
const haftaGunu = (d) => GUNLER[new Date(d + "T12:00:00Z").getUTCDay()];
export function takvimAylari(n = 3) {
  const [y, m] = bugun().split("-").map(Number);
  return Array.from({ length: n }, (_, i) => { const yy = y + Math.floor((m - 1 + i) / 12), mm = ((m - 1 + i) % 12) + 1; return [`${yy}-${String(mm).padStart(2, "0")}`, `${AYLAR[mm - 1]} ${yy}`]; });
}
/* bir ilanın "sonuç günleri": e-satışta artırmaların son günleri, diğerlerinde ihale tarihi */
const G1 = "(CASE WHEN json_valid(takvim) AND json_extract(takvim, '$.a1.bit') IS NOT NULL THEN substr(json_extract(takvim, '$.a1.bit'), 1, 10) ELSE substr(tarih, 1, 10) END)";
const G2 = "(CASE WHEN json_valid(takvim) THEN substr(json_extract(takvim, '$.a2.bit'), 1, 10) END)";
const ARALIKTA = "(g1 BETWEEN ?2 AND ?3 OR g2 BETWEEN ?2 AND ?3)";
const GUN = "(CASE WHEN g1 BETWEEN ?2 AND ?3 THEN g1 ELSE g2 END)";
const ALT = `(SELECT *, ${G1} g1, ${G2} g2 FROM ihale WHERE ${AKTIF})`;
const TUR_F = { icra: "kaynak IN ('bik', 'uyap')", hazine: "kaynak = 'milliemlak'" };

async function takvimVeri(env, bas, bit, f, sayfa, N) {
  const w = [ARALIKTA], b = [bugun(), bas, bit];
  if (TUR_F[f.tur]) w.push(TUR_F[f.tur]);
  if (f.cins) { b.push(f.cins); w.push(`cins = ?${b.length}`); }
  const [rows, ozet, iller] = await Promise.all([
    env.DB.prepare(`SELECT *, ${GUN} gun FROM ${ALT} WHERE ${w.join(" AND ")} ORDER BY gun, il, ilce LIMIT ${N + 1} OFFSET ${(sayfa - 1) * N}`).bind(...b).all(),
    env.DB.prepare(`SELECT cins, CASE WHEN kaynak = 'milliemlak' THEN 'hazine' ELSE 'icra' END tur, count(*) n FROM ${ALT} WHERE ${ARALIKTA} GROUP BY cins, tur`).bind(bugun(), bas, bit).all(),
    env.DB.prepare(`SELECT il, il_slug, count(*) n FROM ${ALT} WHERE ${ARALIKTA} GROUP BY il_slug ORDER BY n DESC LIMIT 12`).bind(bugun(), bas, bit).all(),
  ]);
  return { rows: rows.results || [], ozet: ozet.results || [], iller: iller.results || [] };
}

function takvimGovde(d, ctx, { bas, bit, yol, f, sayfa, N, baslik, giris }) {
  const { esc } = ctx;
  const more = d.rows.length > N, rows = d.rows.slice(0, N);
  const top = (fn) => d.ozet.filter(fn).reduce((s, r) => s + r.n, 0);
  const toplam = top(() => true);
  const qs = (o) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries({ ...f, ...o })) if (v && !(k === "sayfa" && v === 1)) u.set(k, v); const t = u.toString(); return yol + (t ? "?" + t : ""); };
  const cinsler = [...new Set(d.ozet.map((r) => r.cins).filter(Boolean))].sort((a, b) => top((r) => r.cins === b) - top((r) => r.cins === a));
  const gruplar = [];
  for (const x of rows) { const g = x.gun || ""; if (!gruplar.length || gruplar.at(-1)[0] !== g) gruplar.push([g, []]); gruplar.at(-1)[1].push(x); }
  const etiket = (x) => { let tk = null; try { tk = JSON.parse(x.takvim || "null"); } catch {} if (tk?.a2 && (tk.a2.bit || "").slice(0, 10) === x.gun) return "2. artırmanın son günü"; if (tk?.a1) return "1. artırmanın son günü"; return x.kaynak === "milliemlak" ? "ihale günü" : "satış günü"; };
  return `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/ihaleler">İhaleler</a> › <a href="/ihaleler/takvim">İhale takvimi</a> › ${esc(baslik)}</div>
<h1>${esc(giris.h1)}</h1>
<p class="answer">${giris.cevap(toplam, top((r) => r.tur === "icra"), top((r) => r.tur === "hazine"), top((r) => r.cins === "Tarla"), top((r) => r.cins === "Arsa"), top((r) => r.cins === "Konut"))}</p>
<div class="ozet"><span>Toplam <b>${nf(toplam)}</b></span><span>İcra / mahkeme <b>${nf(top((r) => r.tur === "icra"))}</b></span><span>Hazine <b>${nf(top((r) => r.tur === "hazine"))}</b></span></div>
<p class="chips"><a class="tag"${!f.tur && !f.cins ? ' aria-current="page"' : ""} href="${yol}">Hepsi</a> <a class="tag" href="${esc(qs({ tur: "icra", sayfa: 1 }))}"${f.tur === "icra" ? ' aria-current="page"' : ""}>İcra ve mahkeme</a> <a class="tag" href="${esc(qs({ tur: "hazine", sayfa: 1 }))}"${f.tur === "hazine" ? ' aria-current="page"' : ""}>Hazine</a> ${cinsler.slice(0, 7).map((c) => `<a class="tag" href="${esc(qs({ cins: c, sayfa: 1 }))}"${f.cins === c ? ' aria-current="page"' : ""}>${esc(c)} · ${top((r) => r.cins === c)}</a>`).join(" ")}</p>
${gruplar.length ? gruplar.map(([g, xs]) => `<h2 class="tk-gun">${g ? `${gunYaz(g)} ${haftaGunu(g)}` : "Tarihi belirsiz"}</h2><div class="ilist">${xs.map((x) => kart(x, esc).replace('<div class="alt">', `<p class="tk-etiket">${esc(etiket(x))}</p><div class="alt">`)).join("")}</div>`).join("") : `<p class="note">Bu aralıkta ${f.tur || f.cins ? "bu filtreye uygun " : ""}sonuçlanacak güncel ihale yok.</p>`}
<div class="sayfa">${sayfa > 1 ? `<a class="btn" href="${esc(qs({ sayfa: sayfa - 1 }))}">← Önceki</a>` : ""}${more ? `<a class="btn" href="${esc(qs({ sayfa: sayfa + 1 }))}">Sonraki →</a>` : ""}</div>
${d.iller.length ? `<h2>En çok ihale olan iller</h2><p class="chips">${d.iller.map((r) => `<a class="tag" href="/ihaleler/${esc(r.il_slug)}">${esc(r.il)} · ${r.n}</a>`).join(" ")}</p>` : ""}
<h2>Diğer dönemler</h2><p class="chips"><a class="tag" href="/ihaleler/bu-hafta">Bu hafta</a> ${takvimAylari(4).map(([k, ad]) => `<a class="tag" href="/ihaleler/takvim/${k}">${ad}</a>`).join(" ")}</p>
<p class="note">Tarihler ilan metninden okunur. UYAP e-Satış'ta her artırma birkaç gün sürer; burada artırmanın <b>son günü</b> esas alınmıştır. Birinci artırmada alıcı çıkmazsa ilan ikinci artırmanın son gününde yeniden listelenir. Teklif vermeden önce ilanın aslını mutlaka kontrol edin; nasıl katılınacağını <a href="/rehber/icra-ihalesine-nasil-girilir">icra ihalesi rehberinde</a> bulabilirsiniz.</p>`;
}
const TAKVIM_CSS = `.tk-gun{margin:26px 0 10px;font-size:20px;border-bottom:2px solid var(--line,#e5e0d5);padding-bottom:6px}.tk-etiket{margin:6px 0 0;font-size:12.5px;font-weight:700;color:#8a5a00}.chips .tag[aria-current]{background:#2E5130;color:#fff}`;

export async function takvimSayfa(env, url, ctx, tip, ay) {
  const { page, html } = ctx;
  const f = { tur: TUR_F[url.searchParams.get("tur")] ? url.searchParams.get("tur") : "", cins: (url.searchParams.get("cins") || "").slice(0, 30) };
  const sayfa = Math.max(1, parseInt(url.searchParams.get("sayfa") || "1", 10) || 1), N = 60;
  const b = bugun();
  if (tip === "hafta") {
    const bas = b, bit = gunEkle(b, 6);
    const d = await takvimVeri(env, bas, bit, f, sayfa, N);
    const ar = `${gunYaz(bas)} – ${gunYaz(bit)}`;
    const body = takvimGovde(d, ctx, { bas, bit, yol: "/ihaleler/bu-hafta", f, sayfa, N, baslik: "Bu hafta", giris: {
      h1: `Bu hafta sonuçlanacak ihaleler (${ar})`,
      cevap: (t, i, h, ta, ar2, k) => t ? `Önümüzdeki 7 günde (${ar}) son günü gelen <b>${nf(t)}</b> ihale var: ${nf(i)} icra ve mahkeme satışı, ${nf(h)} hazine ihalesi. Bunların ${[ta ? `${nf(ta)} tanesi tarla` : "", ar2 ? `${nf(ar2)} tanesi arsa` : "", k ? `${nf(k)} tanesi konut` : ""].filter(Boolean).join(", ") || "tamamı diğer taşınmazlar"}.` : `Önümüzdeki 7 günde (${ar}) son günü gelen ihale bulunmuyor.` } });
    return html(page({ title: `Bu hafta sonuçlanacak icra ve hazine ihaleleri (${ar})`, description: `${ar} arasında son günü gelen icra, mahkeme ve hazine ihaleleri: tarla, arsa, ev ve işyeri; gün gün liste, bedel, alan ve artırma tarihleri.`, path: "/ihaleler/bu-hafta", body, current: "/ihaleler", ekCss: TAKVIM_CSS, noindex: sayfa > 1 || !!(f.tur || f.cins) }), 200, 1800);
  }
  if (tip === "ay") {
    const gecerli = takvimAylari(6).map(([k]) => k);
    if (!gecerli.includes(ay)) return null;
    const [y, m] = ay.split("-").map(Number);
    const bas = ay === b.slice(0, 7) ? b : `${ay}-01`, bit = `${ay}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
    const ad = `${AYLAR[m - 1]} ${y}`;
    const d = await takvimVeri(env, bas, bit, f, sayfa, N);
    const body = takvimGovde(d, ctx, { bas, bit, yol: `/ihaleler/takvim/${ay}`, f, sayfa, N, baslik: ad, giris: {
      h1: `${ad} icra ve hazine ihaleleri: tarla, arsa, ev, işyeri`,
      cevap: (t, i, h, ta, ar2, k) => t ? `${ad} içinde${bas !== `${ay}-01` ? " bugünden itibaren" : ""} son günü gelen <b>${nf(t)}</b> ihale var: ${nf(i)} icra ve mahkeme satışı, ${nf(h)} hazine ihalesi${ta || ar2 || k ? ` (${[ta ? `${nf(ta)} tarla` : "", ar2 ? `${nf(ar2)} arsa` : "", k ? `${nf(k)} konut` : ""].filter(Boolean).join(", ")})` : ""}. Liste gün gün sıralanmıştır; yeni ilanlar eklendikçe güncellenir.` : `${ad} için henüz yayımlanmış ihale yok. İcra ilanları genellikle ihaleden 2–6 hafta önce yayımlanır; bu sayfa her gün güncellenir.` } });
    return html(page({ title: `${ad} icra ve hazine ihaleleri: tarla, arsa, ev`, description: `${ad} ayında son günü gelen icradan ve hazineden satılık tarla, arsa, ev ve işyerleri; gün gün ihale takvimi, bedel ve alan bilgisi.`, path: `/ihaleler/takvim/${ay}`, body, current: "/ihaleler", ekCss: TAKVIM_CSS, noindex: sayfa > 1 || !!(f.tur || f.cins) }), 200, 1800);
  }
  /* takvim ana sayfası */
  const donem = [["/ihaleler/bu-hafta", "Bu hafta", b, gunEkle(b, 6)], ["/ihaleler/bu-hafta", "Gelecek hafta", gunEkle(b, 7), gunEkle(b, 13)], ...takvimAylari(4).map(([k, ad]) => { const [y, m] = k.split("-").map(Number); return [`/ihaleler/takvim/${k}`, ad, k === b.slice(0, 7) ? b : `${k}-01`, `${k}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`]; })];
  const sayi = await Promise.all(donem.map(([, , s, e]) => env.DB.prepare(`SELECT count(*) n FROM ${ALT} WHERE ${ARALIKTA}`).bind(b, s, e).first().then((r) => r?.n || 0).catch(() => 0)));
  const gun14 = (await env.DB.prepare(`SELECT ${GUN} gun, count(*) n FROM ${ALT} WHERE ${ARALIKTA} GROUP BY gun ORDER BY gun`).bind(b, b, gunEkle(b, 13)).all().catch(() => ({ results: [] }))).results || [];
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/ihaleler">İhaleler</a> › İhale takvimi</div>
<h1>İhale takvimi: hangi gün hangi ihale sonuçlanıyor?</h1>
<p class="answer">İcra, mahkeme ve hazine ihalelerini son günlerine göre izleyin. Bu hafta <b>${nf(sayi[0])}</b>, gelecek hafta <b>${nf(sayi[1])}</b> ihalenin son günü geliyor. UYAP e-Satış'ta artırmalar birkaç gün sürdüğü için artırmanın son günü esas alınır.</p>
<div class="grid">${donem.filter((_, i) => i !== 1).map(([h, ad], i) => `<a class="card" href="${h}"><b>${ad}</b><span>${nf(sayi[i === 0 ? 0 : i + 1])} ihale</span></a>`).join("")}</div>
${gun14.length ? `<h2>Önümüzdeki 14 gün</h2><div class="tablo-kap"><table><thead><tr><th>Gün</th><th>Son günü gelen ihale</th></tr></thead><tbody>${gun14.map((r) => `<tr><td>${gunYaz(r.gun)} ${haftaGunu(r.gun)}</td><td><b>${nf(r.n)}</b></td></tr>`).join("")}</tbody></table></div>` : ""}
<p class="note">Takvim ilan metinlerinden otomatik çıkarılır ve her gün güncellenir. Kesin tarih ve saat için ilanın aslına bakın.</p>`;
  return html(page({ title: "İhale takvimi: bu hafta ve bu ay sonuçlanacak icra ihaleleri", description: "İcra, mahkeme ve hazine ihalelerinin takvimi: bu hafta, gelecek hafta ve önümüzdeki aylarda son günü gelen tarla, arsa, ev ve işyeri ihaleleri.", path: "/ihaleler/takvim", body, current: "/ihaleler", ekCss: TAKVIM_CSS }), 200, 1800);
}
