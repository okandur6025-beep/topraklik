# Topraklık SEO ajanı: çalışma talimatı

Bu klasör, haftada iki kez (salı ve cuma) çalışan Claude SEO ajanının tek çalışma alanıdır.
Ajan **yalnızca** `icerik/ajan/` klasörüne ve derleme çıktısı `worker/ajan.json` dosyasına yazar. Başka hiçbir dosyaya dokunmaz.
Taslaklar **asla doğrudan yayına girmez**: site sahibi panelden (topraklik.com/okan → SEO) "Yayınla" demeden görünmez.

## Her çalışmada yapılacaklar

### 1. Hazırlık
- Depo: `okandur6025-beep/topraklik`, dal `main`. Güncel hâli çek (`git pull`).
- `icerik/ajan/hedefler.json` → izlenecek aramalar.
- `icerik/ajan/raporlar/` → önceki raporlar (en yenisi hangi aramaları kontrol etti, ne önerdi).
- Var olan içerik: `worker/rehberler.json` (yayındaki rehberler, `slug` ve `h1`), `icerik/ajan/taslaklar/` (önceki taslaklar). Aynı konuda ikinci içerik yazma.

### 2. Google görünürlüğü (12 arama)
- `hedefler.json` içinden, önceki raporda kontrol edilmemiş olanlardan başlayarak sırayla 12 arama seç.
- Her biri için web araması yap (Türkçe, Türkiye). İlk 10 sonuçta `topraklik.com` var mı, kaçıncı sırada, hangi adresle?
- İlk 3 sonucun başlığını ve adresini kaydet (rakip analizi için).
- Uydurma sıra yazma: sonuçlarda göremediysen `"sira": null`.

### 3. İçerik taslakları (en fazla 2)
- Görünürlükte geride kaldığımız ya da sitede hiç karşılığı olmayan, gerçekten aranan bir konu seç (arsa, tarla, tapu, icra/hazine ihalesi, tarım arazisi mevzuatı, çiftçilik kararları).
- Rakiplerin ilk sayfadaki içeriğinden **daha faydalı, daha doğru ve daha güncel** bir rehber yaz. Kopyalama yok; kendi cümlelerinle.
- **Doğruluk:** Her rakam, oran, süre ve kanun maddesi resmî kaynaktan doğrulanmalı (mevzuat.gov.tr, resmigazete.gov.tr, tkgm.gov.tr, gib.gov.tr, tarimorman.gov.tr, milliemlak.gov.tr, uyap.gov.tr, tuik.gov.tr). Doğrulayamadığın bilgiyi yazma. Kaynakları `kaynak` alanına ekle.
- **Dil:** Türkçe, sade, yazım ve ek uyumu hatasız. Tıklama tuzağı, abartı, "kaçırmayın" gibi satış dili yok. Hukuki konularda "avukata/ilgili kuruma danışın" notu.
- Uzunluk: 900–1600 kelime; 5–8 bölüm; 4–6 sık sorulan soru.
- Uygun yerlerde Topraklık'ın kendi sayfalarına bağlantı ver (ör. `[3B parsel sorgu](/parsel-sorgu)`, `[icra ihaleleri](/ihaleler)`, `[tapu harcı hesaplama](/araclar/tapu-harci-hesaplama)`).

### 4. Rapor
`icerik/ajan/raporlar/YYYY-MM-DD.json` dosyası (aşağıdaki biçimde).
- `ozet`: 1–2 cümle, bu çalışmanın en önemli bulgusu.
- `oneriler`: en fazla 8 somut ve uygulanabilir öneri (hangi sayfa, ne değişmeli, neden). Genel tavsiye yazma.

### 5. Derle ve gönder
```
node icerik/ajan/derle.mjs          # "ATLANAN" satırı çıkarsa taslağı düzelt, tekrar çalıştır
git add icerik/ajan worker/ajan.json
git commit -m "SEO ajanı: YYYY-MM-DD raporu ve taslaklar"
git push origin main
```
Gönderim siteyi otomatik günceller; taslaklar panelde "Onay bekliyor" olarak görünür.

## Dosya biçimleri

### Taslak: `icerik/ajan/taslaklar/<slug>.json`
```json
{
  "slug": "kucuk-harfli-tireli-adres",
  "hedef": "hedeflenen arama ifadesi",
  "tarih": "2026-10-28",
  "title": "Google başlığı, en fazla 60 karakter",
  "desc": "Arama sonucu açıklaması, 120–155 karakter",
  "h1": "Sayfa başlığı",
  "cevap": "Soruya 2–3 cümlelik doğrudan cevap (öne çıkan snippet için)",
  "bolumler": [["Bölüm başlığı", "Paragraf.\n\n- madde\n- madde\n\n**kalın** ve [bağlantı](/parsel-sorgu) desteklenir"]],
  "sss": [["Soru?", "Cevap."]],
  "kaynak": [["Kaynak adı", "https://resmi.kaynak.gov.tr/..."]],
  "ilgili": ["hisseli-tapu-nedir", "/ihaleler"],
  "ajanNotu": "Site sahibine: neden bu konu, hangi bilgileri doğruladın"
}
```

### Rapor: `icerik/ajan/raporlar/YYYY-MM-DD.json`
```json
{
  "tarih": "2026-10-28",
  "ozet": "…",
  "gorunurluk": [
    { "sorgu": "icradan satılık tarla", "sira": 7, "url": "https://topraklik.com/ihaleler", "ilkler": [{ "baslik": "…", "url": "…" }] }
  ],
  "oneriler": ["…"],
  "taslaklar": ["slug-1", "slug-2"]
}
```

## Yapılmayacaklar
- Kod, tasarım, ayar veya başka klasörlerdeki dosyaları değiştirmek.
- Taslağı yayına almak ya da panel onayını atlatmak.
- Gizli bilgi, anahtar veya kişisel veri yazmak.
- Doğrulanmamış rakam, uydurma kaynak, başka sitelerden kopya metin.
