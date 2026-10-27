/* Gerçek parsel sorgu: TKGM idari yapı + parsel geometrisi, Topraklık üzerinden önbellekli.
 * Veritabanı kullanmaz (D1 kotasından bağımsız). Harita: MapLibre + uydu + 3B arazi. */

const API = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3/api/";
const UA = "Mozilla/5.0 (compatible; TopraklikBot/1.0; +https://topraklik.com)";
const trSirala = (a, b) => a.ad.localeCompare(b.ad, "tr");

function merkez(geom) {
  let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
  const w = (c) => { if (typeof c[0] === "number") { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } else c.forEach(w); };
  try { w(geom.coordinates); } catch { return null; }
  return [Math.round(((y0 + y1) / 2) * 1e5) / 1e5, Math.round(((x0 + x1) / 2) * 1e5) / 1e5];
}

async function tkgmGetir(yol) {
  const r = await fetch(API + yol, { headers: { "user-agent": UA, accept: "application/json", referer: "https://parselsorgu.tkgm.gov.tr/", origin: "https://parselsorgu.tkgm.gov.tr" }, signal: AbortSignal.timeout(12000) });
  const metin = await r.text();
  let j = null;
  try { j = JSON.parse(metin); } catch {}
  return { durum: r.status, j, metin: metin.slice(0, 300) };
}

const json = (o, durum = 200, sure = 0) => new Response(JSON.stringify(o), { status: durum, headers: { "content-type": "application/json; charset=utf-8", "cache-control": sure ? `public, max-age=${sure}` : "no-store", "access-control-allow-origin": "*" } });

/* Kenar önbelleği: aynı sorgu TKGM'ye tekrar gitmez */
async function onbellekli(ctx, anahtar, sure, uret) {
  const cache = caches.default, key = new Request("https://topraklik.com/__onbellek/" + anahtar);
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await uret();
  if (res.status === 200 && sure) { const k = res.clone(); const p = cache.put(key, k); ctx?.waitUntil ? ctx.waitUntil(p) : await p; }
  return res;
}

export async function parselApi(req, env, ctx, url) {
  const p = url.pathname;
  try {
    let m;
    if (p === "/api/idari/il") return onbellekli(ctx, "il", 30 * 86400, async () => {
      const r = await tkgmGetir("idariYapi/ilListe");
      if (r.durum !== 200 || !r.j?.features) return json({ hata: "İl listesi alınamadı", durum: r.durum }, 502);
      return json(r.j.features.map((f) => ({ id: f.properties.id, ad: String(f.properties.text).trim() })).sort(trSirala), 200, 86400);
    });
    if ((m = p.match(/^\/api\/idari\/(ilce|mahalle)\/(\d{1,9})$/))) return onbellekli(ctx, `${m[1]}-${m[2]}`, 30 * 86400, async () => {
      const r = await tkgmGetir(`idariYapi/${m[1] === "ilce" ? "ilceListe" : "mahalleListe"}/${m[2]}`);
      if (r.durum !== 200 || !r.j?.features) return json({ hata: (m[1] === "ilce" ? "İlçe" : "Mahalle") + " listesi alınamadı", durum: r.durum }, 502);
      return json(r.j.features.map((f) => ({ id: f.properties.id, ad: String(f.properties.text).trim() })).sort(trSirala), 200, 86400);
    });
    if (p === "/api/parsel") {
      const mah = url.searchParams.get("mah"), ada = url.searchParams.get("ada"), parsel = url.searchParams.get("parsel");
      const lat = parseFloat(url.searchParams.get("lat")), lng = parseFloat(url.searchParams.get("lng"));
      let yol, anahtar;
      if (/^\d{1,9}$/.test(mah || "") && /^\d{1,6}$/.test(ada || "") && /^\d{1,6}$/.test(parsel || "")) { yol = `parsel/${mah}/${ada}/${parsel}`; anahtar = `p-${mah}-${ada}-${parsel}`; }
      else if (lat > 35 && lat < 43 && lng > 25 && lng < 45.5) { yol = `parsel/${lat.toFixed(6)}/${lng.toFixed(6)}/`; anahtar = `n-${lat.toFixed(5)}-${lng.toFixed(5)}`; }
      else return json({ hata: "Mahalle, ada ve parsel ya da harita noktası gerekli" }, 400);
      return onbellekli(ctx, anahtar, 7 * 86400, async () => {
        const r = await tkgmGetir(yol);
        if (r.durum === 200 && r.j?.geometry) {
          const o = r.j.properties || {};
          return json({ geometry: r.j.geometry, merkez: merkez(r.j.geometry), il: o.ilAd, ilce: o.ilceAd, mahalle: o.mahalleAd, mahalleId: o.mahalleId, ada: o.adaNo, parsel: o.parselNo, alan: o.alan, nitelik: o.nitelik, mevkii: o.mevkii, pafta: o.pafta, durum: o.durum, zemin: o.zeminKmdurum }, 200, 86400);
        }
        if (r.durum === 404 || /bulunamad/i.test(r.metin)) return json({ hata: "Bu ada ve parsel bulunamadı. Numaraları ve mahalleyi kontrol edin; parsel ifraz/tevhit ile değişmiş olabilir." }, 404);
        return json({ hata: "TKGM şu an yanıt vermedi, biraz sonra tekrar deneyin.", durum: r.durum }, 502);
      });
    }
  } catch (e) {
    return json({ hata: "TKGM'ye ulaşılamadı, biraz sonra tekrar deneyin.", ayrinti: e.message }, 502);
  }
  return null;
}

/* ---------- Sayfa ---------- */
const ML = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl";

export const PARSEL_CSS = `
.ps-ust{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:10px;margin:0 0 14px}
.ps-ust h1{margin:0;font-family:"Playfair Display",Georgia,serif;font-size:clamp(26px,3.6vw,38px)}
.ps-ust p{margin:4px 0 0;color:var(--muted)}
.ps-kap{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start;margin:0 0 28px}
.ps-form{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:10px;position:sticky;top:80px}
.ps-form label{display:grid;gap:5px;font-size:12.5px;font-weight:800;color:var(--muted);letter-spacing:.02em}
.ps-form select,.ps-form input{font:600 15px Manrope,system-ui,sans-serif;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px 12px;width:100%;min-width:0}
.ps-form select:disabled{opacity:.55}
.ps-iki{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ps-btn{border:0;border-radius:12px;background:var(--green);color:#fff;font:800 15.5px Manrope,system-ui,sans-serif;padding:13px 16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
.ps-btn:disabled{opacity:.6;cursor:wait}
.ps-ipucu{font-size:12.5px;color:var(--muted);margin:0;line-height:1.45}
.ps-hata{background:#FBE9E4;color:#8A2E1D;border-radius:10px;padding:10px 12px;font-size:14px;margin:0}
.ps-harita-kap{position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--line);background:#1d2320;min-height:520px;height:min(72vh,680px)}
#psHarita{position:absolute;inset:0}
.ps-arac{position:absolute;z-index:3;top:12px;left:12px;display:flex;gap:6px;flex-wrap:wrap}
.ps-arac button{border:0;background:rgba(255,253,248,.95);color:var(--ink);font:800 13px Manrope,system-ui,sans-serif;border-radius:999px;padding:8px 13px;box-shadow:0 4px 14px -6px rgba(0,0,0,.4);cursor:pointer}
.ps-arac button[aria-pressed=true]{background:var(--green);color:#fff}
.ps-bos{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#F3EEE2;pointer-events:none;z-index:2;padding:20px}
.ps-bos b{display:block;font-family:"Playfair Display",Georgia,serif;font-size:24px;margin-bottom:6px}
.ps-sonuc{display:none;margin:16px 0 0}
.ps-sonuc.acik{display:block}
.ps-kartlar{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:0 0 14px}
.ps-k{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.ps-k small{display:block;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ps-k b{display:block;font-size:19px;margin-top:3px;line-height:1.2}
.ps-k span{font-size:12.5px;color:var(--muted)}
.ps-baglar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.ps-baglar a,.ps-baglar button{display:inline-flex;align-items:center;gap:6px;text-decoration:none;border:1px solid var(--line);background:var(--card);color:var(--ink);font:800 13.5px Manrope,system-ui,sans-serif;border-radius:999px;padding:9px 14px;cursor:pointer}
.ps-baglar a.ana{background:var(--green);border-color:var(--green);color:#fff}
.ps-not{font-size:12.5px;color:var(--muted)}
.maplibregl-ctrl-attrib{font-size:10.5px}
@media (max-width:900px){.ps-kap{grid-template-columns:1fr}.ps-form{position:static}.ps-harita-kap{min-height:420px;height:62vh}}`;

const KAYNAKLAR = `<h2>Tarlayı en güncel hâliyle nereden görebilirim?</h2>
<p>Yüksek çözünürlüklü uydu fotoğrafları birkaç ayda ya da birkaç yılda bir yenilenir; her gün yenilenen ücretsiz uydu görüntüleri ise daha düşük çözünürlüklüdür. En iyi sonuç için ikisini birlikte kullanın:</p>
<ul><li><b>Copernicus Browser (ücretsiz, 2–5 günde bir yeni görüntü):</b> Avrupa Birliği'nin Sentinel-2 uydusu. Detay az (bir piksel 10 m) ama tarlanın bu hafta sürülüp sürülmediğini, ekili olup olmadığını ve bitki sağlığını (NDVI) gösterir. Parsel sonucundaki "Güncel uydu" düğmesi doğrudan parselin konumunda açar.</li>
<li><b>Esri Wayback (ücretsiz, geçmiş tarihler):</b> Aynı yerin yıllar içindeki yüksek çözünürlüklü fotoğraflarını tarih tarih karşılaştırmanızı sağlar; arazide yapılaşma veya ağaçlandırma olup olmadığını görmek için idealdir.</li>
<li><b>TKGM Parsel Sorgu ortofotosu (ücretsiz):</b> Tapu ve Kadastro'nun kendi hava fotoğrafı; parsel sınırlarıyla birlikte resmî kaynaktır.</li>
<li><b>Topraklık 3B görünüm:</b> Parseli uydu fotoğrafı üzerinde, arazinin yükseltisiyle birlikte gösterir; eğim ve rakımı hesaplar.</li></ul>`;

export function parselSayfa({ esc, page, html, ARACLAR }) {
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › Parsel sorgulama</div>
<div class="ps-ust"><div><h1>3B parsel sorgulama</h1><p>Ada ve parsel numarasıyla tarlanızı, arsanızı uyduda ve 3B arazide görün.</p></div></div>
<div class="ps-kap">
<form class="ps-form" id="psForm" autocomplete="off">
<label>İl<select id="psIl" required><option value="">Yükleniyor…</option></select></label>
<label>İlçe<select id="psIlce" required disabled><option value="">Önce il seçin</option></select></label>
<label>Mahalle / köy<select id="psMah" required disabled><option value="">Önce ilçe seçin</option></select></label>
<div class="ps-iki"><label>Ada<input id="psAda" inputmode="numeric" pattern="[0-9]*" placeholder="Örn. 214" required></label><label>Parsel<input id="psParsel" inputmode="numeric" pattern="[0-9]*" placeholder="Örn. 9" required></label></div>
<button class="ps-btn" id="psBtn" type="submit">Parseli bul</button>
<p class="ps-hata" id="psHata" hidden></p>
<p class="ps-ipucu">Ada ve parsel tapu senedinde yazar. Numarayı bilmiyorsanız haritada tarlanın üzerine dokunun, parsel bulunur.</p>
</form>
<div><div class="ps-harita-kap"><div id="psHarita"></div><div class="ps-arac" id="psArac" style="display:none"><button type="button" id="ps3b" aria-pressed="true">3B</button><button type="button" id="psTur" aria-pressed="false">Drone turu</button><button type="button" id="psKat" aria-pressed="false">Haritaya geç</button></div><div class="ps-bos" id="psBos"><div><b>Türkiye'nin her parseli burada</b>Soldan il, ilçe, mahalle, ada ve parseli seçin ya da haritada yakınlaşıp tarlaya dokunun.</div></div></div>
<section class="ps-sonuc" id="psSonuc" aria-live="polite"></section></div>
</div>
<div class="layout"><article><h2>Parsel sorgulama nasıl yapılır?</h2><ol><li>Tapudaki il, ilçe ve mahalle (köy) adını seçin.</li><li>Tapu senedindeki <b>ada</b> ve <b>parsel</b> numarasını yazın, "Parseli bul"a dokunun.</li><li>Parsel sınırı uyduda ve 3B arazide çizilir; yüzölçümü, niteliği, mevkii, rakımı ve yaklaşık eğimi görünür.</li><li>"Drone turu" ile parselin çevresini kuş bakışı gezin; bağlantıyı paylaşarak başkasına aynı parseli gösterin.</li></ol>
<h2>Ada ve parsel numarası nerede yazar?</h2><p>Tapu senedinin ön yüzünde "Ada" ve "Parsel" başlıklarıyla yazar. e-Devlet'te "Tapu Bilgileri Sorgulama" hizmetinden de kendi taşınmazlarınızın ada ve parsel numarasını görebilirsiniz.</p>
${KAYNAKLAR}
<h2>Parsel sorgunun sınırları</h2><p>Parsel bilgileri Tapu ve Kadastro Genel Müdürlüğü'nün herkese açık parsel sorgu servisinden alınır; bilgi amaçlıdır ve resmî belge yerine geçmez. Rakım ve eğim uydu yükseklik verisinden hesaplanan yaklaşık değerlerdir. İmar durumu için belediyeden, tapu kaydı ve şerhler için tapu müdürlüğünden bilgi alın.</p></article>
<aside><h3>Araçlar</h3>${Object.entries(ARACLAR).map(([k, x]) => `<a class="card" href="/araclar/${k}"><b>${esc(x.ad)}</b></a>`).join("")}<a class="card" href="/ihaleler"><b>Güncel ihaleler →</b></a></aside></div>
<link rel="stylesheet" href="${ML}.css"><script src="${ML}.js"></script><script>${ISTEMCI}</script>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "WebApplication", name: "Topraklık 3B Parsel Sorgulama", applicationCategory: "UtilitiesApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" }, inLanguage: "tr" },
    { "@context": "https://schema.org", "@type": "HowTo", name: "Ada ve parsel ile parsel sorgulama", step: ["İl, ilçe ve mahalleyi seçin", "Ada ve parsel numarasını yazın", "Parselin sınırını, alanını ve 3B arazisini inceleyin"].map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t })) }];
  return html(page({ title: "3B parsel sorgulama: ada parsel ile tarla ve arsa bul · Topraklık", description: "Ada ve parsel numarasıyla tarla ve arsanızı uyduda ve 3B arazide görün: yüzölçümü, nitelik, mevkii, rakım ve eğim. Ücretsiz parsel sorgu.", path: "/parsel-sorgu", body, current: "/parsel-sorgu", jsonld }), 200, 21600);
}

/* ---------- İstemci kodu ---------- */
const ISTEMCI = String.raw`(()=>{
const $=id=>document.getElementById(id), S={il:$("psIl"),ilce:$("psIlce"),mah:$("psMah")};
const slug=t=>String(t||"").replace(/İ/g,"i").replace(/I/g,"ı").toLocaleLowerCase("tr").replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nf=(n,d=0)=>Number(n).toLocaleString("tr-TR",{maximumFractionDigits:d,minimumFractionDigits:d});
const hata=m=>{const e=$("psHata");e.textContent=m||"";e.hidden=!m};
const getir=async u=>{const r=await fetch(u);const j=await r.json().catch(()=>({hata:"Yanıt okunamadı"}));if(!r.ok)throw new Error(j.hata||("Hata "+r.status));return j};
const doldur=(sel,list,ilk)=>{sel.innerHTML='<option value="">'+ilk+'</option>'+list.map(x=>'<option value="'+x.id+'">'+esc(x.ad)+'</option>').join("");sel.disabled=false};
const q=new URLSearchParams(location.search);
let map,hazir=false,son=null,tur=null,uydu=true;
async function iller(){try{const l=await getir("/api/idari/il");doldur(S.il,l,"İl seçin");return l}catch(e){S.il.innerHTML='<option value="">Liste alınamadı</option>';hata(e.message);return[]}}
async function ilceler(id){S.ilce.disabled=true;S.mah.disabled=true;S.ilce.innerHTML='<option>Yükleniyor…</option>';S.mah.innerHTML='<option value="">Önce ilçe seçin</option>';try{const l=await getir("/api/idari/ilce/"+id);doldur(S.ilce,l,"İlçe seçin");return l}catch(e){hata(e.message);return[]}}
async function mahalleler(id){S.mah.disabled=true;S.mah.innerHTML='<option>Yükleniyor…</option>';try{const l=await getir("/api/idari/mahalle/"+id);doldur(S.mah,l,"Mahalle / köy seçin");return l}catch(e){hata(e.message);return[]}}
S.il.onchange=()=>{hata();S.il.value&&ilceler(S.il.value)};
S.ilce.onchange=()=>{hata();S.ilce.value&&mahalleler(S.ilce.value)};
const bul=(l,ad)=>{const s=slug(ad);return l.find(x=>slug(x.ad)===s)||l.find(x=>slug(x.ad).startsWith(s)||s.startsWith(slug(x.ad)))};

function harita(){
  if(map||!window.maplibregl)return;
  map=new maplibregl.Map({container:"psHarita",center:[35.2,39.1],zoom:5,maxPitch:75,attributionControl:{compact:true},
    style:{version:8,glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources:{
        uydu:{type:"raster",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],tileSize:256,maxzoom:17,attribution:"Uydu: Esri, Maxar, Earthstar Geographics"},
        etiket:{type:"raster",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],tileSize:256,maxzoom:17},
        osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,maxzoom:19,attribution:"© OpenStreetMap katkıcıları"},
        dem:{type:"raster-dem",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],tileSize:256,maxzoom:15,encoding:"terrarium",attribution:"Yükseklik: Mapzen/AWS Terrain Tiles"}},
      layers:[{id:"uydu",type:"raster",source:"uydu"},{id:"osm",type:"raster",source:"osm",layout:{visibility:"none"}},{id:"etiket",type:"raster",source:"etiket",paint:{"raster-opacity":.85}}]}});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");
  map.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");
  map.on("load",()=>{hazir=true;
    map.addSource("parsel",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
    map.addLayer({id:"p-dolgu",type:"fill",source:"parsel",paint:{"fill-color":"#F2C35A","fill-opacity":.22}});
    map.addLayer({id:"p-isik",type:"line",source:"parsel",paint:{"line-color":"#F2C35A","line-width":9,"line-opacity":.35,"line-blur":4}});
    map.addLayer({id:"p-cizgi",type:"line",source:"parsel",paint:{"line-color":"#FFE29A","line-width":3}});
    if(son)ciz(son)});
  map.on("click",async e=>{if(map.getZoom()<13){map.flyTo({center:e.lngLat,zoom:Math.min(map.getZoom()+3,15)});return}
    await sorgu("/api/parsel?lat="+e.lngLat.lat+"&lng="+e.lngLat.lng,true)});
}
function bbox(g){let a=[180,90,-180,-90];const w=c=>{if(typeof c[0]==="number"){a[0]=Math.min(a[0],c[0]);a[1]=Math.min(a[1],c[1]);a[2]=Math.max(a[2],c[0]);a[3]=Math.max(a[3],c[1])}else c.forEach(w)};w(g.coordinates);return a}
function halkalar(g){return g.type==="Polygon"?[g.coordinates[0]]:g.type==="MultiPolygon"?g.coordinates.map(p=>p[0]):[]}
function icinde(pt,r){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c}return c}
function metre(a,b){const R=6371008.8,t=Math.PI/180,dl=(b[1]-a[1])*t,dn=(b[0]-a[0])*t,x=Math.sin(dl/2)**2+Math.cos(a[1]*t)*Math.cos(b[1]*t)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function cevre(g){return halkalar(g).reduce((s,r)=>s+r.slice(1).reduce((t,p,i)=>t+metre(r[i],p),0),0)}
function arazi(g){try{if(!map.getTerrain())return null;const b=bbox(g),rs=halkalar(g),N=9,pts=[];for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const p=[b[0]+(b[2]-b[0])*i/N,b[1]+(b[3]-b[1])*j/N];if(rs.some(r=>icinde(p,r)))pts.push(p)}
  rs.forEach(r=>r.forEach(p=>pts.push(p)));const ex=map.getTerrain().exaggeration||1;const v=pts.map(p=>({p,h:map.queryTerrainElevation(p)})).filter(x=>x.h!=null).map(x=>({p:x.p,h:x.h/ex}));if(v.length<3)return null;
  let lo=v[0],hi=v[0];v.forEach(x=>{if(x.h<lo.h)lo=x;if(x.h>hi.h)hi=x});const ort=v.reduce((s,x)=>s+x.h,0)/v.length,d=metre(lo.p,hi.p);return{ort,min:lo.h,max:hi.h,egim:d>5?(hi.h-lo.h)/d*100:0}}catch(e){return null}}
function ciz(d){if(!hazir)return;map.getSource("parsel").setData({type:"Feature",geometry:d.geometry,properties:{}});const b=bbox(d.geometry);
  map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:70,bottom:50,left:40,right:40},pitch:$("ps3b").getAttribute("aria-pressed")==="true"?58:0,bearing:-18,duration:2200,maxZoom:18.5});
  map.once("moveend",()=>setTimeout(()=>{const a=arazi(d.geometry);const el=$("psRakim");if(el&&a){el.innerHTML="<small>Rakım</small><b>"+nf(a.ort)+" m</b><span>"+nf(a.min)+"–"+nf(a.max)+" m arası</span>";$("psEgim").innerHTML="<small>Yaklaşık eğim</small><b>%"+nf(a.egim,1)+"</b><span>"+(a.egim<2?"düz":a.egim<6?"hafif eğimli":a.egim<12?"orta eğimli":"dik")+"</span>"}},900))}
const alanSayi=s=>{if(s==null)return null;if(typeof s==="number")return s;const t=String(s).trim();return parseFloat(/,\d{1,2}$/.test(t)?t.replace(/\./g,"").replace(",","."):t.replace(/,/g,""))};
function sonucHtml(d){const m2=alanSayi(d.alan),c=cevre(d.geometry),[lat,lng]=d.merkez||[];
  const link=location.origin+"/parsel-sorgu?il="+encodeURIComponent(slug(d.il))+"&ilce="+encodeURIComponent(slug(d.ilce))+"&mahalle="+encodeURIComponent(slug(d.mahalle))+"&ada="+d.ada+"&parsel="+d.parsel;
  const baslik=d.il+" "+d.ilce+" "+d.mahalle+" "+d.ada+" ada "+d.parsel+" parsel";
  return '<h2 style="margin:0 0 10px;font-family:Playfair Display,Georgia,serif">'+esc(baslik)+'</h2><div class="ps-kartlar">'
  +'<div class="ps-k"><small>Yüzölçümü</small><b>'+(m2?nf(m2)+" m²":"—")+'</b><span>'+(m2?nf(m2/1000,2)+" dönüm":"")+'</span></div>'
  +'<div class="ps-k"><small>Nitelik</small><b>'+esc(d.nitelik||"—")+'</b><span>'+esc(/^\d+$/.test(d.durum||"")?"":d.durum||"")+'</span></div>'
  +'<div class="ps-k"><small>Mevkii</small><b>'+esc(d.mevkii||"—")+'</b><span>'+(d.pafta?"Pafta "+esc(d.pafta):"")+'</span></div>'
  +'<div class="ps-k"><small>Çevre uzunluğu</small><b>'+nf(c)+' m</b><span>sınır çiti için</span></div>'
  +'<div class="ps-k" id="psRakim"><small>Rakım</small><b>…</b><span>3B görünümde hesaplanır</span></div><div class="ps-k" id="psEgim"><small>Yaklaşık eğim</small><b>…</b><span></span></div></div>'
  +'<div class="ps-baglar"><a class="ana" href="https://wa.me/?text='+encodeURIComponent(baslik+" · 3B parsel görünümü: "+link)+'" target="_blank" rel="noopener">WhatsApp\'ta paylaş</a><button type="button" id="psKopya">Bağlantıyı kopyala</button>'
  +'<a href="/ihaleler/'+slug(d.il)+'/'+slug(d.ilce)+'">'+esc(d.ilce)+' ihaleleri</a><a href="/il/'+slug(d.il)+'/'+slug(d.ilce)+'">'+esc(d.ilce)+'\'de ne ekiliyor?</a>'
  +(lat?'<a href="https://browser.dataspace.copernicus.eu/?zoom=15&lat='+lat+'&lng='+lng+'" target="_blank" rel="noopener">Güncel uydu (Sentinel-2) ↗</a><a href="https://livingatlas.arcgis.com/wayback/#mapCenter='+lng+'%2C'+lat+'%2C17" target="_blank" rel="noopener">Geçmiş fotoğraflar ↗</a><a href="https://www.google.com/maps/@?api=1&map_action=map&center='+lat+','+lng+'&zoom=18&basemap=satellite" target="_blank" rel="noopener">Google Haritalar ↗</a>':"")
  +'<button type="button" id="psKml">KML indir</button></div><p class="ps-not">Kaynak: TKGM parsel sorgu servisi. Bilgi amaçlıdır, resmî belge yerine geçmez. Rakım ve eğim yaklaşıktır.</p>'}
function kml(d){const rs=halkalar(d.geometry).map(r=>"<Polygon><outerBoundaryIs><LinearRing><coordinates>"+r.map(p=>p[0]+","+p[1]+",0").join(" ")+"</coordinates></LinearRing></outerBoundaryIs></Polygon>").join("");
  const t='<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>'+esc(d.ada+"-"+d.parsel)+'</name><Placemark><name>'+esc(d.il+" "+d.ilce+" "+d.mahalle+" "+d.ada+"/"+d.parsel)+'</name><description>Topraklık parsel sorgu · topraklik.com</description><Style><LineStyle><color>ff5ac3f2</color><width>3</width></LineStyle><PolyStyle><color>385ac3f2</color></PolyStyle></Style>'+(rs.includes("</Polygon><Polygon>")?"<MultiGeometry>"+rs+"</MultiGeometry>":rs)+'</Placemark></Document></kml>';
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"application/vnd.google-earth.kml+xml"}));a.download="parsel-"+d.ada+"-"+d.parsel+".kml";a.click()}
async function sorgu(u,noktadan){hata();const b=$("psBtn");b.disabled=true;b.textContent="Aranıyor…";
  try{const d=await getir(u);son=d;$("psBos").style.display="none";$("psArac").style.display="flex";ciz(d);const s=$("psSonuc");s.innerHTML=sonucHtml(d);s.classList.add("acik");
    $("psKopya").onclick=()=>{const l=s.querySelector("a.ana").href.split("text=")[1];navigator.clipboard?.writeText(decodeURIComponent(l).split(": ").pop());$("psKopya").textContent="Kopyalandı ✓"};
    $("psKml").onclick=()=>kml(d);
    history.replaceState(null,"","/parsel-sorgu?il="+slug(d.il)+"&ilce="+slug(d.ilce)+"&mahalle="+slug(d.mahalle)+"&ada="+d.ada+"&parsel="+d.parsel);
    if(noktadan){$("psAda").value=d.ada;$("psParsel").value=d.parsel}
    if(innerWidth<900&&!noktadan)document.querySelector(".ps-harita-kap").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){hata(e.message)}finally{b.disabled=false;b.textContent="Parseli bul"}}
$("psForm").onsubmit=e=>{e.preventDefault();if(!S.mah.value)return hata("Mahalle / köy seçin");sorgu("/api/parsel?mah="+S.mah.value+"&ada="+encodeURIComponent($("psAda").value.trim())+"&parsel="+encodeURIComponent($("psParsel").value.trim()))};
$("ps3b").onclick=e=>{const on=e.currentTarget.getAttribute("aria-pressed")!=="true";e.currentTarget.setAttribute("aria-pressed",on);if(on){map.setTerrain({source:"dem",exaggeration:1.3});map.easeTo({pitch:58,duration:900})}else{map.setTerrain(null);map.easeTo({pitch:0,bearing:0,duration:900})}};
$("psTur").onclick=e=>{const btn=e.currentTarget;if(tur){cancelAnimationFrame(tur);tur=null;btn.setAttribute("aria-pressed","false");btn.textContent="Drone turu";return}
  btn.setAttribute("aria-pressed","true");btn.textContent="Turu durdur";if(map.getPitch()<45)map.easeTo({pitch:62,duration:800});let t0=null;const b0=map.getBearing();
  const f=t=>{if(t0==null)t0=t;map.rotateTo(b0+((t-t0)/1000)*14%360,{duration:0});tur=requestAnimationFrame(f)};tur=requestAnimationFrame(f)};
$("psKat").onclick=e=>{uydu=!uydu;map.setLayoutProperty("uydu","visibility",uydu?"visible":"none");map.setLayoutProperty("etiket","visibility",uydu?"visible":"none");map.setLayoutProperty("osm","visibility",uydu?"none":"visible");e.currentTarget.textContent=uydu?"Haritaya geç":"Uyduya geç"};
function basla(){harita();if(map)map.on("load",()=>{map.setTerrain({source:"dem",exaggeration:1.3})})}
if(window.maplibregl)basla();else addEventListener("load",basla);
(async()=>{const l=await iller();const il=q.get("il"),ilce=q.get("ilce"),mh=q.get("mahalle"),ada=q.get("ada"),pr=q.get("parsel");
  if(ada)$("psAda").value=ada;if(pr)$("psParsel").value=pr;
  if(!il)return;const a=bul(l,il);if(!a)return;S.il.value=a.id;const l2=await ilceler(a.id);if(!ilce)return;const b=bul(l2,ilce);if(!b)return;S.ilce.value=b.id;
  const l3=await mahalleler(b.id);if(!mh)return;const c=bul(l3,mh.replace(/-(mahallesi|koyu|mah)$/,""));if(!c)return;S.mah.value=c.id;if(ada&&pr)sorgu("/api/parsel?mah="+c.id+"&ada="+ada+"&parsel="+pr)})();
})();`;
