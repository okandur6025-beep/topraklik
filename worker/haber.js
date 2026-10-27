/* Haber zenginleştirme ve görünüm.
 * Toplanan her haber için kaynak sayfadan kısa metin alınır, Workers AI ile
 * Topraklık'ın kendi cümleleriyle özet + "neden önemli" notu yazılır.
 * Kaynağın metni ya da görseli sitede yayımlanmaz; yalnız bizim özetimiz ve kaynağa bağlantı. */
import { URUN_LISTE, IL_AD } from "./urun.js";

export const AI_MODELLER = ["@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/mistralai/mistral-small-3.1-24b-instruct", "@cf/meta/llama-3.1-8b-instruct-fast"];
let calisanModel = null;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

import { KONU, sahne } from "./sahne.js";
import { paylas } from "./ihale.js";
export { KONU };

const KONU_TAHMIN = [
  [/buğday|arpa|mısır|hububat|tahıl|çeltik|pirinç|yulaf|TMO/i, "tahil"], [/fındık|zeytin|üzüm|elma|narenciye|portakal|kayısı|incir|fıstık|bahçe|meyve|çay/i, "meyve"],
  [/domates|biber|sera|sebze|patates|soğan|hıyar/i, "sebze"], [/hayvan|süt|et |besi|koyun|keçi|sığır|tavuk|yumurta|arı|bal|yem/i, "hayvan"],
  [/hibe|destek|IPARD|TKDK|kredi|başvuru|ödeme/i, "destek"], [/fiyat|borsa|ihracat|ithalat|piyasa|zam|maliyet|gübre|mazot/i, "fiyat"],
  [/arazi|tarla|arsa|ihale|icra|tapu|milli emlak|hazine|imar|parsel/i, "arazi"], [/su |sulama|baraj|kuraklık|yağış|yeraltı/i, "su"],
  [/iklim|don |sıcak|hava|zirai don|sel|dolu/i, "iklim"], [/traktör|drone|dijital|teknoloji|akıllı|makine|mekanizasyon|Ar-Ge/i, "teknoloji"],
];
export const konuBul = (n) => (KONU[n.konu] ? n.konu : (KONU_TAHMIN.find(([r]) => r.test(n.title || "")) || [])[1] || "genel");

export function haberGorsel(n, sinif = "") {
  const k = konuBul(n), K = KONU[k];
  return `<div class="hb-art ${sinif}" style="--k:${K.k}">${sahne(k, n.id || n.title)}<span class="hb-konu">${K.ad}</span></div>`;
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
{"alakali": true veya false, "ozet": "...", "maddeler": ["..."], "onem": "...", "kimler": "...", "konu": "...", "urunler": ["..."], "iller": ["..."]}
- alakali: Haber tarım, hayvancılık, gıda üretimi, tarım ürünü fiyatları, tarımsal destek/hibe, kırsal kalkınma, su/sulama, iklimin tarıma etkisi, arazi/tarla/arsa, tapu, imar veya ihale ile ilgiliyse true. Savunma, siyaset, spor, magazin, genel ekonomi, Mısır ülkesi gibi konular ise false.
- ozet: 2-3 cümle. Kendi cümlelerinle yaz, kaynak metinden cümle kopyalama. Kim, ne, nerede, ne zaman ve önemli rakamlar.
- onem: 1-2 cümle. Bu haberin çiftçi, üretici veya arazi sahibi/alıcısı için SOMUT etkisi: fiyata, gelire, maliyete, başvuru tarihine, ödemeye, arazi değerine ya da ekim kararına nasıl yansır; kim etkilenir; neyi takip etmeli veya kontrol etmeli. "Analiz etmeli", "haklarını korumalı", "önlem almalı" gibi genel ve boş tavsiyeler verme. Siyasi görüş, talep veya "devlet şunu yapmalı" türü yorum yazma; tarafsız kal. "Ayrıca" ile başlayan dolgu cümle ekleme. "Okur" deme; "çiftçiler", "üreticiler", "arazi alacaklar" gibi yaz.
- maddeler: 2-4 kısa madde; metindeki en önemli somut bilgiler (rakam, tarih, yer, kurum, son başvuru günü). Her madde en fazla 15 kelime. Somut bilgi yoksa [].
- kimler: Haberden etkilenenler, kısa (ör. "Ege'deki pamuk üreticileri", "Konya'da tarla almak isteyenler"). En fazla 8 kelime.
- konu: şunlardan biri: tahil, meyve, sebze, hayvan, destek, fiyat, arazi, su, iklim, teknoloji, genel
- urunler: metinde geçen tarım ürünleri (ör. "buğday", "fındık"); yoksa [].
- iller: metinde geçen Türkiye illeri (ör. "Konya"); yoksa [].
Konuya göre "onem" ipuçları:
- Arazi/tarla/arsa satış veya ihale haberi: "fırsat", "kaçırmayın", "değerlendirin" gibi satış dili ASLA kullanma. Bunun yerine teklif öncesi neyin kontrol edilmesi gerektiğini yaz: düşük bedelli parseller çoğu zaman küçük, hisseli, yolu olmayan ya da imarsız olur; tapu kaydı, imar durumu, hisse oranı ve şartname incelenmeli; teminat ve ihale tarihi kaçırılmamalı.
- Hibe/destek haberi: kimler başvurabilir, son tarih, destek oranı; başvuru için ne hazırlanmalı.
- Fiyat/piyasa haberi: üreticinin satış ya da ekim kararına, maliyetine etkisi.
- Üretim/hasat haberi: bölge üreticileri için fiyat, rekolte veya ekim planı açısından anlamı.
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

export async function haberYaz(env, n, model) {
  let kaynak = "";
  try { kaynak = await kaynakMetni(n.url); } catch (e) {}
  if (!kaynak && n.summary) kaynak = n.summary;
  const icerik = `Başlık: ${n.title}\nKaynak: ${n.source}\nTarih: ${n.published_at?.slice(0, 10)}\n\nKaynak metinden parçalar:\n${kaynak || "(metin alınamadı; yalnız başlığa dayan, kısa yaz)"}`;
  const sira = model ? [model] : calisanModel ? [calisanModel, ...AI_MODELLER.filter((m) => m !== calisanModel)] : AI_MODELLER;
  let r, sonHata;
  for (const m of sira) {
    try { r = await env.AI.run(m, { messages: [{ role: "system", content: SISTEM }, { role: "user", content: icerik }], max_tokens: 500, temperature: 0.2 }); calisanModel = m; break; }
    catch (e) { sonHata = e; if (!/5018|not allowed|No such model|5007/i.test(e.message)) throw e; }
  }
  if (!r) throw sonHata;
  const j = jsonCoz(r?.response ?? r);
  if (!j || typeof j.ozet !== "string") return { hata: "yanıt çözülemedi", ham: String(r?.response ?? "").slice(0, 400), kaynakUzunluk: kaynak.length };
  const urunler = [...new Set((j.urunler || []).map(urunSlug).filter(Boolean))].slice(0, 4);
  const iller = [...new Set((j.iller || []).map(ilSlug).filter(Boolean))].slice(0, 3);
  return { model: calisanModel, alakali: j.alakali === false ? 0 : 1, ozet: j.ozet.trim().slice(0, 700), maddeler: JSON.stringify((Array.isArray(j.maddeler) ? j.maddeler : []).filter((x) => typeof x === "string" && x.trim()).slice(0, 4).map((x) => x.trim().slice(0, 160))), kimler: String(j.kimler || "").trim().slice(0, 90), onem: String(j.onem || "").trim().slice(0, 500), konu: KONU[j.konu] ? j.konu : konuBul(n), ilgili: JSON.stringify({ u: urunler, i: iller }), kaynakUzunluk: kaynak.length };
}

export const HABER_SEMA = ["ALTER TABLE news ADD COLUMN ozet TEXT", "ALTER TABLE news ADD COLUMN onem TEXT", "ALTER TABLE news ADD COLUMN konu TEXT", "ALTER TABLE news ADD COLUMN ilgili TEXT", "ALTER TABLE news ADD COLUMN alakali INTEGER", "ALTER TABLE news ADD COLUMN islendi INTEGER", "ALTER TABLE news ADD COLUMN maddeler TEXT", "ALTER TABLE news ADD COLUMN kimler TEXT",
  "CREATE INDEX IF NOT EXISTS news_isle ON news(islendi, published_at)", "CREATE INDEX IF NOT EXISTS news_pub ON news(published_at)", "CREATE INDEX IF NOT EXISTS news_cat ON news(category, published_at)"];
export async function haberSema(env) {
  const out = [];
  for (const s of HABER_SEMA) { try { await env.DB.prepare(s).run(); out.push("ok"); } catch (e) { out.push(e.message.slice(0, 60)); } }
  return out;
}

/* Cron: son 5 günün işlenmemiş haberlerinden en yenileri */
export async function haberAdim(env, adet = 2) {
  if (!env.AI) return ["AI bağlı değil"];
  const sec = () => env.DB.prepare("SELECT id, title, url, source, summary, published_at FROM news WHERE islendi IS NULL AND published_at > ?1 ORDER BY published_at DESC LIMIT ?2").bind(new Date(Date.now() - 5 * 864e5).toISOString(), adet).all();
  let res;
  try { res = await sec(); } catch (e) { if (!/no such column/i.test(e.message)) throw e; await haberSema(env); try { res = await sec(); } catch (e2) { return ["şema bekliyor: " + e2.message.slice(0, 80)]; } }
  const rows = res.results || [];
  const log = [];
  for (const n of rows) {
    try {
      const z = await haberYaz(env, n);
      if (z.hata) { await env.DB.prepare("UPDATE news SET islendi = 2 WHERE id = ?1").bind(n.id).run(); log.push(`${n.id}: ${z.hata}`); continue; }
      await env.DB.prepare("UPDATE news SET ozet = ?2, onem = ?3, konu = ?4, ilgili = ?5, alakali = ?6, maddeler = ?7, kimler = ?8, islendi = 1 WHERE id = ?1").bind(n.id, z.ozet, z.onem, z.konu, z.ilgili, z.alakali, z.maddeler, z.kimler).run();
      log.push(`${n.id}: ${z.alakali ? "ok" : "alakasız"}`);
    } catch (e) {
      await env.DB.prepare("UPDATE news SET islendi = 2 WHERE id = ?1").bind(n.id).run();
      log.push(`${n.id}: hata ${e.message.slice(0, 80)}`);
    }
  }
  return log;
}

/* ---------- Görünüm: Topraklık Haber Bülteni ---------- */
const SERIF = `"Playfair Display",Georgia,"Times New Roman",serif`;
export const HABER_CSS = `
article.bt-lead,article.hb-kart,article.bt-yan{background:none;border:0;border-radius:0;padding:0;max-width:none}
.hb-art{position:relative;overflow:hidden;display:block;border-radius:12px;background:#EFE8D8;aspect-ratio:16/10;isolation:isolate}
.hb-art svg{display:block;width:100%;height:100%;transition:transform .5s ease}
a:hover>.hb-art svg,.hb-kart:hover .hb-art svg{transform:scale(1.035)}
.hb-konu{position:absolute;left:10px;bottom:10px;font:800 10.5px/1 Manrope,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--k);background:rgba(255,253,248,.94);padding:6px 10px;border-radius:999px;box-shadow:0 2px 10px -4px rgba(0,0,0,.25)}
.hb-kicker{font:800 11px/1.2 Manrope,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--k,var(--green))}
.hb-zaman{font-size:12.5px;color:var(--muted,#6C6858)}
.hb-ozet{margin:0;font-size:15px;line-height:1.6;color:var(--ink,#26261E)}
.hb-onem{margin:0;font-size:14px;line-height:1.5;background:#FBF3E2;border-left:3px solid var(--gold2,#D9B25C);border-radius:0 10px 10px 0;padding:9px 12px;color:#4A3E22}
.hb-onem b{display:block;font:800 10.5px/1.4 Manrope,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--gold,#8A6420);margin-bottom:3px}
.hb-onem i{display:block;font-style:normal;font-size:12.5px;color:#7A6A44;margin-top:5px}
.bt-mast{text-align:center;border-top:4px double var(--ink,#26261E);border-bottom:1px solid var(--ink,#26261E);padding:10px 0 16px;margin:4px 0 16px}
.bt-satir{display:flex;justify-content:space-between;gap:6px 14px;flex-wrap:wrap;font:800 11px/1.4 Manrope,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#6C6858);border-bottom:1px solid var(--line,#E6DDCB);padding-bottom:8px}
.bt-baslik{font-family:${SERIF};font-weight:700;font-size:clamp(36px,7vw,78px);line-height:1;letter-spacing:-.015em;margin:14px 0 8px;color:var(--ink,#26261E)}
.bt-baslik span{color:var(--green,#2E5130)}.bt-baslik em{font-weight:600}
.bt-alt{font-family:${SERIF};font-style:italic;color:var(--muted,#6C6858);font-size:clamp(15px,1.9vw,19px);margin:0 auto;max-width:56ch}
.bt-mast+.tabs{justify-content:center;margin-bottom:26px}
.bt-ust{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);gap:30px;margin:0 0 34px}
.bt-lead{display:flex;flex-direction:column;gap:12px}
.bt-lead .hb-art{aspect-ratio:16/9;border-radius:16px}
.bt-lead h2{font-family:${SERIF};font-size:clamp(25px,3.3vw,40px);line-height:1.12;margin:0;letter-spacing:-.01em}
.bt-lead h2 a,.hb-kart h3 a,.bt-yan h3 a{color:var(--ink,#26261E);text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 100%/0 1.5px no-repeat;transition:background-size .3s}
.bt-lead h2 a:hover,.hb-kart h3 a:hover,.bt-yan h3 a:hover{background-size:100% 1.5px}
.bt-lead .hb-ozet{font-size:17px;line-height:1.65}
.bt-lead .hb-ozet::first-letter{float:left;font-family:${SERIF};font-size:3.3em;line-height:.82;padding:6px 8px 0 0;color:var(--green,#2E5130)}
.bt-gun{border-left:1px solid var(--line,#E6DDCB);padding-left:26px}
.bt-gun h3{font:800 12px/1.2 Manrope,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--green,#2E5130);margin:0 0 2px}
.bt-gun p.bt-gun-alt{font-family:${SERIF};font-style:italic;color:var(--muted,#6C6858);margin:0 0 6px;font-size:15px}
.bt-gun ol{list-style:none;margin:0;padding:0;counter-reset:b}
.bt-gun li{counter-increment:b;display:grid;grid-template-columns:38px 1fr;gap:4px;padding:13px 0;border-bottom:1px solid var(--line,#E6DDCB)}
.bt-gun li:last-child{border-bottom:0}
.bt-gun li::before{content:counter(b);font-family:${SERIF};font-size:34px;line-height:.95;color:var(--gold2,#D9B25C);font-weight:700}
.bt-gun li a{font-weight:800;color:var(--ink,#26261E);text-decoration:none;line-height:1.32;font-size:15px}.bt-gun li a:hover{color:var(--green,#2E5130)}
.bt-gun li span{display:block;font-size:13.5px;color:var(--muted,#6C6858);margin-top:4px;line-height:1.45}
.bt-bolum{margin:6px 0 36px}
.bt-bas{display:flex;align-items:center;gap:14px;margin:0 0 16px}
.bt-bas h2{margin:0;font-family:${SERIF};font-size:clamp(22px,2.6vw,28px);white-space:nowrap}
.bt-bas::after{content:"";flex:1;border-top:2px solid var(--ink,#26261E)}
.bt-bas a{order:3;font-size:13px;font-weight:800;color:var(--green,#2E5130);text-decoration:none;white-space:nowrap}
.hb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:26px 22px}
.hb-kart{display:flex;flex-direction:column;gap:9px;min-width:0}
.hb-kart h3{font-family:${SERIF};font-size:20px;line-height:1.25;margin:0;letter-spacing:-.005em}
.hb-kart .hb-ozet{font-size:14.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.hb-kart .hb-onem{font-size:13.5px}
.hb-ust{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.hb-alt{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted,#6C6858);margin-top:auto;padding-top:2px}
.hb-alt a{color:var(--green,#2E5130);font-weight:800;text-decoration:none}
.bt-yanlar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin:0 0 36px;padding:22px 0 0;border-top:1px solid var(--line,#E6DDCB)}
.bt-yan{display:grid;grid-template-columns:118px 1fr;gap:14px;align-items:start}
.bt-yan .hb-art{aspect-ratio:1;border-radius:10px}.bt-yan .hb-konu{display:none}
.bt-yan h3{font-family:${SERIF};font-size:17px;line-height:1.3;margin:4px 0 6px}
.bt-yan p{margin:0;font-size:13.5px;color:var(--muted,#6C6858);line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bt-bant{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;background:var(--green,#2E5130);color:#F3EEE2;border-radius:16px;padding:18px 22px;margin:0 0 36px}
.bt-bant b{font-family:${SERIF};font-size:21px;color:#fff;display:block}.bt-bant span{font-size:14px;opacity:.85}
.bt-bant a{background:#D9B25C;color:#26261E;font-weight:800;text-decoration:none;border-radius:10px;padding:11px 16px;white-space:nowrap}
.bt-bant svg{width:44px;height:44px}
.hb-basliklar{display:grid;border-top:2px solid var(--ink,#26261E);margin:0 0 24px}
.hb-basliklar a{display:flex;gap:10px;align-items:baseline;padding:12px 2px;border-bottom:1px solid var(--line,#E6DDCB);text-decoration:none;color:var(--ink,#26261E);font-weight:700;font-size:15px}
.hb-basliklar a:hover{color:var(--green,#2E5130)}.hb-basliklar small{color:var(--muted,#6C6858);font-weight:400;white-space:nowrap;margin-left:auto}
.hb-detay .hb-art{aspect-ratio:21/9;border-radius:16px;margin:0 0 18px}
.hb-detay h1{font-family:${SERIF};font-size:clamp(28px,4.2vw,44px);line-height:1.12;letter-spacing:-.01em;margin:8px 0 10px}
.hb-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13.5px;color:var(--muted,#6C6858);border-bottom:1px solid var(--line,#E6DDCB);padding-bottom:14px;margin-bottom:18px}
.hb-meta b{color:var(--ink,#26261E)}
.hb-lede{font-size:18.5px;line-height:1.7;margin:0 0 20px}
.hb-lede::first-letter{float:left;font-family:${SERIF};font-size:3.5em;line-height:.8;padding:7px 9px 0 0;color:var(--green,#2E5130)}
.hb-maddeler{padding:16px 18px;margin:0 0 20px;background:var(--soft,#F5EAD0);border-radius:14px}.hb-maddeler ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.hb-maddeler li{display:grid;grid-template-columns:22px 1fr;gap:6px;font-size:15.5px;line-height:1.5}
.hb-maddeler li::before{content:"";width:9px;height:9px;border-radius:2px;background:var(--green,#2E5130);transform:rotate(45deg);margin-top:7px}
.hb-maddeler h2{margin:0 0 10px;font:800 11.5px/1.3 Manrope,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--green,#2E5130)}
.hb-detay .hb-onem{font-size:16px;padding:14px 16px;margin:0 0 20px}
.hb-btn{display:inline-flex;align-items:center;gap:8px;background:var(--ink,#26261E);color:#fff!important;text-decoration:none;font-weight:800;border-radius:12px;padding:13px 18px;margin:2px 0 8px}
.hb-btn:hover{background:var(--green,#2E5130)}
.hb-ilgili{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:8px 0 6px}
.hb-ilgili a{display:block;border:1px solid var(--line,#E6DDCB);border-radius:12px;padding:11px 13px;text-decoration:none;color:var(--ink,#26261E);background:var(--card,#fff);font-weight:800;font-size:14.5px}
.hb-ilgili a:hover{border-color:var(--gold2,#D9B25C)}.hb-ilgili a small{display:block;color:var(--muted,#6C6858);font-weight:400;font-size:12.5px;margin-top:2px}
.hb-aside-kart{display:grid;grid-template-columns:72px 1fr;gap:10px;align-items:center;text-decoration:none;color:var(--ink,#26261E);margin:0 0 14px}
.hb-aside-kart .hb-art{aspect-ratio:1;border-radius:9px}.hb-aside-kart .hb-konu{display:none}
.hb-aside-kart b{font-size:14px;line-height:1.3;display:block}.hb-aside-kart small{color:var(--muted,#6C6858);font-size:12px}
@media (max-width:900px){.bt-ust{grid-template-columns:1fr}.bt-gun{border-left:0;padding-left:0;border-top:2px solid var(--ink,#26261E);padding-top:12px}.bt-yanlar{grid-template-columns:1fr}}
@media (max-width:560px){.bt-bant{grid-template-columns:1fr;text-align:left}.bt-bant svg{display:none}.bt-yan{grid-template-columns:92px 1fr}.hb-detay .hb-art{aspect-ratio:16/9}}`;

const ic = (n) => (n.ozet ? `/haberler/${n.id}` : n.url);
const dis = (n) => (n.ozet ? "" : ' target="_blank" rel="noopener nofollow"');
const kk = (n) => KONU[konuBul(n)];
const ilkCumle = (t) => { const m = String(t || "").match(/^(.{30,200}?[.!?])(\s|$)/); return m ? m[1] : String(t || "").slice(0, 160); };
const onemHtml = (n, esc) => (n.onem ? `<p class="hb-onem"><b>Neden önemli?</b>${esc(n.onem)}${n.kimler ? `<i>Kimi ilgilendiriyor: ${esc(n.kimler)}</i>` : ""}</p>` : "");

export function haberKart(n, { esc, ago, CATS }) {
  return `<article class="hb-kart" style="--k:${kk(n).k}"><a href="${esc(ic(n))}"${dis(n)} tabindex="-1" aria-hidden="true">${haberGorsel(n)}</a>
<div class="hb-ust"><span class="hb-kicker">${esc(CATS[n.category] || "Gündem")}</span><span class="hb-zaman">${esc(ago(n.published_at))}</span></div>
<h3><a href="${esc(ic(n))}"${dis(n)}>${esc(n.title)}</a></h3>${n.ozet ? `<p class="hb-ozet">${esc(n.ozet)}</p>` : ""}${onemHtml(n, esc)}
<div class="hb-alt"><span>${esc(n.source)}${n.digerKaynak ? ` ve ${n.digerKaynak.length} kaynak daha` : ""}</span>${n.ozet ? `<a href="/haberler/${esc(n.id)}">Devamı →</a>` : `<a href="${esc(n.url)}" target="_blank" rel="noopener nofollow">Kaynakta oku ↗</a>`}</div></article>`;
}

function yanKart(n, { esc, ago, CATS }) {
  return `<article class="bt-yan" style="--k:${kk(n).k}"><a href="${esc(ic(n))}"${dis(n)} tabindex="-1" aria-hidden="true">${haberGorsel(n)}</a><div><span class="hb-kicker">${esc(CATS[n.category] || "Gündem")}</span><h3><a href="${esc(ic(n))}"${dis(n)}>${esc(n.title)}</a></h3><p>${esc(n.ozet || "")}</p></div></article>`;
}

export function haberBasliklar(rows, { esc, ago }) {
  if (!rows.length) return "";
  return `<div class="hb-basliklar">${rows.map((n) => `<a href="${esc(ic(n))}"${dis(n)}>${esc(n.title)}<small>${esc(n.source)} · ${esc(ago(n.published_at))}</small></a>`).join("")}</div>`;
}

const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export function bultenUst({ esc, CATS, cat, tabs }) {
  const simdi = new Date(), tr = new Date(simdi.getTime() + 3 * 3600e3);
  const tarih = tr.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const sayi = Math.max(1, Math.floor((tr - Date.UTC(2026, 9, 1)) / 864e5) + 1);
  return `<header class="bt-mast"><div class="bt-satir"><span>Sayı ${sayi}</span><span>${esc(tarih)}, ${GUN[tr.getUTCDay()]}</span><span>Her gün güncellenir</span></div>
<h1 class="bt-baslik"><span>Topraklık</span> <em>Haber Bülteni</em></h1><p class="bt-alt">${cat ? esc(CATS[cat]) + " · " : ""}Tarlaya, ürüne ve araziye dair günün haberleri: kısa özet ve sizin için neden önemli olduğu.</p></header>${tabs}`;
}

const BANT_IKON = `<svg viewBox="0 0 64 64" fill="none" stroke="#D9B25C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 46l17-8 18 8 17-8v13l-17 8-18-8-17 8z"/><path d="M32 36s-10-9-10-17a10 10 0 0 1 20 0c0 8-10 17-10 17z"/><circle cx="32" cy="19" r="3.4"/></svg>`;

export function bulten(rows, ctx) {
  const { esc, cat, CATS } = ctx;
  const zengin = rows.filter((n) => n.ozet), yalin = rows.filter((n) => !n.ozet);
  if (!zengin.length) return `${haberBasliklar(yalin, ctx)}`;
  const kullan = new Set();
  const al = (n) => (kullan.add(n), n);
  const lead = al(zengin.find((n) => n.onem && ["arazi", "hibe"].includes(n.category)) || zengin[0]);
  const gun = zengin.filter((n) => n !== lead).slice(0, 5); gun.forEach(al);
  let h = `<section class="bt-ust"><article class="bt-lead" style="--k:${kk(lead).k}"><a href="${esc(ic(lead))}" tabindex="-1" aria-hidden="true">${haberGorsel(lead, "buyuk")}</a>
<div class="hb-ust"><span class="hb-kicker">Manşet · ${esc(CATS[lead.category] || "Gündem")}</span><span class="hb-zaman">${esc(lead.source)} · ${esc(ctx.ago(lead.published_at))}</span></div>
<h2><a href="${esc(ic(lead))}">${esc(lead.title)}</a></h2><p class="hb-ozet">${esc(lead.ozet)}</p>${onemHtml(lead, esc)}<div class="hb-alt"><span></span><a href="/haberler/${esc(lead.id)}">Haberin ayrıntısı →</a></div></article>
${gun.length ? `<aside class="bt-gun"><h3>Bugün 1 dakikada</h3><p class="bt-gun-alt">Günün öne çıkanları, tek cümleyle.</p><ol>${gun.map((n) => `<li><div><a href="${esc(ic(n))}">${esc(n.title)}</a><span>${esc(ilkCumle(n.ozet || n.onem))}</span></div></li>`).join("")}</ol></aside>` : ""}</section>`;
  const kalan = zengin.filter((n) => !kullan.has(n));
  const yan = kalan.slice(0, 3); yan.forEach(al);
  if (yan.length === 3) h += `<section class="bt-yanlar">${yan.map((n) => yanKart(n, ctx)).join("")}</section>`; else yan.forEach((n) => kullan.delete(n));
  if (!cat) {
    h += `<div class="bt-bant">${BANT_IKON}<div><b>Bu haftanın tarla ve arsa ihaleleri</b><span>İcra, sulh hukuk ve Milli Emlak ilanları; il ve ilçeye göre arayın.</span></div><a href="/ihaleler">İhalelere bak →</a></div>`;
    for (const k of ["arazi", "hibe", "piyasa", "gundem"]) {
      const xs = zengin.filter((n) => !kullan.has(n) && n.category === k).slice(0, 6);
      if (!xs.length) continue; xs.forEach(al);
      h += `<section class="bt-bolum"><div class="bt-bas"><h2>${esc(CATS[k])}</h2><a href="/haberler?kategori=${k}">Tümü →</a></div><div class="hb-grid">${xs.map((n) => haberKart(n, ctx)).join("")}</div></section>`;
    }
  } else {
    const xs = zengin.filter((n) => !kullan.has(n)); xs.forEach(al);
    if (xs.length) h += `<section class="bt-bolum"><div class="bt-bas"><h2>Diğer haberler</h2></div><div class="hb-grid">${xs.map((n) => haberKart(n, ctx)).join("")}</div></section>`;
  }
  const geri = zengin.filter((n) => !kullan.has(n));
  if (geri.length) h += `<section class="bt-bolum"><div class="bt-bas"><h2>Daha fazla</h2></div><div class="hb-grid">${geri.map((n) => haberKart(n, ctx)).join("")}</div></section>`;
  if (yalin.length) h += `<section class="bt-bolum"><div class="bt-bas"><h2>Kısa kısa</h2></div>${haberBasliklar(yalin, ctx)}</section>`;
  return h;
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
  let ilg = { u: [], i: [] }, maddeler = [];
  try { ilg = JSON.parse(n.ilgili || "{}"); } catch {}
  try { maddeler = JSON.parse(n.maddeler || "[]"); } catch {}
  const linkler = [
    ...(ilg.u || []).map((s) => { const u = URUN_LISTE.find((x) => x.slug === s); return u && [`/urun/${s}`, `${u.ad} rehberi`, "Ekim, verim, fiyat, kazanç"]; }).filter(Boolean),
    ...(ilg.i || []).flatMap((s) => (IL_AD[s] ? [[`/il/${s}`, `${IL_AD[s]} tarımı`, "İlçeler, ürünler"], [`/ihaleler/${s}`, `${IL_AD[s]} arazi ihaleleri`, "İcra ve hazine ilanları"]] : [])),
    ...(KONU_LINK[konuBul(n)] || []),
  ].slice(0, 6);
  const benzer = ((await env.DB.prepare("SELECT id, title, source, url, published_at, category, ozet, konu FROM news WHERE category = ?1 AND id != ?2 AND ozet IS NOT NULL AND alakali = 1 ORDER BY published_at DESC LIMIT 4").bind(n.category, id).all()).results) || [];
  const sure = Math.max(1, Math.round(((n.ozet || "").length + (n.onem || "").length + maddeler.join(" ").length) / 900));
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › <a href="/haberler">Haber Bülteni</a> › <a href="/haberler?kategori=${esc(n.category)}">${esc(CATS[n.category] || "Gündem")}</a></div>
<div class="layout"><article class="hb-detay" style="--k:${kk(n).k}">${haberGorsel(n, "serit")}<span class="hb-kicker">${esc(CATS[n.category] || "Gündem")}</span>
<h1>${esc(n.title)}</h1>
<div class="hb-meta"><span>Kaynak: <b>${esc(n.source)}</b></span><span>${esc(trDate(n.published_at))}</span><span>${sure} dk okuma</span></div>
<p class="hb-lede">${esc(n.ozet)}</p>
${maddeler.length ? `<section class="hb-maddeler"><h2>Öne çıkan bilgiler</h2><ul>${maddeler.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></section>` : ""}
${onemHtml(n, esc)}
<a class="hb-btn" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">Haberin tamamı: ${esc(n.source)} ↗</a>
${paylas(`${n.title} · Topraklık Haber Bülteni`, `https://topraklik.com/haberler/${n.id}`, esc)}
${linkler.length ? `<h2>Topraklık'ta ilgili</h2><div class="hb-ilgili">${linkler.map(([l, t, a]) => `<a href="${esc(l)}">${esc(t)}<small>${esc(a)}</small></a>`).join("")}</div>` : ""}
<p class="src">Bu özet ve değerlendirme, ${esc(n.source)} kaynağındaki habere dayanılarak Topraklık tarafından yapay zekâ desteğiyle hazırlanmıştır; görsel konuyu temsil eden bir çizimdir. Ayrıntılar ve kesin bilgi için haberin aslını okuyun.</p></article>
<aside><h3>Aynı konudan</h3>${benzer.map((b) => `<a class="hb-aside-kart" href="/haberler/${esc(b.id)}" style="--k:${kk(b).k}">${haberGorsel(b)}<span><b>${esc(b.title)}</b><small>${esc(b.source)} · ${esc(ago(b.published_at))}</small></span></a>`).join("") || `<a class="card" href="/haberler"><b>Tüm haberler →</b></a>`}<a class="card" href="/ihaleler"><b>Güncel ihaleler →</b></a></aside></div>`;
  const jsonld = { "@context": "https://schema.org", "@type": "NewsArticle", headline: n.title.slice(0, 110), datePublished: n.published_at, inLanguage: "tr", description: n.ozet, isBasedOn: n.url, author: { "@type": "Organization", name: "Topraklık" }, publisher: { "@type": "Organization", name: "Topraklık", url: SITE } };
  return html(page({ title: `${n.title} · Topraklık Haber Bülteni`, description: n.ozet.slice(0, 160), path: `/haberler/${id}`, body, current: "/haberler", jsonld, noindex: !n.alakali }), 200, 3600);
}

/* ---------- Tekrar eden haberler ---------- */
const GENEL = new Set(["için", "olarak", "ile", "daha", "kadar", "sonra", "önce", "büyük", "yeni", "oldu", "olan", "geldi", "açıkl", "haber", "devam", "ediyo", "bekle", "belli", "nasıl", "neler", "kimle", "tarla", "arsa", "icrad", "icra", "satış", "satıl", "çıkar", "çıktı", "ihale", "ilanı", "fiyat", "fırsa", "hibe", "deste", "milyo", "çiftç", "üreti", "tarım", "rekol", "hasat", "sezon", "yüzde", "dönüm", "metre", "zaman", "günde", "yüksek", "yükse", "dikka", "sağla", "sahib", "isten", "başla", "verdi", "gerek", "yapıl", "edile", "toplam", "bin", "ton", "kilo", "lira", "adet", "metrekare"].map((w) => w.slice(0, 4)));
const IL_SET = new Set(Object.values(IL_AD).map((a) => trk(a)));
function kokler(t) {
  return [...new Set(String(t || "").toLocaleLowerCase("tr").replace(/[’'`´][a-zçğıöşü]*/g, " ").replace(/[^a-zçğıöşü ]/g, " ").split(/\s+/).filter((w) => w.length >= 3).map((w) => w.slice(0, 4)).filter((w) => !GENEL.has(w)))];
}
function iller(t) { const s = new Set(); for (const w of String(t || "").toLocaleLowerCase("tr").replace(/[’'`´][a-zçğıöşü]*/g, " ").split(/[^a-zçğıöşü]+/)) if (IL_SET.has(w)) s.add(w); return s; }
export function benzerMi(a, b) {
  const ia = iller(a), ib = iller(b);
  if (ia.size && ib.size && ![...ia].some((x) => ib.has(x))) return false;
  const A = kokler(a), B = new Set(kokler(b));
  const ortak = A.filter((w) => B.has(w)).length;
  return ortak >= 2 && ortak / Math.min(A.length, B.size || 1) >= 0.5;
}
/* Aynı olayın kopyalarını birleştir: özetli olan öne geçer, diğer kaynaklar karta not edilir */
export function tekrarAyikla(rows) {
  const n = rows.length, ata = rows.map((_, i) => i);
  const bul = (i) => (ata[i] === i ? i : (ata[i] = bul(ata[i])));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (benzerMi(rows[i].title, rows[j].title)) ata[bul(j)] = bul(i);
  const grup = new Map();
  rows.forEach((r, i) => { const k = bul(i); (grup.get(k) || grup.set(k, []).get(k)).push(r); });
  const ana = new Set();
  for (const g of grup.values()) {
    const sec = g.find((r) => r.ozet) || g[0];
    sec.digerKaynak = g.filter((r) => r !== sec).map((r) => r.source);
    if (!sec.digerKaynak.length) delete sec.digerKaynak;
    ana.add(sec);
  }
  return rows.filter((r) => ana.has(r));
}
