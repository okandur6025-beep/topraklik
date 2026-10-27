/* İcra / UYAP satış ilanı metninden güvenilir alanlar: yüzölçümü, hisse, kıymet, KDV, 1. ve 2. artırma tarihleri.
 * Yalnızca ilk taşınmaz bloğu okunur ("1 NO'LU TAŞINMAZIN"); bulunamayan alan boş bırakılır, tahmin edilmez. */

const sayi = (s) => { if (!s) return null; const t = String(s).trim(); const v = parseFloat(/,\d{1,3}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(v) ? v : null; };
const tarih = (g, a, y, s) => `${y}-${a}-${g}${s ? "T" + s : ""}`;
const TR = "A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû";

export function metinCoz(ham) {
  const t = String(ham || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const bas = Math.max(0, t.search(/1\s*NO'?LU TAŞINMAZIN|TAŞINMAZIN\s+CİNSİ|Satılmasına karar verilen/i));
  const s2 = t.search(/2\s*NO'?LU TAŞINMAZIN/i);
  const blok = t.slice(bas, s2 > bas ? s2 : bas + 4000);
  const o = { cokTasinmaz: s2 > bas };

  const yz = blok.match(/yüz\s*ölçümü\s*(?:[:=]|olan|toplam)?\s*([\d.]+(?:,\d+)?)\s*m(?:2|²|\s*2)/i) || blok.match(/([\d.]+(?:,\d+)?)\s*m(?:2|²)\s*(?:yüzölçümlü|yüz ölçümlü|miktarlı|büyüklüğündeki|alanlı)/i);
  if (yz) o.m2 = sayi(yz[1]);

  const pay = blok.match(/(\d+)\s*\/\s*(\d+)\s*(?:oranında(?:ki)?\s*)?(?:hisse|pay)/i);
  if (pay && +pay[1] < +pay[2]) o.hisse = `${pay[1]}/${pay[2]}`;
  const hm = blok.match(/hisse(?:lerin(?:in)?)?\s*(?:toplamı|karşılığı)?\s*(?:ise)?\s*([\d.]+(?:,\d+)?)\s*m(?:2|²)/i) || blok.match(/([\d.]+(?:,\d+)?)\s*m(?:2|²)\s*'?(?:lik|lık|lük|luk)?\s*(?:hisse|pay)/i);
  if (hm) o.hisse_m2 = sayi(hm[1]);
  if (o.hisse && !o.hisse_m2 && o.m2) { const [a, b] = o.hisse.split("/").map(Number); o.hisse_m2 = Math.round((o.m2 * a / b) * 100) / 100; }
  if (!o.hisse && /tam(?:amı)?\s*(?:hisse|mülkiyet)|tamamı satılacak/i.test(blok)) o.tam = true;

  const kiy = blok.match(/Kıymeti\s*:\s*([\d.]+(?:,\d{1,2})?)/i) || t.match(/Kıymeti\s*:\s*([\d.]+(?:,\d{1,2})?)/i);
  if (kiy) o.kiymet = sayi(kiy[1]);
  const kdv = blok.match(/KDV\s*Oranı\s*:\s*%\s*(\d+)/i) || t.match(/KDV\s*Oranı\s*:\s*%\s*(\d+)/i);
  if (kdv) o.kdv = +kdv[1];

  const art = (n) => {
    const m = t.match(new RegExp(`${n}\\s*\\.\\s*Artırma[\\s\\S]{0,60}?Başlangıç\\s*Tarih\\s*ve\\s*Saati\\s*:\\s*(\\d{2})\\/(\\d{2})\\/(\\d{4})\\s*-\\s*(\\d{2}:\\d{2})[\\s\\S]{0,240}?Bitiş\\s*Tarih\\s*ve\\s*Saati\\s*:\\s*(\\d{2})\\/(\\d{2})\\/(\\d{4})\\s*-\\s*(\\d{2}:\\d{2})`, "i"));
    return m ? { bas: tarih(m[1], m[2], m[3], m[4]), bit: tarih(m[5], m[6], m[7], m[8]) } : null;
  };
  const a1 = art(1), a2 = art(2);
  if (a1 || a2) o.takvim = { a1, a2 };
  o.mirasci = /SADECE MALİK OLAN MİRASÇILAR|mirasçı(?:lar)? arasında/i.test(t);

  const nit = blok.match(new RegExp(`kayıtlı\\s+([${TR} \\-]{3,40}?)\\s+(?:niteliğindeki|nitelikli|vasıflı|vasfındaki)`, "i")) || blok.match(new RegExp(`(?:tapuda|tapu kaydında)\\s*["'“”]*\\s*([${TR} \\-]{3,40}?)["'“”]*\\s*(?:nitelikli|niteliğinde|vasıflı)`, "i"));
  if (nit) o.nitelik = nit[1].trim();
  const ap = blok.match(/(\d+)\s*ada[,\s]*(?:no'?lu\s*)?(\d+)\s*(?:no'?lu\s*)?parsel/i);
  if (ap) { o.ada = ap[1]; o.parsel = ap[2]; }
  return o;
}

/* Satışın şu anki aşaması (Türkiye tarihine göre) */
export function asama(x, bugun) {
  let tk = null;
  try { tk = typeof x.takvim === "string" ? JSON.parse(x.takvim) : x.takvim; } catch {}
  const g = (d) => (d || "").slice(0, 10);
  if (tk?.a1 || tk?.a2) {
    const { a1, a2 } = tk;
    if (a1 && g(a1.bas) > bugun) return { kod: "bekliyor", metin: `1. artırma başlangıcı: ${gunAy(a1.bas)}`, son: a1.bit };
    if (a1 && g(a1.bit) >= bugun) return { kod: "a1", metin: `1. artırma sürüyor · son gün ${gunAy(a1.bit)}`, son: a1.bit };
    if (a2 && g(a2.bas) > bugun) return { kod: "a2bekliyor", metin: `2. artırma başlangıcı: ${gunAy(a2.bas)}`, son: a2.bit };
    if (a2 && g(a2.bit) >= bugun) return { kod: "a2", metin: `2. artırma sürüyor · son gün ${gunAy(a2.bit)}`, son: a2.bit };
    return { kod: "bitti", metin: "Artırmalar sona erdi", son: (a2 || a1).bit };
  }
  const t = g(x.tarih), b = g(x.bitis);
  if (t && t > bugun) return { kod: "bekliyor", metin: `İhale tarihi: ${gunAy(x.tarih)}`, son: x.bitis || x.tarih };
  if (b && b >= bugun) return { kod: "a1", metin: t === bugun ? "İhale bugün" : `Son gün: ${gunAy(x.bitis)}`, son: x.bitis };
  return { kod: "bitti", metin: "İhale tarihi geçti", son: x.bitis || x.tarih };
}
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export function gunAy(t) { if (!t) return ""; const [y, m, d] = t.slice(0, 10).split("-"); return `${+d} ${AY[+m - 1]}`; }
export function aralik(a) { if (!a) return "—"; const [y1, m1, d1] = a.bas.slice(0, 10).split("-"), [y2, m2, d2] = a.bit.slice(0, 10).split("-"); return m1 === m2 ? `${+d1}–${+d2} ${AY[+m2 - 1]} ${y2}` : `${+d1} ${AY[+m1 - 1]} – ${+d2} ${AY[+m2 - 1]} ${y2}`; }
