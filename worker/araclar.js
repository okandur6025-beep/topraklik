/* Hesaplama araçları: veritabanı kullanmaz, tamamı tarayıcıda çalışır. */

const ORTAK_CSS = `.arac{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;background:var(--gsoft);border-radius:14px;padding:18px;margin:16px 0}
.arac label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:var(--muted)}
.arac input,.arac select{box-sizing:border-box;font:600 16px inherit;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);width:100%}
.arac .chk{flex-direction:row;align-items:center;gap:8px}.arac .chk input{width:auto}
.sonuc{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.sonuc div{background:var(--card);border-radius:10px;padding:10px 12px}.sonuc span{display:block;font-size:12px;color:var(--muted)}.sonuc b{font-size:18px}
.sonuc .ana{background:var(--green);color:#fff}.sonuc .ana span{color:#e6efe0}`;

const TL = `const tl=(n)=>(Math.round(n)||0).toLocaleString("tr-TR")+" TL",$=(i)=>document.getElementById(i),v=(i)=>parseFloat(String($(i).value).replace(",","."))||0;`;

export const ARACLAR = {
  "tapu-harci-hesaplama": {
    ad: "Tapu harcı hesaplama", kisa: "Alıcı ve satıcının ödeyeceği tapu harcı ile döner sermaye ücretini hesaplayın.",
    title: "Tapu harcı hesaplama 2026: tapu masrafı ne kadar?",
    desc: "2026 tapu harcı hesaplama aracı: satış bedeline göre alıcı ve satıcı tapu harcı (%2 + %2), döner sermaye ücreti ve toplam tapu masrafı.",
    govde: `<p class="answer">Tapu harcı, tapuda beyan edilen satış bedelinin <b>%2'si alıcıdan, %2'si satıcıdan</b> olmak üzere toplam %4'tür. Buna tapu müdürlüğünün döner sermaye ücreti eklenir. Beyan edilen bedel, taşınmazın emlak vergi değerinin altında olamaz.</p>
<div class="arac">
<label>Satış bedeli (TL)<input id="b" type="number" min="0" step="1000" value="1000000"></label>
<label>Emlak vergi değeri (TL, belediyeden)<input id="e" type="number" min="0" step="1000" placeholder="bilmiyorsanız boş bırakın"></label>
<label>Döner sermaye ücreti (TL)<input id="d" type="number" min="0" step="1" value="6681"></label>
<label>Harcı kim ödüyor?<select id="k"><option value="ayri">Herkes kendi payını</option><option value="alici">Tamamını alıcı</option></select></label>
<div class="sonuc" id="o"></div></div>
<ul><li>Hesapta esas alınan bedel: beyan edilen bedel ile emlak vergi değerinden yüksek olanıdır.</li><li>Döner sermaye ücreti ilçeye göre değişir; 2026 ortalaması yaklaşık 6.681 TL olarak açıklanmıştır. Kesin tutarı randevu sırasında tapu müdürlüğü bildirir.</li><li>Tapu harcı, randevudan önce Tapu ve Kadastro'nun internet sitesi veya banka üzerinden ödenir.</li></ul>
<h2>Gerçek bedeli yazmak neden önemli?</h2><p>Tapuda gerçek satış bedelinin altında değer gösterilirse aradaki fark üzerinden harç, vergi ziyaı cezası ve faiz istenebilir. Ayrıca beş yıl içinde satışta değer artış kazancı vergisi düşük gösterilen bedel üzerinden hesaplanacağından satıcı aleyhine sonuç doğabilir.</p>`,
    js: `function h(){const b=Math.max(v("b"),v("e")),a=b*.02,s=b*.02,d=v("d"),hep=$("k").value==="alici";$("o").innerHTML="<div><span>Harç matrahı</span><b>"+tl(b)+"</b></div><div><span>Alıcı harcı (%2)</span><b>"+tl(hep?a+s:a)+"</b></div><div><span>Satıcı harcı (%2)</span><b>"+tl(hep?0:s)+"</b></div><div><span>Döner sermaye</span><b>"+tl(d)+"</b></div><div class=ana><span>Toplam tapu masrafı</span><b>"+tl(a+s+d)+"</b></div>"}["b","e","d","k"].forEach(i=>$(i).addEventListener("input",h));h()`,
    sss: [["Tapu harcı 2026'da yüzde kaç?", "Satış bedelinin %2'si alıcıdan, %2'si satıcıdan alınır; toplam %4'tür."], ["Tapu harcını kim öder?", "Kanuna göre alıcı ve satıcı kendi paylarını öder; taraflar anlaşırsa tamamını biri ödeyebilir."], ["Döner sermaye ücreti ne kadar?", "İlçeye göre değişir; 2026 için ortalama yaklaşık 6.681 TL'dir."]],
    kaynak: [["Tapu ve Kadastro Genel Müdürlüğü", "https://www.tkgm.gov.tr"], ["2026 tapu harcı ve döner sermaye (Milliyet)", "https://www.milliyet.com.tr/emlak/tapu-devir-ucreti-nedir-2026-tapu-harci-masrafi-ne-kadar-oldu-6515059"]],
  },
  "icra-ihalesi-maliyet-hesaplama": {
    ad: "İcra ihalesi maliyet hesaplama", kisa: "İhale bedeline KDV, tapu harcı, damga vergisi ve masrafları ekleyip toplam maliyeti görün.",
    title: "İcra ihalesi masrafı hesaplama: KDV, tapu harcı, damga vergisi",
    desc: "İcradan arsa, tarla veya ev alırken ihale bedeline eklenen KDV, tapu harcı, damga vergisi ve teslim masraflarını hesaplayın; teminat ve en düşük teklif tutarını görün.",
    govde: `<p class="answer">İcra ihalesinde ödenecek tutar ihale bedelinden fazladır. Bedele <b>KDV</b> (arsa ve tarlada çoğunlukla %10, şartnamede yazıyorsa %20), alıcı payı <b>tapu harcı (%2)</b>, <b>damga vergisi (binde 5,69)</b> ve teslim masrafları eklenir.</p>
<div class="arac">
<label>Muhammen (tahmini) bedel (TL)<input id="m" type="number" min="0" step="1000" value="1000000"></label>
<label>Vereceğiniz teklif (TL)<input id="t" type="number" min="0" step="1000" value="700000"></label>
<label>KDV oranı<select id="k"><option value="10">%10 (arsa, tarla)</option><option value="20">%20 (şartnamede yazıyorsa)</option><option value="1">%1</option><option value="0">KDV yok / istisna</option></select></label>
<label>Teslim ve diğer masraflar (TL)<input id="x" type="number" min="0" step="100" value="5000"></label>
<div class="sonuc" id="o"></div></div>
<ul><li>Teklif verebilmek için muhammen bedelin <b>%10'u</b> kadar teminat yatırılır.</li><li>İlk ve ikinci artırmada teklif, muhammen bedelin en az <b>%50'si</b> olmalıdır (mirasçılara özel ilk artırmada %100).</li><li>Satış bedeli kesinleşmeden itibaren 7 gün içinde ödenir; ödenmezse teminat yanabilir ve fark sorumluluğu doğar.</li><li>KDV oranı ve vergiler her ilanın şartnamesinde yazar; hesaplamadan önce şartnameyi okuyun.</li></ul>
<p>Adım adım anlatım için <a href="/rehber/icra-ihalesine-nasil-girilir">icra ihalesine nasıl girilir</a> ve <a href="/rehber/icra-ihalesinin-feshi">icra ihalesinin feshi</a> rehberlerine, güncel ilanlar için <a href="/ihaleler?kaynak=icra">icra ihalelerine</a> bakın.</p>`,
    js: `function h(){const m=v("m"),t=v("t"),k=v("k")/100,kdv=t*k,tap=t*.02,dv=t*.00569,x=v("x");$("o").innerHTML="<div><span>Teminat (%10)</span><b>"+tl(m*.1)+"</b></div><div><span>En düşük teklif (%50)</span><b>"+tl(m*.5)+"</b></div><div><span>KDV</span><b>"+tl(kdv)+"</b></div><div><span>Tapu harcı (%2)</span><b>"+tl(tap)+"</b></div><div><span>Damga vergisi (‰5,69)</span><b>"+tl(dv)+"</b></div><div><span>Diğer masraflar</span><b>"+tl(x)+"</b></div><div class=ana><span>Toplam maliyet</span><b>"+tl(t+kdv+tap+dv+x)+"</b></div><div><span>Muhammen bedele göre</span><b>%"+(m?Math.round((t+kdv+tap+dv+x)/m*100):0)+"</b></div>"+(t&&m&&t<m*.5?"<div style='grid-column:1/-1;background:var(--soft)'><span>Uyarı</span><b style='font-size:15px'>Teklif muhammen bedelin %50'sinin altında; ihale bu bedelle yapılamaz.</b></div>":"")}["m","t","k","x"].forEach(i=>$(i).addEventListener("input",h));h()`,
    sss: [["İcra ihalesinde KDV ne kadar?", "Arsa ve tarlalarda genellikle %10'dur; şartnamede %20 yazıyorsa o uygulanır. Bazı satışlar KDV'den istisnadır."], ["İcra ihalesinde teminat ne kadar?", "Muhammen bedelin %10'udur."], ["İcra ihalesinde en düşük teklif ne olmalı?", "Muhammen bedelin en az %50'si olmalıdır."]],
    kaynak: [["2004 sayılı İcra ve İflas Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.3.2004.pdf"], ["UYAP e-Satış", "https://esatis.uyap.gov.tr"]],
  },
  "donum-metrekare-cevirme": {
    ad: "Dönüm, m², dekar ve hektar çevirici", kisa: "Arazi ölçülerini birbirine çevirin; 1 dönüm = 1 dekar = 1.000 m².",
    title: "Dönüm metrekare çevirme: 1 dönüm kaç m²? Dekar, hektar, evlek",
    desc: "Dönüm, metrekare, dekar, hektar, evlek ve eski dönüm (Osmanlı dönümü) arasında çeviri. 1 dönüm kaç metrekare sorusunun cevabı.",
    govde: `<p class="answer">Türkiye'de bugün kullanılan <b>1 dönüm = 1 dekar = 1.000 m²</b>'dir. 1 hektar 10 dönümdür (10.000 m²). Eski tapularda geçen Osmanlı (eski) dönümü yaklaşık 919,3 m²'dir; 1 evlek 250 m²'dir.</p>
<div class="arac">
<label>Değer<input id="d" type="number" min="0" step="any" value="1"></label>
<label>Birim<select id="u"><option value="1000">Dönüm / dekar</option><option value="1">Metrekare (m²)</option><option value="10000">Hektar</option><option value="250">Evlek</option><option value="919.3">Eski (Osmanlı) dönüm</option><option value="1000000">Kilometrekare</option></select></label>
<div class="sonuc" id="o"></div></div>
<h2>Tarla ölçüleri hakkında</h2><p>Tapuda alan her zaman metrekare olarak yazar. Tarla ve bahçe işlerinde dönüm (dekar) kullanılır; verim de "dekar başına kilogram" olarak verilir. Tarım arazisinin bölünmesinde 5403 sayılı Kanun'un en küçük parsel büyüklükleri geçerlidir: mutlak, marjinal ve özel ürün arazilerinde 20 dönüm, dikili tarım arazilerinde 5 dönüm, örtüaltı tarımında 3 dönüm.</p>`,
    js: `function h(){const m=v("d")*v("u"),f=(n,d)=>n.toLocaleString("tr-TR",{maximumFractionDigits:d});$("o").innerHTML="<div class=ana><span>Metrekare</span><b>"+f(m,2)+" m²</b></div><div><span>Dönüm / dekar</span><b>"+f(m/1000,4)+"</b></div><div><span>Hektar</span><b>"+f(m/10000,4)+"</b></div><div><span>Evlek</span><b>"+f(m/250,2)+"</b></div><div><span>Eski dönüm</span><b>"+f(m/919.3,3)+"</b></div>"}["d","u"].forEach(i=>$(i).addEventListener("input",h));h()`,
    sss: [["1 dönüm kaç metrekare?", "1 dönüm 1.000 m²'dir (1 dekar)."], ["1 hektar kaç dönüm?", "1 hektar 10 dönümdür, yani 10.000 m²."], ["Eski dönüm kaç m²?", "Osmanlı dönümü yaklaşık 919,3 m²'dir; eski tapularda görülebilir."]],
    kaynak: [["5403 sayılı Toprak Koruma ve Arazi Kullanımı Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5403.pdf"]],
  },
  "hisseli-tapu-pay-hesaplama": {
    ad: "Hisseli tapu pay hesaplama", kisa: "Hisse oranınızın kaç m² ve kaç TL ettiğini, kaç dönüme denk geldiğini hesaplayın.",
    title: "Hisseli tapu pay hesaplama: hissem kaç m² ve kaç TL eder?",
    desc: "Hisseli tapuda pay/payda oranına göre hissenizin metrekaresini, dönümünü ve değerini hesaplayın. Örnek: 1/4 hisse kaç m²?",
    govde: `<p class="answer">Hisseli tapuda payınız, toplam alanın <b>pay ÷ payda</b> kadarıdır. Örneğin 10.000 m²'lik tarlada 1/4 hisse 2.500 m²'ye denk gelir. Ancak bu alan arazide belirli bir yer değildir; tüm parsel üzerinde ortak mülkiyettir.</p>
<div class="arac">
<label>Parselin toplam alanı (m²)<input id="a" type="number" min="0" step="1" value="10000"></label>
<label>Pay<input id="p" type="number" min="0" step="1" value="1"></label>
<label>Payda<input id="q" type="number" min="1" step="1" value="4"></label>
<label>Parselin tamamının değeri (TL, isteğe bağlı)<input id="t" type="number" min="0" step="1000" placeholder="örn. 2000000"></label>
<label class="chk"><input id="i" type="checkbox"> Hisseli satış indirimi uygula (%20)</label>
<div class="sonuc" id="o"></div></div>
<ul><li>Hisseli taşınmazlar genellikle tam mülkiyete göre daha düşük fiyattan alınıp satılır; indirim oranı bölgeye ve ortak sayısına göre değişir.</li><li>Ortaklar arasında anlaşma yoksa ortaklığın giderilmesi (izale-i şuyu) davasıyla satış istenebilir.</li><li>Tarım arazilerinde hisse satışı ve bölünme 5403 sayılı Kanun'a tabidir.</li></ul>
<p>Ayrıntılar için <a href="/rehber/hisseli-tapu-nedir">hisseli tapu</a> rehberine bakın.</p>`,
    js: `function h(){const a=v("a"),p=v("p"),q=v("q")||1,o=p/q,m=a*o,t=v("t"),ind=$("i").checked?.8:1;$("o").innerHTML="<div class=ana><span>Hisseniz</span><b>"+m.toLocaleString("tr-TR",{maximumFractionDigits:2})+" m²</b></div><div><span>Dönüm</span><b>"+(m/1000).toLocaleString("tr-TR",{maximumFractionDigits:3})+"</b></div><div><span>Oran</span><b>%"+(o*100).toLocaleString("tr-TR",{maximumFractionDigits:3})+"</b></div>"+(t?"<div><span>Hissenizin değeri</span><b>"+tl(t*o*ind)+"</b></div>":"")}["a","p","q","t","i"].forEach(i=>$(i).addEventListener("input",h));h()`,
    sss: [["1/4 hisse kaç m²?", "Parsel alanının dörtte biridir; 10.000 m²'lik parselde 2.500 m²."], ["Hisseli tapu satılabilir mi?", "Evet, hissedar kendi payını satabilir; diğer hissedarların yasal önalım hakkı vardır."]],
    kaynak: [["4721 sayılı Türk Medeni Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.4721.pdf"]],
  },
};

export function aracSayfa(slug, { esc, page, html, IL_YOK }) {
  const a = ARACLAR[slug];
  if (!a) return null;
  const digerleri = Object.entries(ARACLAR).filter(([k]) => k !== slug);
  const body = `<style>${ORTAK_CSS}</style><div class="crumb"><a href="/">Ana sayfa</a> › <a href="/araclar">Araçlar</a> › ${esc(a.ad)}</div>
<div class="layout"><article><h1>${esc(a.title)}</h1>${a.govde}
<h2>Sık sorulan sorular</h2>${a.sss.map(([q, c]) => `<details><summary>${esc(q)}</summary><p>${esc(c)}</p></details>`).join("")}
<div class="src">Kaynaklar: ${a.kaynak.map(([n, l]) => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(", ")}<br>Hesaplamalar bilgilendirme amaçlıdır; kesin tutarlar için ilgili kuruma danışın.</div></article>
<aside><h3>Diğer araçlar</h3>${digerleri.map(([k, x]) => `<a class="card" href="/araclar/${k}"><b>${esc(x.ad)}</b><span>${esc(x.kisa)}</span></a>`).join("")}<a class="card" href="/parsel-sorgu"><b>Parsel sorgulama</b><span>Ada ve parsel numarasıyla tarlayı haritada bulun.</span></a></aside></div>
<script>(()=>{${TL}${a.js}})()</script>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "WebApplication", name: a.ad, applicationCategory: "FinanceApplication", operatingSystem: "Tüm tarayıcılar", offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" }, url: `https://topraklik.com/araclar/${slug}` },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.sss.map(([q, c]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: c } })) }];
  return html(page({ title: `${a.title} · Topraklık`, description: a.desc, path: `/araclar/${slug}`, body, current: "/araclar", jsonld }), 200, 3600);
}

export function aracIndex({ esc, page, html }) {
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › Araçlar</div><h1>Arsa, tapu ve ihale hesaplama araçları</h1><p class="lead">Tapu harcından icra ihalesi maliyetine, dönüm çevirmeden hisse hesabına kadar ücretsiz araçlar.</p>
<div class="grid">${Object.entries(ARACLAR).map(([k, x]) => `<a class="card" href="/araclar/${k}"><b>${esc(x.ad)}</b><span>${esc(x.kisa)}</span></a>`).join("")}<a class="card" href="/parsel-sorgu"><b>Parsel sorgulama</b><span>Ada ve parsel numarasıyla tarlayı haritada bulun, 3B görün.</span></a></div>`;
  return html(page({ title: "Arsa, tapu ve ihale hesaplama araçları · Topraklık", description: "Ücretsiz tapu harcı hesaplama, icra ihalesi maliyet hesabı, dönüm-metrekare çevirici, hisseli tapu pay hesabı ve parsel sorgulama.", path: "/araclar", body, current: "/araclar" }), 200, 3600);
}

export function parselSorgu({ esc, page, html }) {
  const body = `<div class="crumb"><a href="/">Ana sayfa</a> › Parsel sorgulama</div>
<div class="layout"><article><h1>Parsel sorgulama: ada ve parsel ile tarla nasıl bulunur?</h1>
<p class="answer">Bir arsanın veya tarlanın yerini, sınırlarını ve alanını <b>il, ilçe, mahalle, ada ve parsel</b> numarasıyla sorgulayabilirsiniz. Topraklık'ın 3B parsel aracı parseli uydu görüntüsü üzerinde gösterir, yakınındaki ihaleleri ve bölgede ne ekildiğini birlikte sunar.</p>
<p><a class="btn dolu" href="/parsel-sorgu">3B parsel sorgu aracını aç</a> <a class="btn" href="https://parselsorgu.tkgm.gov.tr" target="_blank" rel="noopener">TKGM Parsel Sorgu</a></p>
<h2>Adım adım parsel sorgulama</h2><ol><li>Tapudaki il, ilçe ve mahalle (köy) adını seçin.</li><li>Tapu senedindeki <b>ada</b> ve <b>parsel</b> numarasını yazın.</li><li>Sonuçta parselin sınırı, yüzölçümü ve niteliği (tarla, arsa, bağ vb.) görünür.</li><li>Topraklık aracında parseli 3B görünümde inceleyebilir, aynı bölgedeki ihale ve satış fiyatlarıyla karşılaştırabilirsiniz.</li></ol>
<h2>Ada ve parsel numarası nerede yazar?</h2><p>Tapu senedinin ön yüzünde "Ada" ve "Parsel" başlıklarıyla yazar. e-Devlet'te "Tapu Bilgileri Sorgulama" hizmetinden de kendi taşınmazlarınızın ada ve parsel numarasını görebilirsiniz.</p>
<h2>Parsel sorgunun sınırları</h2><p>Parsel sorgu sonuçları bilgi amaçlıdır; resmî belge yerine geçmez. İmar durumu için belediyeden, tapu kaydı ve şerhler için tapu müdürlüğünden bilgi alınmalıdır.</p>
<p>İhaleye çıkan bir tarlayı inceliyorsanız <a href="/ihaleler">güncel ihaleler</a> sayfasında ilanın ada ve parsel bilgisini bulabilirsiniz.</p></article>
<aside><h3>Araçlar</h3>${Object.entries(ARACLAR).map(([k, x]) => `<a class="card" href="/araclar/${k}"><b>${esc(x.ad)}</b></a>`).join("")}</aside></div>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "HowTo", name: "Ada ve parsel ile parsel sorgulama", step: ["İl, ilçe ve mahalleyi seçin", "Ada ve parsel numarasını yazın", "Parselin sınırını ve alanını inceleyin"].map((t, i) => ({ "@type": "HowToStep", position: i + 1, name: t })) }];
  return html(page({ title: "Parsel sorgulama: ada parsel ile tarla ve arsa bulma, 3B görünüm · Topraklık", description: "Ada ve parsel numarasıyla tarla ve arsa sorgulama; parseli uyduda ve 3B görünümde inceleyin, yakındaki ihaleleri görün.", path: "/parsel-sorgu", body, current: "/araclar", jsonld }), 200, 3600);
}
