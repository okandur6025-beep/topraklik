/* Mobil: uygulama gibi alt menü, menü sayfası, ana ekrana ekleme (PWA). Tüm sayfalarda ve ana sayfada kullanılır. */

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IK = {
  ev: I(`<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5"/>`),
  ihale: I(`<path d="m13.5 3.5 7 7-2.8 2.8-7-7z"/><path d="m11 8.5-7.5 7.5 3 3L14 11.5"/><path d="M13 20.5h8"/>`),
  parsel: I(`<path d="m12 3 9 4.8-9 4.8-9-4.8z"/><path d="m3 12.4 9 4.8 9-4.8"/><path d="m3 16.6 9 4.8 9-4.8"/>`),
  haber: I(`<path d="M4 5h12v13.5A2.5 2.5 0 0 0 18.5 21H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M16 9h4v9.5a2.5 2.5 0 0 1-5 0"/><path d="M7.5 9h5M7.5 12.5h5M7.5 16h3"/>`),
  menu: I(`<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>`),
  arac: I(`<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>`),
  tapu: I(`<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>`),
  hibe: I(`<path d="M12 21V11"/><path d="M12 13c-4 0-6.5-2.5-6.5-6.5 4 0 6.5 2.5 6.5 6.5zM12 11c0-4 2.5-6.5 6.5-6.5 0 4-2.5 6.5-6.5 6.5z"/>`),
  urun: I(`<path d="M12 21V8"/><path d="M12 8c-2-1.5-2-4 0-5.5 2 1.5 2 4 0 5.5zM12 13c-2.6 0-4.3-1.3-4.8-3.6 2.6 0 4.3 1.3 4.8 3.6zM12 13c2.6 0 4.3-1.3 4.8-3.6-2.6 0-4.3 1.3-4.8 3.6zM12 18c-2.6 0-4.3-1.3-4.8-3.6 2.6 0 4.3 1.3 4.8 3.6zM12 18c2.6 0 4.3-1.3 4.8-3.6-2.6 0-4.3 1.3-4.8 3.6z"/>`),
  il: I(`<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>`),
  bilgi: I(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>`),
  posta: I(`<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>`),
  kapat: I(`<path d="M6 6l12 12M18 6 6 18"/>`),
  geri: I(`<path d="M15 5l-7 7 7 7"/>`),
  ekle: I(`<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>`),
};

const SEKME = [["/", "Ana sayfa", "ev"], ["/ihaleler", "İhaleler", "ihale"], ["/parsel-sorgu", "Parsel", "parsel"], ["/haberler", "Haberler", "haber"]];
const MENU = [
  ["/araclar", "Hesaplama araçları", "Tapu harcı, ihale maliyeti, dönüm", "arac"],
  ["/rehber", "İhale ve tapu rehberi", "Hisseli tapu, icra, imar", "tapu"],
  ["/hibe", "Hibe ve destek", "Çiftçi destekleri, başvurular", "hibe"],
  ["/urun", "Ürünler ve kazanç", "117 ürün, fiyat, verim", "urun"],
  ["/il", "İller", "81 il, ilçe ve mahalleler", "il"],
  ["/haberler", "Haber Bülteni", "Günün tarım ve arazi haberleri", "haber"],
  ["/hakkimizda", "Hakkımızda", "Topraklık nedir?", "bilgi"],
  ["/iletisim", "İletişim", "Öneri ve düzeltme", "posta"],
];

const aktifMi = (yol, h) => (h === "/" ? yol === "/" : yol === h || yol.startsWith(h + "/"));

export const MOBIL_META = `<link rel="manifest" href="/manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Topraklık"><meta name="apple-mobile-web-app-status-bar-style" content="default">`;

export const MOBIL_CSS = `
.tk-alt,.tk-geri{display:none}
#tk-menu{border:0;padding:0;margin:0;max-width:none;width:100%;max-height:none;height:100%;background:transparent}
#tk-menu::backdrop{background:rgba(26,30,20,.45);backdrop-filter:blur(2px)}
.tk-sayfa{position:absolute;left:0;right:0;bottom:0;background:#FFFDF8;border-radius:22px 22px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom,0px));max-height:88vh;overflow:auto;box-shadow:0 -12px 40px -12px rgba(0,0,0,.35);animation:tk-yuk .26s cubic-bezier(.2,.8,.2,1);font-family:Manrope,system-ui,sans-serif;color:#26261E}
@keyframes tk-yuk{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
.tk-tutac{width:42px;height:5px;border-radius:99px;background:#D8CFBC;margin:2px auto 10px}
.tk-sbas{display:flex;align-items:center;justify-content:space-between;margin:0 2px 12px}
.tk-sbas b{font-family:"Playfair Display",Georgia,serif;font-size:22px}
.tk-sbas button{border:0;background:#F3EEE2;border-radius:99px;width:36px;height:36px;display:grid;place-items:center;color:#26261E}
.tk-sbas button svg{width:20px;height:20px}
.tk-liste{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tk-liste a{display:flex;flex-direction:column;gap:6px;text-decoration:none;color:#26261E;background:#F6F1E6;border-radius:16px;padding:13px 13px 12px;min-height:96px}
.tk-liste a[aria-current]{background:#E3ECDA}
.tk-liste svg{width:24px;height:24px;color:#2E5130}
.tk-liste b{font-size:14.5px;line-height:1.2}.tk-liste small{font-size:12px;color:#6C6858;line-height:1.3}
.tk-kur{margin:14px 0 0;background:#2E5130;color:#F3EEE2;border-radius:16px;padding:14px 16px;display:grid;grid-template-columns:34px 1fr;gap:4px 12px;align-items:center}
.tk-kur svg{width:30px;height:30px;color:#D9B25C;grid-row:span 2}
.tk-kur b{color:#fff;font-size:15px}.tk-kur span{font-size:13px;opacity:.9;line-height:1.4}
.tk-kur button{grid-column:2;justify-self:start;margin-top:6px;border:0;border-radius:10px;background:#D9B25C;color:#26261E;font:800 14px Manrope,system-ui,sans-serif;padding:9px 14px}
.tk-kur:not([data-android]) button,.tk-kur[data-android] .tk-ios{display:none}
.tk-alt-yasal{margin:14px 2px 0;font-size:12px;color:#8A8470;text-align:center}
@media (max-width:900px){
  body{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}
  .tk-alt{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;z-index:90;left:0;right:0;bottom:0;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px));background:rgba(255,253,248,.94);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);border-top:1px solid rgba(38,38,30,.1);font-family:Manrope,system-ui,sans-serif}
  .tk-alt a,.tk-alt button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0 4px;border:0;background:none;text-decoration:none;color:#6C6858;font:700 10.5px/1.1 Manrope,system-ui,sans-serif;letter-spacing:.01em;-webkit-tap-highlight-color:transparent}
  .tk-alt svg{width:25px;height:25px}
  .tk-alt [aria-current]{color:#2E5130}
  .tk-alt [aria-current] svg{stroke-width:2.3}
  .tk-alt .tk-orta{margin-top:-22px}
  .tk-alt .tk-orta span.tk-daire{width:54px;height:54px;border-radius:50%;background:#2E5130;color:#fff;display:grid;place-items:center;box-shadow:0 8px 18px -6px rgba(46,81,48,.65),0 0 0 4px #FFFDF8}
  .tk-alt .tk-orta[aria-current] span.tk-daire{background:#B8892E}
  .tk-alt .tk-orta svg{width:26px;height:26px}
  .toast,.tray{bottom:calc(86px + env(safe-area-inset-bottom,0px))!important}
  header.top nav{display:none}
  .top .wrap{min-height:56px}
}
@media (display-mode:standalone){.tk-geri{display:inline-grid;place-items:center;width:36px;height:36px;border-radius:50%;border:0;background:#F3EEE2;color:#26261E;margin-right:6px}.tk-geri svg{width:20px;height:20px}}`;

export function mobilAlt(yol = "/") {
  const sek = SEKME.map(([h, t, i], k) => {
    const ak = aktifMi(yol, h) ? ' aria-current="page"' : "";
    return k === 2 ? `<a class="tk-orta" href="${h}"${ak}><span class="tk-daire">${IK[i]}</span>${t}</a>` : `<a href="${h}"${ak}>${IK[i]}${t}</a>`;
  });
  sek.splice(4, 0, `<button type="button" data-tk-menu aria-haspopup="dialog">${IK.menu}Menü</button>`);
  return `<nav class="tk-alt" aria-label="Mobil menü">${sek.join("")}</nav>
<dialog id="tk-menu" aria-label="Menü"><div class="tk-sayfa"><div class="tk-tutac"></div><div class="tk-sbas"><b>Topraklık</b><button type="button" data-tk-kapat aria-label="Kapat">${IK.kapat}</button></div>
<div class="tk-liste">${MENU.map(([h, t, a, i]) => `<a href="${h}"${aktifMi(yol, h) ? ' aria-current="page"' : ""}>${IK[i]}<b>${t}</b><small>${a}</small></a>`).join("")}</div>
<div class="tk-kur" id="tk-kur">${IK.ekle}<b>Topraklık'ı uygulama gibi kullanın</b><span class="tk-ios">Safari'de alttaki Paylaş simgesine dokunun, ardından "Ana Ekrana Ekle"yi seçin.</span><button type="button">Ana ekrana ekle</button></div>
<p class="tk-alt-yasal"><a href="/yasal" style="color:inherit">Yasal bilgiler</a> · info@topraklik.com</p></div></dialog>
<script>(()=>{const d=document.getElementById("tk-menu");if(!d)return;const ac=()=>{d.showModal?d.showModal():d.setAttribute("open","")},kp=()=>{d.close?d.close():d.removeAttribute("open")};document.querySelectorAll("[data-tk-menu]").forEach(b=>b.addEventListener("click",ac));d.querySelector("[data-tk-kapat]").addEventListener("click",kp);d.addEventListener("click",e=>{if(e.target===d)kp()});const k=document.getElementById("tk-kur");let p;addEventListener("beforeinstallprompt",e=>{e.preventDefault();p=e;k.dataset.android="1"});k.querySelector("button").addEventListener("click",async()=>{if(p){p.prompt();await p.userChoice;p=null;k.hidden=true}});if(matchMedia("(display-mode: standalone)").matches||navigator.standalone)k.hidden=true;document.querySelectorAll(".tk-geri").forEach(b=>b.addEventListener("click",()=>history.length>1?history.back():location.assign("/")))})()</script>`;
}

export const GERI_BTN = `<button type="button" class="tk-geri" aria-label="Geri">${IK.geri}</button>`;

export const MANIFEST = JSON.stringify({
  name: "Topraklık: arsa, tarla, ihale ve tarım",
  short_name: "Topraklık",
  description: "İcra ve hazine arazi ihaleleri, 3D parsel sorgu, tarım rehberleri ve haber bülteni.",
  id: "/",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#F6F1E6",
  theme_color: "#2E5130",
  lang: "tr",
  icons: [
    { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
  shortcuts: [
    { name: "İhaleler", url: "/ihaleler" },
    { name: "Parsel sorgula", url: "/parsel-sorgu" },
    { name: "Haber Bülteni", url: "/haberler" },
  ],
});
