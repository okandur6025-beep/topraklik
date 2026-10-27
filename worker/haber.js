/* Haber zenginleştirme ve görünüm.
 * Toplanan her haber için kaynak sayfadan kısa metin alınır, Workers AI ile
 * Topraklık'ın kendi cümleleriyle özet + "neden önemli" notu yazılır.
 * Kaynağın metni ya da görseli sitede yayımlanmaz; yalnız bizim özetimiz ve kaynağa bağlantı. */
import { URUN_LISTE, IL_AD } from "./urun.js";

export const AI_MODEL = "@cf/google/gemma-3-12b-it";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/* ---------- Konu çizimleri (kendi SVG'lerimiz) ---------- */
const S = (d) => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const KONU = {
  tahil: { ad: "Tahıl", r: ["#B8892E", "#E3C46F"], i: S(`<path d="M32 60V14"/><ellipse cx="32" cy="11" rx="3.4" ry="6"/>${[20, 29, 38].map((y) => `<ellipse cx="26" cy="${y}" rx="3.6" ry="7" transform="rotate(-32 26 ${y})"/><ellipse cx="38" cy="${y}" rx="3.6" ry="7" transform="rotate(32 38 ${y})"/>`).join("")}<path d="M32 50c-5-1-9-4-11-8M32 54c5-1 9-4 11-8"/>`) },
  meyve: { ad: "Meyve ve bahçe", r: ["#3F6B2F", "#86AE52"], i: S(`<circle cx="32" cy="26" r="17"/><path d="M32 43v17M24 60h16M32 50l-6-5M32 47l6-5"/><circle cx="25" cy="22" r="2.6" fill="currentColor"/><circle cx="38" cy="29" r="2.6" fill="currentColor"/><circle cx="31" cy="33" r="2.6" fill="currentColor"/><circle cx="37" cy="18" r="2.6" fill="currentColor"/>`) },
  sebze: { ad: "Sebze ve sera", r: ["#A9442E", "#DE8160"], i: S(`<circle cx="32" cy="38" r="18"/><path d="M32 20c-3-3-8-4-12-2 3 1 6 3 7 6M32 20c3-3 8-4 12-2-3 1-6 3-7 6M32 20v-9M32 11c2-2 5-2 7-1"/><path d="M22 34c1-4 4-7 8-8" opacity=".6"/>`) },
  hayvan: { ad: "Hayvancılık", r: ["#6E4F33", "#B08A5E"], i: S(`<path d="M20 24c0-6 5-10 12-10s12 4 12 10v15c0 8-5 13-12 13s-12-5-12-13z"/><path d="M21 19c-5-1-8-4-9-9M43 19c5-1 8-4 9-9M20 27l-9 3 3 4 7-1M44 27l9 3-3 4-7-1"/><ellipse cx="32" cy="45" rx="8" ry="6"/><circle cx="29" cy="45" r="1.2" fill="currentColor"/><circle cx="35" cy="45" r="1.2" fill="currentColor"/><circle cx="26" cy="31" r="1.8" fill="currentColor"/><circle cx="38" cy="31" r="1.8" fill="currentColor"/>`) },
  destek: { ad: "Hibe ve destek", r: ["#2E5130", "#5F8C50"], i: S(`<path d="M32 38V22"/><path d="M32 28c-7 0-11-4-11-11 7 0 11 4 11 11zM32 24c0-7 4-11 11-11 0 7-4 11-11 11z"/><path d="M8 42h9l9 5h11a4 4 0 0 1 0 8H25"/><path d="M37 51l13-7a4 4 0 0 1 5 6L40 60H18l-10-4"/>`) },
  fiyat: { ad: "Fiyat ve piyasa", r: ["#1F4E5F", "#3F8197"], i: S(`<path d="M9 9v46h46"/><path d="M15 45l11-12 9 7 15-19"/><path d="M42 21h8v8"/><circle cx="26" cy="33" r="1.6" fill="currentColor"/><circle cx="35" cy="40" r="1.6" fill="currentColor"/>`) },
  arazi: { ad: "Arazi ve ihale", r: ["#6B4F2A", "#A98450"], i: S(`<path d="M6 46l17-8 18 8 17-8v13l-17 8-18-8-17 8z"/><path d="M23 38v13M41 46v13" opacity=".7"/><path d="M32 36s-10-9-10-17a10 10 0 0 1 20 0c0 8-10 17-10 17z"/><circle cx="32" cy="19" r="3.4"/>`) },
  su: { ad: "Su ve sulama", r: ["#1D5D80", "#4BA3C7"], i: S(`<path d="M32 7C24 19 17 28 17 37a15 15 0 0 0 30 0c0-9-7-18-15-30z"/><path d="M25 39a7 7 0 0 0 7 7"/><path d="M10 58c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 6 2" opacity=".7"/>`) },
  iklim: { ad: "İklim ve hava", r: ["#C46F1B", "#F0B648"], i: S(`<circle cx="24" cy="22" r="8"/><path d="M24 6v4M24 34v1M8 22h4M37 22h3M12.7 10.7l2.8 2.8M33.3 10.7l-2.8 2.8M12.7 33.3l2.8-2.8"/><path d="M24 52h22a8 8 0 0 0 0-16 12 12 0 0 0-22.6 3A6.5 6.5 0 0 0 24 52z"/>`) },
  teknoloji: { ad: "Mekanizasyon ve teknoloji", r: ["#363B55", "#6A7193"], i: S(`<circle cx="21" cy="44" r="11"/><circle cx="21" cy="44" r="3.5"/><circle cx="49" cy="48" r="7"/><path d="M12 34V20h16l5 13h16v11M28 20v13M42 33V24h4"/><path d="M32 44h10"/>`) },
  genel: { ad: "Tarım gündemi", r: ["#2E5130", "#86A35A"], i: S(`<path d="M8 50h48M14 56h36" opacity=".7"/><path d="M32 50V28"/><path d="M32 34c-8 0-13-5-13-13 8 0 13 5 13 13zM32 30c0-8 5-13 13-13 0 8-5 13-13 13z"/>`) },
};
const KONU_TAHMIN = [
  [/buğday|arpa|mısır|hububat|tahıl|çeltik|pirinç|yulaf|TMO/i, "tahil"], [/fındık|zeytin|üzüm|elma|narenciye|portakal|kayısı|incir|fıstık|bahçe|meyve|çay/i, "meyve"],
  [/domates|biber|sera|sebze|patates|soğan|hıyar/i, "sebze"], [/hayvan|süt|et |besi|koyun|keçi|sığır|tavuk|yumurta|arı|bal|yem/i, "hayvan"],
  [/hibe|destek|IPARD|TKDK|kredi|başvuru|ödeme/i, "destek"], [/fiyat|borsa|ihracat|ithalat|piyasa|zam|maliyet|gübre|mazot/i, "fiyat"],
  [/arazi|tarla|arsa|ihale|icra|tapu|milli emlak|hazine|imar|parsel/i, "arazi"], [/su |sulama|baraj|kuraklık|yağış|yeraltı/i, "su"],
  [/iklim|don |sıcak|hava|zirai don|sel|dolu/i, "iklim"], [/traktör|drone|dijital|teknoloji|akıllı|makine|mekanizasyon|Ar-Ge/i, "teknoloji"],
];
export const konuBul = (n) => (KONU[n.konu] ? n.konu : (KONU_TAHMIN.find(([r]) => r.test(n.title || "")) || [])[1] || "genel");

export function haberGorsel(n, sinif = "") {
  const k = KONU[konuBul(n)];
  return `<div class="hb-art ${sinif}" style="--a:${k.r[0]};--b:${k.r[1]}"><span class="hb-ikon">${k.i}</span><span class="hb-konu">${k.ad}</span></div>`;
}

/* ---------- Kaynak sayfadan kısa metin (yalnızca özet yazmak için) ---------- */
async function kaynakMetni(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "tr-TR,tr;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
  if (!r.ok || !(r.headers.get("content-type") || "").includes("html")) return "";
  let aciklama = "", metin = "", cur = "", say = 0;
  await new HTMLRewriter()
    .on("meta", { element(e) { const p = (e.getAttribute("property") || e.getAttribute("name") || "").toLowerCase(); if (!aciklama && /^(og:description|description|twitter:description)$/.test(p)) aciklama = e.getAttribute("content") || ""; } })
    .on("p", {
      element(e) { cur = ""; try { e.onEndTag(() => { const t = cur.replace(/\s+/g, " ").trim(); if (t.length > 60 && metin.length < 3500 && say < 25) { metin += t + "\n"; say++; } }); } catch (x) {} },
      text(t) { if (cur.length < 1200) cur += t.text; },
    })
    .transform(r).arrayBuffer();
  const ac = aciklama.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
  return (ac ? ac + "\n" : "") + metin.replace(/&quot;/g, '"').replace(/&amp;/g, "&").slice(0, 3500);
}

const SISTEM = `Sen Topraklık'ın tarım editörüsün. Okurların çiftçiler, arazi sahipleri ve tarla/arsa almak isteyenler.
Sana bir haberin başlığı ve kaynak metninden parçalar verilecek. YALNIZCA şu JSON nesnesini döndür, başka hiçbir şey yazma:
{"alakali": true veya false, "ozet": "...", "onem": "...", "konu": "...", "urunler": ["..."], "iller": ["..."]}
- alakali: Haber tarım, hayvancılık, gıda üretimi, tarım ürünü fiyatları, tarımsal destek/hibe, kırsal kalkınma, su/sulama, iklimin tarıma etkisi, arazi/tarla/arsa, tapu, imar veya ihale ile ilgiliyse true. Savunma, siyaset, spor, magazin, genel ekonomi, Mısır ülkesi gibi konular ise false.
- ozet: 2-3 cümle. Kendi cümlelerinle yaz, kaynak metinden cümle kopyalama. Kim, ne, nerede, ne zaman ve önemli rakamlar.
- onem: 1-2 cümle. Bu haber çiftçi, üretici veya arazi sahibi/alıcısı için neden önemli, ne yapmalı ya da neye dikkat etmeli. "Okur" veya "okuyucu" deme, doğrudan "çiftçiler", "üreticiler", "arazi alacaklar" gibi yaz.
- konu: şunlardan biri: tahil, meyve, sebze, hayvan, destek, fiyat, arazi, su, iklim, teknoloji, genel
- urunler: metinde geçen tarım ürünleri (ör. "buğday", "fındık"); yoksa [].
- iller: metinde geçen Türkiye illeri (ör. "Konya"); yoksa [].
Kurallar: Metinde olmayan rakam, tarih, kurum veya iddia UYDURMA. Bilgi azsa kısa yaz. Tıklama tuzağı ve abartı dili kullanma. Haber reklam ya da ilan diliyle yazılmışsa sakin ve tarafsız aktar. Türkçe yaz.`;

const trk = (s) => String(s || "").toLocaleLowerCase("tr").replace(/\(.*?\)/g, "").trim();
const URUN_AD = URUN_LISTE.map((u) => [trk(u.ad), u.slug]).sort((a, b) => b[0].length - a[0].length);
const IL_ADLAR = Object.entries(IL_AD).map(([s, a]) => [trk(a), s]);
const urunSlug = (ad) => { const a = trk(ad); return (URUN_AD.find(([n]) => n === a) || URUN_AD.find(([n]) => n.split(" ")[0] === a) || [])[1] || null; };
const ilSlug = (ad) => { const a = trk(ad); return (IL_ADLAR.find(([n]) => n === a) || [])[1] || null; };

export function jsonCoz(t) {
  if (t && typeof t === "object") return t;
  const s = String(t || ""), i = s.indexOf("{"), j = s.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(s.slice(i, j + 1)); } catch { return null; }
}

export async function haberYaz(env, n, model = AI_MODEL) {
  let kaynak = "";
  try { kaynak = await kaynakMetni(n.url); } catch (e) {}
  if (!kaynak && n.summary) kaynak = n.summary;
  const icerik = `Başlık: ${n.title}\nKaynak: ${n.source}\nTarih: ${n.published_at?.slice(0, 10)}\n\nKaynak metinden parçalar:\n${kaynak || "(metin alınamadı; yalnız başlığa dayan, kısa yaz)"}`;
  const r = await env.AI.run(model, { messages: [{ role: "system", content: SISTEM }, { role: "user", content: icerik }], max_tokens: 500, temperature: 0.2 });
  const j = jsonCoz(r?.response ?? r);
  if (!j || typeof j.ozet !== "string") return { hata: "yanıt çözülemedi", ham: String(r?.response ?? "").slice(0, 400), kaynakUzunluk: kaynak.length };
  const urunler = [...new Set((j.urunler || []).map(urunSlug).filter(Boolean))].slice(0, 4);
  const iller = [...new Set((j.iller || []).map(ilSlug).filter(Boolean))].slice(0, 3);
  return { alakali: j.alakali === false ? 0 : 1, ozet: j.ozet.trim().slice(0, 700), onem: String(j.onem || "").trim().slice(0, 500), konu: KONU[j.konu] ? j.konu : konuBul(n), ilgili: JSON.stringify({ u: urunler, i: iller }), kaynakUzunluk: kaynak.length };
}

export const HABER_SEMA = ["ALTER TABLE news ADD COLUMN ozet TEXT", "ALTER TABLE news ADD COLUMN onem TEXT", "ALTER TABLE news ADD COLUMN konu TEXT", "ALTER TABLE news ADD COLUMN ilgili TEXT", "ALTER TABLE news ADD COLUMN alakali INTEGER", "ALTER TABLE news ADD COLUMN islendi INTEGER",
  "CREATE INDEX IF NOT EXISTS news_isle ON news(islendi, published_at)", "CREATE INDEX IF NOT EXISTS news_pub ON news(published_at)", "CREATE INDEX IF NOT EXISTS news_cat ON news(category, published_at)"];
export async function haberSema(env) {
  const out = [];
  for (const s of HABER_SEMA) { try { await env.DB.prepare(s).run(); out.push("ok"); } catch (e) { out.push(e.message.slice(0, 60)); } }
  return out;
}

/* Cron: son 5 günün işlenmemiş haberlerinden en yenileri */
export async function haberAdim(env, adet = 2) {
  if (!env.AI) return ["AI bağlı değil"];
  const rows = (await env.DB.prepare("SELECT id, title, url, source, summary, published_at FROM news WHERE islendi IS NULL AND published_at > ?1 ORDER BY published_at DESC LIMIT ?2").bind(new Date(Date.now() - 5 * 864e5).toISOString(), adet).all()).results || [];
  const log = [];
  for (const n of rows) {
    try {
      const z = await haberYaz(env, n);
      if (z.hata) { await env.DB.prepare("UPDATE news SET islendi = 2 WHERE id = ?1").bind(n.id).run(); log.push(`${n.id}: ${z.hata}`); continue; }
      await env.DB.prepare("UPDATE news SET ozet = ?2, onem = ?3, konu = ?4, ilgili = ?5, alakali = ?6, islendi = 1 WHERE id = ?1").bind(n.id, z.ozet, z.onem, z.konu, z.ilgili, z.alakali).run();
      log.push(`${n.id}: ${z.alakali ? "ok" : "alakasız"}`);
    } catch (e) {
      await env.DB.prepare("UPDATE news SET islendi = 2 WHERE id = ?1").bind(n.id).run();
      log.push(`${n.id}: hata ${e.message.slice(0, 80)}`);
    }
  }
  return log;
}

/* ---------- Görünüm ---------- */
export const HABER_CSS = `
.hb-art{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--a),var(--b));color:#fff;display:flex;align-items:center;justify-content:center;min-height:118px}
.hb-art::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-28deg,rgba(255,255,255,.09) 0 2px,transparent 2px 16px);mask-image:linear-gradient(180deg,transparent 15%,#000 95%)}
.hb-art::after{content:"";position:absolute;width:62%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.12);right:-14%;top:-30%}
.hb-ikon{position:relative;z-index:1;width:58px;height:58px;opacity:.95;filter:drop-shadow(0 2px 6px rgba(0,0,0,.18))}.hb-ikon svg{width:100%;height:100%}
.hb-konu{position:absolute;z-index:1;left:12px;bottom:9px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:rgba(0,0,0,.22);padding:3px 9px;border-radius:999px}
.hb-art.buyuk{min-height:100%}.hb-art.buyuk .hb-ikon{width:110px;height:110px}
.hb-art.serit{min-height:150px;border-radius:14px;margin:0 0 18px}.hb-art.serit .hb-ikon{width:84px;height:84px}
.hb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px;margin:0 0 28px}
.hb-kart{background:var(--card,#fff);border:1px solid var(--line,#E6DDCB);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s}
.hb-kart:hover{transform:translateY(-2px);box-shadow:0 10px 26px -14px rgba(38,38,30,.35)}
.hb-ic{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.hb-ust{display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--muted,#6C6858);flex-wrap:wrap}
.hb-kat{font-weight:800;color:var(--green,#2E5130);background:var(--gsoft,#E7EEDF);border-radius:999px;padding:2px 9px;font-size:11.5px}
.hb-kart h3,.hb-one h2{margin:0;font-size:17px;line-height:1.35}.hb-kart h3 a,.hb-one h2 a{color:var(--ink,#26261E);text-decoration:none}
.hb-kart h3 a:hover,.hb-one h2 a:hover{color:var(--green,#2E5130)}
.hb-ozet{margin:0;font-size:14.5px;line-height:1.55;color:var(--ink,#26261E);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.hb-onem{margin:0;font-size:13.5px;line-height:1.5;background:#FBF3E2;border-left:3px solid var(--gold,#B8892E);border-radius:0 10px 10px 0;padding:8px 10px;color:#4A3E22}
.hb-onem b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#B8892E);margin-bottom:2px}
.hb-alt{margin-top:auto;display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted,#6C6858);padding-top:4px}
.hb-alt a{color:var(--green,#2E5130);font-weight:800;text-decoration:none}
.hb-one{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);background:var(--card,#fff);border:1px solid var(--line,#E6DDCB);border-radius:18px;overflow:hidden;margin:0 0 22px}
.hb-one .hb-ic{padding:22px 24px;gap:10px}.hb-one h2{font-size:clamp(20px,2.4vw,26px);font-family:"Playfair Display",Georgia,serif}
.hb-one .hb-ozet{font-size:16px;-webkit-line-clamp:6}.hb-one .hb-onem{font-size:14.5px}
.hb-etiket{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.08em;color:#fff;background:var(--gold,#B8892E);border-radius:6px;padding:3px 8px;width:max-content}
.hb-basliklar{display:grid;gap:0;border:1px solid var(--line,#E6DDCB);border-radius:14px;background:var(--card,#fff);margin:0 0 24px}
.hb-basliklar a{display:flex;gap:10px;align-items:baseline;padding:11px 14px;border-bottom:1px solid var(--line,#E6DDCB);text-decoration:none;color:var(--ink,#26261E);font-weight:700;font-size:15px}
.hb-basliklar a:last-child{border-bottom:0}.hb-basliklar a:hover{color:var(--green,#2E5130)}.hb-basliklar small{color:var(--muted,#6C6858);font-weight:400;white-space:nowrap;margin-left:auto}
.hb-detay .hb-kutu{background:var(--soft,#F3EEE2);border-radius:14px;padding:16px 18px;margin:0 0 14px;font-size:17px;line-height:1.6}
.hb-detay .hb-kutu b{display:block;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--green,#2E5130);margin-bottom:4px}
.hb-detay .hb-onem{font-size:16px;padding:14px 16px;margin:0 0 18px}
.hb-btn{display:inline-flex;align-items:center;gap:8px;background:var(--green,#2E5130);color:#fff!important;text-decoration:none;font-weight:800;border-radius:12px;padding:12px 18px;margin:6px 0 4px}
.hb-ilgili{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:8px 0 6px}
.hb-ilgili a{display:block;border:1px solid var(--line,#E6DDCB);border-radius:12px;padding:10px 12px;text-decoration:none;color:var(--ink,#26261E);background:var(--card,#fff);font-weight:700;font-size:14.5px}
.hb-ilgili a small{display:block;color:var(--muted,#6C6858);font-weight:400;font-size:12.5px}
@media (max-width:760px){.hb-one{grid-template-columns:1fr}.hb-art.buyuk{min-height:150px}.hb-art.buyuk .hb-ikon{width:80px;height:80px}}`;

const ic = (n) => n.ozet ? `/haberler/${n.id}` : n.url;
const dis = (n) => (n.ozet ? "" : ' target="_blank" rel="noopener nofollow"');

export function haberKart(n, { esc, ago, CATS }) {
  return `<article class="hb-kart">${haberGorsel(n)}<div class="hb-ic"><div class="hb-ust"><span class="hb-kat">${esc(CATS[n.category] || "Gündem")}</span>${esc(ago(n.published_at))}</div>
<h3><a href="${esc(ic(n))}"${dis(n)}>${esc(n.title)}</a></h3>${n.ozet ? `<p class="hb-ozet">${esc(n.ozet)}</p>` : ""}${n.onem ? `<p class="hb-onem"><b>Neden önemli?</b>${esc(n.onem)}</p>` : ""}
<div class="hb-alt"><span>${esc(n.source)}</span>${n.ozet ? `<a href="/haberler/${esc(n.id)}">Devamı →</a>` : `<a href="${esc(n.url)}" target="_blank" rel="noopener nofollow">Kaynakta oku ↗</a>`}</div></div></article>`;
}

export function haberOne(n, { esc, ago, CATS }) {
  return `<article class="hb-one">${haberGorsel(n, "buyuk")}<div class="hb-ic"><span class="hb-etiket">ÖNE ÇIKAN</span><div class="hb-ust"><span class="hb-kat">${esc(CATS[n.category] || "Gündem")}</span>${esc(n.source)} · ${esc(ago(n.published_at))}</div>
<h2><a href="${esc(ic(n))}"${dis(n)}>${esc(n.title)}</a></h2>${n.ozet ? `<p class="hb-ozet">${esc(n.ozet)}</p>` : ""}${n.onem ? `<p class="hb-onem"><b>Neden önemli?</b>${esc(n.onem)}</p>` : ""}
<div class="hb-alt"><span></span>${n.ozet ? `<a href="/haberler/${esc(n.id)}">Haberi oku →</a>` : ""}</div></div></article>`;
}

export function haberBasliklar(rows, { esc, ago }) {
  if (!rows.length) return "";
  return `<div class="hb-basliklar">${rows.map((n) => `<a href="${esc(ic(n))}"${dis(n)}>${esc(n.title)}<small>${esc(n.source)} · ${esc(ago(n.published_at))}</small></a>`).join("")}</div>`;
}

const KONU_LINK = {
  arazi: [["/ihaleler", "Güncel tarla ve arsa ihaleleri", "İcra ve Milli Emlak ilanları"], ["/rehber/arsa-alirken-dikkat-edilecekler", "Arsa alırken dikkat edilecekler", "Rehber"], ["/araclar/icra-ihalesi-maliyet-hesaplama", "İhale maliyet hesaplama", "Araç"]],
  destek: [["/hibe", "Hibe ve destek rehberi", "Kim, nasıl başvurur?"]],
  fiyat: [["/urun", "Ürün fiyatları ve kazanç", "117 ürün"]],
  tahil: [["/urun/bugday", "Buğday rehberi", "Ekim, verim, kazanç"]],
  teknoloji: [["/parsel-sorgu", "3D parsel sorgulama", "Araç"]],
};

export async function haberDetay(env, id, { esc, ago, trDate, CATS, page, html, SITE }) {
  const n = await env.DB.prepare("SELECT * FROM news WHERE id = ?1").bind(id).first();
  if (!n) return null;
  if (!n.ozet) return Response.redirect(n.url, 302);
  let ilg = { u: [], i: [] };
  try { ilg = JSON.parse(n.ilgili || "{}"); } catch {}
  const linkler = [
    ...(ilg.u || []).map((s) => { const u = URUN_LISTE.find((x) => x.slug === s); return u && [`/urun/${s}`, `${u.ad} rehberi`, "Ekim, verim, fiyat, kazanç"]; }).filter(Boolean),
    ...(ilg.i || []).flatMap((s) => IL_AD[s] ? [[`/il/${s}`, `${IL_AD[s]} tarımı`, "İlçeler, ürünler"], [`/ihaleler/${s}`, `${IL_AD[s]} arazi ihaleleri`, "İcra ve hazine ilanları"]] : []),
    ...(KONU_LINK[konuBul(n)] || []),
  ].slice(0, 6);
  const benzer = ((await env.DB.prepare("SELECT id, title, source, url, published_at, category, ozet, onem, konu FROM news WHERE category = ?1 AND id != ?2 AND ozet IS NOT NULL AND alakali = 1 ORDER BY published_at DESC LIMIT 3").bind(n.category, id).all()).results) || [];
  const tarih = trDate(n.published_at);
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/haberler">Haberler</a> › ${esc(CATS[n.category] || "Gündem")}</div>
<div class="layout"><article class="hb-detay">${haberGorsel(n, "serit")}<div class="hb-ust"><span class="hb-kat">${esc(CATS[n.category] || "Gündem")}</span>${esc(n.source)} · ${esc(tarih)}</div>
<h1>${esc(n.title)}</h1>
<div class="hb-kutu"><b>Kısaca</b>${esc(n.ozet)}</div>
${n.onem ? `<p class="hb-onem"><b>Neden önemli?</b>${esc(n.onem)}</p>` : ""}
<a class="hb-btn" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">Haberin tamamı: ${esc(n.source)} ↗</a>
${linkler.length ? `<h2>Topraklık'ta ilgili</h2><div class="hb-ilgili">${linkler.map(([l, t, a]) => `<a href="${esc(l)}">${esc(t)}<small>${esc(a)}</small></a>`).join("")}</div>` : ""}
<p class="src">Bu özet ve değerlendirme, ${esc(n.source)} kaynağındaki habere dayanılarak Topraklık tarafından yapay zekâ desteğiyle hazırlanmıştır. Ayrıntılar ve kesin bilgi için haberin aslını okuyun.</p></article>
<aside><h3>Aynı konudan</h3>${benzer.map((b) => `<a class="card" href="/haberler/${esc(b.id)}"><b>${esc(b.title)}</b><span>${esc(b.source)} · ${esc(ago(b.published_at))}</span></a>`).join("") || `<a class="card" href="/haberler"><b>Tüm haberler →</b></a>`}<a class="card" href="/ihaleler"><b>Güncel ihaleler →</b></a></aside></div>`;
  const jsonld = { "@context": "https://schema.org", "@type": "NewsArticle", headline: n.title.slice(0, 110), datePublished: n.published_at, inLanguage: "tr", description: n.ozet, isBasedOn: n.url, author: { "@type": "Organization", name: "Topraklık" }, publisher: { "@type": "Organization", name: "Topraklık", url: SITE } };
  return html(page({ title: `${n.title} · Topraklık`, description: n.ozet.slice(0, 160), path: `/haberler/${id}`, body, current: "/haberler", jsonld, noindex: !n.alakali }), 200, 3600);
}
