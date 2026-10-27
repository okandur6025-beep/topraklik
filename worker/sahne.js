/* Haber görselleri: konuya göre Topraklık'a ait çizim sahneler (SVG). Haberin kimliğine göre
 * güneş, bulut, tepe ve öğe yerleşimi değişir; aynı konudaki iki haber birebir aynı görünmez. */

export const KONU = {
  tahil: { ad: "Tahıl", k: "#9A6B12", p: [["#F6E2B3", "#FBF3DF"], "#F2B544", "#CDB57E", "#B79A55", "#D9B45A", "#B8892E"] },
  meyve: { ad: "Meyve ve bahçe", k: "#3F6B2F", p: [["#D7E8D0", "#F4F7EC"], "#F2C14E", "#A3C08C", "#6F9A57", "#88AE5E", "#4E7A3A"] },
  sebze: { ad: "Sebze ve sera", k: "#A9442E", p: [["#F7DCCF", "#FCF2EB"], "#F08A5D", "#BCCB9C", "#8DAA6A", "#A7BE7C", "#6C8A4A"] },
  hayvan: { ad: "Hayvancılık", k: "#7A4E2A", p: [["#E1EDF2", "#F8F5EB"], "#F2C14E", "#AEC48F", "#7FA263", "#9BBB72", "#5F7F45"] },
  destek: { ad: "Hibe ve destek", k: "#2E5130", p: [["#DCEAD6", "#F6F6EC"], "#E7B84A", "#A2BE8A", "#5F8C50", "#7FA85F", "#3F6B3C"] },
  fiyat: { ad: "Fiyat ve piyasa", k: "#1F4E5F", p: [["#D6E6EC", "#F2F6F2"], "#F2C14E", "#AAC1BA", "#7E9F94", "#CDB57E", "#9C8350"] },
  arazi: { ad: "Arazi ve ihale", k: "#8A5A1E", p: [["#EFE2CC", "#FAF5EA"], "#E7A94A", "#C6B086", "#A98450", "#C9A56A", "#8A6A3A"] },
  su: { ad: "Su ve sulama", k: "#1D5D80", p: [["#D3E7F1", "#F3F8FA"], "#F2C14E", "#A6C5B2", "#79A487", "#93B97E", "#5C8A63"] },
  iklim: { ad: "İklim ve hava", k: "#B05A12", p: [["#F5CF9A", "#FBEFD9"], "#E8752A", "#CBA87C", "#A88457", "#C7A15C", "#8E6A33"] },
  teknoloji: { ad: "Mekanizasyon", k: "#363B55", p: [["#DDE3EE", "#F5F6F7"], "#F2C14E", "#AAB8A2", "#7F9474", "#C2A866", "#8B7444"] },
  genel: { ad: "Tarım gündemi", k: "#2E5130", p: [["#E2EDD9", "#F8F6EC"], "#F2C14E", "#AAC291", "#6F9A57", "#9DBB72", "#4E7A3A"] },
};

const fnv = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
let sayac = 0;
const r1 = (x) => Math.round(x * 10) / 10;

const bulut = (x, y, s = 1, renk = "#fff", op = 0.8) => `<g fill="${renk}" opacity="${op}" transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><ellipse rx="36" ry="10"/><circle cx="-12" cy="-7" r="13"/><circle cx="8" cy="-11" r="16"/><circle cx="24" cy="-4" r="9"/></g>`;

const OGE = {
  tahil(R, P) {
    const sap = (x, boy, renk) => {
      const ty = 270 - boy, eg = (R() - 0.5) * 14;
      let s = `<path d="M${r1(x)} 272 Q${r1(x + eg / 3)} ${r1(ty + boy / 2)} ${r1(x + eg)} ${r1(ty)}" stroke="${renk}" stroke-width="2.4" fill="none"/>`;
      for (let k = 0; k < 4; k++) { const yy = ty + 4 + k * 8, xx = x + eg * (1 - (k * 8) / boy); s += `<ellipse cx="${r1(xx - 4)}" cy="${r1(yy)}" rx="2.8" ry="6.5" transform="rotate(-28 ${r1(xx - 4)} ${r1(yy)})" fill="#D9A43A"/><ellipse cx="${r1(xx + 4)}" cy="${r1(yy)}" rx="2.8" ry="6.5" transform="rotate(28 ${r1(xx + 4)} ${r1(yy)})" fill="#C8902A"/>`; }
      return s + `<ellipse cx="${r1(x + eg)}" cy="${r1(ty - 3)}" rx="2.6" ry="6" fill="#E3B24A"/>`;
    };
    let s = ""; const sol = R() > 0.5;
    for (let i = 0; i < 11; i++) s += sap((sol ? 18 : 330) + i * 13 + R() * 6, 70 + R() * 45, "#B8892E");
    for (let i = 0; i < 6; i++) s += sap((sol ? 360 : 30) + i * 15 + R() * 6, 50 + R() * 25, "#C99A3B");
    return s;
  },
  meyve(R) {
    let s = "";
    for (let t = 0; t < 7; t++) {
      const x = 40 + t * 66 + R() * 14, y = 178 + Math.sin(t) * 8 + R() * 6, r = 17 + R() * 5;
      s += `<rect x="${r1(x - 2.5)}" y="${r1(y + r - 6)}" width="5" height="18" rx="2" fill="#6B4F2A"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="#4E7A3A"/><circle cx="${r1(x - 5)}" cy="${r1(y - 5)}" r="${r1(r * 0.55)}" fill="#6E9A4A"/>`;
      for (let f = 0; f < 4; f++) s += `<circle cx="${r1(x - r / 2 + R() * r)}" cy="${r1(y - r / 2 + R() * r)}" r="2.8" fill="${t % 2 ? "#D9502E" : "#E79A2E"}"/>`;
    }
    return s + `<path d="M0 248 C120 240 360 240 480 250" stroke="#4E7A3A" stroke-width="3" fill="none" opacity=".4"/>`;
  },
  sebze(R) {
    let s = ""; const x0 = 30 + R() * 40;
    for (let g = 0; g < 3; g++) {
      const x = x0 + g * 135, w = 118, y = 214;
      s += `<path d="M${r1(x)} ${y} V192 Q${r1(x + w / 2)} 146 ${r1(x + w)} 192 V${y} Z" fill="#F2F6F4" opacity=".93" stroke="#9AA9A3" stroke-width="1.5"/>`;
      for (let k = 1; k < 5; k++) s += `<path d="M${r1(x + (k * w) / 5)} ${y} V${r1(192 - Math.sin((k / 5) * Math.PI) * 36)}" stroke="#9AA9A3" stroke-width="1" opacity=".7"/>`;
    }
    for (let b = 0; b < 16; b++) { const x = 10 + b * 30 + R() * 8, y = 248 + R() * 10; s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="13" ry="9" fill="#5F8C3E"/><circle cx="${r1(x - 4)}" cy="${r1(y - 2)}" r="3.6" fill="#D9442E"/><circle cx="${r1(x + 5)}" cy="${r1(y + 1)}" r="3.2" fill="#E0583A"/>`; }
    return s;
  },
  hayvan(R) {
    const bx = R() > 0.5 ? 330 : 60;
    let s = `<rect x="${bx}" y="150" width="84" height="62" fill="#A9442E"/><path d="M${bx - 8} 153 L${bx + 42} 116 L${bx + 92} 153 Z" fill="#7E2F20"/><rect x="${bx + 27}" y="176" width="30" height="36" fill="#F3E3C7"/><path d="M${bx + 27} 176 L${bx + 57} 212 M${bx + 57} 176 L${bx + 27} 212" stroke="#A9442E" stroke-width="3"/><rect x="${bx + 34}" y="130" width="16" height="12" fill="#F3E3C7"/>`;
    const inek = (x, y, sc, ters) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${ters ? -sc : sc} ${sc})"><path d="M-14 8v13M-6 9v13M8 9v13M15 8v13" stroke="#3A3226" stroke-width="3.2" stroke-linecap="round"/><ellipse rx="23" ry="12" fill="#FAF7F0"/><ellipse cx="-7" cy="-3" rx="8" ry="6" fill="#3A3226"/><ellipse cx="9" cy="4" rx="5" ry="4" fill="#3A3226"/><ellipse cx="24" cy="-7" rx="8" ry="6.5" fill="#FAF7F0"/><ellipse cx="29" cy="-4" rx="4" ry="3.4" fill="#E8B4A0"/><path d="M21 -13l-3 -5M27 -13l3 -5" stroke="#8A7A5A" stroke-width="2"/></g>`;
    const ix = bx > 200 ? 90 : 250;
    s += inek(ix + R() * 30, 214, 1, R() > 0.5) + inek(ix + 90 + R() * 30, 228, 1.15, R() > 0.5) + inek(ix + 40, 200, 0.75, true);
    let f = ""; for (let x = 0; x <= 480; x += 32) f += `<rect x="${x}" y="236" width="5" height="30" fill="#8A6A3A"/>`;
    return s + f + `<path d="M0 244 H480 M0 256 H480" stroke="#A98450" stroke-width="3.5"/>`;
  },
  destek(R) {
    const cx = R() > 0.5 ? 350 : 140, sx = cx > 240 ? 110 : 360;
    let s = `<path d="M${cx} 272 C${cx - 4} 240 ${cx + 4} 214 ${cx} 186" stroke="#3F6B3C" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M${cx} 214 C${cx - 34} 212 ${cx - 52} 190 ${cx - 50} 164 C${cx - 22} 166 ${cx - 4} 186 ${cx} 214Z" fill="#5F8C50"/><path d="M${cx} 196 C${cx + 4} 166 ${cx + 30} 146 ${cx + 62} 150 C${cx + 60} 178 ${cx + 34} 198 ${cx} 196Z" fill="#7FA85F"/><path d="M${cx} 214 C${cx - 26} 204 ${cx - 40} 186" stroke="#3F6B3C" stroke-width="1.6" fill="none" opacity=".6"/>`;
    const kule = (x, n) => { let t = ""; for (let k = 0; k < n; k++) t += `<ellipse cx="${x}" cy="${256 - k * 9}" rx="26" ry="8" fill="#E3B84A" stroke="#B8892E" stroke-width="2"/>`; return t + `<text x="${x}" y="${261 - (n - 1) * 9}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="13" fill="#8A6420">₺</text>`; };
    return s + kule(sx, 5 + Math.floor(R() * 3)) + kule(sx + 58, 3 + Math.floor(R() * 2)) + kule(sx - 50, 2);
  },
  fiyat(R) {
    let pts = [], y = 140;
    for (let i = 0; i <= 8; i++) { pts.push([30 + i * 52, y]); y = Math.max(46, Math.min(150, y - 4 - R() * 22 + (i % 3 === 1 ? 26 : 0))); }
    const d = pts.map(([x, yy], i) => `${i ? "L" : "M"}${r1(x)} ${r1(yy)}`).join(" ");
    const son = pts[pts.length - 1];
    let s = `<path d="${d} L${son[0]} 200 L30 200 Z" fill="#1F4E5F" opacity=".10"/><path d="${d}" stroke="#1F4E5F" stroke-width="4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>${pts.map(([x, yy]) => `<circle cx="${r1(x)}" cy="${r1(yy)}" r="4.5" fill="#FFFDF8" stroke="#1F4E5F" stroke-width="2.5"/>`).join("")}<path d="M${son[0] - 12} ${r1(son[1] - 2)} l12 -10 l4 14" stroke="#1F4E5F" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const cuval = (x, yy, sc) => `<g transform="translate(${x} ${yy}) scale(${sc})"><path d="M-22 26 C-28 6 -20 -14 -10 -20 L10 -20 C20 -14 28 6 22 26 Z" fill="#EADBB4" stroke="#9C8350" stroke-width="2"/><path d="M-11 -20 C-6 -26 6 -26 11 -20" stroke="#9C8350" stroke-width="3" fill="none"/><path d="M-8 2 h16" stroke="#C9B27A" stroke-width="2"/></g>`;
    return s + cuval(380, 232, 1.1) + cuval(426, 240, 0.95) + cuval(342, 244, 0.8);
  },
  arazi(R) {
    const VX = 240, VY = 168, sat = [206, 234, 272], tabs = [-260, -40, 140, 320, 500, 720];
    const xAt = (X, yy) => VX + (X - VX) * ((yy - VY) / (272 - VY));
    const renk = ["#C9A56A", "#B5C27A", "#D8BD7A", "#9DB46A", "#C4B07A", "#A9BE72"];
    let s = "", sec = 1 + Math.floor(R() * 3), secS = 1;
    for (let r = 0; r < 2; r++) for (let c = 0; c < tabs.length - 1; c++) {
      const y0 = sat[r], y2 = sat[r + 1], p = [[xAt(tabs[c], y0), y0], [xAt(tabs[c + 1], y0), y0], [xAt(tabs[c + 1], y2), y2], [xAt(tabs[c], y2), y2]];
      const isSec = r === secS && c === sec;
      s += `<path d="M${p.map(([a, b]) => `${r1(a)} ${r1(b)}`).join(" L")} Z" fill="${renk[(r * 3 + c + sec) % renk.length]}" stroke="${isSec ? "#B5452F" : "#FFF8E8"}" stroke-width="${isSec ? 3 : 2}"${isSec ? ' stroke-dasharray="8 5"' : ""}/>`;
    }
    const px = xAt((tabs[sec] + tabs[sec + 1]) / 2, 250);
    return s + `<ellipse cx="${r1(px)}" cy="252" rx="14" ry="4" fill="#000" opacity=".18"/><path d="M${r1(px)} 250 C${r1(px)} 250 ${r1(px - 24)} 222 ${r1(px - 24)} 205 A24 24 0 0 1 ${r1(px + 24)} 205 C${r1(px + 24)} 222 ${r1(px)} 250 ${r1(px)} 250Z" fill="#B5452F"/><circle cx="${r1(px)}" cy="205" r="9" fill="#FFFDF8"/>`;
  },
  su(R) {
    const sol = R() > 0.5;
    let s = `<path d="M232 205 C246 222 ${sol ? 150 : 330} 236 ${sol ? 90 : 300} 272 L${sol ? 260 : 470} 272 C${sol ? 270 : 400} 240 262 222 248 205 Z" fill="#4BA3C7"/><path d="M${sol ? 170 : 320} 252 c12 -3 22 -3 34 0 M${sol ? 200 : 350} 238 c8 -2 16 -2 24 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".75" stroke-linecap="round"/>`;
    const fx = sol ? 380 : 100;
    s += `<rect x="${fx - 2}" y="214" width="4" height="40" fill="#5C6B70"/>`;
    for (let k = 1; k <= 4; k++) s += `<path d="M${fx} 214 q${k * 14} ${-k * 12} ${k * 28} ${k * 4}" stroke="#2F86B0" stroke-width="3.5" fill="none" stroke-dasharray="1 7" stroke-linecap="round"/><path d="M${fx} 214 q${-k * 14} ${-k * 12} ${-k * 28} ${k * 4}" stroke="#2F86B0" stroke-width="3.5" fill="none" stroke-dasharray="1 7" stroke-linecap="round"/>`;
    return s;
  },
  iklim(R) {
    const x = 120 + R() * 240;
    let s = bulut(x, 64, 1.9, "#7D879B", 0.95) + bulut(x + 70, 84, 1.3, "#959DB0", 0.9);
    for (let k = 0; k < 14; k++) { const rx = x - 50 + k * 13 + R() * 6, ry = 96 + R() * 14; s += `<path d="M${r1(rx)} ${r1(ry)} l-7 ${r1(18 + R() * 10)}" stroke="#6E7C99" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`; }
    return s;
  },
  teknoloji(R) {
    const tx = 250 + R() * 80;
    let s = `<path d="M0 236 C120 230 ${tx - 60} 232 ${tx - 30} 238" stroke="#8B7444" stroke-width="10" opacity=".35" fill="none"/>`;
    s += `<g transform="translate(${r1(tx)} 0)"><rect x="0" y="190" width="78" height="30" rx="4" fill="#B5452F"/><rect x="-22" y="200" width="26" height="20" rx="3" fill="#C9553A"/><path d="M40 190 V160 H74 V190" fill="none" stroke="#3A3226" stroke-width="4"/><rect x="36" y="156" width="42" height="6" rx="2" fill="#3A3226"/><rect x="44" y="166" width="24" height="20" fill="#CFE3EC" opacity=".9"/><path d="M-12 200 V176" stroke="#3A3226" stroke-width="4"/><circle cx="58" cy="232" r="25" fill="#2B2B2B"/><circle cx="58" cy="232" r="10" fill="#D9B25C"/><circle cx="-6" cy="240" r="15" fill="#2B2B2B"/><circle cx="-6" cy="240" r="6" fill="#D9B25C"/></g>`;
    const dx = tx > 300 ? 120 : 380, dy = 64 + R() * 30;
    return s + `<g transform="translate(${r1(dx)} ${r1(dy)})" stroke="#363B55" stroke-width="3" stroke-linecap="round"><path d="M-26 -6 L26 6 M-26 6 L26 -6"/><rect x="-10" y="-6" width="20" height="12" rx="4" fill="#363B55"/><ellipse cx="-28" cy="-8" rx="12" ry="2.5" fill="#6A7193" stroke="none"/><ellipse cx="28" cy="-8" rx="12" ry="2.5" fill="#6A7193" stroke="none"/><path d="M0 6 V14" /><circle cx="0" cy="16" r="2.5" fill="#E8752A" stroke="none"/></g><path d="M${r1(dx)} ${r1(dy + 18)} L${r1(dx - 36)} 214 L${r1(dx + 36)} 214 Z" fill="#E8752A" opacity=".12"/>`;
  },
  genel(R) {
    const x = R() > 0.5 ? 360 : 110;
    return `<rect x="${x - 4}" y="150" width="9" height="46" fill="#6B4F2A"/><circle cx="${x}" cy="132" r="38" fill="#4E7A3A"/><circle cx="${x - 14}" cy="120" r="22" fill="#6E9A4A"/><circle cx="${x + 18}" cy="140" r="18" fill="#5C8A45"/>`
      + `<g transform="translate(${x > 240 ? 130 : 330} 0)"><rect x="0" y="170" width="56" height="38" fill="#FFF8E8"/><path d="M-6 172 L28 148 L62 172 Z" fill="#A9442E"/><rect x="21" y="186" width="14" height="22" fill="#8A6A3A"/><rect x="6" y="180" width="10" height="9" fill="#CFE3EC"/><rect x="40" y="180" width="10" height="9" fill="#CFE3EC"/></g>`;
  },
};

export function sahne(konu, tohum) {
  const K = KONU[konu] || KONU.genel, [gok, gunes, uzak, yakin, tarla, cizgi] = K.p;
  let t = (fnv("tk:" + String(tohum || konu)) ^ 0x9e3779b9) >>> 0 || 1;
  const R = () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const u = `s${(sayac = (sayac + 1) % 1e6)}`;
  const gx = 50 + R() * 380, gy = 46 + R() * 30, a = R() * 24, b = R() * 24, c = R() * 18;
  let s = `<svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${K.ad} çizimi"><defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gok[0]}"/><stop offset="1" stop-color="${gok[1]}"/></linearGradient></defs>`;
  s += `<rect width="480" height="270" fill="url(#${u})"/><circle cx="${r1(gx)}" cy="${r1(gy)}" r="52" fill="${gunes}" opacity=".16"/><circle cx="${r1(gx)}" cy="${r1(gy)}" r="28" fill="${gunes}" opacity=".95"/>`;
  if (konu !== "iklim") s += bulut(40 + R() * 160, 40 + R() * 30, 0.8 + R() * 0.5) + bulut(260 + R() * 180, 30 + R() * 34, 0.6 + R() * 0.5, "#fff", 0.65);
  s += `<path d="M0 ${r1(146 + a)} C80 ${r1(118 + b)} 160 ${r1(124 + a)} 240 ${r1(140 - c)} S400 ${r1(112 + b)} 480 ${r1(134 + c)} V270 H0Z" fill="${uzak}"/>`;
  s += `<path d="M0 186 C120 ${r1(156 + c)} 220 196 320 ${r1(172 + c)} S440 164 480 178 V270 H0Z" fill="${yakin}"/>`;
  s += `<path d="M0 206 C160 196 320 200 480 206 V270 H0Z" fill="${tarla}"/>`;
  if (konu !== "arazi") { let f = ""; for (let k = -9; k <= 9; k++) f += `M${240 + k * 22} 206 L${240 + k * 96} 272 `; s += `<path d="${f}" stroke="${cizgi}" stroke-width="2" opacity=".32"/>`; }
  return s + (OGE[konu] || OGE.genel)(R, K.p) + `</svg>`;
}
