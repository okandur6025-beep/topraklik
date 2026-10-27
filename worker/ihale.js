/* Gerçek ihale ilanları: Milli Emlak (hazine) satış ve kira ilanları.
   Veri, Türkiye IP'si gerektirdiği için kullanıcının bilgisayarındaki tarayıcıdan toplanır
   ve /admin/ihale-yukle ucuna gönderilir. */

export const IHALE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ihale (id TEXT PRIMARY KEY, kaynak TEXT, tip TEXT, ilan_id TEXT, il TEXT, il_slug TEXT, ilce TEXT, ilce_slug TEXT, mahalle TEXT, ada TEXT, parsel TEXT, cins TEXT, imar TEXT, m2 REAL, bedel REAL, teminat REAL, tarih TEXT, yer TEXT, usul TEXT, hisse TEXT, amac TEXT, tasinmaz_no TEXT, link TEXT, foto INTEGER, aktif INTEGER DEFAULT 1, ilk_gorulme TEXT, guncel TEXT)`,
  `CREATE INDEX IF NOT EXISTS ihale_liste ON ihale (aktif, tarih)`,
  `CREATE INDEX IF NOT EXISTS ihale_il ON ihale (il_slug, ilce_slug)`,
];
const COLS = ["id", "kaynak", "tip", "ilan_id", "il", "il_slug", "ilce", "ilce_slug", "mahalle", "ada", "parsel", "cins", "imar", "m2", "bedel", "teminat", "tarih", "yer", "usul", "hisse", "amac", "tasinmaz_no", "link", "foto", "bitis", "nitelik", "dosya"];
const EK_KOLON = ["bitis TEXT", "nitelik TEXT", "dosya TEXT"];
const AKTIF = "aktif = 1 AND COALESCE(bitis, substr(tarih, 1, 10)) >= ?1";
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
  const rows = items.map((x) => ({ ...x, kaynak, tip, il_slug: x.il_slug || slugify(x.il || ""), ilce_slug: slugify(x.ilce || ""), bitis: x.bitis || (x.tarih || "").slice(0, 10) }));
  const sel = COLS.map((c) => `json_extract(value, '$.${c}')`).join(", ");
  const upd = COLS.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ");
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
const dekar = (m2) => (m2 >= 1000 ? ` (${(m2 / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dönüm)` : "");

export const IHALE_CSS = `.ilist{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.ic{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:6px}
.ic h3{margin:0;font-size:17px;line-height:1.3}.ic h3 a{color:var(--ink);text-decoration:none}.ic h3 a:hover{color:var(--green)}
.ic .yer{font-size:14px;color:var(--muted)}.ic .fiyat{font-size:21px;font-weight:800;color:var(--green)}
.ic dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:4px 0;font-size:14px}.ic dt{color:var(--muted)}.ic dd{margin:0;font-weight:600}
.ic .alt{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:8px}
.btn{display:inline-block;border-radius:9px;padding:8px 12px;font-weight:700;font-size:14px;text-decoration:none;border:1px solid var(--green);color:var(--green);background:none;cursor:pointer;font-family:inherit}
.btn.dolu{background:var(--green);color:#fff}
.gun{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:2px 9px;background:var(--soft);color:var(--gold)}
.filt{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px;margin:0 0 18px}
.filt label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:var(--muted)}
.filt select,.filt input{font:600 15px inherit;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);width:100%}
.filt .btn{align-self:end;padding:9px 12px}
.sayfa{display:flex;gap:8px;justify-content:center;margin:22px 0}
.ozet{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}.ozet span{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:14px}.ozet b{font-size:17px;color:var(--green)}`;

function kart(x, esc) {
  const birim = x.m2 && x.bedel ? x.bedel / x.m2 : 0;
  const baslik = `${x.cins || "Taşınmaz"} · ${nf(x.m2)} m²${dekar(x.m2)}`;
  return `<div class="ic"><div><span class="tag">${esc(KAYNAK[x.kaynak]?.tur || "")} ${esc(TIP[x.tip] || "")}</span><span class="gun">${esc(kalan(x.tarih || ""))}</span></div>
<h3><a href="/ihaleler/ilan/${esc(x.id)}">${esc(baslik)}</a></h3>
<div class="yer">${esc([x.il + " / " + x.ilce, x.mahalle || x.nitelik].filter(Boolean).join(" · "))}</div>
<div class="fiyat">${x.bedel ? tl(x.bedel) : "Bedel ilanda"}${x.tip === "kira" && x.bedel ? ` <small style="font-size:13px;color:var(--muted)">yıllık</small>` : ""}</div>
<dl>${x.ada ? `<dt>Ada / parsel</dt><dd>${esc(x.ada)} / ${esc(x.parsel || "—")}</dd>` : ""}${birim ? `<dt>m² fiyatı</dt><dd>${nf(birim)} TL</dd>` : ""}${x.teminat ? `<dt>Teminat</dt><dd>${tl(x.teminat)}</dd>` : ""}${x.dosya ? `<dt>Dosya</dt><dd>${esc(x.dosya)}</dd>` : ""}<dt>${ICRA(x.kaynak) ? "1. satış" : "İhale"}</dt><dd>${esc(trTarih(x.tarih))}</dd>${x.amac ? `<dt>Amaç</dt><dd>${esc(x.amac)}</dd>` : ""}</dl>
<div class="alt"><a class="btn dolu" href="/ihaleler/ilan/${esc(x.id)}">Detay</a><a class="btn" href="${esc(x.link)}" target="_blank" rel="noopener nofollow">${esc(KAYNAK[x.kaynak]?.ad || "Kaynak")}'ta gör</a></div></div>`;
}

async function secenekler(env) {
  const r = (await env.DB.prepare(`SELECT il, il_slug, ilce, ilce_slug, cins, tip, kaynak, count(*) n FROM ihale WHERE ${AKTIF} GROUP BY il_slug, ilce_slug, cins, tip, kaynak`).bind(bugun()).all()).results || [];
  return r;
}

export async function ihaleListe(env, url, ctx, sabit = {}) {
  const { esc, page, html } = ctx;
  const q = (k) => sabit[k] ?? (url.searchParams.get(k) || "");
  const f = { il: q("il"), ilce: q("ilce"), kaynak: q("kaynak"), tip: q("tip"), cins: q("cins"), max: q("max"), min_m2: q("min_m2"), sira: q("sira") || "tarih" };
  const sayfa = Math.max(1, parseInt(url.searchParams.get("sayfa") || "1", 10) || 1), N = 30;
  let rows = [], opts = [];
  try {
    opts = await secenekler(env);
    const w = [AKTIF], b = [bugun()];
    const add = (sql, v) => { b.push(v); w.push(sql.replace("?", "?" + b.length)); };
    if (f.il) add("il_slug = ?", f.il);
    if (f.ilce) add("ilce_slug = ?", f.ilce);
    if (f.kaynak === "icra") w.push("kaynak IN ('bik', 'uyap')"); else if (f.kaynak) add("kaynak = ?", f.kaynak);
    if (f.tip) add("tip = ?", f.tip);
    if (f.cins) add("cins = ?", f.cins);
    if (+f.max) add("bedel <= ?", +f.max);
    if (+f.min_m2) add("m2 >= ?", +f.min_m2);
    const ord = { tarih: "tarih ASC", ucuz: "bedel ASC", buyuk: "m2 DESC", m2fiyat: "bedel / m2 ASC", yeni: "ilk_gorulme DESC" }[f.sira] || "tarih ASC";
    rows = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${w.join(" AND ")} ORDER BY ${ord} LIMIT ${N + 1} OFFSET ${(sayfa - 1) * N}`).bind(...b).all()).results || [];
  } catch (e) { /* tablo henüz yok */ }
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
<label>Kaynak<select name="kaynak">${opt({ icra: "İcra / mahkeme", milliemlak: "Hazine (Milli Emlak)" }, f.kaynak, "Hepsi")}</select></label>
<label>İlan türü<select name="tip">${opt(TIP, f.tip, "Satış ve kira")}</select></label>
<label>Taşınmaz cinsi<select name="cins">${opt(Object.fromEntries(Object.keys(cinsler).map((c) => [c, c])), f.cins, "Hepsi")}</select></label>
<label>En fazla bedel (TL)<input name="max" type="number" min="0" step="10000" value="${esc(f.max)}" placeholder="örn. 1000000"></label>
<label>En az alan (m²)<input name="min_m2" type="number" min="0" step="100" value="${esc(f.min_m2)}" placeholder="örn. 5000"></label>
<label>Sıralama<select name="sira">${opt({ tarih: "İhale tarihi yakın", ucuz: "Bedel düşük", m2fiyat: "m² fiyatı düşük", buyuk: "Alan büyük", yeni: "Yeni eklenen" }, f.sira, "İhale tarihi yakın")}</select></label>
<button class="btn dolu" type="submit">İlanları göster</button></form>`;
  const yer = ilceAd ? `${ilAd} ${ilceAd}` : ilAd;
  const h1 = yer ? `${yer} icra ve hazine arazi, tarla ve arsa ihaleleri` : "Güncel icra ve hazine arazi, tarla ve arsa ihaleleri";
  const pathBase = sabit.il ? `/ihaleler/${sabit.il}${sabit.ilce ? "/" + sabit.ilce : ""}` : "/ihaleler";
  const qs = (p) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(f)) if (v && !sabit[k] && !(k === "sira" && v === "tarih")) u.set(k, v); if (p > 1) u.set("sayfa", p); const s = u.toString(); return pathBase + (s ? "?" + s : ""); };
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/ihaleler">İhaleler</a>${ilAd ? ` › <a href="/ihaleler/${esc(f.il)}">${esc(ilAd)}</a>` : ""}${ilceAd ? ` › ${esc(ilceAd)}` : ""}</div>
<h1>${esc(h1)}</h1>
<p class="lead">İcra ve mahkeme satışlarındaki tarla ve arsalar (ilan.gov.tr) ile Milli Emlak'ın hazine satış ve kiralama ihaleleri her gün güncellenir. Her ilan kaynağına bağlıdır; teklif vermeden önce ilanın aslını ve şartnamesini mutlaka kontrol edin.</p>
<div class="ozet"><span>İcra / mahkeme <b>${nf(topI)}</b></span><span>Hazine satış <b>${nf(topS)}</b></span><span>Hazine kiralama <b>${nf(topK)}</b></span></div>
${form}
${rows.length ? `<div class="ilist">${rows.map((x) => kart(x, esc)).join("")}</div>` : `<p class="note">${opts.length ? "Bu filtreye uygun güncel ilan yok. Filtreleri genişletin." : "İlanlar ilk kez yükleniyor; kısa süre içinde burada olacak."}</p>`}
<div class="sayfa">${sayfa > 1 ? `<a class="btn" href="${esc(qs(sayfa - 1))}">← Önceki</a>` : ""}${more ? `<a class="btn" href="${esc(qs(sayfa + 1))}">Sonraki →</a>` : ""}</div>
<p class="note">İcra ihaleleri UYAP e-Satış üzerinden e-Devlet ile girilerek yapılır. Katılmayı öğrenmek için <a href="/rehber/icra-ihalesine-nasil-girilir">icra ihalesi rehberine</a>, hazine arazisi almak için <a href="/rehber/hazine-arazisi-nasil-alinir">hazine arazisi rehberine</a> bakın.</p>`;
  const desc = yer ? `${yer} icradan satılık tarla ve arsalar ile Milli Emlak hazine arazi satış ve kiralama ihaleleri: muhammen bedel, satış tarihi, ada parsel.` : "Türkiye genelinde icradan ve mahkemeden satılık tarla ve arsalar ile hazine (Milli Emlak) arazi satış ve kiralama ihaleleri; il ve ilçeye göre arama.";
  return html(page({ title: `${h1} · Topraklık`, description: desc, path: pathBase, body, current: "/ihaleler" }), 200, 900);
}

export async function ihaleDetay(env, id, ctx) {
  const { esc, page, html, IL_URUN } = ctx;
  let x = null;
  try { x = await env.DB.prepare("SELECT * FROM ihale WHERE id = ?1").bind(id).first(); } catch (e) {}
  if (!x) return null;
  const gecti = !x.aktif || (x.bitis || (x.tarih || "").slice(0, 10)) < bugun();
  const icra = ICRA(x.kaynak);
  let ek = null;
  if (icra && ctx.bikDetay) { try { ek = await ctx.bikDetay(x.ilan_id, ctx.exec); } catch (e) {} }
  if (ek) { x.ada = x.ada || ek.ada; x.parsel = x.parsel || ek.parsel; x.mahalle = x.mahalle || ek.mahalle; }
  const birim = x.m2 && x.bedel ? x.bedel / x.m2 : 0;
  const baslik = (icra ? `${x.il} ${x.ilce} ${x.mahalle || ""} ${x.ada ? x.ada + "/" + x.parsel : ""} ${nf(x.m2)} m² ${(x.cins || "taşınmaz").toLocaleLowerCase("tr")} icradan satılık` : `${x.il} ${x.ilce} ${x.mahalle || ""} ${x.ada}/${x.parsel} ${x.cins || "taşınmaz"} ${TIP[x.tip]?.toLocaleLowerCase("tr")} ihalesi`).replace(/\s+/g, " ");
  const benzer = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${AKTIF} AND il_slug = ?2 AND id != ?3 ORDER BY tarih LIMIT 6`).bind(bugun(), x.il_slug, id).all()).results || [];
  const urunler = (IL_URUN?.(x.il_slug) || []).filter((u) => u.durum === "yaygin").slice(0, 10);
  const satir = (a, b) => (b ? `<tr><th>${a}</th><td>${b}</td></tr>` : "");
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/ihaleler">İhaleler</a> › <a href="/ihaleler/${esc(x.il_slug)}">${esc(x.il)}</a> › <a href="/ihaleler/${esc(x.il_slug)}/${esc(x.ilce_slug)}">${esc(x.ilce)}</a> › ${esc(x.ada)}/${esc(x.parsel)}</div>
<div class="layout"><article><h1>${esc(baslik.charAt(0).toUpperCase() + baslik.slice(1))}</h1>
${gecti ? `<p class="note"><b>Bu ihalenin tarihi geçti veya ilan yayından kalktı.</b> Güncel ilanlar için <a href="/ihaleler/${esc(x.il_slug)}">${esc(x.il)} ihalelerine</a> bakın.</p>` : `<p class="answer">${esc(x.il)} ${esc(x.ilce)} ${esc(x.mahalle || "")} mahallesindeki ${nf(x.m2)} m² ${esc((x.cins || "taşınmaz").toLocaleLowerCase("tr"))}, ${esc(trTarih(x.tarih))} tarihinde ${x.bedel ? tl(x.bedel) + (x.tip === "kira" ? " yıllık kira" : " muhammen bedelle") : ""} ihaleye çıkıyor (${esc(kalan(x.tarih || ""))}).</p>`}
<table><tbody>
${satir("İlan türü", esc(`${KAYNAK[x.kaynak]?.tur || ""} ${TIP[x.tip] || ""}`))}
${satir("Konum", esc(`${x.il} / ${x.ilce} / ${x.mahalle || ""}`))}
${satir("Ada / parsel", esc(`${x.ada} / ${x.parsel}`))}
${satir("Cinsi", esc(x.cins))}
${satir("Yüzölçümü", `${nf(x.m2)} m²${dekar(x.m2)}`)}
${satir(x.tip === "kira" ? "Yıllık kira bedeli" : "Muhammen (tahmini) bedel", x.bedel ? tl(x.bedel) : "")}
${satir("m² fiyatı", birim ? nf(birim) + " TL" : "")}
${satir("Geçici teminat", x.teminat ? tl(x.teminat) : "")}
${satir(icra ? "1. satış günü" : "İhale tarihi", esc(trTarih(x.tarih)))}
${satir("Nitelik", esc(x.nitelik))}
${satir("Dosya no", esc(x.dosya))}
${satir(icra ? "Satışı yapan" : "İhalenin yapılacağı yer", esc(x.yer))}
${satir("İhale usulü", esc(x.usul))}
${satir("İmar durumu", esc(x.imar))}
${satir("Hazine hissesi", esc(x.hisse))}
${satir("Kiralama amacı", esc(x.amac))}
${satir(icra ? "İlan no" : "Taşınmaz no", esc(x.tasinmaz_no))}
</tbody></table>
<p><a class="btn dolu" href="${esc(x.link)}" target="_blank" rel="noopener nofollow">İlanın aslını ${esc(KAYNAK[x.kaynak]?.ad)}'ta aç</a></p>
${ek?.metin ? `<h2>İlan metni</h2><details><summary>İlanın tam metnini göster</summary><p style="white-space:pre-line;font-size:14.5px">${esc(ek.metin)}</p></details>` : ""}
<h2>İhaleye nasıl katılınır?</h2>
${icra ? `<p>İcra ve mahkeme satışları UYAP e-Satış portalında elektronik açık artırmayla yapılır. e-Devlet ile esatis.uyap.gov.tr adresine girip ilandaki dosyayı bulur, muhammen bedelin %10'u kadar teminatı yatırarak teklif verirsiniz. İlk artırmada en az muhammen bedelin %50'si istenir; alıcı çıkmazsa ikinci artırma yapılır.</p><p>Adım adım anlatım için <a href="/rehber/icra-ihalesine-nasil-girilir">icra ihalesine nasıl girilir</a>, masraflar için <a href="/rehber/icra-ihalesi-masraflari">icra ihalesi masrafları</a> rehberine bakın.</p>` : `<p>Hazine taşınmaz ihaleleri 2886 sayılı Devlet İhale Kanunu'na göre yapılır. Katılmak için ihale saatinden önce geçici teminatı yatırıp, kimlik ve tebligat adresi belgeleriyle ihaleyi yapan Milli Emlak müdürlüğüne başvurursunuz. Ayrıntılar ilanın şartnamesinde yazar; bazı ihalelerde ilk ödeme peşin, kalanı taksitle ödenebilir.</p>
<p>Ayrıntılı adımlar için <a href="/rehber/hazine-arazisi-nasil-alinir">hazine arazisi nasıl alınır</a> rehberine bakın.</p>`}
${urunler.length ? `<h2>${esc(x.il)} ilinde yaygın yetişen ürünler</h2><p class="chips">${urunler.map((u) => `<a class="tag" href="/urun/${u.urun}">${esc(u.ad)}</a>`).join("")}</p><p>Arazide ne ekebileceğinizi ve tahmini kazancı <a href="/il/${esc(x.il_slug)}">${esc(x.il)} sayfasından</a> ve ürün rehberlerindeki hesaplayıcıdan görebilirsiniz.</p>` : ""}
<div class="src">Kaynak: <a href="${esc(x.link)}" target="_blank" rel="noopener nofollow">${x.kaynak === "uyap" ? "UYAP e-Satış ilanı, ilan.gov.tr" : icra ? "Basın İlan Kurumu, ilan.gov.tr" : "T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Milli Emlak Genel Müdürlüğü"}</a> · Topraklık'ta ilk görülme: ${esc((x.ilk_gorulme || "").slice(0, 10))} · son kontrol: ${esc((x.guncel || "").slice(0, 10))}<br>Bilgiler kaynaktan otomatik alınır; teklif vermeden önce ilanın aslını ve şartnamesini kontrol edin.</div></article>
<aside><h3>${esc(x.il)} ilindeki diğer ihaleler</h3>${benzer.length ? benzer.map((b) => `<a class="card" href="/ihaleler/ilan/${esc(b.id)}"><b>${esc(b.cins || "")} · ${nf(b.m2)} m²</b><span>${esc(b.ilce)} · ${b.bedel ? tl(b.bedel) : ""} · ${esc(trTarih(b.tarih).split(" · ")[0])}</span></a>`).join("") : `<p>Şu an başka ilan yok.</p>`}<a class="card" href="/ihaleler/${esc(x.il_slug)}"><b>Tüm ${esc(x.il)} ihaleleri →</b></a></aside></div>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "RealEstateListing", name: baslik, url: `https://topraklik.com/ihaleler/ilan/${x.id}`, datePosted: (x.ilk_gorulme || "").slice(0, 10), ...(x.bedel ? { offers: { "@type": "Offer", price: x.bedel, priceCurrency: "TRY" } } : {}) }];
  return html(page({ title: `${baslik} · Topraklık`, description: `${x.il} ${x.ilce} ${x.mahalle || ""} ${x.ada} ada ${x.parsel} parsel, ${nf(x.m2)} m² ${x.cins || ""}. ${x.bedel ? tl(x.bedel) : ""}, ihale ${trTarih(x.tarih)}.`, path: `/ihaleler/ilan/${x.id}`, body, current: "/ihaleler", jsonld, noindex: gecti }), 200, 1800);
}

export async function ihaleKutusu(env, { il, ilce, limit = 5 }, esc) {
  try {
    const w = [AKTIF, "il_slug = ?2"], b = [bugun(), il];
    if (ilce) { w.push("ilce_slug = ?3"); b.push(ilce); }
    const rows = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${w.join(" AND ")} ORDER BY tarih LIMIT ${limit}`).bind(...b).all()).results || [];
    const n = (await env.DB.prepare(`SELECT count(*) n FROM ihale WHERE ${w.join(" AND ")}`).bind(...b).first())?.n || 0;
    if (!n) return "";
    return `<h3>Güncel hazine ihaleleri (${n})</h3>${rows.map((x) => `<a class="card" href="/ihaleler/ilan/${esc(x.id)}"><b>${esc(x.cins || "")} · ${nf(x.m2)} m²</b><span>${esc(x.ilce)} · ${x.bedel ? tl(x.bedel) : ""} · ${esc(trTarih(x.tarih).split(" · ")[0])}</span></a>`).join("")}<a class="card" href="/ihaleler/${esc(il)}${ilce ? "/" + esc(ilce) : ""}"><b>Tümünü gör →</b></a>`;
  } catch (e) { return ""; }
}

export async function ihaleAnaSayfa(env) {
  try {
    const rows = (await env.DB.prepare(`SELECT * FROM ihale WHERE ${AKTIF} AND tip = 'satis' AND cins IN ('Tarla','Arazi','Bağ-Bahçe') ORDER BY tarih LIMIT 6`).bind(bugun()).all()).results || [];
    const n = (await env.DB.prepare(`SELECT kaynak, tip, count(*) n FROM ihale WHERE ${AKTIF} GROUP BY kaynak, tip`).bind(bugun()).all()).results || [];
    return { rows, sayi: n.reduce((o, r) => { const k = ICRA(r.kaynak) ? "icra" : r.tip; o[k] = (o[k] || 0) + r.n; return o; }, {}) };
  } catch (e) { return { rows: [], sayi: {} }; }
}
export const anaKart = (x, esc) => `<a class="tk-item" href="/ihaleler/ilan/${esc(x.id)}" style="text-decoration:none"><span class="tk-cat">Hazine ${esc(TIP[x.tip])} · ${esc(kalan(x.tarih || ""))}</span><span style="font-weight:800;color:var(--ink,#26261E)">${esc(x.cins)} · ${nf(x.m2)} m²${dekar(x.m2)}</span><span style="color:var(--muted,#6C6858);font-size:14px">${esc(x.il)} / ${esc(x.ilce)} · ${esc(x.mahalle || "")}</span><span style="font-weight:800;color:var(--green,#2E5130);font-size:18px">${x.bedel ? tl(x.bedel) : ""}</span><span class="tk-meta">İhale ${esc(trTarih(x.tarih))}</span></a>`;

export async function ihaleSitemap(env) {
  try {
    const ils = (await env.DB.prepare(`SELECT DISTINCT il_slug, ilce_slug FROM ihale WHERE ${AKTIF}`).bind(bugun()).all()).results || [];
    const ids = (await env.DB.prepare(`SELECT id FROM ihale WHERE ${AKTIF}`).bind(bugun()).all()).results || [];
    const out = new Set(["/ihaleler"]);
    for (const r of ils) { out.add(`/ihaleler/${r.il_slug}`); out.add(`/ihaleler/${r.il_slug}/${r.ilce_slug}`); }
    return [...out, ...ids.map((r) => `/ihaleler/ilan/${r.id}`)];
  } catch (e) { return ["/ihaleler"]; }
}
