/* Ana sayfa: yalnız gerçek ve güncel veri. Prototip parçaları (örnek ilanlar, pazar, sepet, giriş) yok. */
import { kart as ihaleKart } from "./ihale.js";
import { haberKart, tekrarAyikla } from "./haber.js";
import { ARACLAR } from "./araclar.js";
import { REHBER } from "./rehber.js";

const nf = (n) => Number(n || 0).toLocaleString("tr-TR");
const bugunTR = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
async function q(env, sql, ...b) { try { return (await env.DB.prepare(sql).bind(...b).all()).results || []; } catch (e) { return []; } }

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IK = {
  parsel: I(`<path d="m12 3 9 4.8-9 4.8-9-4.8z"/><path d="m3 12.4 9 4.8 9-4.8"/><path d="m3 16.6 9 4.8 9-4.8"/>`),
  ihale: I(`<path d="m13.5 3.5 7 7-2.8 2.8-7-7z"/><path d="m11 8.5-7.5 7.5 3 3L14 11.5"/><path d="M13 20.5h8"/>`),
  urun: I(`<path d="M12 21V8"/><path d="M12 8c-2-1.5-2-4 0-5.5 2 1.5 2 4 0 5.5zM12 13c-2.6 0-4.3-1.3-4.8-3.6 2.6 0 4.3 1.3 4.8 3.6zM12 13c2.6 0 4.3-1.3 4.8-3.6-2.6 0-4.3 1.3-4.8 3.6zM12 18c-2.6 0-4.3-1.3-4.8-3.6 2.6 0 4.3 1.3 4.8 3.6zM12 18c2.6 0 4.3-1.3 4.8-3.6-2.6 0-4.3 1.3-4.8 3.6z"/>`),
  ok: I(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  tik: I(`<path d="m5 12.5 4.2 4L19 7"/>`),
  ara: I(`<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>`),
};

const KAYNAKLAR = [["TKGM", "Parsel sınırı, yüzölçümü, nitelik"], ["UYAP e-Satış", "İcra ve mahkeme satış ilanları"], ["ilan.gov.tr", "Basın İlan Kurumu icra ilanları"], ["Milli Emlak", "Hazine satış ve kiralama ihaleleri"], ["TÜİK", "İlçe bazında ekim alanı ve üretim"], ["TOBB borsaları", "Güncel ürün fiyatları"]];
const SSS = [
  ["Topraklık ücretli mi?", "Hayır. İhale arama, 3B parsel sorgu, hesaplama araçları, rehberler ve haber bülteni ücretsizdir."],
  ["İlan bilgileri nereden geliyor, ne kadar güncel?", "İcra ve mahkeme satışları UYAP e-Satış ve Basın İlan Kurumu'nun ilan.gov.tr sitesinden, hazine ihaleleri Milli Emlak'tan her gün otomatik toplanır. Bedel, yüzölçümü, hisse, KDV ve artırma tarihleri ilanın tam metninden okunur; her ilanda kaynağa bağlantı ve son kontrol tarihi yer alır."],
  ["İhaleye Topraklık üzerinden katılabilir miyim?", "Hayır. Topraklık ihalelerin tarafı veya aracısı değildir. İcra satışlarına e-Devlet ile UYAP e-Satış üzerinden, hazine ihalelerine ilgili Milli Emlak müdürlüğü aracılığıyla katılırsınız."],
  ["Parsel sorgu sonuçları resmî belge yerine geçer mi?", "Hayır. Parsel sınırı ve yüzölçümü TKGM'nin herkese açık servisinden gelir ve bilgi amaçlıdır; rakım ve eğim uydu verisinden hesaplanan yaklaşık değerlerdir. Resmî işlemler için tapu müdürlüğüne ve belediyeye başvurun."],
  ["Hisseli satış ne demek, neden uyarı görüyorum?", "Bazı icra satışlarında taşınmazın tamamı değil, borçlunun hissesi satılır. Hisseli taşınmazda kullanım ve satış için diğer hissedarlarla anlaşmak gerekir; bu yüzden hisseli ilanlarda satılan alanı ve m² fiyatını ayrıca gösteriyoruz."],
];

export const ANA_CSS = `
main.tam{max-width:none;padding:0}
.as-wrap{max-width:1180px;margin:0 auto;padding:0 16px}
.as-hero{position:relative;color:#fff;background:#1F3A22 url(/img/hero.jpg) center 62%/cover no-repeat;isolation:isolate}
.as-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,rgba(18,34,20,.92) 0%,rgba(18,34,20,.74) 42%,rgba(18,34,20,.25) 100%),linear-gradient(0deg,rgba(18,34,20,.7),transparent 45%)}
.as-hero .as-wrap{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:36px;align-items:center;padding-top:clamp(40px,7vw,86px);padding-bottom:clamp(40px,6vw,72px)}
.as-kicker{font:800 12px/1 Manrope,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#E9C46A}
.as-hero h1{font-family:"Playfair Display",Georgia,serif;font-size:clamp(34px,5.2vw,60px);line-height:1.04;margin:14px 0 16px;letter-spacing:-.01em;color:#fff}
.as-hero h1 em{font-style:normal;color:#E9C46A}
.as-hero p.as-alt{font-size:clamp(16px,1.6vw,18.5px);line-height:1.6;color:rgba(255,255,255,.88);max-width:46ch;margin:0 0 22px}
.as-guven{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;color:rgba(255,255,255,.85)}
.as-guven span{display:inline-flex;align-items:center;gap:6px}.as-guven svg{width:17px;height:17px;color:#9FD08A}
.as-arama{background:#FFFDF8;color:var(--ink);border-radius:20px;padding:8px;box-shadow:0 24px 60px -20px rgba(0,0,0,.55)}
.as-sekme{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px}
.as-sekme button{border:0;border-radius:14px;padding:12px;font:800 15px Manrope,system-ui,sans-serif;background:transparent;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
.as-sekme button svg{width:20px;height:20px}
.as-sekme button[aria-selected=true]{background:var(--gsoft);color:var(--green)}
.as-form{display:grid;gap:10px;padding:12px 12px 14px}
.as-form[hidden]{display:none}
.as-form label{display:grid;gap:5px;font-size:12px;font-weight:800;color:var(--muted);letter-spacing:.02em}
.as-form select,.as-form input{font:600 15.5px Manrope,system-ui,sans-serif;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:11px;padding:12px;width:100%;min-width:0}
.as-form select:disabled{opacity:.55}
.as-iki{display:grid;grid-template-columns:1fr 1fr;gap:10px}.as-uc{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.as-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;background:var(--green);color:#fff;font:800 16px Manrope,system-ui,sans-serif;padding:14px 18px;cursor:pointer;text-decoration:none}
.as-btn svg{width:19px;height:19px}.as-btn.ikinci{background:transparent;color:var(--green);border:1.5px solid var(--green)}
.as-ipucu{margin:0;font-size:12.5px;color:var(--muted);line-height:1.45}
.as-sayilar{background:#FFFDF8;border-bottom:1px solid var(--line)}
.as-sayilar .as-wrap{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.as-sayi{padding:20px 16px;border-left:1px solid var(--line)}.as-sayi:first-child{border-left:0}
.as-sayi b{display:block;font-family:"Playfair Display",Georgia,serif;font-size:clamp(24px,3vw,32px);color:var(--green);line-height:1.1}
.as-sayi span{font-size:13.5px;color:var(--muted)}
.as-bolum{padding:clamp(44px,6vw,72px) 0}
.as-bolum.acik{background:#FFFDF8;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.as-bas{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;margin:0 0 22px}
.as-bas h2{font-family:"Playfair Display",Georgia,serif;font-size:clamp(26px,3.2vw,38px);line-height:1.12;margin:6px 0 0;max-width:22ch}
.as-bas p{margin:6px 0 0;color:var(--muted);max-width:60ch}
.as-bas a{font-weight:800;color:var(--green);text-decoration:none;white-space:nowrap}
.as-uclu{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.as-giris{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;text-decoration:none;color:var(--ink);transition:transform .15s,box-shadow .15s}
.as-giris:hover{transform:translateY(-3px);box-shadow:0 16px 34px -18px rgba(38,38,30,.4)}
.as-giris img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.as-giris div{padding:18px 18px 20px;display:flex;flex-direction:column;gap:8px;flex:1}
.as-giris i{width:42px;height:42px;border-radius:12px;background:var(--gsoft);color:var(--green);display:grid;place-items:center;margin-top:-40px;border:3px solid #fff}.as-giris i svg{width:22px;height:22px}
.as-giris b{font-size:19px;font-family:"Playfair Display",Georgia,serif}
.as-giris p{margin:0;color:var(--muted);font-size:14.5px;line-height:1.55}
.as-giris ul{margin:4px 0 0;padding:0;list-style:none;display:grid;gap:5px;font-size:14px}
.as-giris li{display:flex;gap:7px;align-items:flex-start}.as-giris li svg{width:16px;height:16px;flex:none;margin-top:2px;color:var(--green)}
.as-giris span.git{margin-top:auto;padding-top:8px;font-weight:800;color:var(--green);display:inline-flex;align-items:center;gap:6px}.as-giris span.git svg{width:17px;height:17px}
.as-pasaport{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:center}
.as-pasaport figure{margin:0;position:relative;border-radius:20px;overflow:hidden;box-shadow:0 26px 60px -30px rgba(0,0,0,.5)}
.as-pasaport figure img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
.as-pasaport figure svg{position:absolute;inset:0;width:100%;height:100%}
.as-pasaport figcaption{position:absolute;left:14px;bottom:14px;right:14px;background:rgba(255,253,248,.95);border-radius:14px;padding:12px 14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px;color:var(--muted)}
.as-pasaport figcaption b{display:block;color:var(--ink);font-size:16px}
.as-liste{list-style:none;padding:0;margin:16px 0 22px;display:grid;gap:10px}
.as-liste li{display:flex;gap:10px;align-items:flex-start;font-size:15.5px;line-height:1.5}
.as-liste li svg{width:20px;height:20px;flex:none;color:var(--green);margin-top:2px}
.as-not{font-size:12.5px;color:var(--muted);margin:10px 0 0}
.as-ihaleler{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.as-ihaleler .ic{background:#fff}
.as-dogru{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:var(--green);background:var(--gsoft);border-radius:999px;padding:5px 11px}.as-dogru svg{width:15px;height:15px}
.as-araclar{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.as-arac{display:block;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;text-decoration:none;color:var(--ink)}
.as-arac:hover{border-color:var(--gold2)}.as-arac b{display:block;font-size:16px;margin-bottom:4px}.as-arac span{font-size:13.5px;color:var(--muted);line-height:1.45}
.as-rehber{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.as-rehber a{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px;text-decoration:none;color:var(--ink);font-weight:700;font-size:15px;line-height:1.35}
.as-rehber a svg{width:18px;height:18px;flex:none;color:var(--green)}
.as-kaynak{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.as-kaynak div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px}.as-kaynak b{display:block;font-size:15px}.as-kaynak span{font-size:12.5px;color:var(--muted);line-height:1.4}
.as-sss{max-width:820px}.as-sss details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin:0 0 10px}
.as-sss summary{font-weight:800;cursor:pointer;font-size:16px}.as-sss p{margin:10px 0 0;color:var(--muted);line-height:1.6}
.as-son{background:var(--green);color:#F3EEE2}.as-son .as-wrap{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;padding-top:36px;padding-bottom:36px}
.as-son h2{margin:0;font-family:"Playfair Display",Georgia,serif;color:#fff;font-size:clamp(24px,3vw,32px)}.as-son p{margin:6px 0 0;opacity:.85}
.as-son .as-btn{background:#E9C46A;color:#26261E}
@media (max-width:980px){.as-hero .as-wrap{grid-template-columns:1fr}.as-uclu,.as-ihaleler{grid-template-columns:1fr 1fr}.as-araclar{grid-template-columns:1fr 1fr}.as-kaynak{grid-template-columns:repeat(3,1fr)}.as-pasaport{grid-template-columns:1fr}.as-rehber{grid-template-columns:1fr 1fr}}
@media (max-width:640px){.as-uclu,.as-ihaleler,.as-rehber{grid-template-columns:1fr}.as-sayilar .as-wrap{grid-template-columns:1fr 1fr}.as-sayi:nth-child(3){border-left:0}.as-sayi{border-top:1px solid var(--line)}.as-sayi:nth-child(-n+2){border-top:0}.as-kaynak{grid-template-columns:1fr 1fr}.as-uc{grid-template-columns:1fr 1fr}.as-uc label:first-child{grid-column:1/-1}.as-hero h1{font-size:clamp(32px,9vw,42px)}}`;

const ISTEMCI = String.raw`(()=>{
const $=id=>document.getElementById(id);
const slug=t=>String(t||"").replace(/İ/g,"i").replace(/I/g,"ı").toLocaleLowerCase("tr").replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.querySelectorAll(".as-sekme button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".as-sekme button").forEach(x=>x.setAttribute("aria-selected",x===b));document.querySelectorAll(".as-form").forEach(f=>f.hidden=f.id!==b.dataset.form)});
const doldur=(s,l,ilk)=>{s.innerHTML='<option value="">'+ilk+'</option>'+l.map(x=>'<option value="'+x.id+'" data-ad="'+esc(x.ad)+'">'+esc(x.ad)+'</option>').join("");s.disabled=false};
const al=async u=>{const r=await fetch(u);if(!r.ok)throw 0;return r.json()};
let yuklendi=false;
async function iller(){if(yuklendi)return;yuklendi=true;try{doldur($("aIl"),await al("/api/idari/il"),"İl seçin")}catch(e){$("aIl").innerHTML='<option value="">Liste alınamadı</option>'}}
["focus","pointerdown","touchstart"].forEach(e=>$("aIl").addEventListener(e,iller,{once:true}));
if("IntersectionObserver"in window)new IntersectionObserver((g,o)=>{if(g[0].isIntersecting){iller();o.disconnect()}}).observe($("aIl"));
$("aIl").onchange=async()=>{const s=$("aIlce");s.disabled=true;$("aMah").disabled=true;if(!$("aIl").value)return;s.innerHTML="<option>Yükleniyor…</option>";try{doldur(s,await al("/api/idari/ilce/"+$("aIl").value),"İlçe seçin")}catch(e){}};
$("aIlce").onchange=async()=>{const s=$("aMah");s.disabled=true;if(!$("aIlce").value)return;s.innerHTML="<option>Yükleniyor…</option>";try{doldur(s,await al("/api/idari/mahalle/"+$("aIlce").value),"Mahalle / köy seçin")}catch(e){}};
const ad=s=>s.selectedOptions[0]&&s.value?s.selectedOptions[0].dataset.ad:"";
$("fParsel").onsubmit=e=>{e.preventDefault();const p=new URLSearchParams();if(ad($("aIl")))p.set("il",slug(ad($("aIl"))));if(ad($("aIlce")))p.set("ilce",slug(ad($("aIlce"))));if(ad($("aMah")))p.set("mahalle",slug(ad($("aMah"))));if($("aAda").value.trim())p.set("ada",$("aAda").value.trim());if($("aPar").value.trim())p.set("parsel",$("aPar").value.trim());location.href="/parsel-sorgu"+(p.toString()?"?"+p:"")};
$("fIhale").onsubmit=e=>{e.preventDefault();const il=$("iIl").value,t=$("iTur").value,c=$("iCins").value,m=$("iMax").value.replace(/\D/g,"");const p=new URLSearchParams();if(t)p.set(t.split("=")[0],t.split("=")[1]);if(c)p.set("cins",c);if(m)p.set("max",m);location.href="/ihaleler"+(il?"/"+il:"")+(p.toString()?"?"+p:"")};
})();`;

export async function anaSayfa(env, { page, html, esc, latestNews, CATS, ago }) {
  const bugun = bugunTR();
  const AK = "aktif = 1 AND bitis >= ?1";
  const [sayi, iller, cinsler, icra, hazine, haber, uretim] = await Promise.all([
    q(env, `SELECT kaynak, tip, count(*) n FROM ihale WHERE ${AK} GROUP BY kaynak, tip`, bugun),
    q(env, `SELECT il_slug, il, count(*) n FROM ihale WHERE ${AK} GROUP BY il_slug ORDER BY il`, bugun),
    q(env, `SELECT cins, count(*) n FROM ihale WHERE ${AK} AND cins IS NOT NULL GROUP BY cins ORDER BY n DESC LIMIT 10`, bugun),
    q(env, `SELECT * FROM ihale WHERE ${AK} AND kaynak IN ('bik','uyap') AND dogrulandi = 1 AND bedel > 0 AND m2 > 0 AND cins IN ('Tarla','Arsa','Bağ-Bahçe','Zeytinlik') ORDER BY ilk_gorulme DESC LIMIT 3`, bugun),
    q(env, `SELECT * FROM ihale WHERE ${AK} AND kaynak = 'milliemlak' AND tip = 'satis' AND bedel > 0 AND m2 > 0 ORDER BY tarih LIMIT 3`, bugun),
    latestNews(env, { limit: 14 }).catch(() => []),
    q(env, "SELECT count(DISTINCT il_slug || '/' || ilce_slug) n FROM ilce_uretim"),
  ]);
  const top = (f) => sayi.filter(f).reduce((s, r) => s + r.n, 0);
  const nIcra = top((r) => r.kaynak !== "milliemlak"), nHaz = top((r) => r.kaynak === "milliemlak");
  const ihaleler = [...icra, ...hazine];
  const haberler = tekrarAyikla(haber).filter((n) => n.ozet).slice(0, 3);
  const ctx = { esc, ago, CATS };

  const body = `
<section class="as-hero"><div class="as-wrap">
<div><div class="as-kicker">Türkiye'nin arazi platformu</div>
<h1>Toprağını tanı. Değerini bil. <em>Fırsatı yakala.</em></h1>
<p class="as-alt">Ada ve parselle 3B arazi analizi, icra ve hazine arazi ihaleleri, ilçe bazında tarım verisi. Resmî kaynaklardan, her gün güncel.</p>
<div class="as-guven"><span>${IK.tik}Ücretsiz</span><span>${IK.tik}Kaynağı belli veri</span><span>${IK.tik}Her gün güncel</span></div></div>
<div class="as-arama"><div class="as-sekme" role="tablist"><button type="button" role="tab" aria-selected="true" data-form="fParsel">${IK.parsel}Parsel bul</button><button type="button" role="tab" aria-selected="false" data-form="fIhale">${IK.ihale}İhale ara</button></div>
<form class="as-form" id="fParsel" autocomplete="off">
<div class="as-uc"><label>İl<select id="aIl"><option value="">İl seçin</option></select></label><label>İlçe<select id="aIlce" disabled><option value="">İlçe</option></select></label><label>Mahalle / köy<select id="aMah" disabled><option value="">Mahalle</option></select></label></div>
<div class="as-iki"><label>Ada<input id="aAda" inputmode="numeric" placeholder="Örn. 214"></label><label>Parsel<input id="aPar" inputmode="numeric" placeholder="Örn. 9"></label></div>
<button class="as-btn" type="submit">${IK.ara}Parselimi bul</button>
<p class="as-ipucu">Ada ve parsel tapu senedinde yazar. Bilmiyorsanız açılan haritada tarlanın üzerine dokunmanız yeterli.</p></form>
<form class="as-form" id="fIhale" hidden>
<div class="as-iki"><label>İl<select id="iIl"><option value="">Tüm Türkiye</option>${iller.map((r) => `<option value="${esc(r.il_slug)}">${esc(r.il)} (${nf(r.n)})</option>`).join("")}</select></label>
<label>Satış türü<select id="iTur"><option value="">Hepsi</option><option value="kaynak=icra">İcra ve mahkeme</option><option value="tur=sulh">Sulh hukuk (ortaklığın giderilmesi)</option><option value="kaynak=milliemlak">Hazine satışı</option><option value="tip=kira">Hazine kiralama</option></select></label></div>
<div class="as-iki"><label>Taşınmaz<select id="iCins"><option value="">Hepsi</option>${cinsler.map((r) => `<option>${esc(r.cins)}</option>`).join("")}</select></label><label>En çok bedel (TL)<input id="iMax" inputmode="numeric" placeholder="Örn. 1.000.000"></label></div>
<button class="as-btn" type="submit">${IK.ara}İlanları göster</button>
<p class="as-ipucu">${nf(nIcra + nHaz)} aktif ilan arasında arama yapılır.</p></form></div>
</div></section>

<section class="as-sayilar"><div class="as-wrap">
<div class="as-sayi"><b>${nf(nIcra)}</b><span>icra ve mahkeme satışı</span></div>
<div class="as-sayi"><b>${nf(nHaz)}</b><span>hazine satış ve kiralama ihalesi</span></div>
<div class="as-sayi"><b>${nf(uretim[0]?.n || 0)}</b><span>ilçede ekim ve verim verisi</span></div>
<div class="as-sayi"><b>117</b><span>ürün rehberi ve kazanç hesabı</span></div>
</div></section>

<section class="as-bolum"><div class="as-wrap">
<div class="as-bas"><div><div class="as-kicker" style="color:var(--gold)">Ne yapabilirsiniz?</div><h2>Araziyle ilgili kararın üç adımı</h2></div></div>
<div class="as-uclu">
<a class="as-giris" href="/parsel-sorgu"><img src="/img/t2.jpg" alt="" loading="lazy" width="560" height="350"><div><i>${IK.parsel}</i><b>Parselini tanı</b><p>Ada ve parselle tarlanın gerçek sınırını uyduda ve 3B arazide görün.</p><ul><li>${IK.tik}Yüzölçümü, nitelik, mevkii</li><li>${IK.tik}Rakım ve yaklaşık eğim</li><li>${IK.tik}Paylaşılabilir bağlantı, KML</li></ul><span class="git">Parsel sorgula ${IK.ok}</span></div></a>
<a class="as-giris" href="/ihaleler"><img src="/img/t4.jpg" alt="" loading="lazy" width="566" height="340"><div><i>${IK.ihale}</i><b>Fırsatı yakala</b><p>İcra, sulh hukuk ve hazine satışlarını il ve ilçeye göre tek yerden izleyin.</p><ul><li>${IK.tik}1. ve 2. artırma tarihleri</li><li>${IK.tik}Hisseli satış uyarısı, KDV, teminat</li><li>${IK.tik}Her ilanda kaynağa bağlantı</li></ul><span class="git">İhalelere bak ${IK.ok}</span></div></a>
<a class="as-giris" href="/urun"><img src="/img/drip.jpg" alt="" loading="lazy" width="473" height="536" style="aspect-ratio:16/9"><div><i>${IK.urun}</i><b>Değerini bil</b><p>Ne ekilir, ne kazandırır? İlçenizin gerçek verimiyle hesaplayın.</p><ul><li>${IK.tik}117 ürün için ekim ve bakım rehberi</li><li>${IK.tik}TÜİK ilçe verimi, borsa fiyatları</li><li>${IK.tik}Dekar başına tahmini kazanç</li></ul><span class="git">Ürünlere bak ${IK.ok}</span></div></a>
</div></div></section>

${ihaleler.length ? `<section class="as-bolum acik"><div class="as-wrap">
<div class="as-bas"><div><div class="as-kicker" style="color:var(--gold)">Güncel ihaleler</div><h2>Bu hafta öne çıkan arazi satışları</h2><p>İcra ilanlarının bilgileri ilanın tam metninden doğrulanır; hazine ihaleleri Milli Emlak'tan alınır.</p></div><a href="/ihaleler">Tüm ihaleler →</a></div>
<div class="as-ihaleler">${ihaleler.map((x) => ihaleKart(x, esc)).join("")}</div>
<p class="as-not"><span class="as-dogru">${IK.tik}Bilgiler ilan metninden doğrulandı</span> Teklif vermeden önce ilanın aslını ve şartnameyi mutlaka kontrol edin.</p>
</div></section>` : ""}

<section class="as-bolum"><div class="as-wrap as-pasaport">
<figure><img src="/img/featured.jpg" alt="Tarım arazileri, kuş bakışı" loading="lazy" width="900" height="559"><svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true"><path d="M150 96 L262 82 L292 170 L176 198 Z" fill="rgba(242,195,90,.28)" stroke="#FFE29A" stroke-width="3"/><path d="M150 96 L262 82 L292 170 L176 198 Z" fill="none" stroke="#F2C35A" stroke-width="10" stroke-opacity=".3"/></svg>
<figcaption><span><b>1.603 m²</b>yüzölçümü</span><span><b>Tarla</b>nitelik</span><span><b>823 m</b>rakım</span></figcaption></figure>
<div><div class="as-kicker" style="color:var(--gold)">3B parsel sorgu</div><h2 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(26px,3.2vw,38px);line-height:1.12;margin:8px 0 0">Tapudaki numaradan tarlanın kendisine</h2>
<ul class="as-liste"><li>${IK.tik}<span><b>Gerçek sınır:</b> Parsel çizgisi Tapu ve Kadastro'nun servisinden gelir, uydu fotoğrafının üzerine çizilir.</span></li><li>${IK.tik}<span><b>Arazi yapısı:</b> 3B görünümde tepe ve vadiler, ortalama rakım ve yaklaşık eğim.</span></li><li>${IK.tik}<span><b>Çevresi:</b> Aynı ilçedeki ihaleler, ilçede ne ekildiği, güncel ve geçmiş uydu görüntülerine bağlantı.</span></li><li>${IK.tik}<span><b>Paylaşım:</b> Bağlantıyı WhatsApp'tan gönderin ya da KML olarak Google Earth'te açın.</span></li></ul>
<a class="as-btn" href="/parsel-sorgu">${IK.parsel}Parselini sorgula</a>
<p class="as-not">Görseldeki değerler örnek bir parsele aittir. Sonuçlar bilgi amaçlıdır, resmî belge yerine geçmez.</p></div>
</div></section>

${haberler.length ? `<section class="as-bolum acik"><div class="as-wrap">
<div class="as-bas"><div><div class="as-kicker" style="color:var(--gold)">Topraklık Haber Bülteni</div><h2>Tarım ve arazi gündemi</h2><p>Her haberin kısa özeti ve sizin için neden önemli olduğu.</p></div><a href="/haberler">Bülteni aç →</a></div>
<div class="hb-grid">${haberler.map((n) => haberKart(n, ctx)).join("")}</div></div></section>` : ""}

<section class="as-bolum"><div class="as-wrap">
<div class="as-bas"><div><div class="as-kicker" style="color:var(--gold)">Hesaplama araçları</div><h2>Masrafı önceden bilin</h2></div><a href="/araclar">Tüm araçlar →</a></div>
<div class="as-araclar">${Object.entries(ARACLAR).map(([k, a]) => `<a class="as-arac" href="/araclar/${k}"><b>${esc(a.ad)}</b><span>${esc(a.kisa || "")}</span></a>`).join("")}</div>
<div class="as-bas" style="margin-top:44px"><div><div class="as-kicker" style="color:var(--gold)">Rehberler</div><h2>Almadan önce bilinmesi gerekenler</h2></div><a href="/rehber">Tüm rehberler →</a></div>
<div class="as-rehber">${["hisseli-tapu-nedir", "icradan-ev-almak", "arsa-alirken-dikkat-edilecekler", "tarlaya-ev-yapilir-mi", "tapu-harci-nedir", "tarim-arazisi-bolunme-5403", "mirasci-ilk-artirma-kurali", "imar-durumu-nasil-ogrenilir", "kadastro-ada-parsel-nedir"].filter((s) => REHBER[s]).map((s) => `<a href="/rehber/${s}">${esc(REHBER[s].h1)}${IK.ok}</a>`).join("")}</div>
</div></section>

<section class="as-bolum acik"><div class="as-wrap">
<div class="as-bas"><div><div class="as-kicker" style="color:var(--gold)">Veriler nereden geliyor?</div><h2>Her bilginin kaynağı belli</h2><p>Topraklık resmî kurumların herkese açık verilerini derler; her ilanda ve sayfada kaynağa bağlantı ve güncellenme tarihi bulunur.</p></div></div>
<div class="as-kaynak">${KAYNAKLAR.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join("")}</div>
</div></section>

<section class="as-bolum"><div class="as-wrap">
<div class="as-bas"><div><div class="as-kicker" style="color:var(--gold)">Sık sorulan sorular</div><h2>Merak edilenler</h2></div></div>
<div class="as-sss">${SSS.map(([s, c], i) => `<details${i === 0 ? " open" : ""}><summary>${s}</summary><p>${c}</p></details>`).join("")}</div>
</div></section>

<section class="as-son"><div class="as-wrap"><div><h2>Tarlanı bugün tanı</h2><p>Ada ve parsel numarasıyla başlayın; gerisini Topraklık göstersin.</p></div><a class="as-btn" href="/parsel-sorgu">${IK.parsel}Parselini sorgula</a></div></section>
<script>${ISTEMCI}</script>`;

  const jsonld = [
    { "@context": "https://schema.org", "@type": "WebSite", name: "Topraklık", url: "https://topraklik.com/", inLanguage: "tr" },
    { "@context": "https://schema.org", "@type": "Organization", name: "Topraklık", url: "https://topraklik.com/", logo: "https://topraklik.com/icon-512.png", email: "info@topraklik.com" },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: SSS.map(([s, c]) => ({ "@type": "Question", name: s, acceptedAnswer: { "@type": "Answer", text: c } })) },
  ];
  return html(page({ title: "Topraklık · Arsa, tarla, icra ve hazine ihaleleri, 3B parsel sorgu", description: "Ada ve parselle 3B arazi analizi, icra ve hazine arazi ihaleleri, ilçe bazında tarım verisi ve kazanç hesabı. Resmî kaynaklardan, her gün güncel ve ücretsiz.", path: "/", body, current: "/", jsonld, tam: true, ekCss: ANA_CSS }), 200, 600);
}
