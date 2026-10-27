// Topraklık ön kapı Worker'ı
// - Statik siteyi (Cloudflare Pages) arkadan sunar
// - Ana sayfaya kayan yazı + "Tarımda bugün" kutusu + menü linkleri ekler
// - /haberler, /rehber, /hibe, /il, /urun sayfalarını D1'den üretir
// - Her 2 saatte bir tarım haberlerini toplar (cron)
import { URUN, URUN_LISTE, IL_AD, urunleriIl, urunPage, urunJsonLd, URUN_CSS, fiyatUygula } from "./urun.js";
import { fiyatAdim, urunFiyat } from "./fiyat.js";
import { milliEmlakTopla } from "./topla.js";
import { ihaleCors, ihaleYukle, ihaleListe, ihaleDetay, ihaleKutusu, ihaleAnaSayfa, anaKart, ihaleSitemap, IHALE_CSS } from "./ihale.js";
const ORIGIN = "https://topraklik.pages.dev";
const SITE = "https://topraklik.com";
const UA = "Mozilla/5.0 (compatible; TopraklikBot/1.0; +https://topraklik.com)";

const bing = (q) => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=tr&cc=TR`;
const AGRI = /tarım|tarim|çiftçi|ciftci|hasat|rekolte|buğday|hububat|arpa|mısır|gübre|hibe|TKDK|IPARD|tarla|arazi|sera|zeytin|fındık|pamuk|hayvancılık|süt|TMO|ziraat|tohum|sulama|kırsal|orman/i;
const FEEDS = [
  { cat: "gundem", url: "https://www.tarimdunyasi.net/rss", name: "Tarım Dünyası" },
  { cat: "hibe", url: bing("tarımsal destek hibe başvuru") },
  { cat: "piyasa", url: bing("buğday fiyatı ticaret borsası") },
  { cat: "arazi", url: bing("tarla ihalesi arazi satışı") },
  { cat: "gundem", url: bing("çiftçi hasat rekolte") },
  { cat: "hibe", url: bing("TKDK IPARD kırsal kalkınma") },
  { cat: "piyasa", url: bing("gübre mazot fiyatı çiftçi") },
  { cat: "arazi", url: bing("Milli Emlak tarım arazisi satış") },
  { cat: "gundem", url: "https://www.aa.com.tr/tr/rss/default?cat=ekonomi", name: "Anadolu Ajansı", filter: true },
  { cat: "gundem", url: "https://www.trthaber.com/ekonomi_articles.rss", name: "TRT Haber", filter: true },
  { cat: "piyasa", url: "https://www.dunya.com/rss", name: "Dünya", filter: true },
  { cat: "gundem", url: "https://www.haberturk.com/rss/ekonomi.xml", name: "Habertürk", filter: true },
];
const CATS = { gundem: "Tarım gündemi", hibe: "Hibe ve destek", piyasa: "Fiyat ve piyasa", arazi: "Arazi ve ihale" };
const SECTIONS = {
  rehber: { name: "İhale ve tapu rehberleri", lead: "İcra ihalesinden hisseli tapuya, arazi alırken bilmeniz gerekenler." },
  hibe: { name: "Hibe ve destek rehberi", lead: "Çiftçilere ve kırsal yatırımcılara verilen hibe ve destekler, kim başvurur ve nasıl başvurulur." },
  il: { name: "İllere göre tarım", lead: "Her ilin iklimi, başlıca ürünleri, ne ekilir ve destekler." },
  urun: { name: "Ürün rehberleri", lead: "Ekim zamanı, toprak ve iklim isteği, bakım ve hasat bilgisi." },
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const decode = (s) => String(s ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");
const strip = (s) => decode(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const trDate = (iso) => { try { return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }); } catch { return ""; } };
const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); if (m < 60) return `${Math.max(1, m)} dk önce`; const h = Math.round(m / 60); if (h < 24) return `${h} saat önce`; return trDate(iso); };

async function sha(s) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
}

export function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const g = (t) => (it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`)) || [])[1] || "";
    let title = strip(g("title"));
    const source = strip(g("source") || g("News:Source"));
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    let link = strip(g("link"));
    try { const u = new URL(link); if (u.hostname.endsWith("bing.com") && u.searchParams.get("url")) link = u.searchParams.get("url"); } catch {}
    const pub = g("pubDate");
    if (!title || !link) continue;
    items.push({ title, source: source || "Kaynak", url: link, published_at: new Date(pub || Date.now()).toISOString() });
  }
  return items;
}

const normTitle = (t) => t.toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 90);

const fnv = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

// Ücretsiz planda tek çalışmada en fazla 50 sorgu ve kısa CPU süresi var:
// her çalışmada 2 konu işlenir, satırlar toplu yazılır.
async function collectNews(env, slot = 0, perRun = 2) {
  const log = [];
  const now = new Date().toISOString();
  for (let k = 0; k < perRun; k++) {
    const f = FEEDS[(slot * perRun + k) % FEEDS.length];
    try {
      const r = await fetch(f.url, { headers: { "user-agent": UA } });
      const tag = f.name || f.url.replace(/^https:\/\/(www\.)?/, "").slice(0, 40);
      if (!r.ok) { log.push(`${tag}: HTTP ${r.status}`); continue; }
      const xml = await r.text();
      const items = parseRss(xml.slice(0, 120000)).filter((it) => !f.filter || AGRI.test(it.title)).slice(0, 20).map((it) => (f.name && it.source === "Kaynak" ? { ...it, source: f.name } : it));
      let added = 0;
      for (let i = 0; i < items.length; i += 12) {
        const chunk = items.slice(i, i + 12);
        const sql = "INSERT OR IGNORE INTO news (id, title, source, url, published_at, category, created_at) VALUES " + chunk.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
        const args = chunk.flatMap((it) => [fnv(normTitle(it.title)), it.title.slice(0, 300), it.source.slice(0, 120), it.url, it.published_at, f.cat, now]);
        const res = await env.DB.prepare(sql).bind(...args).run();
        added += res.meta?.changes || 0;
      }
      log.push(`${tag}: ${items.length} bulundu, ${added} yeni`);
    } catch (e) { log.push(`${f.name || f.url.slice(8, 48)}: hata ${e.message}`); }
  }
  if (slot % 8 === 0) await env.DB.prepare("DELETE FROM news WHERE published_at < ?1").bind(new Date(Date.now() - 120 * 864e5).toISOString()).run();
  await env.DB.prepare("INSERT INTO runs (at, job, log) VALUES (?1, 'news', ?2)").bind(now, log.join("\n")).run();
  return log;
}

/* ---------- İl / ilçe / mahalle (TKGM idari yapı) ---------- */
const TKGM = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3/api/idariYapi/";
const slugify = (t) => String(t).replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function centre(geom) {
  let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
  const walk = (c) => { if (typeof c[0] === "number") { if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0]; if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1]; } else c.forEach(walk); };
  try { walk(geom.coordinates); } catch { return [null, null]; }
  return [Math.round(((y0 + y1) / 2) * 1e5) / 1e5, Math.round(((x0 + x1) / 2) * 1e5) / 1e5];
}
async function tkgm(path) {
  const r = await fetch(TKGM + path, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`TKGM ${path}: HTTP ${r.status}`);
  return ((await r.json()).features || []).map((f) => { const [lat, lng] = centre(f.geometry || {}); return { id: f.properties.id, ad: String(f.properties.text).trim(), lat, lng }; });
}
async function insertRows(env, table, cols, rows) {
  const per = Math.max(1, Math.floor(99 / cols.length));
  for (let i = 0; i < rows.length; i += per) {
    const chunk = rows.slice(i, i + per);
    await env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES ` + chunk.map(() => `(${cols.map(() => "?").join(", ")})`).join(", ")).bind(...chunk.flatMap((r) => cols.map((c) => r[c] ?? null))).run();
  }
}
async function geoStep(env) {
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM geo_il").first("n");
  if (!n) { const ils = await tkgm("ilListe"); await insertRows(env, "geo_il", ["id", "ad", "slug", "lat", "lng"], ils.map((i) => ({ ...i, slug: slugify(i.ad) }))); return `iller: ${ils.length}`; }
  const il = await env.DB.prepare("SELECT id, ad FROM geo_il WHERE ilce_done = 0 ORDER BY id LIMIT 1").first();
  if (il) {
    const ilces = await tkgm(`ilceListe/${il.id}`);
    await insertRows(env, "geo_ilce", ["id", "il_id", "ad", "slug", "lat", "lng"], ilces.map((i) => ({ ...i, il_id: il.id, slug: slugify(i.ad) })));
    await env.DB.prepare("UPDATE geo_il SET ilce_done = 1, ilce_count = ?1 WHERE id = ?2").bind(ilces.length, il.id).run();
    return `${il.ad}: ${ilces.length} ilçe`;
  }
  const ilce = await env.DB.prepare("SELECT id, ad FROM geo_ilce WHERE mah_done = 0 ORDER BY id LIMIT 1").first();
  if (!ilce) return "tamam";
  const mahs = await tkgm(`mahalleListe/${ilce.id}`);
  await insertRows(env, "geo_mahalle", ["id", "ilce_id", "ad", "lat", "lng"], mahs.map((m) => ({ ...m, ilce_id: ilce.id })));
  await env.DB.prepare("UPDATE geo_ilce SET mah_done = 1, mah_count = ?1 WHERE id = ?2").bind(mahs.length, ilce.id).run();
  return `${ilce.ad}: ${mahs.length} mahalle`;
}

async function latestNews(env, { cat, limit = 30, offset = 0 } = {}) {
  const q = cat
    ? env.DB.prepare("SELECT * FROM news WHERE category = ?1 ORDER BY published_at DESC LIMIT ?2 OFFSET ?3").bind(cat, limit, offset)
    : env.DB.prepare("SELECT * FROM news ORDER BY published_at DESC LIMIT ?1 OFFSET ?2").bind(limit, offset);
  return (await q.all()).results || [];
}

async function tickerItems(env) {
  const notices = (await env.DB.prepare("SELECT text, url FROM notices WHERE active = 1 ORDER BY sort DESC, id DESC LIMIT 6").all()).results || [];
  if (env.TICKER_AUTO !== "1") return notices.map((n) => ({ ...n, kind: "Topraklık" }));
  const since = new Date(Date.now() - 10 * 864e5).toISOString();
  const grants = (await env.DB.prepare(
    "SELECT title AS text, url FROM news WHERE category = 'hibe' AND published_at > ?1 AND (title LIKE '%başvuru%' OR title LIKE '%Başvuru%' OR title LIKE '%çağrı%' OR title LIKE '%hibe%' OR title LIKE '%Hibe%') ORDER BY published_at DESC LIMIT 4"
  ).bind(since).all()).results || [];
  return [...notices.map((n) => ({ ...n, kind: "Topraklık" })), ...grants.map((g) => ({ ...g, kind: "Hibe" }))];
}

/* ---------- HTML ---------- */
const CSS = `:root{color-scheme:light;--cream:#F6F1E6;--paper:#FFFDF8;--card:#fff;--ink:#26261E;--muted:#5E5A4A;--line:#E6DDCB;--green:#2E5130;--green2:#3F6B3C;--gold:#8A6420;--gold2:#D9B25C;--soft:#F5EAD0;--gsoft:#E3ECDA}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--cream:#13110C;--paper:#1B1812;--card:#211D16;--ink:#EEE7D8;--muted:#B3AA95;--line:#3A3226;--green:#8FC27E;--green2:#6FA05F;--gold:#D3A447;--soft:#3A2E15;--gsoft:#1E2A1B}}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.65 Manrope,"Segoe UI",system-ui,sans-serif}
a{color:var(--green)}img{max-width:100%}
.wrap{max-width:1100px;margin:0 auto;padding:0 16px}
.top{position:sticky;top:0;z-index:20;background:var(--paper);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;gap:18px;min-height:64px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--green);font:700 24px "Playfair Display",Georgia,serif}
.brand img{width:30px;height:auto}
.top nav{display:flex;gap:4px;flex-wrap:wrap;margin-left:auto}
.top nav a{text-decoration:none;color:var(--ink);font-weight:600;font-size:14px;padding:8px 10px;border-radius:8px}
.top nav a:hover,.top nav a[aria-current=page]{background:var(--gsoft);color:var(--green)}
main{padding:28px 0 56px}
.crumb{font-size:13px;color:var(--muted);margin-bottom:10px}.crumb a{color:var(--muted)}
h1{font:600 clamp(28px,4vw,40px)/1.15 "Playfair Display",Georgia,serif;margin:0 0 10px}
h2{font-size:22px;margin:32px 0 10px}h3{font-size:17px;margin:22px 0 6px}
.lead{font-size:18px;color:var(--muted);margin:0 0 24px;max-width:70ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;text-decoration:none;color:var(--ink);display:block}
.card:hover{border-color:var(--gold2)}
.card b{display:block;font-size:16px;margin-bottom:4px}.card span{font-size:14px;color:var(--muted)}
.news{display:grid;gap:10px}
.ni{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.ni a{text-decoration:none;color:var(--ink);font-weight:700;font-size:16px;line-height:1.35}
.ni a:hover{color:var(--green)}
.meta{font-size:13px;color:var(--muted);margin-top:4px}
.tag{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;background:var(--gsoft);color:var(--green);margin-right:6px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}
.tabs a{text-decoration:none;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 14px;font-size:14px;font-weight:700}
.tabs a[aria-current=page]{background:var(--green);border-color:var(--green);color:#fff}
article{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:24px clamp(18px,4vw,36px);max-width:820px}
article table{width:100%;border-collapse:collapse;font-size:15px;margin:12px 0;display:block;overflow-x:auto}
article th,article td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
article th{font-size:13px;color:var(--muted)}
.answer{background:var(--soft);border-radius:12px;padding:14px 16px;font-size:16.5px;margin:0 0 18px}
.note{background:var(--gsoft);border-radius:12px;padding:12px 14px;font-size:14.5px}
.src{font-size:13.5px;color:var(--muted);border-top:1px solid var(--line);margin-top:28px;padding-top:12px}
details{border-bottom:1px solid var(--line);padding:10px 0}summary{font-weight:700;cursor:pointer}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}
aside .card{margin-bottom:12px}
@media (max-width:900px){.layout{grid-template-columns:1fr}}
footer{border-top:1px solid var(--line);background:var(--paper);padding:24px 0;font-size:13.5px;color:var(--muted)}
footer .wrap{display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between}`;

const NAV = [["/", "Ana sayfa"], ["/ihaleler", "İhaleler"], ["/haberler", "Haberler"], ["/rehber", "İhale ve tapu"], ["/hibe", "Hibe ve destek"], ["/il", "İller"], ["/urun", "Ürünler"]];

function page({ title, description, path, body, current, jsonld, noindex }) {
  const url = SITE + path;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${url}">${noindex ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="website"><meta property="og:site_name" content="Topraklık"><meta property="og:locale" content="tr_TR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="theme-color" content="#2E5130">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@400;600;700;800&display=swap">
<style>${CSS}${URUN_CSS}${IHALE_CSS}</style>${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}</head><body>
<header class="top"><div class="wrap"><a class="brand" href="/"><img src="/favicon.svg" alt="" width="30" height="35">Topraklık</a>
<nav aria-label="Ana menü">${NAV.map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav></div></header>
<main class="wrap">${body}</main>
<footer><div class="wrap"><span>© ${new Date().getFullYear()} Topraklık · Toprağa dair ne varsa.</span><span><a href="/yasal">Yasal bilgiler</a> · <a href="mailto:info@topraklik.com">info@topraklik.com</a></span></div></footer>
</body></html>`;
}

const html = (s, status = 200, cache = 300) => new Response(s, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": `public, max-age=${cache}` } });

function newsList(rows) {
  if (!rows.length) return `<p class="note">Haberler toplanıyor, birkaç dakika içinde burada olacak.</p>`;
  return `<div class="news">${rows.map((n) => `<div class="ni"><a href="${esc(n.url)}" target="_blank" rel="noopener nofollow">${esc(n.title)}</a><div class="meta"><span class="tag">${esc(CATS[n.category] || n.category)}</span>${esc(n.source)} · ${esc(ago(n.published_at))}</div></div>`).join("")}</div>`;
}

async function newsPage(env, url) {
  const cat = url.searchParams.get("kategori") || "";
  const p = Math.max(1, parseInt(url.searchParams.get("sayfa") || "1", 10) || 1);
  const rows = await latestNews(env, { cat: CATS[cat] ? cat : "", limit: 40, offset: (p - 1) * 40 });
  const tabs = `<nav class="tabs" aria-label="Kategoriler"><a href="/haberler"${!cat ? ' aria-current="page"' : ""}>Tümü</a>${Object.entries(CATS).map(([k, v]) => `<a href="/haberler?kategori=${k}"${cat === k ? ' aria-current="page"' : ""}>${v}</a>`).join("")}</nav>`;
  const more = rows.length === 40 ? `<p><a href="/haberler?${cat ? `kategori=${cat}&` : ""}sayfa=${p + 1}">Daha eski haberler →</a></p>` : "";
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › Haberler</div><h1>Tarım haberleri</h1>
<p class="lead">Tarım, hibe, fiyat ve arazi gündemi her 2 saatte bir güncellenir. Haberin tamamı için başlığa tıklayın; kaynak sitesinde açılır.</p>${tabs}${newsList(rows)}${more}`;
  return html(page({ title: `${cat ? CATS[cat] + " haberleri" : "Tarım haberleri"} · Topraklık`, description: "Güncel tarım, hibe ve destek, ürün fiyatları ve arazi ihale haberleri tek sayfada.", path: "/haberler" + (cat ? `?kategori=${cat}` : ""), body, current: "/haberler" }), 200, 600);
}

const URUN_KAT = ["Tahıllar", "Baklagiller", "Yağlı tohumlar", "Endüstri bitkileri", "Yem bitkileri", "Sebzeler", "Meyveler", "Sert kabuklular", "Tıbbi ve aromatik bitkiler", "Yeni ve alternatif ürünler"];
async function urunIndex(env) {
  const db = ((await env.DB.prepare("SELECT slug, h1, description, category FROM pages WHERE section = 'urun' AND status = 'published'").all()).results || []).filter((r) => !URUN[r.slug]);
  const rows = [...URUN_LISTE.map((u) => ({ slug: u.slug, h1: u.ad + " yetiştiriciliği", description: u.ozet, category: u.kat })), ...db];
  const by = {}; rows.forEach((r) => (by[r.category || "Diğer"] ||= []).push(r));
  const cats = [...URUN_KAT.filter((k) => by[k]), ...Object.keys(by).filter((k) => !URUN_KAT.includes(k))];
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › Ürün rehberleri</div><h1>Ürün rehberleri: ne, nerede, nasıl yetişir?</h1><p class="lead">${rows.length} ürün için iklim ve toprak isteği, ekim zamanı, bölge bölge ve il il yetiştiricilik bilgisi.</p>
<nav class="tabs" aria-label="Gruplar">${cats.map((k) => `<a href="#${slugify(k)}">${esc(k)}</a>`).join("")}</nav>
${cats.map((k) => `<h2 id="${slugify(k)}">${esc(k)}</h2><div class="grid">${by[k].sort((a, b) => a.h1.localeCompare(b.h1, "tr")).map((r) => `<a class="card" href="/urun/${r.slug}"><b>${esc(r.h1.replace(/ yetiştiriciliği$/, ""))}</b><span>${esc(r.description)}</span></a>`).join("")}</div>`).join("")}`;
  return html(page({ title: "Ürün rehberleri: ne nerede nasıl yetişir? · Topraklık", description: "Tahıl, baklagil, sebze, meyve, sert kabuklu, tıbbi bitki ve yeni ürünler: ekim zamanı, iklim, toprak ve il il yetiştiricilik rehberi.", path: "/urun", body, current: "/urun" }));
}
async function ilUrunleri(env, ilSlug) {
  const db = ((await env.DB.prepare("SELECT u.urun, u.ad, u.durum FROM urun_il u JOIN pages p ON p.section = 'urun' AND p.slug = u.urun AND p.status = 'published' WHERE u.il = ?1").bind(ilSlug).all()).results || []).filter((r) => !URUN[r.urun]);
  return [...urunleriIl(ilSlug), ...db];
}
function urunListHtml(list, title) {
  const y = list.filter((x) => x.durum === "yaygin").sort((a, b) => a.ad.localeCompare(b.ad, "tr")), u = list.filter((x) => x.durum !== "yaygin").sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  if (!y.length && !u.length) return "";
  const chips = (a) => a.map((x) => `<a class="tag" style="text-decoration:none;margin:0 6px 8px 0" href="/urun/${x.urun}">${esc(x.ad)}</a>`).join("");
  return `<h2>${esc(title)}</h2>${y.length ? `<p><b>Yaygın üretilenler:</b></p><p>${chips(y)}</p>` : ""}${u.length ? `<p><b>Yetiştirilebilecekler:</b></p><p>${chips(u)}</p>` : ""}`;
}
async function sectionIndex(env, sec) {
  if (sec === "urun") return urunIndex(env);
  const S = SECTIONS[sec];
  const rows = (await env.DB.prepare("SELECT slug, title, description FROM pages WHERE section = ?1 AND status = 'published' ORDER BY sort, title").bind(sec).all()).results || [];
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › ${esc(S.name)}</div><h1>${esc(S.name)}</h1><p class="lead">${esc(S.lead)}</p>
${rows.length ? `<div class="grid">${rows.map((r) => `<a class="card" href="/${sec}/${r.slug}"><b>${esc(r.title)}</b><span>${esc(r.description)}</span></a>`).join("")}</div>` : `<p class="note">Bu bölümün sayfaları hazırlanıyor.</p>`}`;
  return html(page({ title: `${S.name} · Topraklık`, description: S.lead, path: `/${sec}`, body, current: `/${sec}` }));
}

async function contentPage(env, sec, slug) {
  if (sec === "urun" && URUN[slug]) {
    const u = fiyatUygula(URUN[slug], await urunFiyat(env, slug));
    const related = URUN_LISTE.filter((x) => x.kat === u.kat && x.slug !== slug).slice(0, 14);
    const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/urun">Ürün rehberleri</a> › <a href="/urun#${slugify(u.kat)}">${esc(u.kat)}</a> › ${esc(u.ad)}</div>${urunPage(u, { esc, IL_AD, related })}`;
    return html(page({ title: `${u.title || u.ad + " yetiştiriciliği: nerede, nasıl yetişir, ne kazandırır?"} · Topraklık`, description: u.description || u.ozet, path: `/urun/${slug}`, body, current: "/urun", jsonld: urunJsonLd(u, SITE) }), 200, 1800);
  }
  const r = await env.DB.prepare("SELECT * FROM pages WHERE section = ?1 AND slug = ?2 AND status = 'published'").bind(sec, slug).first();
  if (!r) return null;
  const faq = JSON.parse(r.faq_json || "[]"), sources = JSON.parse(r.sources_json || "[]");
  const related = (await env.DB.prepare("SELECT slug, title FROM pages WHERE section = ?1 AND slug != ?2 AND status = 'published' ORDER BY sort LIMIT 6").bind(sec, slug).all()).results || [];
  const news = await latestNews(env, { cat: sec === "hibe" ? "hibe" : sec === "rehber" ? "arazi" : "gundem", limit: 5 });
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/${sec}">${esc(SECTIONS[sec].name)}</a> › ${esc(r.title)}</div>
<div class="layout"><article><h1>${esc(r.h1 || r.title)}</h1>${r.answer ? `<p class="answer">${esc(r.answer)}</p>` : ""}${r.body_html}
${faq.length ? `<h2>Sık sorulan sorular</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}` : ""}
<div class="src">Son güncelleme: ${esc(trDate(r.updated_at))}${sources.length ? ` · Kaynaklar: ${sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(", ")}` : ""}<br>Bu sayfa bilgilendirme amaçlıdır; işlem yapmadan önce resmî kaynağı kontrol edin.</div></article>
<aside>${related.length ? `<h3>Bu bölümde</h3>${related.map((x) => `<a class="card" href="/${sec}/${x.slug}"><b>${esc(x.title)}</b></a>`).join("")}` : ""}<h3>İlgili haberler</h3>${newsList(news)}</aside></div>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "Article", headline: r.title, description: r.description, dateModified: r.updated_at, inLanguage: "tr", publisher: { "@type": "Organization", name: "Topraklık", url: SITE } }];
  if (faq.length) jsonld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  return html(page({ title: `${r.title} · Topraklık`, description: r.description, path: `/${sec}/${slug}`, body, current: `/${sec}`, jsonld }), 200, 900);
}

/* ---------- il ve ilçe sayfaları ---------- */
const trSort = (a, b) => a.ad.localeCompare(b.ad, "tr");
const mapLink = (lat, lng, z = 11) => lat ? `https://www.google.com/maps/@${lat},${lng},${z}z` : "";
async function newsAbout(env, words, limit = 6) {
  const w = words.filter(Boolean).slice(0, 2);
  if (!w.length) return [];
  return (await env.DB.prepare(`SELECT * FROM news WHERE ${w.map((_, i) => `title LIKE ?${i + 1}`).join(" OR ")} ORDER BY published_at DESC LIMIT ${limit}`).bind(...w.map((x) => `%${x}%`)).all()).results || [];
}
async function ilIndex(env) {
  const rows = ((await env.DB.prepare("SELECT ad, slug, ilce_count FROM geo_il").all()).results || []).sort(trSort);
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › İller</div><h1>İllere göre tarım ve arazi</h1><p class="lead">81 ilin ilçe ve mahalleleri, tarım bilgileri, ihaleleri ve haberleri. İlinizi seçin.</p>
<div class="grid">${rows.map((r) => `<a class="card" href="/il/${r.slug}"><b>${esc(r.ad)}</b><span>${r.ilce_count ? r.ilce_count + " ilçe" : "ilçeler yükleniyor"}</span></a>`).join("")}</div>`;
  return html(page({ title: "İllere göre tarım, arazi ve ihaleler · Topraklık", description: "Türkiye'nin 81 ili: ilçe ve mahalleler, ne ekilir, tarım bilgileri, arazi ihaleleri ve haberler.", path: "/il", body, current: "/il" }));
}
async function ilPage(env, slug) {
  const il = await env.DB.prepare("SELECT * FROM geo_il WHERE slug = ?1").bind(slug).first();
  if (!il) return null;
  const ilces = ((await env.DB.prepare("SELECT ad, slug, mah_count FROM geo_ilce WHERE il_id = ?1").bind(il.id).all()).results || []).sort(trSort);
  const c = await env.DB.prepare("SELECT * FROM pages WHERE section = 'il' AND slug = ?1 AND status = 'published'").bind(slug).first();
  const mahTotal = ilces.reduce((s, x) => s + (x.mah_count || 0), 0);
  const news = await newsAbout(env, [il.ad]);
  const faq = c ? JSON.parse(c.faq_json || "[]") : [], sources = c ? JSON.parse(c.sources_json || "[]") : [];
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/il">İller</a> › ${esc(il.ad)}</div>
<div class="layout"><article><h1>${esc(c?.h1 || `${il.ad} tarım, arazi ve ihale rehberi`)}</h1>${c?.answer ? `<p class="answer">${esc(c.answer)}</p>` : ""}
<p class="note">${esc(il.ad)}: ${ilces.length || "?"} ilçe${mahTotal ? `, ${mahTotal.toLocaleString("tr-TR")} mahalle ve köy` : ""}. ${il.lat ? `<a href="${mapLink(il.lat, il.lng, 9)}" target="_blank" rel="noopener">Haritada gör</a>` : ""}</p>
${c ? c.body_html : `<p>${esc(il.ad)} için iklim, başlıca ürünler ve ne ekilir bilgileri hazırlanıyor. Bu sırada ilçe ve mahalle listesine, arazi ihalelerine ve haberlere aşağıdan ulaşabilirsiniz.</p>`}
${urunListHtml(await ilUrunleri(env, slug), `${il.ad} ilinde yetişen ürünler`)}
<h2>${esc(il.ad)} ilçeleri</h2>${ilces.length ? `<div class="grid">${ilces.map((x) => `<a class="card" href="/il/${slug}/${x.slug}"><b>${esc(x.ad)}</b><span>${x.mah_count != null ? x.mah_count + " mahalle / köy" : "mahalleler yükleniyor"}</span></a>`).join("")}</div>` : `<p>İlçeler yükleniyor.</p>`}
${faq.length ? `<h2>Sık sorulan sorular</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}` : ""}
<div class="src">İdari bölünme: Tapu ve Kadastro Genel Müdürlüğü${sources.length ? " · Kaynaklar: " + sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(", ") : ""}</div></article>
<aside>${await ihaleKutusu(env, { il: slug }, esc)}<h3>Rehberler</h3><a class="card" href="/rehber/icra-ihalesine-nasil-girilir"><b>İcra ihalesine nasıl girilir?</b></a><a class="card" href="/rehber/tarla-alirken-dikkat-edilecekler"><b>Tarla alırken dikkat edilecekler</b></a><a class="card" href="/hibe"><b>Hibe ve destekler</b></a><h3>${esc(il.ad)} haberleri</h3>${newsList(news)}</aside></div>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "Place", name: il.ad, address: { "@type": "PostalAddress", addressRegion: il.ad, addressCountry: "TR" }, ...(il.lat ? { geo: { "@type": "GeoCoordinates", latitude: il.lat, longitude: il.lng } } : {}) }];
  if (faq.length) jsonld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  return html(page({ title: c?.title ? `${c.title} · Topraklık` : `${il.ad} ilçeleri, tarım ve arazi ihaleleri · Topraklık`, description: c?.description || `${il.ad} ilinin ${ilces.length} ilçesi ve mahalleleri, tarım bilgileri, ne ekilir, tarla ve arsa ihaleleri, ${il.ad} tarım haberleri.`, path: `/il/${slug}`, body, current: "/il", jsonld }), 200, 900);
}
async function ilcePage(env, ilSlug, ilceSlug) {
  const il = await env.DB.prepare("SELECT * FROM geo_il WHERE slug = ?1").bind(ilSlug).first();
  if (!il) return null;
  const ilce = await env.DB.prepare("SELECT * FROM geo_ilce WHERE il_id = ?1 AND slug = ?2").bind(il.id, ilceSlug).first();
  if (!ilce) return null;
  const mahs = ((await env.DB.prepare("SELECT ad, lat, lng FROM geo_mahalle WHERE ilce_id = ?1").bind(ilce.id).all()).results || []).sort(trSort);
  const c = await env.DB.prepare("SELECT * FROM pages WHERE section = 'ilce' AND slug = ?1 AND status = 'published'").bind(`${ilSlug}-${ilceSlug}`).first();
  const news = await newsAbout(env, [ilce.ad]);
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/il">İller</a> › <a href="/il/${ilSlug}">${esc(il.ad)}</a> › ${esc(ilce.ad)}</div>
<div class="layout"><article><h1>${esc(c?.h1 || `${ilce.ad} (${il.ad}) mahalleleri, köyleri ve arazileri`)}</h1>${c?.answer ? `<p class="answer">${esc(c.answer)}</p>` : ""}
<p class="note">${esc(ilce.ad)}, ${esc(il.ad)}: ${mahs.length ? mahs.length + " mahalle ve köy" : "mahalle listesi yükleniyor"}. ${ilce.lat ? `<a href="${mapLink(ilce.lat, ilce.lng, 11)}" target="_blank" rel="noopener">Haritada gör</a>` : ""}</p>
${c ? c.body_html : ""}
${urunListHtml(await ilUrunleri(env, ilSlug), `${ilce.ad} ve ${il.ad} çevresinde yetişen ürünler`)}
<p class="note">Ürün seçimi ilçe içinde de rakım, sulama ve toprağa göre değişir; kesin karar için toprak analizi yaptırın ve ilçe tarım müdürlüğüne danışın.</p>
<h2>${esc(ilce.ad)} mahalle ve köyleri</h2>${mahs.length ? `<ul style="columns:3 180px;padding-left:18px">${mahs.map((m) => `<li>${esc(m.ad)}</li>`).join("")}</ul>` : `<p>Liste yükleniyor.</p>`}
<p>Bu ilçedeki bir parseli sorgulamak için <a href="/#harita">3B parsel sorgu</a> aracına ada ve parsel numarasını girin. ${esc(il.ad)} geneli tarım bilgileri için <a href="/il/${ilSlug}">${esc(il.ad)} sayfasına</a> bakın.</p>
<div class="src">İdari bölünme: Tapu ve Kadastro Genel Müdürlüğü</div></article>
<aside>${await ihaleKutusu(env, { il: ilSlug, ilce: ilceSlug }, esc) || await ihaleKutusu(env, { il: ilSlug }, esc)}<h3>${esc(ilce.ad)} ve ${esc(il.ad)} haberleri</h3>${newsList(news.length ? news : await newsAbout(env, [il.ad], 5))}</aside></div>`;
  return html(page({ title: `${ilce.ad} (${il.ad}) mahalleleri, köyleri ve tarla ihaleleri · Topraklık`, description: `${il.ad} ${ilce.ad} ilçesinin ${mahs.length || ""} mahalle ve köyü, haritası, tarım bilgileri ve arazi ihaleleri.`, path: `/il/${ilSlug}/${ilceSlug}`, body, current: "/il" }), 200, 1800);
}

async function sitemap(env) {
  const rows = (await env.DB.prepare("SELECT section, slug, updated_at FROM pages WHERE status = 'published'").all()).results || [];
  const today = new Date().toISOString().slice(0, 10);
  const urls = [["/", today, "1.0"], ["/haberler", today, "0.8"], ...Object.keys(SECTIONS).map((s) => [`/${s}`, today, "0.8"]), ["/yasal", "2026-10-26", "0.2"],
    ...URUN_LISTE.map((u) => [`/urun/${u.slug}`, "2026-10-27", "0.7"]),
    ...rows.filter((r) => r.section !== "il" && r.section !== "ilce" && !(r.section === "urun" && URUN[r.slug])).map((r) => [`/${r.section}/${r.slug}`, (r.updated_at || today).slice(0, 10), "0.7"])];
  const ils = (await env.DB.prepare("SELECT id, slug FROM geo_il").all()).results || [];
  const ilSlug = Object.fromEntries(ils.map((i) => [i.id, i.slug]));
  urls.push(...ils.map((i) => [`/il/${i.slug}`, today, "0.7"]));
  urls.push(...(await ihaleSitemap(env)).map((u) => [u, today, u.includes("/ilan/") ? "0.6" : "0.8"]));
  const ilces = (await env.DB.prepare("SELECT il_id, slug FROM geo_ilce WHERE mah_done = 1").all()).results || [];
  urls.push(...ilces.map((x) => [`/il/${ilSlug[x.il_id]}/${x.slug}`, today, "0.5"]));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, d, pr]) => `  <url><loc>${SITE}${p}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join("\n")}\n</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

/* ---------- ana sayfaya eklenenler ---------- */
const INJECT_CSS = `<style>
.tk-bar{background:#1F3A22;color:#F3EEE2;font:600 13.5px/1 Manrope,"Segoe UI",sans-serif;overflow:hidden;position:relative;z-index:51}
.tk-in{display:flex;align-items:center;gap:0;height:36px;white-space:nowrap}
.tk-lbl{flex:none;background:#B8892E;color:#fff;padding:0 12px;height:36px;display:flex;align-items:center;font-weight:800;letter-spacing:.04em;font-size:12px}
.tk-track{overflow:hidden;flex:1;mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent)}
.tk-move{display:inline-flex;gap:40px;padding-left:24px;animation:tk-scroll var(--tk-dur,40s) linear infinite}
.tk-bar:hover .tk-move,.tk-bar:focus-within .tk-move{animation-play-state:paused}
.tk-move a{color:#F3EEE2;text-decoration:none}.tk-move a:hover{text-decoration:underline}
.tk-move b{color:#D9B25C;margin-right:6px}
@keyframes tk-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.tk-track::-webkit-scrollbar{display:none}.tk-track{scrollbar-width:none}
.tk-rot{display:none;padding-left:16px;overflow:hidden;text-overflow:ellipsis}
.tk-rot a{color:#F3EEE2;text-decoration:none}.tk-rot b{color:#D9B25C;margin-right:6px}
.hero .hero-in .wrap{justify-content:flex-start;padding-top:clamp(28px,5vh,64px);gap:14px}
.hero{height:clamp(640px,48vw,720px)}
.tk-news{padding-block:36px}.tk-news .tk-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.tk-news .tk-item{background:var(--card,#fff);border:1px solid var(--line,#E6DDCB);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}
.tk-news .tk-item a{color:var(--ink,#26261E);text-decoration:none;font-weight:700;line-height:1.35}
.tk-news .tk-item a:hover{color:var(--gold,#B8892E)}
.tk-news .tk-meta{font-size:12.5px;color:var(--muted,#6C6858);margin-top:auto}
.tk-news .tk-cat{font-size:11.5px;font-weight:800;color:var(--green,#2E5130);letter-spacing:.04em;text-transform:uppercase}
@media (max-width:900px){.tk-news .tk-grid{grid-template-columns:1fr 1fr}}@media (max-width:560px){.tk-news .tk-grid{grid-template-columns:1fr}}
</style>`;

function tickerHtml(items) {
  if (!items.length) return "";
  const label = (i) => i.kind && i.kind !== "Topraklık" ? `<b>${esc(i.kind)}</b>` : `<b aria-hidden="true">●</b>`;
  const one = items.map((i) => `<span>${label(i)}${i.url ? `<a href="${esc(i.url)}"${/^https?:/.test(i.url) && !i.url.startsWith(SITE) ? ' target="_blank" rel="noopener nofollow"' : ""}>${esc(i.text)}</a>` : esc(i.text)}</span>`).join("");
  const dur = Math.max(25, items.length * 10);
  return `<div class="tk-bar" role="region" aria-label="Duyurular"><div class="tk-in"><span class="tk-lbl">DUYURU</span><div class="tk-track"><div class="tk-move" style="--tk-dur:${dur}s">${one}<span aria-hidden="true" style="display:contents">${one}</span></div></div><div class="tk-rot" aria-live="off"></div></div></div>`;
}

function newsBoxHtml(rows) {
  if (!rows.length) return "";
  return `<section class="tk-news" id="haberler-kutu"><div class="wrap"><div class="sec-head"><div><h2 class="sec-title">Tarımda bugün</h2><p class="sec-sub">Tarım, hibe, fiyat ve arazi gündemi · her 2 saatte güncellenir</p></div><a class="btn btn-line" href="/haberler">Tüm haberler →</a></div>
<div class="tk-grid">${rows.map((n) => `<div class="tk-item"><span class="tk-cat">${esc(CATS[n.category] || "")}</span><a href="${esc(n.url)}" target="_blank" rel="noopener nofollow">${esc(n.title)}</a><span class="tk-meta">${esc(n.source)} · ${esc(ago(n.published_at))}</span></div>`).join("")}</div></div></section>`;
}

// Site yeniden yüklenene kadar ana sayfa koduna uygulanan küçük düzeltmeler
const PATCHES = [["const kdv=$(\"cKdv\").checked?bid*.2:0,h=bid*.02", "const kdvO=$(\"cKdv\").checked?.2:.1,kdv=bid*kdvO,h=bid*.02"], ["[\"KDV\",kdv],[\"Toplam\",bid+h+d+kdv]]", "[`KDV (%${kdvO*100}${kdvO>.1?\", şartname\":\"\"})`,kdv],[\"Toplam\",bid+h+d+kdv]]"], ["kdv=$(\"cKdv2\").checked?t*.2:0,h=t*.02", "kdvO=$(\"cKdv2\").checked?.2:.1,kdv=t*kdvO,h=t*.02"], ["[\"KDV\",kdv?tl(kdv):\"yok\"]", "[`KDV (%${kdvO*100}${kdvO>.1?\", şartname\":\"\"})`,tl(kdv)]"]];

async function homepage(req, env, originRes) {
  let items = [], news = [];
  let text = await originRes.text();
  for (const [a, b] of PATCHES) text = text.split(a).join(b);
  originRes = new Response(text, { status: originRes.status, headers: originRes.headers });
  let ihl = { rows: [], sayi: {} };
  try { items = await tickerItems(env); news = await latestNews(env, { limit: 6 }); ihl = await ihaleAnaSayfa(env); } catch (e) {}
  const tk = tickerHtml(items), nb = newsBoxHtml(news);
  const ib = ihl.rows.length ? `<section class="tk-news" id="gercek-ihaleler"><div class="wrap"><div class="sec-head"><div><div class="coord">GERÇEK İLANLAR · HER GÜN GÜNCELLENİR</div><h2 class="sec-title">Güncel hazine arazi ihaleleri</h2><div class="sec-sub">Milli Emlak'ın ${(ihl.sayi.satis || 0).toLocaleString("tr-TR")} satış ve ${(ihl.sayi.kira || 0).toLocaleString("tr-TR")} kiralama ilanı; il ve ilçeye göre arayın.</div></div><a class="btn btn-gold" href="/ihaleler">Tüm ihaleler →</a></div><div class="tk-grid">${ihl.rows.map((x) => anaKart(x, esc)).join("")}</div></div></section>` : "";
  const navLinks = `<li><a href="/ihaleler">İhaleler</a></li><li><a href="/haberler">Haberler</a></li><li><a href="/rehber">Rehber</a></li>`;
  const res = new HTMLRewriter()
    .on("head", { element(e) { e.append(INJECT_CSS, { html: true }); } })
    .on("body", { element(e) { if (tk) e.prepend(tk, { html: true }); } })
    .on("header.top .nav ul", { element(e) { e.append(navLinks, { html: true }); } })
    .on("section#ihaleler", { element(e) { if (ib) e.before(ib, { html: true }); if (nb) e.before(nb, { html: true }); } })
    .transform(originRes);
  const h = new Headers(res.headers); h.set("cache-control", "public, max-age=300"); h.delete("content-length");
  return new Response(res.body, { status: res.status, headers: h });
}

async function proxy(req, url) {
  const o = new URL(url.pathname + url.search, ORIGIN);
  return fetch(new Request(o, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual" }));
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (path === "/api/haberler") return Response.json(await latestNews(env, { cat: url.searchParams.get("kategori") || "", limit: 30 }), { headers: { "cache-control": "public, max-age=300" } });
      if (path === "/api/duyurular") return Response.json(await tickerItems(env), { headers: { "cache-control": "public, max-age=300" } });
      if (path === "/haberler") return newsPage(env, url);
      if (path === "/sitemap.xml") return sitemap(env);
      if (path === "/topla/milliemlak.js") return new Response(`const __name = (f) => f;\nreturn (${milliEmlakTopla.toString()})(KEY);`, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store", ...ihaleCors(req) } });
      if (path === "/admin/ihale-yukle") {
        const cors = ihaleCors(req);
        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
        if (req.method !== "POST" || !env.ADMIN_KEY || req.headers.get("x-admin-key") !== env.ADMIN_KEY) return new Response("yetkisiz", { status: 401, headers: cors });
        try { return Response.json(await ihaleYukle(env, await req.json(), slugify), { headers: cors }); } catch (e) { return Response.json({ hata: e.message }, { status: 400, headers: cors }); }
      }
      const ih = path.match(/^\/ihaleler(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?$/);
      if (ih) {
        const ctx = { esc, page, html, IL_URUN: urunleriIl };
        if (ih[1] === "ilan" && ih[2]) { const r = await ihaleDetay(env, ih[2], ctx); if (r) return r; }
        else return ihaleListe(env, url, ctx, ih[1] ? { il: ih[1], ...(ih[2] ? { ilce: ih[2] } : {}) } : {});
      }
      const g = path.match(/^\/il(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?$/);
      if (g) {
        const r = !g[1] ? await ilIndex(env) : g[2] ? await ilcePage(env, g[1], g[2]) : await ilPage(env, g[1]);
        if (r) return r;
      }
      const m = path.match(/^\/(rehber|hibe|il|urun)(?:\/([a-z0-9-]+))?$/);
      if (m) {
        if (!m[2]) return sectionIndex(env, m[1]);
        const r = await contentPage(env, m[1], m[2]);
        if (r) return r;
        return html(page({ title: "Sayfa bulunamadı · Topraklık", description: "", path, body: `<h1>Sayfa bulunamadı</h1><p class="lead">Aradığınız sayfa taşınmış ya da henüz yayında değil.</p><p><a href="/${m[1]}">${esc(SECTIONS[m[1]].name)} →</a></p>` }), 404, 60);
      }
      if (url.pathname.startsWith("/admin/")) {
        if (!env.ADMIN_KEY || req.headers.get("x-admin-key") !== env.ADMIN_KEY) return new Response("yetkisiz", { status: 401 });
        if (url.pathname === "/admin/probe") { const r = await fetch(url.searchParams.get("u"), { headers: { "user-agent": UA } }); const t = await r.text(); return Response.json({ status: r.status, len: t.length, items: (t.match(/<item[ >]/g) || []).length, head: t.slice(0, 300), props: (t.match(/"properties":\{[^}]*\}/g) || []).slice(0, 4), tail: t.slice(-300) }); }
        if (url.pathname === "/admin/geo") return Response.json(await geoStep(env));
        if (url.pathname === "/admin/fiyat") return Response.json(await fiyatAdim(env, parseInt(url.searchParams.get("parca") || "0", 10)));
        if (url.pathname === "/admin/collect") return Response.json(await collectNews(env, parseInt(url.searchParams.get("slot") || "0", 10)));
      }
      const res = await proxy(req, url);
      if (path === "/yasal" && (res.headers.get("content-type") || "").includes("text/html")) { const t = (await res.text()).split('<span class="ph">[Veri sorumlusunun adı soyadı / şirket unvanı]</span>, <span class="ph">[adres]</span>').join("Topraklık Ekibi, Ankara"); return new Response(t, { status: res.status, headers: res.headers }); }
      if (path === "/" && req.method === "GET" && (res.headers.get("content-type") || "").includes("text/html")) return homepage(req, env, res);
      return res;
    } catch (e) {
      return proxy(req, url);
    }
  },
  async scheduled(event, env, ctx) {
    const min = Math.floor(event.scheduledTime / 60000);
    ctx.waitUntil((async () => {
      const gm = min % 1440; // UTC günün dakikası; 241–246 = İstanbul 07:01–07:06
      if (gm >= 241 && gm <= 246) { try { await fiyatAdim(env, gm - 241); } catch (e) { await env.DB.prepare("INSERT INTO runs (at, job, log) VALUES (?1, 'fiyat', ?2)").bind(new Date().toISOString(), e.message).run(); } return; }
      if (min % 30 === 0) await collectNews(env, Math.floor(min / 30));
      else { try { await geoStep(env); } catch (e) { await env.DB.prepare("INSERT INTO runs (at, job, log) VALUES (?1, 'geo', ?2)").bind(new Date().toISOString(), e.message).run(); } }
    })());
  },
};
