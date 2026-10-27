/* Site içi teknik SEO denetimi: sayfalar dışarıya istek atmadan, sitenin kendi işleyicisiyle üretilip incelenir.
 * Haftalık zamanlı görev ve /admin/seo-denetim ile çalışır; sonuç D1'deki seo_denetim tablosuna yazılır ve panelde gösterilir. */

const SITE = "https://topraklik.com";
const SABIT = ["/", "/ihaleler", "/parsel-sorgu", "/haberler", "/urun", "/rehber", "/araclar", "/il", "/hibe", "/hakkimizda", "/iletisim"];

async function q(env, sql, ...b) { try { return (await env.DB.prepare(sql).bind(...b).all()).results || []; } catch (e) { return []; } }
const metin = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const coz = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function incele(yol, html, durum) {
  const b = [];
  const title = coz((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const desc = coz((html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || "").trim();
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1] || "";
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
  const kelime = metin(main).split(" ").length;
  let ld = 0, ldHata = 0;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) { ld++; try { JSON.parse(m[1]); } catch (e) { ldHata++; } }
  const linkler = [...new Set([...main.matchAll(/href="(\/[^"#]*)"/g)].map((m) => coz(m[1])).filter((u) => !/^\/(api|admin|okan|cdn-cgi)|\.(xml|svg|png|jpg|css|js|webmanifest)$/.test(u)))];
  const gorsel = [...main.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const altsiz = gorsel.filter((g) => !/\balt="/.test(g)).length;
  if (durum !== 200) b.push(["kritik", `Sayfa ${durum} döndü`]);
  if (!title) b.push(["kritik", "Başlık (title) yok"]);
  else if (title.length > 70) b.push(["uyari", `Başlık uzun (${title.length} karakter); Google 60–65 karakterden sonrasını keser`]);
  else if (title.length < 25) b.push(["uyari", `Başlık kısa (${title.length} karakter)`]);
  if (!noindex) {
    if (!desc) b.push(["kritik", "Açıklama (meta description) yok"]);
    else if (desc.length > 170) b.push(["bilgi", `Açıklama uzun (${desc.length} karakter)`]);
    else if (desc.length < 60) b.push(["uyari", `Açıklama kısa (${desc.length} karakter)`]);
  }
  if (h1 !== 1) b.push(["uyari", h1 ? `${h1} adet H1 var; bir tane olmalı` : "H1 başlığı yok"]);
  if (!canon) b.push(["uyari", "Kanonik adres (canonical) yok"]);
  else if (canon !== SITE + yol.split("?")[0] && !(yol === "/" && canon === SITE + "/")) b.push(["bilgi", `Kanonik adres farklı: ${canon.replace(SITE, "")}`]);
  if (ldHata) b.push(["kritik", "Yapılandırılmış veri (JSON-LD) bozuk"]);
  if (!noindex && kelime < 250) b.push(["uyari", `İnce içerik: ana bölümde ~${kelime} kelime`]);
  if (altsiz) b.push(["bilgi", `${altsiz} görselde alt metin yok`]);
  return { yol, durum, title, desc, h1, kelime, ld, noindex, linkler, bulgu: b, boyut: html.length };
}

export async function seoDenetim(env, isle) {
  const bugun = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const [ilan, ilce, urun, rehber, haber, il] = await Promise.all([
    q(env, "SELECT id FROM ihale WHERE aktif = 1 AND bitis >= ?1 ORDER BY random() LIMIT 10", bugun),
    q(env, "SELECT i.slug il, c.slug ilce FROM geo_ilce c JOIN geo_il i ON i.id = c.il_id ORDER BY random() LIMIT 10"),
    q(env, "SELECT 1 LIMIT 0"),
    q(env, "SELECT 1 LIMIT 0"),
    q(env, "SELECT id FROM news WHERE alakali = 1 AND ozet IS NOT NULL ORDER BY published_at DESC LIMIT 4"),
    q(env, "SELECT slug FROM geo_il ORDER BY random() LIMIT 3"),
  ]);
  const yollar = [...SABIT, ...ilan.map((r) => `/ihaleler/ilan/${r.id}`), ...ilce.map((r) => `/il/${r.il}/${r.ilce}`), ...haber.map((r) => `/haberler/${r.id}`), ...il.map((r) => `/il/${r.slug}`), "/urun/bugday", "/urun/zeytin", "/urun/findik", "/rehber/hisseli-tapu-nedir", "/rehber/tapu-harci-nedir", "/rehber/icra-ihalesine-nasil-girilir", "/araclar/tapu-harci-hesaplama"];
  const getir = async (yol) => {
    try {
      const r = await isle(new Request(SITE + yol, { headers: { accept: "text/html", "user-agent": "TopraklikSEO/1.0" } }));
      if (!r) return { durum: 0, html: "" };
      const loc = r.headers.get("location");
      return { durum: r.status, html: r.status === 200 ? await r.text() : "", loc };
    } catch (e) { return { durum: 500, html: "" }; }
  };
  const sayfalar = [];
  for (const y of yollar) { const g = await getir(y); sayfalar.push(incele(y, g.html, g.durum)); }
  /* iç bağlantılar: örnek sayfalardaki benzersiz bağlantıların bir kısmı kontrol edilir */
  const tum = [...new Set(sayfalar.flatMap((s) => s.linkler))].filter((u) => !yollar.includes(u));
  const ornek = tum.sort(() => Math.random() - 0.5).slice(0, 60);
  const kirik = [];
  for (const u of ornek) { const g = await getir(u); if (g.durum >= 400 || g.durum === 0) kirik.push({ yol: u, durum: g.durum, kaynak: sayfalar.find((s) => s.linkler.includes(u))?.yol }); }
  /* tekrar eden başlıklar */
  const baslik = {};
  for (const s of sayfalar) if (s.title) (baslik[s.title] ||= []).push(s.yol);
  const tekrar = Object.entries(baslik).filter(([, v]) => v.length > 1).map(([t, v]) => ({ title: t, yollar: v }));
  /* puan: kritik -6, uyarı -2, bilgi -0.5, kırık bağlantı -4, tekrar başlık -3; 100'den düşülür */
  let ceza = 0, say = { kritik: 0, uyari: 0, bilgi: 0 };
  for (const s of sayfalar) for (const [sv] of s.bulgu) { say[sv]++; ceza += sv === "kritik" ? 6 : sv === "uyari" ? 2 : 0.5; }
  ceza += kirik.length * 4 + tekrar.length * 3;
  const puan = Math.max(0, Math.round(100 - ceza / Math.max(1, sayfalar.length / 10)));
  const sonuc = { at: new Date().toISOString(), puan, sayfa: sayfalar.length, kontrolEdilenLink: ornek.length, say, kirik, tekrar,
    sayfalar: sayfalar.map((s) => ({ yol: s.yol, durum: s.durum, title: s.title, tl: s.title.length, dl: s.desc.length, kelime: s.kelime, ld: s.ld, noindex: s.noindex, bulgu: s.bulgu, kb: Math.round(s.boyut / 1024) })) };
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS seo_denetim (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, puan INTEGER, json TEXT)").run();
  await env.DB.prepare("INSERT INTO seo_denetim (at, puan, json) VALUES (?1, ?2, ?3)").bind(sonuc.at, puan, JSON.stringify(sonuc)).run();
  await env.DB.prepare("DELETE FROM seo_denetim WHERE id NOT IN (SELECT id FROM seo_denetim ORDER BY id DESC LIMIT 30)").run();
  return { puan, sayfa: sayfalar.length, say, kirik: kirik.length, tekrar: tekrar.length };
}
