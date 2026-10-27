/* Tarayıcıda (www.milliemlak.gov.tr sekmesinde) çalışan toplayıcı.
   Worker bu fonksiyonun kaynak kodunu /topla/milliemlak.js adresinden sunar.
   Kullanım (milliemlak sekmesinde):
     const s = await (await fetch("https://topraklik.com/topla/milliemlak.js")).text();
     await new Function("KEY", s)(ADMIN_KEY);
*/
export async function milliEmlakTopla(KEY) {
  const API = "https://mebis-s-p.csb.gov.tr/api/MileWeb/";
  const H = { "Content-Type": "application/json", Authorization: "Bearer null", "login-type": "2" };
  const gun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" }) + "T00:00:00.000Z";
  const post = async (u, b) => { const r = await fetch(API + u, { method: "POST", headers: H, body: JSON.stringify(b) }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
  const ozet = {};
  for (const [tip, uc, ilanTipi] of [["satis", "GetSatisIlanList", 20], ["kira", "GetKiraIlanList", 21]]) {
    const items = [];
    for (let off = 0; off < 60; off++) {
      const j = await post(uc, { ilan_tipi: ilanTipi, ilan_durumu_id: 1, ihale_baslangic_tarihi: gun, fotograf_var_mi: null, offset: off, pageSize: 100 });
      const list = j.response_object || [];
      for (const x of list) {
        const t = (x.tasinmazlar || [])[0];
        if (!t) continue;
        const k = t.kira || {};
        const imar = [t.imar_durumu === "Evet" ? "İmarlı" : t.imar_durumu === "Hayır" ? "İmarsız" : "", t.imar_turu, t.imar_ozellik].filter(Boolean).join(", ");
        const pay = t.hazine_hissesi_pay, payda = t.hazine_hissesi_payda;
        items.push({
          id: "me" + x.id, ilan_id: String(x.id), il: t.il, ilce: t.ilce, mahalle: t.mahalle, ada: t.ada, parsel: t.parsel,
          cins: t.tasinmaz_cinsi, imar, m2: t.onaylanan_yuzolcumu || t.uygun_gorulen_yuzolcumu || t.yuzolcumu,
          bedel: tip === "kira" ? (t.uygun_toplam_bedel || t.ihale_cikis_bedeli || null) : (t.toplam_tahmini_bedel || x.liste_fiyat || null),
          teminat: t.gecici_teminat_bedeli, tarih: (t.ihale_tarihi || "").slice(0, 10) + (t.ihale_tarihi_saati ? "T" + t.ihale_tarihi_saati : ""),
          yer: [t.ihale_yapilacak_yer_il, t.ihale_yapilacak_yer_ilce].filter(Boolean).join(" / "), usul: t.aciklama || t.yasal_dayanak || (k.kiralama_yasal_dayanagi ? k.kiralama_yasal_dayanagi + " kiralama" : null),
          hisse: pay && payda && pay !== payda ? `${pay}/${payda}` : null, amac: k.kiralama_amaci ? (k.kira_ayrinti_cinsi ? k.kira_ayrinti_cinsi + " · " : "") + k.kiralama_amaci.trim() : null,
          tasinmaz_no: t.tasinmaz_no, link: `https://www.milliemlak.gov.tr/#/ilan-detay/${x.ilan_tipi_id}/${x.id}`, foto: (t.tasinmaz_fotograflar || []).length,
        });
      }
      if (list.length < 100) break;
    }
    const baslangic = new Date(Date.now() - 3600e3).toISOString(); // saat farkına karşı 1 saat geriden
    let sonuc = null;
    for (let i = 0; i < items.length || i === 0; i += 300) {
      const parca = items.slice(i, i + 300), son = i + 300 >= items.length;
      const r = await fetch("https://topraklik.com/admin/ihale-yukle", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": KEY }, body: JSON.stringify({ kaynak: "milliemlak", tip, baslangic, son: son && items.length > 0, items: parca }) });
      sonuc = await r.json();
      if (!r.ok) throw new Error("yükleme hatası: " + JSON.stringify(sonuc));
    }
    ozet[tip] = { toplanan: items.length, kalkan: sonuc?.kalkan ?? 0 };
  }
  return ozet;
}
