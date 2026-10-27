"""Ürün rehberi ortak tanımları: iller, bölgeler, yardımcılar."""
BOLGELER = {
    "Marmara": "istanbul edirne kirklareli tekirdag kocaeli sakarya yalova bursa balikesir canakkale bilecik",
    "Ege": "izmir manisa aydin denizli mugla usak kutahya afyonkarahisar",
    "Akdeniz": "antalya mersin adana hatay osmaniye kahramanmaras isparta burdur",
    "İç Anadolu": "ankara konya kayseri eskisehir sivas yozgat kirsehir nevsehir nigde aksaray karaman kirikkale cankiri",
    "Karadeniz": "zonguldak bartin karabuk bolu duzce kastamonu sinop samsun corum amasya tokat ordu giresun trabzon rize artvin gumushane bayburt",
    "Doğu Anadolu": "erzurum erzincan kars ardahan agri igdir van mus bitlis bingol tunceli elazig malatya hakkari",
    "Güneydoğu Anadolu": "gaziantep sanliurfa diyarbakir mardin batman siirt sirnak adiyaman kilis",
}
BOLGELER = {k: v.split() for k, v in BOLGELER.items()}
IL_AD = dict(x.split("|") for x in "adana|Adana,adiyaman|Adıyaman,afyonkarahisar|Afyonkarahisar,agri|Ağrı,aksaray|Aksaray,amasya|Amasya,ankara|Ankara,antalya|Antalya,ardahan|Ardahan,artvin|Artvin,aydin|Aydın,balikesir|Balıkesir,bartin|Bartın,batman|Batman,bayburt|Bayburt,bilecik|Bilecik,bingol|Bingöl,bitlis|Bitlis,bolu|Bolu,burdur|Burdur,bursa|Bursa,canakkale|Çanakkale,cankiri|Çankırı,corum|Çorum,denizli|Denizli,diyarbakir|Diyarbakır,duzce|Düzce,edirne|Edirne,elazig|Elazığ,erzincan|Erzincan,erzurum|Erzurum,eskisehir|Eskişehir,gaziantep|Gaziantep,giresun|Giresun,gumushane|Gümüşhane,hakkari|Hakkari,hatay|Hatay,igdir|Iğdır,isparta|Isparta,istanbul|İstanbul,izmir|İzmir,kahramanmaras|Kahramanmaraş,karabuk|Karabük,karaman|Karaman,kars|Kars,kastamonu|Kastamonu,kayseri|Kayseri,kirikkale|Kırıkkale,kirklareli|Kırklareli,kirsehir|Kırşehir,kilis|Kilis,kocaeli|Kocaeli,konya|Konya,kutahya|Kütahya,malatya|Malatya,manisa|Manisa,mardin|Mardin,mersin|Mersin,mugla|Muğla,mus|Muş,nevsehir|Nevşehir,nigde|Niğde,ordu|Ordu,osmaniye|Osmaniye,rize|Rize,sakarya|Sakarya,samsun|Samsun,siirt|Siirt,sinop|Sinop,sivas|Sivas,sanliurfa|Şanlıurfa,sirnak|Şırnak,tekirdag|Tekirdağ,tokat|Tokat,trabzon|Trabzon,tunceli|Tunceli,usak|Uşak,van|Van,yalova|Yalova,yozgat|Yozgat,zonguldak|Zonguldak".split(","))
assert len(IL_AD) == 81 and sorted(sum(BOLGELER.values(), [])) == sorted(IL_AD)
IL_BOLGE = {il: b for b, ils in BOLGELER.items() for il in ils}

def iller(spec):
    """'konya sanliurfa R:Ege -mugla' -> il slug listesi (R: bölge, - çıkar)."""
    out, cikar = [], set()
    for t in spec.split():
        if t.startswith("-"):
            cikar.add(t[1:])
        elif t.startswith("R:"):
            out += BOLGELER[t[2:].replace("_", " ")]
        else:
            assert t in IL_AD, f"bilinmeyen il: {t}"
            out.append(t)
    seen, res = set(), []
    for il in out:
        if il not in seen and il not in cikar:
            seen.add(il); res.append(il)
    return res

# Sık kullanılan kaynaklar
K = {
    "tmo": ("TMO 2026 hububat alım fiyatları (2 Haziran 2026)", "https://www.bloomberght.com/tmo-2026-yili-hububat-alim-ve-satis-fiyatlarini-acikladi-3778801"),
    "tmo_celtik": ("TMO 2026 çeltik alım fiyatları (13 Ekim 2026)", "https://www.foreks.com/haber/detay/6acdfdf3cc2275389d2d6df6/FRKS/tr/tmo-2026-yili-celtik-alim-fiyatlarini-belirledi-13-10-26/"),
    "tmo_findik": ("TMO 2026 fındık alım fiyatları (6 Ağustos 2026)", "https://www.takvim.com.tr/ekonomi/2026/08/06/tmo-acikladi-2026-findik-alim-fiyatlari-ne-kadar"),
    "pancar": ("Türkşeker 2026-2027 pancar alım fiyatı (13 Ekim 2026)", "https://www.foreks.com/haber/detay/6ace37c8cc2275389d2d70f2/FRKS/tr/turkseker-2026-2027-yili-seker-pancari-alim-fiyati-ton-basina-3720-lira-olarak-belirlendi-13-10-26/"),
    "cay": ("2026 yaş çay alım fiyatı (13 Mayıs 2026)", "https://www.alomaliye.com/2026/05/13/yas-cay-alim-fiyati-kilogram-basina-35-lira-olarak-belirlendi/"),
    "aycicegi": ("Trakya Birlik 2026/27 ayçiçeği ön alım fiyatı (18 Eylül 2026)", "https://www.dha.com.tr/gundem/trakya-birlik-ayciceginde-on-alim-fiyatini-37-bin-tl-olarak-acikladi-2947240"),
    "tuik": ("TÜİK Bitkisel Üretim İstatistikleri", "https://data.tuik.gov.tr/Kategori/GetKategori?p=Tarim-111"),
    "tepge": ("TEPGE Tarım Ürünleri Piyasa Raporları", "https://arastirma.tarimorman.gov.tr/tepge"),
    "bakanlik": ("Tarım ve Orman Bakanlığı", "https://www.tarimorman.gov.tr"),
    "tagem": ("TAGEM araştırma enstitüleri yetiştiricilik yayınları", "https://arastirma.tarimorman.gov.tr/tagem"),
    "hal": ("Hal Kayıt Sistemi fiyatları", "https://www.hal.gov.tr"),
}
