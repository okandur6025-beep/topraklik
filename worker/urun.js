/* Ürün rehberleri: veriler icerik/urunler/*.py dosyalarından derlenen urunler.json içinden gelir. */
import DATA from "./urunler.json";
const URUNLER = DATA.urunler;
export const IL_AD = DATA.iller;
export const URUN_LISTE = URUNLER;

export const URUN = Object.fromEntries(URUNLER.map((u) => [u.slug, u]));
const IL_URUN = {};
for (const u of URUNLER) {
  for (const il of u.yaygin) (IL_URUN[il] ||= []).push({ urun: u.slug, ad: u.ad, durum: "yaygin" });
  for (const il of u.uygun) (IL_URUN[il] ||= []).push({ urun: u.slug, ad: u.ad, durum: "uygun" });
}
export const urunleriIl = (il) => IL_URUN[il] || [];

const tl = (n) => Math.round(n).toLocaleString("tr-TR") + " TL";
const MOD = { kuru: "Kuru (yağmura dayalı)", sulu: "Sulu", tek: "Standart", sera: "Sera / örtüaltı", acik: "Açık tarla" };

export function varsayilanNet(z) {
  const m = Object.keys(z.verim).filter((k) => k !== "aralik")[0];
  const v = z.verim[m], c = typeof z.maliyet === "object" ? z.maliyet[m] : z.maliyet, f = typeof z.fiyat === "object" ? z.fiyat[m] : z.fiyat;
  return { mod: m, verim: v, fiyat: f, gelir: v * f, maliyet: c, net: v * f - c + (z.destek || 0) };
}

const trSayi = (n) => (Math.abs(n) < 10 && n !== Math.round(n) ? n.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : Math.round(n).toLocaleString("tr-TR"));
const trGun = (t) => { const [y, m, g] = String(t).split("-"); return g ? `${+g}.${m}.${y}` : t; };

/* Canlı piyasa fiyatlarını (fiyat tablosu) ürün verisine uygular. Resmî fiyatı (TMO vb.) olan ürünlerde varsayılan değişmez. */
export function fiyatUygula(u, rows) {
  if (!u.kazanc || !rows?.length) return u;
  const z = { ...u.kazanc, piyasa: [] };
  const tahmin = typeof u.kazanc.fiyat === "object" ? Object.values(u.kazanc.fiyat)[0] : u.kazanc.fiyat;
  const makul = (r) => r && r.deger >= tahmin * 0.3 && r.deger <= tahmin * 3.5; // birim farkı veya hatalı kayıt varsa kullanma
  const b = rows.find((r) => r.kaynak === "borsa" && makul(r)), h = rows.find((r) => r.kaynak === "hal" && r.deger > 0);
  if (b) {
    const borsalar = [...new Set(JSON.parse(b.detay || "[]").map((x) => x.b.replace(/\s*ticaret borsas[ıi]\s*$/i, "").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())))].slice(0, 3).join(", ");
    z.piyasa.push([`Borsa ortalaması ${trSayi(b.deger)} TL/kg: son 60 günde ${b.islem} kayıt, en son ${trGun(b.tarih)}${borsalar ? " (" + borsalar + ")" : ""}. TOBB ticaret borsaları`, "https://borsa.tobb.org.tr/fiyat_urun_1.php"]);
    if (!u.kazanc.fiyat_kaynak) {
      z.fiyat = typeof z.fiyat === "object" ? Object.fromEntries(Object.keys(z.fiyat).map((k) => [k, b.deger])) : b.deger;
      z.fiyat_kaynak = [`Ticaret borsaları son 60 gün ağırlıklı ortalaması (TOBB, ${trGun(b.tarih)})`, "https://borsa.tobb.org.tr/fiyat_urun_1.php"];
    }
  }
  if (h) z.piyasa.push([`İzmir Hali toptan ortalaması ${trSayi(h.deger)} TL/kg (${trGun(h.tarih)}). Hal fiyatına komisyon, nakliye ve fire dahildir; üreticinin eline geçen fiyat daha düşüktür. İzmir Büyükşehir açık veri`, "https://acikveri.bizizmir.com"]);
  const yeni = { ...u, kazanc: z };
  if (z.fiyat !== u.kazanc.fiyat) {
    const d = varsayilanNet(z), br = z.birim || "kg";
    yeni.sss = u.sss.map((f) => (f.q.startsWith("1 dönüm") ? { ...f, a: `Güncel piyasa fiyatıyla dekarda yaklaşık ${trSayi(d.verim)} ${br} ürün ve ${trSayi(d.fiyat)} TL/${br} fiyatla brüt gelir ${trSayi(d.gelir)} TL, masraf ${trSayi(d.maliyet)} TL${z.destek ? `, destek ${trSayi(z.destek)} TL` : ""}; tahmini net ${trSayi(d.net)} TL olur (arazi kirası hariç). Verim ve fiyat bölgeye göre değişir; sayfadaki hesaplayıcıyla kendi rakamlarınızı girin.${z.ilk ? " " + z.ilk + "." : ""}` } : f));
  }
  return yeni;
}

function kazancHtml(u, esc, iv) {
  const z = u.kazanc;
  if (!z) return "";
  const mods = Object.keys(z.verim).filter((k) => k !== "aralik");
  const d = varsayilanNet(z);
  const data = JSON.stringify({ verim: z.verim, maliyet: z.maliyet, fiyat: z.fiyat, destek: z.destek || 0 }).replace(/</g, "\\u003c");
  const sel = mods.length > 1 ? `<label>Sulama<select id="kMod">${mods.map((m) => `<option value="${m}">${MOD[m] || m}</option>`).join("")}</select></label>` : `<input type="hidden" id="kMod" value="${mods[0]}">`;
  return `<h2 id="kazanc">${esc(u.ad)} ne kadar kazandırır? Tahmini hesap</h2>
<p>Varsayılan değerlerle 1 dekarda (1 dönüm = 1.000 m²) ${esc(MOD[d.mod]?.toLowerCase() || "")} üretimde tahmini brüt gelir <b>${tl(d.gelir)}</b>, üretim masrafı <b>${tl(d.maliyet)}</b>${z.destek ? `, destek <b>${tl(z.destek)}</b>` : ""}; geriye kalan <b>${tl(d.net)}</b>. Kendi alanınızı ve bölgenizdeki fiyatı girerek hesaplayın:</p>
<div class="calc" id="kCalc">${sel}
${iv?.rows?.length ? `<label style="grid-column:1/-1">İlçenizin ortalama verimi (TÜİK ${iv.yil})<select id="kIlce"><option value="">İlçe seçin; verim kutusuna yazılsın</option>${Object.entries(iv.rows.reduce((o, r) => ((o[r[0]] ||= []).push(r), o), {})).map(([il, xs]) => `<optgroup label="${esc(IL_AD[il] || il)}">${xs.map((r) => `<option value="${r[2]}">${esc(r[1])}: ${r[2].toLocaleString("tr-TR")} kg/da</option>`).join("")}</optgroup>`).join("")}</select></label>` : ""}
<label>Alan (dekar / dönüm)<input id="kDa" type="number" min="0" step="0.5" value="10"></label>
<label>Verim (${esc(z.birim || "kg")}/dekar)<input id="kV" type="number" min="0" step="any"></label>
<label>Satış fiyatı (TL/${esc(z.birim || "kg")})<input id="kF" type="number" min="0" step="any"></label>
<label>Üretim masrafı (TL/dekar)<input id="kM" type="number" min="0" step="any"></label>
<label>Destek (TL/dekar)<input id="kD" type="number" min="0" step="any" value="${z.destek || 0}"></label>
<label>Arazi kirası (TL/dekar)<input id="kK" type="number" min="0" step="any" value="0"></label>
<div class="out" id="kOut" aria-live="polite"></div></div>
<ul class="kz">
<li><b>Verim:</b> ${esc(z.verim.aralik || "")}${z.verim_not ? " · " + esc(z.verim_not) : ""}</li>
<li><b>Fiyat:</b> ${typeof z.fiyat === "object" ? Object.entries(z.fiyat).map(([k, v]) => `${(MOD[k] || k).toLocaleLowerCase("tr")} ${v.toLocaleString("tr-TR")}`).join(", ") : z.fiyat.toLocaleString("tr-TR")} TL/${esc(z.birim || "kg")} · ${z.fiyat_kaynak ? `<a href="${esc(z.fiyat_kaynak[1])}" target="_blank" rel="noopener">${esc(z.fiyat_kaynak[0])}</a>` : esc(z.fiyat_not || "Ekim 2026 yaklaşık üretici fiyatı (Topraklık tahmini); bölgenizdeki borsa ve hal fiyatını girin.")}</li>
<li><b>Masraf:</b> ${esc(z.maliyet_not || "Tohum/fide, gübre, ilaç, mazot ve makine, işçilik ve sulama dahil; arazi kirası hariç. Ekim 2026 fiyatlarıyla Topraklık tahminidir.")}</li>
${(z.piyasa || []).map(([t, l]) => `<li><b>Piyasa:</b> ${esc(t)} · <a href="${esc(l)}" target="_blank" rel="noopener">kaynak</a></li>`).join("")}
${z.destek ? `<li><b>Destek:</b> ${esc(z.destek_not || "")}</li>` : ""}
${z.ilk ? `<li><b>Verime yatma:</b> ${esc(z.ilk)}${z.kurulum ? ` · Kuruluş maliyeti yaklaşık ${tl(z.kurulum)}/dekar (ilk yıl, bir kez)` : ""}</li>` : ""}
${z.notu ? `<li>${esc(z.notu)}</li>` : ""}</ul>
<p class="note">Hesap tahminidir. Gerçek kazanç; toprak, iklim, çeşit, bakım, hasat zamanı ve satış kanalına göre büyük değişir. Ekim öncesi il veya ilçe tarım müdürlüğüne ve ziraat odasına danışın.</p>
<script>(()=>{const Z=${data},$=(i)=>document.getElementById(i),f=(n)=>Math.round(n).toLocaleString("tr-TR")+" TL";
const pick=(o,m)=>typeof o==="object"?o[m]:o;function set(){const m=$("kMod").value;$("kV").value=pick(Z.verim,m);$("kF").value=pick(Z.fiyat,m);$("kM").value=pick(Z.maliyet,m);calc()}
function calc(){const a=+$("kDa").value||0,v=+$("kV").value||0,p=+$("kF").value||0,c=+$("kM").value||0,d=+$("kD").value||0,k=+$("kK").value||0;
const g=a*v*p,t=a*(c+k),n=g-t+a*d;$("kOut").innerHTML="<div><span>Ürün</span><b>"+(+(a*v).toFixed(a*v<10?2:0)).toLocaleString("tr-TR")+" ${esc(z.birim || "kg")}</b></div><div><span>Brüt gelir</span><b>"+f(g)+"</b></div><div><span>Masraf"+(k?" + kira":"")+"</span><b>"+f(t)+"</b></div>"+(d?"<div><span>Destek</span><b>"+f(a*d)+"</b></div>":"")+"<div class=net><span>Tahmini net</span><b>"+f(n)+"</b></div><div><span>Dekar başına net</span><b>"+f(a?n/a:0)+"</b></div>"}
$("kMod").addEventListener("change",set);const ic=$("kIlce");ic&&ic.addEventListener("change",()=>{if(ic.value){$("kV").value=ic.value;calc()}});["kDa","kV","kF","kM","kD","kK"].forEach(i=>$(i).addEventListener("input",calc));set()})()</script>`;
}

function ilceVerimTablo(iv, u, esc) {
  if (!iv?.rows?.length) return "";
  const top = [...iv.rows].filter((r) => r[3] >= 1000).sort((a, b) => b[2] - a[2]).slice(0, 10);
  const genis = [...iv.rows].sort((a, b) => b[3] - a[3]).slice(0, 10);
  const satir = (r) => `<tr><td>${esc(IL_AD[r[0]] || r[0])} / ${esc(r[1])}</td><td>${r[2].toLocaleString("tr-TR")} kg/da</td><td>${r[3].toLocaleString("tr-TR")} da</td></tr>`;
  return `<h2>${esc(u.ad)} en çok hangi ilçelerde ekiliyor? (TÜİK ${iv.yil})</h2><table><thead><tr><th>İl / ilçe</th><th>Verim</th><th>Ekilen alan</th></tr></thead><tbody>${genis.map(satir).join("")}</tbody></table>
${top.length ? `<h3>En yüksek verim alınan ilçeler</h3><p>En az 1.000 dekar ekilen ilçeler arasında:</p><table><thead><tr><th>İl / ilçe</th><th>Verim</th><th>Ekilen alan</th></tr></thead><tbody>${top.map(satir).join("")}</tbody></table>` : ""}
<p class="src">Kaynak: TÜİK Bitkisel Üretim İstatistikleri, ilçe düzeyi (${iv.yil}). Toplam ${iv.rows.length} ilçede ekim yapıldı.</p>`;
}

export const URUN_CSS = `.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0}.facts div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px}.facts span{display:block;font-size:12px;color:var(--muted)}.facts b{font-size:14.5px}
.calc{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;background:var(--gsoft);border-radius:14px;padding:16px;margin:12px 0}.calc label{display:flex;flex-direction:column;font-size:13px;font-weight:700;color:var(--muted);gap:4px}.calc input,.calc select{box-sizing:border-box;font:600 16px inherit;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);width:100%}
.calc .out{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.calc .out div{background:var(--card);border-radius:10px;padding:10px 12px}.calc .out span{display:block;font-size:12px;color:var(--muted)}.calc .out b{font-size:17px}.calc .out .net{background:var(--green);color:#fff}.calc .out .net span{color:#e6efe0}
ul.kz{font-size:14.5px;padding-left:18px}ul.kz li{margin:4px 0}.chips a{display:inline-block;margin:0 6px 8px 0;text-decoration:none}`;

export function urunPage(u, { esc, IL_AD, related, iv }) {
  const ilLinks = (xs) => xs.map((x) => `<a class="tag" href="/il/${x}">${esc(IL_AD[x] || x)}</a>`).join("");
  const sec = (t, s) => (s ? `<h2>${t}</h2>${String(s).split("\n\n").map((p) => `<p>${esc(p)}</p>`).join("")}` : "");
  const z = u.kazanc;
  const facts = [["Grup", u.kat], u.latin && ["Bilimsel adı", u.latin], u.ekim_kisa && ["Ekim / dikim", u.ekim_kisa], u.hasat_kisa && ["Hasat", u.hasat_kisa], z?.verim?.aralik && ["Verim", z.verim.aralik], u.omur && ["Ekonomik ömür", u.omur]].filter(Boolean);
  return `<h1>${esc(u.h1 || u.ad + " yetiştiriciliği")}</h1><p class="answer">${esc(u.ozet)}</p>
<div class="facts">${facts.map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}</div>
${sec("İklim isteği", u.iklim)}${sec("Toprak isteği", u.toprak)}${sec("Ekim ve dikim", u.ekim)}${sec("Bakım, sulama ve gübreleme", u.bakim)}${sec("Hasat ve depolama", u.hasat)}
${u.bolge.length ? `<h2>Bölgelere göre ${esc(u.ad.toLocaleLowerCase("tr"))} yetiştiriciliği</h2><table><thead><tr><th>Bölge</th><th>Durum ve zamanlama</th></tr></thead><tbody>${u.bolge.map(([b, t]) => `<tr><td>${esc(b)}</td><td>${esc(t)}</td></tr>`).join("")}</tbody></table>` : ""}
${u.yaygin.length || u.uygun.length ? `<h2>Hangi illerde yetişir?</h2>${u.yaygin.length ? `<p><b>En çok üretildiği iller:</b></p><p class="chips">${ilLinks(u.yaygin)}</p>` : ""}${u.uygun.length ? `<p><b>Uygun koşullarda yetiştirilebileceği iller:</b></p><p class="chips">${ilLinks(u.uygun)}</p>` : ""}<p>İl içinde rakım, sulama ve toprağa göre büyük farklar olur. İlçe ve köy düzeyinde karar vermeden önce toprak analizi yaptırın.</p>` : ""}
${u.ilce ? sec("İlçe düzeyinde öne çıkan yerler", u.ilce) : ""}
${kazancHtml(u, esc, iv)}${ilceVerimTablo(iv, u, esc)}
${u.dikkat ? `<p class="note"><b>Dikkat:</b> ${esc(u.dikkat)}</p>` : ""}
${u.sss.length ? `<h2>Sık sorulan sorular</h2>${u.sss.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}` : ""}
<div class="src">Son güncelleme: ${esc(u.guncel || "Ekim 2026")} · Kaynaklar: ${u.kaynak.map(([n, l]) => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(", ")}<br>Bu sayfa bilgilendirme amaçlıdır; ekim kararı öncesi il/ilçe tarım müdürlüğüne danışın.</div>
${related.length ? `<h2>Aynı gruptan diğer ürünler</h2><p class="chips">${related.map((r) => `<a class="tag" href="/urun/${r.slug}">${esc(r.ad)}</a>`).join("")}</p>` : ""}`;
}

export function urunJsonLd(u, SITE) {
  const out = [{ "@context": "https://schema.org", "@type": "Article", headline: u.h1 || u.ad + " yetiştiriciliği", description: u.ozet, inLanguage: "tr", dateModified: "2026-10-27", publisher: { "@type": "Organization", name: "Topraklık", url: SITE } }];
  if (u.sss.length) out.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: u.sss.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  return out;
}
