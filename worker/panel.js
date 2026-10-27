/* Yönetim paneli: topraklik.com/okan
 * Giriş: Cloudflare Access (e-posta + tek kullanımlık kod). Worker, Access'in imzaladığı JWT'yi doğrular.
 * Gerekli değişkenler (wrangler.toml [vars]): ACCESS_TEAM = "<takım>.cloudflareaccess.com", ACCESS_AUD = "<uygulama AUD etiketi>".
 * Kimin girebileceği Access politikasında tanımlıdır (e-posta adresi depoda tutulmaz). */

/* ---------- Kimlik doğrulama ---------- */
const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
let sertifika = { at: 0, keys: [] };
export async function erisim(req, env) {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) return { kurulum: true };
  const cerez = (req.headers.get("cookie") || "").match(/CF_Authorization=([^;]+)/);
  const tok = req.headers.get("cf-access-jwt-assertion") || (cerez && cerez[1]);
  if (!tok) return null;
  try {
    const [h, p, s] = tok.split(".");
    const hd = JSON.parse(new TextDecoder().decode(b64(h))), pl = JSON.parse(new TextDecoder().decode(b64(p)));
    if (Date.now() - sertifika.at > 3600e3) { const r = await fetch(`https://${env.ACCESS_TEAM}/cdn-cgi/access/certs`); sertifika = { at: Date.now(), keys: (await r.json()).keys || [] }; }
    const jwk = sertifika.keys.find((k) => k.kid === hd.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64(s), new TextEncoder().encode(`${h}.${p}`));
    const aud = Array.isArray(pl.aud) ? pl.aud : [pl.aud];
    if (!ok || !aud.includes(env.ACCESS_AUD) || pl.exp * 1000 < Date.now() || pl.iss !== `https://${env.ACCESS_TEAM}`) return null;
    return { email: pl.email || "" };
  } catch (e) { return null; }
}

/* ---------- Yardımcılar ---------- */
const nf = (n, d = 0) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: d });
const gunTR = (ofs = 0) => new Date(Date.now() + 3 * 3600e3 - ofs * 864e5).toISOString().slice(0, 10);
const yuzde = (a, b) => (b ? Math.round((a / b) * 100) : 0);
async function q(env, sql, ...b) { try { return (await env.DB.prepare(sql).bind(...b).all()).results || []; } catch (e) { return []; } }
async function bir(env, sql, ...b) { try { return (await env.DB.prepare(sql).bind(...b).first()) || {}; } catch (e) { return {}; } }
const gecen = (iso) => { if (!iso) return "—"; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); if (isNaN(m)) return "—"; if (m < 1) return "az önce"; if (m < 60) return `${m} dk önce`; const h = Math.round(m / 60); if (h < 48) return `${h} saat önce`; return `${Math.round(h / 24)} gün önce`; };

function cizgi(gunler, seriler) {
  const W = 760, H = 220, P = { l: 44, r: 12, t: 14, b: 28 };
  const mx = Math.max(1, ...seriler.flatMap((s) => s.v));
  const x = (i) => P.l + (i * (W - P.l - P.r)) / Math.max(1, gunler.length - 1), y = (v) => H - P.b - (v / mx) * (H - P.t - P.b);
  const izgara = [0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(mx * f)}" y2="${y(mx * f)}" stroke="#E6DDCB"/><text x="${P.l - 6}" y="${y(mx * f) + 4}" text-anchor="end" font-size="11" fill="#6C6858">${nf(mx * f)}</text>`).join("");
  const etk = gunler.map((g, i) => (i % Math.ceil(gunler.length / 8) === 0 || i === gunler.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6C6858">${g.slice(8, 10)}.${g.slice(5, 7)}</text>` : "")).join("");
  const yol = (s) => `<path d="${s.v.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${s.r}" stroke-width="2.5" stroke-linejoin="round"/>` + (s.alan ? `<path d="M${x(0)} ${y(0)} ${s.v.map((v, i) => `L${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")} L${x(s.v.length - 1)} ${y(0)}Z" fill="${s.r}" opacity=".1"/>` : "");
  return `<svg viewBox="0 0 ${W} ${H}" class="pn-grafik" role="img">${izgara}${seriler.map(yol).join("")}${etk}</svg><div class="pn-lejant">${seriler.map((s) => `<span><i style="background:${s.r}"></i>${s.ad}</span>`).join("")}</div>`;
}
function cubuk(satirlar, { bos = "Henüz veri yok", link } = {}) {
  if (!satirlar.length) return `<p class="pn-bos">${bos}</p>`;
  const mx = Math.max(...satirlar.map((r) => r[1]));
  const top = satirlar.reduce((s, r) => s + r[1], 0);
  return `<div class="pn-cubuk">${satirlar.map(([ad, n]) => `<div class="pn-cs"><span class="pn-ad">${link ? `<a href="${ad}" target="_blank">${ad}</a>` : ad}</span><span class="pn-bar"><i style="width:${Math.max(2, (n / mx) * 100)}%"></i></span><b>${nf(n)}</b><small>%${yuzde(n, top)}</small></div>`).join("")}</div>`;
}
const kart = (ad, deger, alt = "", renk = "") => `<div class="pn-kart${renk ? " " + renk : ""}"><small>${ad}</small><b>${deger}</b>${alt ? `<span>${alt}</span>` : ""}</div>`;
const bolum = (baslik, ic, ek = "") => `<section class="pn-bolum"><div class="pn-bb"><h2>${baslik}</h2>${ek}</div>${ic}</section>`;

/* ---------- Site planı ---------- */
const PLAN = {
  kisa: { ad: "Kısa vade · 0–1 ay", hedef: "Site kesintisiz, verisi eksiksiz ve Google'a hazır olsun.", maddeler: [
    ["altyapi", "Ücretli altyapı ve kesintisiz site", "Veritabanı kotası yüzünden sayfalar kapanmasın.", "Kesinti süresi: 0", "tamam"],
    ["parsel", "Gerçek 3B parsel sorgu (TKGM)", "Sitenin en güçlü aracı; insanları getiren ve paylaştıran özellik.", "Günlük parsel sorgusu", "tamam"],
    ["uyap-tum", "UYAP'taki tüm taşınmazlar (ev, işyeri dahil)", "İcradan satılık her şey tek yerde; arama trafiği artar.", "Aktif icra ilanı sayısı", "devam"],
    ["bulten", "Topraklık Haber Bülteni (özet + neden önemli)", "Her gün yeni içerik; Google ve sosyal medya için düzenli sebep.", "Günlük özetlenen haber", "tamam"],
    ["mobil", "Mobil uygulama görünümü ve ana ekrana ekleme", "Ziyaretçilerin çoğu telefondan geliyor.", "Mobil oturum oranı", "tamam"],
    ["panel", "Yönetim paneli (/okan)", "Siteyi tek ekrandan izlemek.", "—", "devam"],
    ["temizlik", "Prototipten kalanların temizliği", "Giriş Yap, sepet ve Tohum & Gübre çalışmıyor; güveni zedeliyor.", "Çalışmayan düğme: 0", "plan"],
    ["search-console", "Google Search Console kaydı ve site haritası", "Google'ın binlerce sayfayı hızla indekslemesi için şart.", "İndekslenen sayfa sayısı", "plan"],
    ["paylasim", "İlan paylaşım düğmeleri ve özel önizleme görseli", "Her paylaşım siteye ücretsiz reklam.", "Haftalık paylaşım tıklaması", "devam"],
    ["drone", "Drone turu videosu (sosyal medya + ilan sitesi sürümü)", "Emlakçıların Topraklık'ı kullanması için güçlü neden.", "Üretilen video sayısı", "plan"],
  ] },
  orta: { ad: "Orta vade · 1–6 ay", hedef: "Kullanıcıyı geri getiren ve rakiplerden ayıran özellikler; ilk gelir.", maddeler: [
    ["alarm", "İhale alarmı (Telegram botu, sonra e-posta)", "İl, ilçe, fiyat, m² seçen kullanıcıya yeni ilan bildirimi; geri dönüşün bir numaralı nedeni.", "Alarm abonesi sayısı", "plan"],
    ["firsat", "Uygun fiyat etiketi (ilçe m² emsali)", "Her ilanın ilçedeki benzerlerine göre ucuz/pahalı olduğunu göster.", "Etiketli ilan oranı", "plan"],
    ["risk", "İlan başına risk kontrolü ve otomatik maliyet", "Hisseli, mirasçı hakkı, KDV, imar, yol; toplam maliyet hesabı hazır gelir.", "Detay sayfasında kalma süresi", "plan"],
    ["ilce-rapor", "İlçe arazi piyasası raporları (970 ilçe)", "\"Beyşehir tarla fiyatları\" gibi aramalarda ilk sayfa.", "İlçe sayfalarından gelen ziyaret", "plan"],
    ["arazini-sat", "\"Arazini satmak mı istiyorsun?\" başvuru formu + ücretsiz değerleme", "Satıcı listesi oluşur; EİDS sonrası ilan altyapısına hazırlık (KVKK metniyle).", "Aylık başvuru", "plan"],
    ["arama", "Hızlı arama (ilan, rehber, haber, parsel)", "Tek kutudan her şey; site içi gezinmeyi artırır.", "Arama kullanım oranı", "plan"],
    ["fiyat-gecmis", "Ürün fiyat geçmişi grafikleri", "Çiftçi için günlük dönüş nedeni.", "Ürün sayfası ziyareti", "plan"],
    ["eposta-bulten", "Haftalık e-posta bülteni", "Kendi kitlemiz; Google'a bağımlılığı azaltır.", "Abone sayısı", "plan"],
    ["vitrin", "Emlakçı vitrini ve öne çıkan ilan (ilk gelir)", "İlçe sayfalarında bölgenin emlakçıları; ücretli öne çıkarma.", "Aylık gelir", "plan"],
    ["rehber-60", "Rehberleri 60+ yapmak, il bazlı tapu/ihale rehberleri", "Uzun kuyruk arama trafiği.", "Rehber sayfası ziyareti", "devam"],
  ] },
  uzun: { ad: "Uzun vade · 6–24 ay", hedef: "Türkiye'nin arazi ve tarım platformu; sürdürülebilir gelir.", maddeler: [
    ["eids", "Şirketleşme + EİDS entegrasyonu → doğrulanmış sahibinden ilanlar", "Yasal ilan platformu olmak; ilan gelirine kapı.", "Doğrulanmış ilan sayısı", "plan"],
    ["uygulama", "App Store ve Google Play uygulaması", "Bildirimler ve kalıcı kullanıcı.", "Aktif uygulama kullanıcısı", "plan"],
    ["uyelik", "Emlakçı, eksper ve yatırımcı üyelikleri (ücretli paketler)", "Logolu drone turu, toplu parsel raporu, alarm sınırsız.", "Ücretli üye", "plan"],
    ["tarlam", "Tarlam: uydu ile tarla izleme (bitki sağlığı, don/dolu uyarısı)", "Çiftçinin her hafta açtığı ekran.", "Kayıtlı tarla sayısı", "plan"],
    ["asistan", "Ekim ve kazanç asistanı (yapay zekâ)", "Parsel + iklim + fiyat ile \"ne ekmeliyim\" önerisi.", "Öneri alan kullanıcı", "plan"],
    ["endeks", "Topraklık arazi fiyat endeksi (il/ilçe)", "Basının ve bankaların kaynak gösterdiği veri; marka gücü.", "Basında anılma", "plan"],
    ["hisseli", "Hisseli arazi birleştirme ve kooperatif pazaryeri", "Hisseli tapu sorununa çözüm; özgün iş modeli.", "Eşleşen hissedar", "plan"],
    ["pazar", "Tohum, gübre ve ekipman ortaklıkları", "\"Tohum & Gübre\" sekmesini gerçek ve gelir getiren hâle getirmek.", "Komisyon geliri", "plan"],
  ] },
};
const DURUM = { tamam: ["Tamam", "pn-yesil"], devam: ["Devam ediyor", "pn-sari"], plan: ["Planlandı", "pn-gri"] };

/* ---------- Bölümler ---------- */
async function ozet(env) {
  const bugun = gunTR(), dun = gunTR(1), g7 = gunTR(6), g30 = gunTR(29);
  const [gor, tek, bot, ilan, haber, uy, hata, yeniIlan] = await Promise.all([
    q(env, "SELECT gun, sum(n) n FROM z_yol WHERE gun >= ?1 GROUP BY gun", g30),
    q(env, "SELECT gun, count(*) n FROM z_tekil WHERE gun >= ?1 GROUP BY gun", g30),
    bir(env, "SELECT sum(CASE WHEN bot = 'Google' THEN n ELSE 0 END) g, sum(n) t FROM z_bot WHERE gun = ?1", bugun),
    q(env, "SELECT kaynak, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 GROUP BY kaynak", bugun),
    bir(env, "SELECT count(*) t, sum(CASE WHEN ozet IS NOT NULL AND alakali = 1 THEN 1 ELSE 0 END) o FROM news WHERE published_at >= ?1", new Date(Date.now() - 864e5).toISOString()),
    bir(env, "SELECT v FROM durum WHERE k = 'uyap'"),
    bir(env, "SELECT count(*) n FROM runs WHERE at >= ?1 AND ((job IN ('uyap','haber','geo','bik','fiyat','news') AND (job != 'news' OR log LIKE '%hata%')) OR log LIKE '%HTTP 4%' OR log LIKE '%HTTP 5%' OR log LIKE '%rror%' OR log LIKE '%exceeded%')", new Date(Date.now() - 864e5).toISOString()),
    bir(env, "SELECT count(*) n FROM ihale WHERE ilk_gorulme >= ?1", new Date(Date.now() - 864e5).toISOString()),
  ]);
  const gunler = Array.from({ length: 30 }, (_, i) => gunTR(29 - i));
  const gm = Object.fromEntries(gor.map((r) => [r.gun, r.n])), tm = Object.fromEntries(tek.map((r) => [r.gun, r.n]));
  const top = (m, from) => gunler.filter((g) => g >= from).reduce((s, g) => s + (m[g] || 0), 0);
  const ik = Object.fromEntries(ilan.map((r) => [r.kaynak, r.n]));
  let uyd = {}; try { uyd = JSON.parse(uy.v || "{}"); } catch {}
  const fark = (gm[bugun] || 0) - (gm[dun] || 0);
  return bolum("Bugün", `<div class="pn-kartlar">
${kart("Sayfa görüntüleme", nf(gm[bugun] || 0), `dün ${nf(gm[dun] || 0)} · ${fark >= 0 ? "▲" : "▼"} ${nf(Math.abs(fark))}`)}
${kart("Tekil ziyaretçi", nf(tm[bugun] || 0), `dün ${nf(tm[dun] || 0)}`)}
${kart("Son 7 gün", nf(top(gm, g7)), `${nf(top(tm, g7))} tekil`)}
${kart("Son 30 gün", nf(top(gm, g30)), `${nf(top(tm, g30))} tekil`)}
${kart("Google taraması (bugün)", nf(bot.g || 0), `tüm botlar ${nf(bot.t || 0)}`)}
${kart("Aktif ilan", nf((ik.bik || 0) + (ik.uyap || 0) + (ik.milliemlak || 0)), `icra ${nf((ik.bik || 0) + (ik.uyap || 0))} · hazine ${nf(ik.milliemlak || 0)}`)}
${kart("Son 24 saatte yeni ilan", nf(yeniIlan.n || 0))}
${kart("Son 24 saat haber", nf(haber.t || 0), `${nf(haber.o || 0)} özetlendi`)}
${kart("UYAP taraması", `${nf(uyd.skip || 0)}. ilan`, `tur ${uyd.tur || 0}`)}
${kart("Son 24 saatte hata", nf(hata.n || 0), hata.n ? "Ajanlar sekmesine bakın" : "sorun yok", hata.n ? "pn-uyari" : "")}
</div>`) + bolum("Son 30 gün ziyaret", cizgi(gunler, [{ ad: "Sayfa görüntüleme", r: "#2E5130", v: gunler.map((g) => gm[g] || 0), alan: true }, { ad: "Tekil ziyaretçi", r: "#B8892E", v: gunler.map((g) => tm[g] || 0) }]));
}

async function trafik(env, aralik) {
  const bas = gunTR(aralik - 1);
  const [yol, kay, ulke, cihaz, saat, cikis, paylas, bot] = await Promise.all([
    q(env, "SELECT yol, sum(n) n FROM z_yol WHERE gun >= ?1 GROUP BY yol ORDER BY n DESC LIMIT 400", bas),
    q(env, "SELECT kaynak, sum(n) n FROM z_kaynak WHERE gun >= ?1 GROUP BY kaynak ORDER BY n DESC LIMIT 20", bas),
    q(env, "SELECT ulke, sum(n) n FROM z_ulke WHERE gun >= ?1 GROUP BY ulke ORDER BY n DESC LIMIT 12", bas),
    q(env, "SELECT cihaz, sum(n) n FROM z_cihaz WHERE gun >= ?1 GROUP BY cihaz ORDER BY n DESC", bas),
    q(env, "SELECT saat, sum(n) n FROM z_saat WHERE gun >= ?1 GROUP BY saat", bas),
    q(env, "SELECT deger, sum(n) n FROM z_olay WHERE gun >= ?1 AND tur = 'cikis' GROUP BY deger ORDER BY n DESC LIMIT 15", bas),
    q(env, "SELECT deger, sum(n) n FROM z_olay WHERE gun >= ?1 AND tur = 'paylas' GROUP BY deger ORDER BY n DESC", bas),
    q(env, "SELECT bot, sum(n) n FROM z_bot WHERE gun >= ?1 GROUP BY bot ORDER BY n DESC", bas),
  ]);
  const GRUP = [[/^\/$/, "Ana sayfa"], [/^\/ihaleler\/ilan\//, "İlan detayları"], [/^\/ihaleler/, "İhale listeleri"], [/^\/parsel-sorgu/, "Parsel sorgu"], [/^\/haberler\//, "Haber detayları"], [/^\/haberler/, "Haber Bülteni"], [/^\/urun/, "Ürün sayfaları"], [/^\/il\/[^/]+\/[^/]+/, "İlçe sayfaları"], [/^\/il/, "İl sayfaları"], [/^\/rehber/, "Rehberler"], [/^\/hibe/, "Hibe ve destek"], [/^\/araclar/, "Araçlar"]];
  const g = {}; yol.forEach((r) => { const k = (GRUP.find(([re]) => re.test(r.yol)) || [0, "Diğer"])[1]; g[k] = (g[k] || 0) + r.n; });
  const sm = Object.fromEntries(saat.map((r) => [r.saat, r.n]));
  const smx = Math.max(1, ...Object.values(sm));
  const saatG = `<div class="pn-saat">${Array.from({ length: 24 }, (_, h) => `<div title="${h}:00 · ${nf(sm[h] || 0)}"><i style="height:${Math.max(2, ((sm[h] || 0) / smx) * 100)}%"></i><small>${h % 3 === 0 ? h : ""}</small></div>`).join("")}</div>`;
  const ULKE = { TR: "Türkiye", DE: "Almanya", NL: "Hollanda", US: "ABD", GB: "Birleşik Krallık", FR: "Fransa", AZ: "Azerbaycan", CY: "Kıbrıs", BE: "Belçika", AT: "Avusturya", "??": "Bilinmiyor" };
  const ara = `<div class="pn-aralik">${[[1, "Bugün"], [7, "7 gün"], [30, "30 gün"], [90, "90 gün"]].map(([d, t]) => `<a href="/okan?b=trafik&g=${d}"${d === aralik ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</div>`;
  return bolum("Trafik", ara + `<div class="pn-iki">${bolum("Bölümlere göre", cubuk(Object.entries(g).sort((a, b) => b[1] - a[1])))}${bolum("Gelenler (kaynak)", cubuk(kay.map((r) => [r.kaynak, r.n]), { bos: "Henüz dışarıdan gelen ziyaret kaydı yok" }))}</div>
<div class="pn-iki">${bolum("En çok ziyaret edilen sayfalar", cubuk(yol.slice(0, 20).map((r) => [r.yol, r.n]), { link: true }))}${bolum("Gidenler (dış bağlantı tıklamaları)", cubuk(cikis.map((r) => [r.deger, r.n]), { bos: "Henüz dış tıklama yok" }) + `<h3>Paylaşımlar</h3>` + cubuk(paylas.map((r) => [r.deger, r.n]), { bos: "Henüz paylaşım yok" }))}</div>
<div class="pn-iki">${bolum("Cihaz", cubuk(cihaz.map((r) => [r.cihaz, r.n])))}${bolum("Ülke", cubuk(ulke.map((r) => [ULKE[r.ulke] || r.ulke, r.n])))}</div>
${bolum("Saatlere göre ziyaret (Türkiye saati)", saatG)}
${bolum("Arama motorları ve botlar", cubuk(bot.map((r) => [r.bot, r.n]), { bos: "Henüz bot ziyareti yok" }) + `<p class="pn-not">Bot ziyaretleri ziyaretçi sayısına katılmaz. Google'ın düzenli gelmesi sayfaların indekslendiğinin işaretidir.</p>`)}`);
}

async function ilanlar(env) {
  const bugun = gunTR();
  const [kaynak, cins, tur, il, yeni, haber, icerik, geo, sayfa, uretim] = await Promise.all([
    q(env, "SELECT kaynak, tip, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 GROUP BY kaynak, tip ORDER BY n DESC", bugun),
    q(env, "SELECT coalesce(cins, '—') cins, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 GROUP BY cins ORDER BY n DESC", bugun),
    q(env, "SELECT coalesce(satis_turu, '—') t, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 GROUP BY satis_turu ORDER BY n DESC", bugun),
    q(env, "SELECT il, count(*) n FROM ihale WHERE aktif = 1 AND bitis >= ?1 GROUP BY il ORDER BY n DESC LIMIT 12", bugun),
    q(env, "SELECT id, il, ilce, cins, m2, bedel, kaynak, ilk_gorulme FROM ihale WHERE aktif = 1 ORDER BY ilk_gorulme DESC LIMIT 10"),
    bir(env, "SELECT count(*) t, sum(CASE WHEN ozet IS NOT NULL THEN 1 ELSE 0 END) o, sum(CASE WHEN alakali = 0 THEN 1 ELSE 0 END) a FROM news"),
    q(env, "SELECT section, status, count(*) n FROM pages GROUP BY section, status"),
    bir(env, "SELECT (SELECT count(*) FROM geo_il) il, (SELECT count(*) FROM geo_ilce) ilce, (SELECT count(*) FROM geo_mahalle) mah, (SELECT count(*) FROM geo_ilce WHERE mah_done = 1) ilce_tamam"),
    bir(env, "SELECT count(*) n FROM uyap_gorulen"),
    bir(env, "SELECT count(*) n, count(DISTINCT il_slug || ilce_slug) ilce FROM ilce_uretim"),
  ]);
  const KA = { bik: "BİK icra", uyap: "UYAP e-Satış", milliemlak: "Milli Emlak" }, TI = { satis: "satış", kira: "kira" };
  const TUR = { icra: "İcra dairesi", sulh: "Sulh hukuk", iflas: "İflas", mahkeme: "Diğer mahkeme", hazine: "Hazine" };
  const tl = (n) => (n ? nf(n) + " ₺" : "—");
  return bolum("İlanlar", `<div class="pn-iki">${bolum("Kaynağa göre aktif ilan", cubuk(kaynak.map((r) => [`${KA[r.kaynak] || r.kaynak} · ${TI[r.tip] || r.tip}`, r.n])))}${bolum("Taşınmaz cinsi", cubuk(cins.map((r) => [r.cins, r.n])))}</div>
<div class="pn-iki">${bolum("Satış türü", cubuk(tur.map((r) => [TUR[r.t] || r.t, r.n])))}${bolum("En çok ilan olan iller", cubuk(il.map((r) => [r.il, r.n])))}</div>
${bolum("Son eklenen ilanlar", `<div class="pn-tablo"><table><thead><tr><th>Ne zaman</th><th>Yer</th><th>Cins</th><th>m²</th><th>Bedel</th><th>Kaynak</th></tr></thead><tbody>${yeni.map((r) => `<tr><td>${gecen(r.ilk_gorulme)}</td><td><a href="/ihaleler/ilan/${r.id}" target="_blank">${r.il} / ${r.ilce}</a></td><td>${r.cins || ""}</td><td>${nf(r.m2)}</td><td>${tl(r.bedel)}</td><td>${KA[r.kaynak] || r.kaynak}</td></tr>`).join("")}</tbody></table></div>`)}`)
    + bolum("İçerik ve veri", `<div class="pn-kartlar">
${kart("Haber (toplam)", nf(haber.t), `${nf(haber.o)} özetli · ${nf(haber.a)} ilgisiz elendi`)}
${kart("UYAP okunan ilan", nf(sayfa.n))}
${kart("İl / ilçe / mahalle", `${nf(geo.il)} / ${nf(geo.ilce)}`, `${nf(geo.mah)} mahalle · ${nf(geo.ilce_tamam)} ilçe tamam`)}
${kart("TÜİK ilçe üretim", nf(uretim.n), `${nf(uretim.ilce)} ilçe`)}
${kart("Ürün rehberi", "117")}
${kart("Tapu ve ihale rehberi", "23+")}
</div>${cubuk(icerik.map((r) => [`${r.section} · ${r.status === "published" ? "yayında" : r.status === "draft" ? "taslak" : r.status}`, r.n]), { bos: "Veritabanında sayfa yok" })}`);
}

const AJANLAR = [
  ["news", "Haber toplayıcı", "Tarım, hibe, fiyat ve arazi haberlerini kaynaklardan toplar.", "30 dakikada bir"],
  ["haber", "Haber editörü (yapay zekâ)", "Her habere özet, öne çıkan bilgiler ve \"neden önemli\" yazar; ilgisizleri eler.", "4 dakikada bir"],
  ["uyap", "UYAP e-Satış tarayıcı", "İcradan satılık tüm taşınmazları ilan.gov.tr'den okur.", "2 dakikada bir"],
  ["bik", "BİK icra ilanları", "Basın İlan Kurumu tarla ve arsa icra ilanlarını tarar, kalkanları kapatır.", "Her gece 04:00–04:40"],
  ["bik-dogrula", "İlan doğrulayıcı", "BİK ilanlarının tam metnini okuyup bedel, alan, hisse, KDV ve artırma tarihlerini doğrular.", "2 dakikada bir"],
  ["fiyat", "Fiyat toplayıcı", "TOBB borsaları ve İzmir hali fiyatlarını günceller.", "Her sabah 07:01"],
  ["geo", "Mahalle listesi", "TKGM'den il, ilçe, mahalle listesini tamamlar.", "10 dakikada bir"],
];

async function ajanlar(env) {
  const [durum, hatalar, me, taslak] = await Promise.all([
    q(env, "SELECT k, v FROM durum"),
    q(env, "SELECT at, job, log FROM runs WHERE ((job IN ('uyap','haber','geo','bik','fiyat','news') AND (job != 'news' OR log LIKE '%hata%')) OR log LIKE '%HTTP 4%' OR log LIKE '%HTTP 5%' OR log LIKE '%rror%' OR log LIKE '%exceeded%') ORDER BY id DESC LIMIT 20"),
    bir(env, "SELECT max(guncel) son, count(*) n FROM ihale WHERE kaynak = 'milliemlak' AND aktif = 1"),
    bir(env, "SELECT count(*) n, max(updated_at) son FROM pages WHERE status = 'draft'"),
  ]);
  const D = Object.fromEntries(durum.map((r) => [r.k, r.v]));
  const son = (k) => { try { return JSON.parse(D["son:" + k] || "null"); } catch { return null; } };
  const sonHata = (k) => hatalar.find((h) => h.job === k);
  const satir = ([k, ad, ne, ne_zaman]) => {
    const s = son(k), h = sonHata(k);
    const hataYeni = h && (!s || Date.parse(h.at) > Date.parse(s.at));
    const durumT = hataYeni ? ["Hata", "pn-kirmizi"] : s ? ["Çalışıyor", "pn-yesil"] : ["Bekliyor", "pn-gri"];
    return `<tr><td><b>${ad}</b><small>${ne}</small></td><td>${ne_zaman}</td><td>${s ? gecen(s.at) : "—"}<small>${s ? String(s.ozet || "").slice(0, 120) : ""}</small></td><td><span class="pn-etiket ${durumT[1]}">${durumT[0]}</span></td></tr>`;
  };
  let uy = {}; try { uy = JSON.parse(D.uyap || "{}"); } catch {}
  return bolum("Otomatik işler (sitede)", `<div class="pn-tablo"><table><thead><tr><th>İş</th><th>Sıklık</th><th>Son çalışma</th><th>Durum</th></tr></thead><tbody>${AJANLAR.map(satir).join("")}</tbody></table></div><p class="pn-not">UYAP taraması şu an ${nf(uy.skip || 0)}. ilanda, ${uy.tur || 0}. tur.</p>`)
    + bolum("Claude ajanları (zamanlanmış görevler)", `<div class="pn-tablo"><table><thead><tr><th>Ajan</th><th>Sıklık</th><th>Son iz</th></tr></thead><tbody>
<tr><td><b>Milli Emlak toplayıcı</b><small>Hazine satış ve kira ihalelerini senin bilgisayarındaki tarayıcıdan toplar (site yalnızca Türkiye IP'sinden açılıyor).</small></td><td>Her gün 06:13</td><td>${me.son ? gecen(me.son) : "—"}<small>${nf(me.n)} aktif hazine ilanı</small></td></tr>
<tr><td><b>Haftalık hibe ajanı</b><small>Yeni hibe ve destek programlarını araştırır, taslak hazırlar; yayınlamaz.</small></td><td>Pazartesi 08:41</td><td>${taslak.son ? gecen(taslak.son) : "—"}<small>${nf(taslak.n)} taslak bekliyor</small></td></tr>
</tbody></table></div><p class="pn-not">Bu ajanlar Claude'da zamanlanmış görev olarak çalışır; ayrıntılı kayıtlar Claude uygulamasındaki görev geçmişindedir.</p>`)
    + bolum("Son hatalar", hatalar.length ? `<div class="pn-tablo"><table><thead><tr><th>Zaman</th><th>İş</th><th>Kayıt</th></tr></thead><tbody>${hatalar.map((h) => `<tr><td>${gecen(h.at)}</td><td>${h.job}</td><td><code>${String(h.log || "").replace(/</g, "&lt;").slice(0, 300)}</code></td></tr>`).join("")}</tbody></table></div>` : `<p class="pn-bos">Kayıt yok.</p>`);
}

async function plan(env) {
  const kayit = Object.fromEntries((await q(env, "SELECT id, durum, notu FROM panel_plan")).map((r) => [r.id, r]));
  const say = { tamam: 0, devam: 0, plan: 0 }; let top = 0;
  const vade = (k) => {
    const v = PLAN[k];
    return bolum(v.ad, `<p class="pn-hedef">${v.hedef}</p><div class="pn-plan">${v.maddeler.map(([id, ad, neden, olcut, varsayilan]) => {
      const d = kayit[id]?.durum || varsayilan; say[d]++; top++;
      return `<form class="pn-madde" method="post" action="/okan/plan"><input type="hidden" name="id" value="${id}"><div><b>${ad}</b><p>${neden}</p><small>Ölçüt: ${olcut}</small>${kayit[id]?.notu ? `<em>Not: ${kayit[id].notu.replace(/</g, "&lt;")}</em>` : ""}</div><div class="pn-sec"><span class="pn-etiket ${DURUM[d][1]}">${DURUM[d][0]}</span><select name="durum" onchange="this.form.submit()">${Object.entries(DURUM).map(([k2, [t]]) => `<option value="${k2}"${k2 === d ? " selected" : ""}>${t}</option>`).join("")}</select><input name="notu" placeholder="Not ekle" value="${(kayit[id]?.notu || "").replace(/"/g, "&quot;")}" onchange="this.form.submit()"></div></form>`;
    }).join("")}</div>`);
  };
  const ic = vade("kisa") + vade("orta") + vade("uzun");
  return bolum("Site planı", `<div class="pn-kartlar">${kart("Tamamlanan", nf(say.tamam), `%${yuzde(say.tamam, top)}`, "pn-k-yesil")}${kart("Devam eden", nf(say.devam))}${kart("Planlanan", nf(say.plan))}</div><div class="pn-ilerleme"><i style="width:${yuzde(say.tamam, top)}%"></i><i class="d" style="width:${yuzde(say.devam, top)}%"></i></div>`) + ic;
}

function baglantilar() {
  const L = [["Cloudflare paneli", "https://dash.cloudflare.com", "Workers, D1 veritabanı, faturalar"], ["Cloudflare Access", "https://one.dash.cloudflare.com", "Panele kimlerin girebileceği"], ["Google Search Console", "https://search.google.com/search-console", "Google'da görünürlük, indeksleme"], ["GitHub deposu", "https://github.com/okandur6025-beep/topraklik", "Sitenin kodu"], ["Site haritası", "/sitemap.xml", "Google'a verilen sayfa listesi"], ["Haber Bülteni", "/haberler", ""], ["Parsel sorgu", "/parsel-sorgu", ""], ["İhaleler", "/ihaleler", ""]];
  return bolum("Bağlantılar", `<div class="pn-baglar">${L.map(([a, u, d]) => `<a href="${u}" target="_blank" rel="noopener"><b>${a}</b><small>${d}</small></a>`).join("")}</div>`);
}

/* ---------- Sayfa ---------- */
const CSS = `
body{background:#F3EFE5}main.wrap{max-width:1180px}
.pn-ust{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:10px;margin:8px 0 14px}
.pn-ust h1{margin:0;font-family:"Playfair Display",Georgia,serif;font-size:clamp(26px,3.4vw,36px)}.pn-ust p{margin:2px 0 0;color:var(--muted)}
.pn-sekme{display:flex;gap:6px;overflow-x:auto;padding:2px 0 12px;margin:0 0 6px;scrollbar-width:none}
.pn-sekme a{white-space:nowrap;text-decoration:none;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 14px;font-weight:800;font-size:14px}
.pn-sekme a[aria-current]{background:var(--green);border-color:var(--green);color:#fff}
.pn-bolum{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:0 0 14px}
.pn-bolum .pn-bolum{border:0;padding:0;margin:0;background:none}
.pn-bb{display:flex;justify-content:space-between;align-items:center;gap:10px}.pn-bb h2{margin:0 0 12px;font-size:18px}
.pn-bolum .pn-bolum .pn-bb h2{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.pn-kartlar{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin:0 0 12px}
.pn-kart{background:#FBF8F1;border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.pn-kart small{display:block;font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.pn-kart b{display:block;font-size:24px;margin:4px 0 2px;font-family:"Playfair Display",Georgia,serif}.pn-kart span{font-size:12.5px;color:var(--muted)}
.pn-kart.pn-uyari{background:#FBE9E4;border-color:#E9B9AA}.pn-kart.pn-k-yesil{background:#E7EFDF}
.pn-grafik{width:100%;height:auto;display:block}.pn-lejant{display:flex;gap:14px;font-size:13px;color:var(--muted);margin-top:4px}.pn-lejant i{display:inline-block;width:12px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}
.pn-iki{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:0 0 6px}
.pn-cubuk{display:grid;gap:7px}
.pn-cs{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto 38px;gap:8px;align-items:center;font-size:13.5px}
.pn-ad{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pn-ad a{color:var(--ink)}
.pn-bar{background:#F1ECE0;border-radius:99px;height:8px;overflow:hidden}.pn-bar i{display:block;height:100%;background:var(--green);border-radius:99px}
.pn-cs b{font-variant-numeric:tabular-nums}.pn-cs small{color:var(--muted);text-align:right}
.pn-saat{display:grid;grid-template-columns:repeat(24,1fr);gap:3px;height:120px;align-items:end}
.pn-saat div{display:flex;flex-direction:column;justify-content:flex-end;height:100%}.pn-saat i{display:block;background:#B8892E;border-radius:4px 4px 0 0}.pn-saat small{font-size:10px;color:var(--muted);text-align:center;height:14px}
.pn-tablo{overflow-x:auto}.pn-tablo table{width:100%;border-collapse:collapse;font-size:14px}
.pn-tablo th{text-align:left;font-size:12px;color:var(--muted);border-bottom:1px solid var(--line);padding:8px}
.pn-tablo td{border-bottom:1px solid #F1ECE0;padding:9px 8px;vertical-align:top}.pn-tablo td small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.pn-tablo code{font-size:12px;white-space:pre-wrap;word-break:break-word}
.pn-etiket{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:3px 10px;white-space:nowrap}
.pn-yesil{background:#E3ECDA;color:#2E5130}.pn-sari{background:#FBEFD3;color:#8A6420}.pn-gri{background:#EEEAE0;color:#6C6858}.pn-kirmizi{background:#FBE1DA;color:#9A3220}
.pn-not{font-size:13px;color:var(--muted);margin:8px 0 0}.pn-bos{color:var(--muted);font-size:14px}
.pn-aralik{display:flex;gap:6px;margin:0 0 12px}.pn-aralik a{text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:6px 11px;font-weight:700;font-size:13px}.pn-aralik a[aria-current]{background:var(--ink);color:#fff}
.pn-hedef{margin:-4px 0 12px;font-family:"Playfair Display",Georgia,serif;font-style:italic;color:var(--muted)}
.pn-plan{display:grid;gap:8px}
.pn-madde{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#FBF8F1}
.pn-madde b{font-size:15px}.pn-madde p{margin:3px 0;font-size:13.5px}.pn-madde small{color:var(--muted);font-size:12.5px}.pn-madde em{display:block;font-size:12.5px;color:#8A6420;margin-top:4px}
.pn-sec{display:grid;gap:6px;align-content:start}.pn-sec select,.pn-sec input{font:600 13px Manrope,system-ui,sans-serif;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:#fff}
.pn-ilerleme{display:flex;height:10px;border-radius:99px;overflow:hidden;background:#EEEAE0}.pn-ilerleme i{background:var(--green)}.pn-ilerleme i.d{background:#D9B25C}
.pn-baglar{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.pn-baglar a{display:block;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#FBF8F1}.pn-baglar small{display:block;color:var(--muted)}
.pn-giris{max-width:560px;margin:40px auto;background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px}
@media (max-width:800px){.pn-iki{grid-template-columns:1fr}.pn-madde{grid-template-columns:1fr}.pn-cs{grid-template-columns:minmax(0,1.3fr) minmax(0,.8fr) auto 34px}}`;

const SEKME = [["ozet", "Genel bakış"], ["trafik", "Trafik"], ["ilanlar", "İlanlar ve içerik"], ["ajanlar", "Ajanlar"], ["plan", "Site planı"], ["baglantilar", "Bağlantılar"]];

const yanit = (s, durum = 200) => new Response(s, { status: durum, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });

export async function panel(req, env, url, { page, onay }) {
  const k = onay ? { email: "yonetici" } : await erisim(req, env);
  if (!k) return yanit(page({ title: "Yönetim paneli · Topraklık", description: "", path: "/okan", noindex: true, body: `<div class="pn-giris"><h1>Giriş gerekli</h1><p>Bu sayfa yalnızca yetkili e-posta adresiyle açılır. Lütfen sayfayı yenileyin; e-posta doğrulama ekranı açılacaktır.</p></div><style>${CSS}</style>` }), 401);
  if (k.kurulum) return yanit(page({ title: "Yönetim paneli kurulumu · Topraklık", description: "", path: "/okan", noindex: true, body: `<div class="pn-giris"><h1>Panel kurulumu bekliyor</h1><p>E-postayla giriş için Cloudflare Access ayarı tamamlanınca panel burada açılacak. Kurulum adımları Claude sohbetinde.</p></div><style>${CSS}</style>` }), 503);
  if (url.pathname === "/okan/plan" && req.method === "POST") {
    const f = await req.formData();
    const id = String(f.get("id") || "").slice(0, 40), durum = String(f.get("durum") || "");
    if (id && DURUM[durum]) {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS panel_plan (id TEXT PRIMARY KEY, durum TEXT, notu TEXT, at TEXT)").run();
      await env.DB.prepare("INSERT INTO panel_plan (id, durum, notu, at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET durum = excluded.durum, notu = excluded.notu, at = excluded.at").bind(id, durum, String(f.get("notu") || "").slice(0, 300), new Date().toISOString()).run();
    }
    return Response.redirect(url.origin + "/okan?b=plan", 303);
  }
  const b = SEKME.some(([s]) => s === url.searchParams.get("b")) ? url.searchParams.get("b") : "ozet";
  const g = [1, 7, 30, 90].includes(+url.searchParams.get("g")) ? +url.searchParams.get("g") : 7;
  const ic = b === "trafik" ? await trafik(env, g) : b === "ilanlar" ? await ilanlar(env) : b === "ajanlar" ? await ajanlar(env) : b === "plan" ? await plan(env) : b === "baglantilar" ? baglantilar() : await ozet(env);
  const ad = (k.email || "").split("@")[0];
  const saat = new Date(Date.now() + 3 * 3600e3).toISOString().slice(11, 16);
  const body = `<div class="pn-ust"><div><h1>Merhaba${ad ? " " + ad.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, "").slice(0, 1).toUpperCase() + ad.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, "").slice(1, 20).replace(/\d+$/, "") : ""}</h1><p>Topraklık yönetim paneli · ${gunTR()} ${saat}</p></div><a class="btn" href="/cdn-cgi/access/logout">Çıkış yap</a></div>
<nav class="pn-sekme">${SEKME.map(([s, t]) => `<a href="/okan?b=${s}"${s === b ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>${ic}<style>${CSS}</style>`;
  return yanit(page({ title: "Yönetim paneli · Topraklık", description: "", path: "/okan", noindex: true, body }));
}
