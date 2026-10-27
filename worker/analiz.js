/* Topraklık'ın kendi ziyaret ölçümü (çerezsiz, kişisel veri saklamadan).
 * Sayfa görüntüleme, kaynak (gelenler), ülke, cihaz, saat, tekil ziyaretçi (günlük tuzlu özet), arama motoru botları
 * ve sayfadan yapılan dış tıklamalar/paylaşımlar (gidenler) günlük toplamlar olarak D1'e yazılır. */

const SEMA = [
  "CREATE TABLE IF NOT EXISTS z_yol (gun TEXT, yol TEXT, n INTEGER, PRIMARY KEY (gun, yol))",
  "CREATE TABLE IF NOT EXISTS z_kaynak (gun TEXT, kaynak TEXT, n INTEGER, PRIMARY KEY (gun, kaynak))",
  "CREATE TABLE IF NOT EXISTS z_ulke (gun TEXT, ulke TEXT, n INTEGER, PRIMARY KEY (gun, ulke))",
  "CREATE TABLE IF NOT EXISTS z_cihaz (gun TEXT, cihaz TEXT, n INTEGER, PRIMARY KEY (gun, cihaz))",
  "CREATE TABLE IF NOT EXISTS z_saat (gun TEXT, saat INTEGER, n INTEGER, PRIMARY KEY (gun, saat))",
  "CREATE TABLE IF NOT EXISTS z_tekil (gun TEXT, h TEXT, PRIMARY KEY (gun, h))",
  "CREATE TABLE IF NOT EXISTS z_bot (gun TEXT, bot TEXT, n INTEGER, PRIMARY KEY (gun, bot))",
  "CREATE TABLE IF NOT EXISTS z_olay (gun TEXT, tur TEXT, deger TEXT, n INTEGER, PRIMARY KEY (gun, tur, deger))",
];
export async function analizSema(env) { for (const s of SEMA) await env.DB.prepare(s).run(); }

const BOTLAR = [[/googlebot|google-inspectiontool|adsbot-google|mediapartners-google/i, "Google"], [/bingbot|msnbot/i, "Bing"], [/yandex/i, "Yandex"], [/applebot/i, "Apple"], [/duckduckbot/i, "DuckDuckGo"], [/facebookexternalhit|facebot|meta-externalagent/i, "Facebook önizleme"], [/whatsapp/i, "WhatsApp önizleme"], [/telegrambot/i, "Telegram önizleme"], [/twitterbot/i, "X önizleme"], [/gptbot|chatgpt|oai-searchbot/i, "OpenAI"], [/claudebot|claude-web|anthropic/i, "Anthropic"], [/perplexity/i, "Perplexity"], [/petalbot/i, "Huawei Petal"], [/ahrefs|semrush|mj12|dotbot|bytespider|dataforseo/i, "SEO tarayıcıları"], [/bot|crawl|spider|slurp|preview|fetch|curl|python|go-http|axios|node-fetch|headless/i, "Diğer botlar"]];
const botBul = (ua) => (BOTLAR.find(([r]) => r.test(ua)) || [])[1] || null;

function kaynakBul(ref, url) {
  const utm = url.searchParams.get("utm_source");
  if (utm) return utm.toLowerCase().slice(0, 30);
  if (!ref) return "Doğrudan";
  let h = "";
  try { h = new URL(ref).hostname.replace(/^www\./, ""); } catch { return "Doğrudan"; }
  if (h.endsWith("topraklik.com")) return null; /* site içi gezinme kaynak sayılmaz */
  const E = [[/(^|\.)google\./, "Google"], [/bing\.com/, "Bing"], [/yandex\./, "Yandex"], [/duckduckgo/, "DuckDuckGo"], [/(^|\.)(facebook|fb)\.com|fb\.me/, "Facebook"], [/instagram/, "Instagram"], [/(^|\.)(t\.co|x\.com|twitter\.com)$/, "X (Twitter)"], [/whatsapp|wa\.me/, "WhatsApp"], [/(^|\.)t\.me$|telegram/, "Telegram"], [/youtube|youtu\.be/, "YouTube"], [/linkedin|lnkd\.in/, "LinkedIn"], [/sahibinden/, "Sahibinden"], [/chatgpt|openai/, "ChatGPT"], [/perplexity/, "Perplexity"], [/claude\.ai/, "Claude"]];
  return (E.find(([r]) => r.test(h)) || [])[1] || h.slice(0, 40);
}

function cihazBul(ua) {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android/i.test(ua)) return /iphone/i.test(ua) ? "iPhone" : /android/i.test(ua) ? "Android telefon" : "Mobil";
  return "Bilgisayar";
}

const gunTR = (d = new Date()) => new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10);
const saatTR = (d = new Date()) => new Date(d.getTime() + 3 * 3600e3).getUTCHours();

function yolNormal(p) {
  if (p.length > 120) p = p.slice(0, 120);
  return p;
}

export function sayfaMi(req, path) {
  if (req.method !== "GET") return false;
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return false;
  if (/^\/(api|admin|panel|okan|topla|__|cdn-cgi)(\/|$)/.test(path)) return false;
  const acc = req.headers.get("accept") || "";
  return acc.includes("text/html") || acc === "*/*" || !acc;
}

async function calistir(env, stmts) {
  try { await env.DB.batch(stmts()); }
  catch (e) { if (!/no such table/i.test(e.message)) throw e; await analizSema(env); await env.DB.batch(stmts()); }
}

export async function ziyaretKaydet(req, env, url, path) {
  const ua = req.headers.get("user-agent") || "";
  const gun = gunTR();
  const bot = botBul(ua);
  if (bot) return calistir(env, () => [env.DB.prepare("INSERT INTO z_bot (gun, bot, n) VALUES (?1, ?2, 1) ON CONFLICT(gun, bot) DO UPDATE SET n = n + 1").bind(gun, bot)]);
  const kaynak = kaynakBul(req.headers.get("referer"), url);
  const ulke = (req.cf && req.cf.country) || "??";
  const ip = req.headers.get("cf-connecting-ip") || "";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${gun}|${ip}|${ua}|topraklik`));
  const h = [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  return calistir(env, () => {
    const s = [
      env.DB.prepare("INSERT INTO z_yol (gun, yol, n) VALUES (?1, ?2, 1) ON CONFLICT(gun, yol) DO UPDATE SET n = n + 1").bind(gun, yolNormal(path)),
      env.DB.prepare("INSERT INTO z_ulke (gun, ulke, n) VALUES (?1, ?2, 1) ON CONFLICT(gun, ulke) DO UPDATE SET n = n + 1").bind(gun, ulke),
      env.DB.prepare("INSERT INTO z_cihaz (gun, cihaz, n) VALUES (?1, ?2, 1) ON CONFLICT(gun, cihaz) DO UPDATE SET n = n + 1").bind(gun, cihazBul(ua)),
      env.DB.prepare("INSERT INTO z_saat (gun, saat, n) VALUES (?1, ?2, 1) ON CONFLICT(gun, saat) DO UPDATE SET n = n + 1").bind(gun, saatTR()),
      env.DB.prepare("INSERT OR IGNORE INTO z_tekil (gun, h) VALUES (?1, ?2)").bind(gun, h),
    ];
    if (kaynak) s.push(env.DB.prepare("INSERT INTO z_kaynak (gun, kaynak, n) VALUES (?1, ?2, 1) ON CONFLICT(gun, kaynak) DO UPDATE SET n = n + 1").bind(gun, kaynak));
    return s;
  });
}

/* Sayfadan gelen olay (dış tıklama, paylaşım) */
export async function olayKaydet(req, env) {
  let o = {};
  try { o = JSON.parse((await req.text()).slice(0, 600)); } catch { return new Response(null, { status: 204 }); }
  const tur = String(o.t || "").replace(/[^a-zçğıöşü_-]/gi, "").slice(0, 20), deger = String(o.d || "").slice(0, 80);
  if (!tur || !deger) return new Response(null, { status: 204 });
  if (botBul(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
  await calistir(env, () => [env.DB.prepare("INSERT INTO z_olay (gun, tur, deger, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(gun, tur, deger) DO UPDATE SET n = n + 1").bind(gunTR(), tur, deger)]);
  return new Response(null, { status: 204 });
}

/* Tüm sayfalara eklenen küçük ölçüm betiği: dış bağlantı ve paylaşım tıklamaları */
export const OLAY_JS = `<script>addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a)return;var t,d;if(a.dataset.olay){var p=a.dataset.olay.split(":");t=p[0];d=p[1]}else if(a.host&&a.host!==location.host&&/^https?:/.test(a.href)){t="cikis";d=a.host.replace(/^www\\./,"")}else return;try{navigator.sendBeacon("/api/olay",JSON.stringify({t:t,d:d}))}catch(x){}},true)</script>`;
