"""Tapu, arsa, ihale ve tarım arazisi rehberleri.
Derleme: python3 icerik/rehberler/rehberler.py  -> worker/rehberler.json
Her rehber: slug, title (Google başlığı), h1, desc, cevap (kısa cevap), bolumler [(başlık, metin)], sss [(soru, cevap)], kaynak [(ad, url)], ilgili [slug/yol]
Metinlerde paragraf ayırıcı: boş satır. Madde listesi: satır başında "- ".
"""
import json, pathlib

TMK = ("4721 sayılı Türk Medeni Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.4721.pdf")
IIK = ("2004 sayılı İcra ve İflas Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.3.2004.pdf")
TK5403 = ("5403 sayılı Toprak Koruma ve Arazi Kullanımı Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5403.pdf")
K7584 = ("7584 sayılı Kanun (Resmî Gazete, 20 Haziran 2026)", "https://www.alomaliye.com/2026/06/20/7584-sayili-kanun/")
TKGM = ("Tapu ve Kadastro Genel Müdürlüğü", "https://www.tkgm.gov.tr")
HK = ("492 sayılı Harçlar Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.3.492.pdf")
EVK = ("1319 sayılı Emlak Vergisi Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.3.1319.pdf")
GVK = ("193 sayılı Gelir Vergisi Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.3.193.pdf")
IMAR = ("3194 sayılı İmar Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.3194.pdf")
DIK = ("2886 sayılı Devlet İhale Kanunu", "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.2886.pdf")
TADYON = ("Tarım Arazilerinin Korunması ve Kullanılması Hakkında Yönetmelik (4 Nisan 2026)", "https://www.alomaliye.com/2026/04/04/tarim-arazilerinin-korunmasi-ve-kullanilmasi-hakkinda-yonetmelik/")
EDEVLET = ("e-Devlet Tapu Bilgileri Sorgulama", "https://www.turkiye.gov.tr/tapu-bilgileri-sorgulama")
WEBTAPU = ("Web Tapu", "https://webtapu.tkgm.gov.tr")
MILLIEMLAK = ("Milli Emlak Genel Müdürlüğü ilanları", "https://www.milliemlak.gov.tr")

R = []
def rehber(**k):
    R.append(k)

rehber(slug="tapu-harci-nedir", title="Tapu harcı nedir, ne kadar, kim öder? (2026)", h1="Tapu harcı nedir, kim öder ve nasıl hesaplanır?",
 desc="Tapu harcı 2026'da alıcı ve satıcı için %2'dir. Harcın kim tarafından ödendiği, emlak vergi değeriyle ilişkisi, döner sermaye ve ödeme adımları.",
 cevap="Tapu harcı, tapuda gösterilen satış bedelinin %2'si alıcıdan, %2'si satıcıdan alınan vergidir; toplam %4 eder. Beyan edilen bedel emlak vergi değerinin altında olamaz. Harca ek olarak tapu müdürlüğü döner sermaye ücreti ödenir.",
 bolumler=[
  ("Tapu harcı nasıl hesaplanır?", "Harç matrahı, tapuda beyan edilen satış bedelidir. Bu bedel taşınmazın emlak vergi değerinden düşük gösterilemez; düşük gösterilirse harç emlak vergi değeri üzerinden alınır.\n\nÖrnek: 2.000.000 TL'ye satılan bir tarlada alıcı 40.000 TL, satıcı 40.000 TL tapu harcı öder. Buna döner sermaye ücreti eklenir. Hesabı [tapu harcı hesaplama aracıyla](/araclar/tapu-harci-hesaplama) kendiniz yapabilirsiniz."),
  ("Tapu harcını kim öder?", "Kanuna göre alıcı ve satıcı kendi %2'lik paylarını öder. Uygulamada taraflar anlaşıp harcın tamamını birinin ödemesini kararlaştırabilir; tapu müdürlüğü toplamın ödenmiş olmasına bakar."),
  ("Gerçek bedelden düşük göstermek neden risklidir?", "Gerçek bedelin altında beyan yapıldığı sonradan tespit edilirse aradaki fark üzerinden harç, vergi ziyaı cezası ve gecikme faizi istenebilir. Ayrıca satıcı beş yıl içinde sattığında değer artış kazancı vergisi düşük gösterilen alış bedeline göre hesaplanır. Alıcı açısından da ileride satarken düşük alış bedeli aleyhe sonuç doğurabilir."),
  ("Tapu harcı nasıl ödenir?", "- Tapu randevusu Web Tapu veya ALO 181 üzerinden alınır.\n- Randevu sırasında harç ve döner sermaye tutarları bildirilir.\n- Ödeme anlaşmalı bankalardan, internet bankacılığından veya Web Tapu üzerinden yapılır.\n- Ödeme makbuzu ile randevu saatinde tapu müdürlüğüne gidilir."),
  ("İcra ve hazine satışlarında tapu harcı", "İcra ihalesinde alıcı payı tapu harcını (%2) alıcı öder; satıcı payı ihale bedelinden karşılanır. Hazine satışlarında ise ilanın şartnamesi esas alınır. İcra masraflarının tamamı için [icra ihalesi maliyet hesabına](/araclar/icra-ihalesi-maliyet-hesaplama) bakın."),
 ],
 sss=[("Tapu harcı 2026'da yüzde kaç?", "Alıcı için %2, satıcı için %2; toplam %4."), ("Tapu harcı emlak vergi değerinin altında ödenebilir mi?", "Hayır. Beyan edilen bedel emlak vergi değerinden düşükse harç emlak vergi değeri üzerinden hesaplanır."), ("Döner sermaye ücreti nedir?", "Tapu müdürlüğünün işlem başına aldığı ücrettir; 2026'da ortalama yaklaşık 6.681 TL olup ilçeye göre değişir.")],
 kaynak=[HK, TKGM, WEBTAPU], ilgili=["/araclar/tapu-harci-hesaplama", "tapu-devri-nasil-yapilir", "deger-artis-kazanci-vergisi"])

rehber(slug="tapu-devri-nasil-yapilir", title="Tapu devri nasıl yapılır? Adım adım satış işlemi ve gerekli belgeler", h1="Tapu devri nasıl yapılır? Adım adım rehber",
 desc="Arsa, tarla veya ev satışında tapu devrinin adımları: Web Tapu başvurusu, randevu, gerekli belgeler, harç ödemesi ve tapu müdürlüğündeki imza.",
 cevap="Tapu devri; Web Tapu üzerinden başvuru, tapu harcı ve döner sermayenin ödenmesi ve randevu günü alıcı ile satıcının tapu müdürlüğünde resmî senedi imzalamasıyla tamamlanır. İşlem genellikle aynı gün sonuçlanır.",
 bolumler=[
  ("1. Başvuru ve randevu", "Satıcı veya alıcı Web Tapu üzerinden (e-Devlet şifresiyle) satış başvurusu yapar ya da ALO 181'i arar. Başvuruda taşınmazın il, ilçe, ada ve parsel bilgisi ile tarafların kimlik bilgileri istenir. Başvuru onaylanınca randevu tarihi ve ödenecek tutarlar bildirilir."),
  ("2. Gerekli belgeler", "- Alıcı ve satıcının kimlik kartları\n- Son altı ay içinde çekilmiş vesikalık fotoğraf (bazı müdürlüklerde fotoğraf işlem sırasında çekilir)\n- Konut ve işyerlerinde zorunlu deprem sigortası (DASK) poliçesi\n- Belediyeden alınan emlak vergi değeri yazısı (gerekirse)\n- Vekâletle işlem yapılacaksa vekâletname\n- Yabancı uyruklu taraf varsa yeminli tercüman"),
  ("3. Harç ve döner sermaye ödemesi", "Tapu harcı (alıcı %2, satıcı %2) ve döner sermaye ücreti randevudan önce ödenir. Ödeme yapılmadan imza aşamasına geçilmez. Hesap için [tapu harcı hesaplama aracını](/araclar/tapu-harci-hesaplama) kullanabilirsiniz."),
  ("4. Tapu müdürlüğünde imza", "Randevu saatinde taraflar tapu müdürlüğüne gelir. Memur kimlikleri kontrol eder, resmî senedi okur ve taraflara imzalatır. Alıcının adına yeni tapu düzenlenir; e-Devlet'te de kısa sürede görünür."),
  ("Tarım arazisinde dikkat", "Tarla ve bağ-bahçe satışlarında 5403 sayılı Kanun'un bölünme ve hisselendirme kuralları uygulanır. Asgari büyüklüğün altında kalacak hisse devirleri tapuda yapılamaz. Ayrıntı için [tarım arazisi bölünme kuralları](/rehber/tarim-arazisi-bolunme-5403) rehberine bakın."),
 ],
 sss=[("Tapu devri ne kadar sürer?", "Belgeler tamamsa randevu günü genellikle bir saat içinde tamamlanır; randevu süresi müdürlüğe göre birkaç gün sürebilir."), ("Tapu devri için iki taraf da gitmek zorunda mı?", "Evet, ya bizzat ya da noterden alınmış vekâletnameyle vekil aracılığıyla katılmaları gerekir.")],
 kaynak=[TKGM, WEBTAPU, HK], ilgili=["tapu-harci-nedir", "tapu-senedi-nasil-okunur", "arsa-alirken-dikkat-edilecekler"])

rehber(slug="tapu-senedi-nasil-okunur", title="Tapu senedi nasıl okunur? Ada, parsel, pafta, nitelik ve hisse", h1="Tapu senedi nasıl okunur?",
 desc="Tapu senedindeki ada, parsel, pafta, yüzölçümü, nitelik, hisse ve edinme sebebi alanlarının anlamı. Şerh, beyan ve ipotek kayıtları nereden görülür?",
 cevap="Tapu senedinde taşınmazın yeri (il, ilçe, mahalle, ada, parsel), yüzölçümü, niteliği (tarla, arsa, mesken), malikleri ve hisse oranları yazar. Şerh, beyan ve ipotek gibi kayıtlar ise senette değil, tapu kaydında görünür.",
 bolumler=[
  ("Ada, parsel ve pafta", "Ada, sokaklarla çevrili kadastro bloğunun numarasıdır; parsel ise ada içindeki her bir taşınmazın numarasıdır. Pafta, kadastro haritasının sayfa numarasıdır. Ada ve parsel numarasıyla taşınmazın yerini [parsel sorgulama](/parsel-sorgu) sayfasından bulabilirsiniz."),
  ("Yüzölçümü ve nitelik", "Yüzölçümü metrekare olarak yazar (1.000 m² = 1 dönüm). Nitelik, taşınmazın tapudaki cinsidir: tarla, bağ, bahçe, arsa, mesken, kargir ev gibi. Nitelik, imar durumunu göstermez; arsa niteliği imarlı olduğu anlamına gelmez."),
  ("Malik ve hisse", "Taşınmazın birden fazla sahibi varsa her birinin payı kesirle yazılır (örneğin 1/4). Pay toplamı 1'e eşit olmalıdır. Hisseli taşınmazlarda hisse oranının kaç metrekareye denk geldiğini [hisse hesaplama aracıyla](/araclar/hisseli-tapu-pay-hesaplama) görebilirsiniz."),
  ("Edinme sebebi", "Malikin taşınmazı nasıl edindiğini gösterir: satış, miras (intikal), bağış, icra satışı, kamulaştırma gibi."),
  ("Şerh, beyan ve ipotekler nereden görülür?", "Tapu senedinde yazmayan haciz, ipotek, önalım şerhi, kira şerhi veya 5403 kapsamındaki beyanlar tapu kaydında yer alır. Kendi taşınmazınızın kaydını e-Devlet'ten, satın alacağınız taşınmazınkini ise malikin izniyle tapu müdürlüğünden görebilirsiniz. Ayrıntı için [şerh, beyan ve ipotek](/rehber/tapuda-serh-beyan-ipotek) rehberine bakın."),
 ],
 sss=[("Tapudaki 'arsa' yazısı imarlı demek mi?", "Hayır. Nitelik ile imar durumu farklıdır; imar durumu belediyeden öğrenilir."), ("Ada parsel numarası nereden öğrenilir?", "Tapu senedinde yazar; e-Devlet'te Tapu Bilgileri Sorgulama hizmetinden de görülebilir.")],
 kaynak=[TKGM, EDEVLET], ilgili=["tapuda-serh-beyan-ipotek", "imar-durumu-nasil-ogrenilir", "/parsel-sorgu"])

rehber(slug="tapuda-serh-beyan-ipotek", title="Tapuda şerh, beyan ve ipotek nedir? Haciz şerhli tapu alınır mı?", h1="Tapuda şerh, beyan ve ipotek nedir?",
 desc="Tapu kaydındaki haciz, ipotek, önalım, kira ve 5403 şerhlerinin anlamı; şerhli taşınmaz alırken dikkat edilmesi gerekenler.",
 cevap="Şerh, taşınmaz üzerindeki üçüncü kişi haklarını herkese karşı ileri sürülebilir hâle getiren kayıttır (haciz, önalım, kira gibi). Beyan bilgi amaçlı nottur. İpotek ise taşınmazın bir borcun teminatı gösterilmesidir. Şerhli veya ipotekli taşınmaz alınabilir ama bu haklar yeni malike de geçer.",
 bolumler=[
  ("Şerh türleri", "- **Haciz şerhi:** Malikin borcu nedeniyle taşınmaz üzerine konulan haczi gösterir. Haciz kaldırılmadan alınan taşınmaz alacaklı tarafından sattırılabilir.\n- **İhtiyati tedbir:** Dava süresince devri engelleyen mahkeme kararıdır.\n- **Önalım (şufa) şerhi:** Belirli kişilere öncelikli satın alma hakkı tanır.\n- **Kira şerhi:** Kiracının hakkını yeni malike karşı korur.\n- **5403 şerhi:** 2026'dan itibaren tarım arazisinin amacı dışında kullanıldığı tespit edilirse 'amacı dışında kullanılmıştır' şerhi düşülür ve devir engellenir."),
  ("Beyanlar", "Beyanlar, taşınmazla ilgili bilgi notlarıdır: yönetim planı, 5403 kapsamında tarım arazisi olduğu, korunan alan içinde kaldığı, sit alanı gibi. Beyanlar hak doğurmaz ama yatırım kararını etkileyebilir."),
  ("İpotek", "İpotekli taşınmaz satılabilir; ancak borç ödenmezse alacaklı taşınmazı kimin elinde olursa olsun sattırabilir. Satın almadan önce ipoteğin kaldırılmasını (fek) satış şartı olarak koymak en güvenli yoldur."),
  ("İcra ihalesinde şerhler", "İcra ihalesiyle satılan taşınmazda haciz şerhleri ihaleyle birlikte kaldırılır. Ancak bazı irtifak hakları ve beyanlar kalabilir. İlandaki 'kaydındaki şerhler' bölümünü ve dosyadaki tapu kaydını mutlaka okuyun. Ayrıntı için [icra ihalesine nasıl girilir](/rehber/icra-ihalesine-nasil-girilir) rehberine bakın."),
 ],
 sss=[("Haciz şerhli tapu alınır mı?", "Teknik olarak alınabilir ama haciz yeni malike karşı da geçerlidir. Haczin kaldırılması satış şartı olmalıdır."), ("Şerhler nereden görülür?", "Tapu kaydında görünür; malik e-Devlet'ten görebilir, alıcı malikin izniyle tapu müdürlüğünden öğrenebilir.")],
 kaynak=[TMK, TKGM, K7584], ilgili=["tapu-senedi-nasil-okunur", "arsa-alirken-dikkat-edilecekler"])

rehber(slug="hisseli-tapu-nedir", title="Hisseli tapu nedir? Alınır mı, riskleri ve avantajları", h1="Hisseli tapu nedir, alınır mı?",
 desc="Hisseli (müşterek mülkiyetli) tapu nedir, hisseli arsa veya tarla almanın riskleri, önalım hakkı, ortaklığın giderilmesi ve 2026 düzenlemeleri.",
 cevap="Hisseli tapu, bir taşınmazın birden fazla kişiye pay oranında ait olduğu müşterek mülkiyettir. Her hissedar taşınmazın tamamında payı oranında hak sahibidir; arazide kendine ait ayrı bir parça yoktur. Bu yüzden hisseli taşınmaz ucuz olsa da kullanım, satış ve yapılaşmada risk taşır.",
 bolumler=[
  ("Müşterek ve elbirliği mülkiyet", "Müşterek mülkiyette her ortağın payı bellidir (1/4, 1/10 gibi) ve kendi payını tek başına satabilir. Elbirliği (iştirak hâlinde) mülkiyette ise paylar belirli değildir; mirasta taksim yapılmadan önceki durum böyledir ve satış için tüm mirasçıların birlikte hareket etmesi gerekir."),
  ("Riskler", "- Arazide 'benim yerim' diye ayrılmış bir bölüm yoktur; fiilî kullanım anlaşmaları resmî değildir.\n- Diğer hissedarlar satışta yasal önalım hakkını kullanabilir.\n- Yapılaşma ve tarım dışı kullanım için tüm hissedarların onayı gerekir.\n- Ortaklardan biri ortaklığın giderilmesi davası açarsa taşınmaz satışa çıkarılabilir.\n- Tarım arazilerinde 5403 sayılı Kanun asgari büyüklüğün altındaki hisselendirmeyi yasaklar; 7584 sayılı Kanun ile kooperatif hissesi üzerinden satış modeli 2026'da kapatılmıştır."),
  ("Avantajlar", "Hisseli taşınmazlar tam mülkiyete göre genellikle daha ucuzdur. Uzun vadede ortaklığın giderilmesiyle tamamı satılırsa veya diğer hisseler toplanırsa değer kazanabilir. İcra ve sulh hukuk satışlarında hisseli tarlalar sıkça ihaleye çıkar; [ortaklığın giderilmesi satışları](/ihaleler?tur=sulh) sayfasından takip edebilirsiniz."),
  ("Satın almadan önce", "Hisse oranını, toplam alanı ve diğer hissedar sayısını tapu kaydından öğrenin. Payınızın kaç metrekare ettiğini [hisse hesaplama aracıyla](/araclar/hisseli-tapu-pay-hesaplama) hesaplayın. Tarım arazisiyse 5403 kurallarına uyduğunu ve tapuda 'amacı dışında kullanılmıştır' şerhi olmadığını kontrol edin."),
 ],
 sss=[("Hisseli tapu satılabilir mi?", "Evet, müşterek mülkiyette her hissedar kendi payını satabilir; diğer hissedarların önalım hakkı vardır."), ("Hisseli tarlaya ev yapılır mı?", "Tüm hissedarların izni ve 5403 ile imar mevzuatına uygun izinler olmadan yapılamaz; izinsiz yapıya 2026'dan itibaren ağır cezalar uygulanır.")],
 kaynak=[TMK, TK5403, K7584], ilgili=["hisseli-tapu-nasil-satilir", "onalim-hakki-sufa", "ortakligin-giderilmesi-davasi", "hisseli-tarla-almak"])

rehber(slug="hisseli-tapu-nasil-satilir", title="Hisseli tapu nasıl satılır? Hissedar izni ve önalım hakkı", h1="Hisseli tapu nasıl satılır?",
 desc="Hisseli taşınmazda payınızı satarken diğer hissedarların önalım hakkı, noter bildirimi, tapu işlemleri ve tarım arazisi kuralları.",
 cevap="Müşterek mülkiyette her hissedar kendi payını diğerlerinin iznine gerek olmadan tapuda satabilir. Ancak pay üçüncü kişiye satılırsa diğer hissedarlar yasal önalım hakkıyla aynı bedelle payı alabilir. Bu riski azaltmak için satış diğer hissedarlara bildirilir.",
 bolumler=[
  ("Satış adımları", "- Payın oranını ve tapu kaydını kontrol edin.\n- Alıcıyla bedelde anlaşın; tarım arazisiyse 5403'e göre hisse devrinin mümkün olduğunu tapu müdürlüğünden teyit edin.\n- Web Tapu üzerinden satış başvurusu yapın, harçları ödeyin ve randevu günü tapuda imzalayın.\n- Satış, alıcı veya satıcı tarafından diğer hissedarlara noter aracılığıyla bildirilir."),
  ("Önalım hakkı ne zaman kullanılır?", "Diğer hissedarlar, satışın kendilerine bildirildiği tarihten itibaren üç ay içinde ve her hâlde satıştan itibaren iki yıl içinde önalım davası açabilir. Bu süreler geçtikten sonra hak kullanılamaz. Ayrıntı için [önalım hakkı](/rehber/onalim-hakki-sufa) rehberine bakın."),
  ("Payı diğer hissedarlara satmak", "Payı ortaklardan birine satmak önalım riskini ortadan kaldırır ve çoğu zaman en hızlı yoldur. Ortaklar arasında anlaşma yoksa ortaklığın giderilmesi davasıyla taşınmazın tamamı satılabilir."),
 ],
 sss=[("Hisseli tapu satışı için diğer hissedarların onayı gerekir mi?", "Müşterek mülkiyette gerekmez; ancak önalım hakları saklıdır. Elbirliği mülkiyette (taksim edilmemiş mirasta) tüm mirasçıların katılımı gerekir."), ("Önalım hakkı kaç yıl geçerlidir?", "Satışın bildiriminden itibaren 3 ay, her hâlde satıştan itibaren 2 yıl.")],
 kaynak=[TMK, TKGM], ilgili=["hisseli-tapu-nedir", "onalim-hakki-sufa", "ortakligin-giderilmesi-davasi"])

rehber(slug="onalim-hakki-sufa", title="Önalım (şufa) hakkı nedir? Dava süresi ve şartları", h1="Önalım (şufa) hakkı nedir, nasıl kullanılır?",
 desc="Hisseli taşınmazlarda yasal önalım hakkı: kimler kullanır, dava açma süreleri (3 ay ve 2 yıl), bedel yatırma ve istisnalar.",
 cevap="Önalım hakkı, müşterek mülkiyette bir hissedarın payını üçüncü kişiye satması durumunda diğer hissedarların aynı bedeli ödeyerek payı alma hakkıdır. Dava satışın öğrenilmesinden itibaren 3 ay, her hâlde satıştan itibaren 2 yıl içinde açılmalıdır.",
 bolumler=[
  ("Kimler kullanabilir?", "Yasal önalım hakkı yalnızca müşterek mülkiyetteki paydaşlara aittir. Paydaşlar arasındaki satışlarda önalım hakkı doğmaz. Ayrıca sözleşmeyle kurulan ve tapuya şerh verilen sözleşmeden doğan önalım hakları da vardır."),
  ("Süreler", "- Satış, noter aracılığıyla bildirildiyse bildirim tarihinden itibaren 3 ay.\n- Her hâlde satışın tapuya tescilinden itibaren 2 yıl.\nBu süreler hak düşürücüdür; geçince dava açılamaz."),
  ("Bedel ve masraflar", "Dava açan paydaş, satış bedelini ve alıcının ödediği tapu harcı gibi masrafları mahkemenin belirlediği süre içinde yatırmak zorundadır. Tapuda gerçek bedelden düşük gösterilen satışlarda, gerçek bedelin ispatı tartışma konusu olabilir."),
  ("İcra satışlarında önalım", "Cebrî artırmayla (icra ihalesiyle) yapılan satışlarda yasal önalım hakkı kullanılamaz. Bu yüzden icra ve ortaklığın giderilmesi satışlarında alınan paylar önalım riski taşımaz."),
 ],
 sss=[("Önalım davası nerede açılır?", "Taşınmazın bulunduğu yerdeki asliye hukuk mahkemesinde."), ("İcradan alınan hisseye önalım uygulanır mı?", "Hayır, cebrî artırmayla yapılan satışlarda yasal önalım hakkı kullanılamaz.")],
 kaynak=[TMK], ilgili=["hisseli-tapu-nasil-satilir", "hisseli-tapu-nedir"])

rehber(slug="ortakligin-giderilmesi-davasi", title="Ortaklığın giderilmesi (izale-i şuyu) davası nedir? Süreç ve satış", h1="Ortaklığın giderilmesi (izale-i şuyu) davası",
 desc="Hisseli taşınmazlarda ortaklığın giderilmesi davası nasıl açılır, aynen taksim ve satış yoluyla giderme, sulh hukuk satış memurluğu ihaleleri.",
 cevap="Ortaklığın giderilmesi davası, hissedarlar taşınmazın paylaşımı konusunda anlaşamadığında herhangi bir hissedarın sulh hukuk mahkemesinde açtığı davadır. Mahkeme mümkünse taşınmazı aynen böler; mümkün değilse satışına karar verir ve satış, sulh hukuk satış memurluğu tarafından açık artırmayla yapılır.",
 bolumler=[
  ("Kimler açabilir?", "Müşterek veya elbirliği mülkiyetteki her paydaş, pay oranı ne olursa olsun dava açabilir. Mirasta taksim yapılmamışsa mirasçılardan biri de bu davayı açabilir. Dava, taşınmazın bulunduğu yerdeki sulh hukuk mahkemesinde görülür."),
  ("Aynen taksim mi, satış mı?", "Mahkeme önce taşınmazın paylara göre bölünüp bölünemeyeceğine bakar. Tarım arazilerinde 5403 sayılı Kanun'un asgari büyüklükleri bölünmeyi çoğu zaman engellediği için genellikle satış yoluna gidilir."),
  ("Satış nasıl yapılır?", "Satış kararı kesinleşince dosya sulh hukuk satış memurluğuna gider. Taşınmaz bilirkişiyle değerlenir ve UYAP e-Satış üzerinden elektronik açık artırmaya çıkarılır. Miras yoluyla edinilmiş ve üçüncü kişi paydaş bulunmayan taşınmazlarda ilk artırma yalnızca mirasçı malikler arasında yapılır; alıcı çıkmazsa ikinci artırma herkese açıktır. Bu satışları [sulh hukuk satışları](/ihaleler?tur=sulh) sayfasından takip edebilirsiniz."),
  ("Satış bedeli nasıl paylaşılır?", "Satıştan elde edilen bedel, masraflar düşüldükten sonra paydaşlara pay oranlarında dağıtılır."),
 ],
 sss=[("Ortaklığın giderilmesi davası ne kadar sürer?", "Taşınmaz sayısı ve tebligat durumuna göre genellikle bir ila iki yıl sürer."), ("Ortaklığın giderilmesiyle satılan taşınmaza önalım uygulanır mı?", "Hayır, açık artırmayla yapılan satışlarda yasal önalım hakkı kullanılamaz.")],
 kaynak=[TMK, IIK], ilgili=["hisseli-tapu-nedir", "mirasci-ilk-artirma-kurali", "icra-ihalesine-nasil-girilir"])

rehber(slug="mirasci-ilk-artirma-kurali", title="Mirasçılara özel ilk artırma: ortaklığın giderilmesi satışlarında yeni kural", h1="Ortaklığın giderilmesi satışlarında mirasçılara özel ilk artırma",
 desc="Miras yoluyla edinilen taşınmazların satışında birinci artırmanın yalnızca mirasçı malikler arasında, muhammen bedelin %100'ünden yapılması kuralı.",
 cevap="Miras yoluyla edinilmiş ve mirasçılar dışında paydaşı olmayan taşınmazlarda ortaklığın giderilmesi satışının birinci artırmasına yalnızca mirasçı malikler katılabilir ve teklif muhammen bedelin %100'ünden az olamaz. Alıcı çıkmazsa ikinci artırma herkese açık yapılır.",
 bolumler=[
  ("Kural nasıl işler?", "Satış ilanında 'Birinci açık artırma sadece malik olan mirasçılar arasında yapılır' ibaresi yer alır. İlk artırmada en az muhammen bedelin tamamı (artı masraflar ve varsa rüçhanlı alacaklar) teklif edilmelidir. Bu aşamada dışarıdan alıcı teklif veremez."),
  ("Dışarıdan alıcı için ne anlama gelir?", "Yatırımcılar yalnızca ikinci artırmaya katılabilir. İkinci artırmada genel kural uygulanır: teklif muhammen bedelin en az %50'si olmalıdır. Topraklık'taki UYAP e-Satış ilanlarında bu kuralın geçerli olduğu satışlar 'İhale usulü' satırında ayrıca belirtilir."),
  ("Mirasçılar için ne anlama gelir?", "Taşınmazı ailede tutmak isteyen mirasçı, diğerlerine muhammen bedel üzerinden payını ödeyerek taşınmazın tamamını alma imkânına sahiptir."),
 ],
 sss=[("Mirasçı olmayan ilk artırmaya katılabilir mi?", "Hayır, bu kuralın uygulandığı satışlarda birinci artırmaya yalnızca mirasçı malikler katılabilir."), ("İkinci artırmada en düşük teklif ne olmalı?", "Muhammen bedelin %50'si.")],
 kaynak=[IIK], ilgili=["ortakligin-giderilmesi-davasi", "icra-ihalesine-nasil-girilir"])

rehber(slug="icra-ihalesinin-feshi", title="İcra ihalesinin feshi davası: süre, şartlar ve sonuçları", h1="İcra ihalesinin feshi nedir, ne zaman istenir?",
 desc="İcra ihalesine katılanlar ve ilgililer için ihalenin feshi davası: 7 günlük süre, fesih sebepleri, alıcıya etkisi ve %10 para cezası.",
 cevap="İhalenin feshi, usulüne uygun yapılmadığı iddia edilen icra ihalesinin iptali için icra mahkemesinde açılan davadır. İhaleye katılanlar ve ilgililer ihale tarihinden itibaren 7 gün içinde başvurabilir. Fesih istemi reddedilirse başvurana ihale bedelinin %10'u oranında para cezası verilebilir.",
 bolumler=[
  ("Kimler açabilir?", "Alıcı, borçlu, alacaklı, tapu kaydında ilgisi bulunanlar ve ihaleye katılan teklif sahipleri fesih isteyebilir."),
  ("Fesih sebepleri", "- Satış ilanının usulüne uygun yapılmaması veya tebliğ edilmemesi\n- Kıymet takdirindeki usulsüzlükler\n- İhaleye fesat karıştırılması (anlaşmalı teklif vb.)\n- Taşınmazın niteliğinde ilanda belirtilmeyen önemli farklılık bulunması"),
  ("Alıcıya etkisi", "Fesih davası sürerken tapu tescili yapılmaz. Dava reddedilip karar kesinleşince tescil gerçekleşir. Fesih kabul edilirse ihale bozulur ve alıcının yatırdığı bedel iade edilir. Bu yüzden ihale sonrası birkaç hafta tapuyu alamama ihtimalini hesaba katın."),
 ],
 sss=[("İhalenin feshi süresi kaç gündür?", "İhale tarihinden itibaren 7 gün; ihale tebliğ edilmesi gerekenler için tebliğden itibaren 7 gün."), ("Fesih davası reddedilirse ne olur?", "Davacıya ihale bedelinin %10'u oranında para cezası verilebilir.")],
 kaynak=[IIK], ilgili=["icra-ihalesine-nasil-girilir", "icra-ihalesi-masraflari", "icradan-ev-almak"])

rehber(slug="icradan-ev-almak", title="İcradan ev, arsa veya tarla almak mantıklı mı? Avantajlar ve riskler", h1="İcradan ev, arsa veya tarla almak",
 desc="İcradan satılık taşınmaz almanın avantajları, riskleri, tahliye, borç ve şerh durumu, masraflar ve dikkat edilmesi gerekenler.",
 cevap="İcradan taşınmaz almak çoğu zaman piyasanın altında fiyat sunar; ilk ve ikinci artırmada muhammen bedelin %50'sinden teklif verilebilir. Buna karşılık KDV ve harçlar, tahliye süreci, ihalenin feshi riski ve taşınmazı görmeden alma gibi riskler vardır.",
 bolumler=[
  ("Avantajlar", "- Piyasa değerinin altında alma imkânı\n- Haciz şerhlerinin ihaleyle kaldırılması\n- Yasal önalım hakkının işlememesi\n- Satışların UYAP e-Satış'ta şeffaf yapılması"),
  ("Riskler", "- Taşınmazı içeriden görme imkânının sınırlı olması\n- İçinde oturan borçlunun veya kiracının tahliyesi gerekebilmesi\n- KDV (arsa ve tarlada çoğunlukla %10) ve tapu harcı gibi ek masraflar\n- 7 gün içinde açılabilecek ihalenin feshi davası nedeniyle tescilin gecikmesi\n- Ödemeyi süresinde yapmazsanız teminatın yanması ve fark sorumluluğu"),
  ("Toplam maliyet", "Teklif bedeline KDV, tapu harcı (%2), damga vergisi ve teslim masrafları eklenir. Toplamı [icra ihalesi maliyet hesaplama aracıyla](/araclar/icra-ihalesi-maliyet-hesaplama) görebilirsiniz."),
  ("Nereden bakılır?", "Güncel icra ve mahkeme satışlarını il ve ilçeye göre [icradan satılık tarla ve arsalar](/ihaleler?tur=icra) sayfasında, adım adım katılım için [icra ihalesine nasıl girilir](/rehber/icra-ihalesine-nasil-girilir) rehberinde bulabilirsiniz."),
 ],
 sss=[("İcradan alınan evde kiracı varsa ne olur?", "Kiracının hakları kira sözleşmesine ve tapu kaydına göre değerlendirilir; yeni malik bazı durumlarda tahliye için dava açmak zorunda kalabilir."), ("İcradan tarla almak güvenli mi?", "Satış resmîdir ve haciz şerhleri kalkar; ancak niteliği, yolu ve hisse durumunu ilandan ve tapu kaydından kontrol etmek gerekir.")],
 kaynak=[IIK], ilgili=["icra-ihalesine-nasil-girilir", "icra-ihalesi-masraflari", "icra-ihalesinin-feshi"])

rehber(slug="tarim-arazisi-bolunme-5403", title="Tarım arazisi bölünebilir mi? 5403 asgari parsel büyüklükleri ve hisse satışı", h1="Tarım arazisi bölünme kuralları (5403 sayılı Kanun)",
 desc="Tarım arazilerinde asgari parsel büyüklüğü (20, 5 ve 3 dekar), hisselendirme yasağı, miras paylaşımı ve 2026'da 7584 sayılı Kanun'la gelen değişiklikler.",
 cevap="5403 sayılı Kanun'a göre tarım arazileri asgari büyüklüklerin altında bölünemez ve hisselendirilemez: mutlak, marjinal ve özel ürün arazilerinde 20 dekar, dikili tarım arazilerinde 5 dekar, örtüaltı tarımında 3 dekar. Bu sınırların altında kalacak hisse devirleri tapuda yapılmaz.",
 bolumler=[
  ("Asgari büyüklükler", "- Mutlak tarım arazisi, marjinal tarım arazisi ve özel ürün arazisi: 20 dekar (20 dönüm)\n- Dikili tarım arazisi (bağ, bahçe, zeytinlik vb.): 5 dekar\n- Örtüaltı tarımı (sera): 3 dekar\nAsgari büyüklüğün altındaki araziler bölünemez; bu büyüklüğün altında kalacak şekilde hisse de satılamaz."),
  ("Mirasta durum", "Miras yoluyla geçen tarım arazisinde mirasçılar paylaşımda anlaşamazsa arazi bölünmez; mirasçılardan biri diğerlerinin payını alabilir, aksi hâlde ortaklığın giderilmesiyle satış yoluna gidilir."),
  ("2026 değişiklikleri (7584 sayılı Kanun)", "20 Haziran 2026'da yürürlüğe giren 7584 sayılı Kanun'la:\n- Kooperatiflerin tarımsal niteliği korunacak alanlarda mülk edinmesi (tarımsal amaçlı kooperatifler hariç) yasaklandı; kooperatif hissesi üzerinden 'hobi bahçesi' satışının yasal dayanağı kalmadı.\n- Tarım arazisinde izinsiz yapı için idari para cezasının taban katsayısı m² başına 2.500 TL'ye çıkarıldı.\n- İzinsiz yapılara elektrik, su ve doğal gaz aboneliği yasaklandı.\n- Amacı dışında kullanılan arazilerin tapusuna şerh düşülmesi ve devrin engellenmesi düzenlendi.\n- Tescili mümkün olmayan fiilî hisse oluşturup devredenler için hapis cezası öngörüldü."),
  ("Alıcı için ne demek?", "Hisseli tarla alırken payınızın 5403 kurallarına uygun olarak tapuya tescil edilebildiğinden emin olun. 'Noterden hisse', 'kooperatif hissesi' veya 'tapu sonra verilecek' gibi teklifler hukuki risk taşır."),
 ],
 sss=[("Tarla kaç dönümün altında bölünemez?", "Arazinin sınıfına göre 20, 5 veya 3 dekarın altında bölünemez."), ("Hobi bahçesi satışı yasal mı?", "7584 sayılı Kanun'la kooperatif hissesi üzerinden tarım arazisi satış modelinin yasal dayanağı 2026'da kaldırılmıştır.")],
 kaynak=[TK5403, K7584, TADYON], ilgili=["hobi-bahcesi-kooperatif-hissesi", "tarlaya-ev-yapilir-mi", "hisseli-tapu-nedir"])

rehber(slug="hobi-bahcesi-kooperatif-hissesi", title="Hobi bahçesi ve kooperatif hissesiyle tarla satışı 2026: yasal mı?", h1="Hobi bahçesi ve kooperatif hissesiyle tarla almak",
 desc="7584 sayılı Kanun'la 2026'da hobi bahçesi ve kooperatif hissesi satışına getirilen yasaklar, izinsiz yapı cezaları ve alıcıların dikkat etmesi gerekenler.",
 cevap="20 Haziran 2026'da yürürlüğe giren 7584 sayılı Kanun'la, tarım arazisinin kooperatife devredilip üyelere hisse olarak satılması yönteminin yasal dayanağı kaldırıldı. Bu yolla 'hobi bahçesi' satın almak ciddi hukuki ve cezai risk taşır.",
 bolumler=[
  ("Ne değişti?", "- Tarımsal amaçlı olmayan kooperatifler tarımsal niteliği korunacak alanlarda mülkiyet ve sınırlı ayni hak edinemez.\n- Tescili mümkün olmayan fiilî hisseler oluşturup devretmek suç olarak düzenlendi.\n- Amacı dışında kullanılan arazinin tapusuna şerh düşülür ve devir engellenir."),
  ("İzinsiz yapı ve altyapı", "Tarım arazisinde izinsiz yapılan bağ evi, konteyner veya ev için idari para cezasının taban katsayısı m² başına 2.500 TL'dir. İzinsiz yapılara elektrik, su ve doğal gaz bağlanamaz; bağlayan kurumlara abone başına para cezası uygulanır. Yıkım ve eski hâle getirme hükümleri de geçerlidir."),
  ("Elinizde hobi bahçesi varsa", "Tapu kaydınızda şerh olup olmadığını kontrol edin, yapı varsa durumunu il tarım ve orman müdürlüğünden öğrenin ve bir avukattan görüş alın. Yeni bir satış teklifinde 'kooperatif hissesi' veya 'noter satışı' ifadelerine karşı dikkatli olun."),
 ],
 sss=[("Hobi bahçesi almak 2026'da yasal mı?", "Kooperatif hissesi yoluyla tarım arazisi satışı 7584 sayılı Kanun'la yasal dayanağını yitirdi; bu yolla alınan hisseler tapuya tescil edilemez ve ceza riski taşır."), ("Tarlaya konteyner koymak serbest mi?", "Hayır, kalıcı kullanıma yönelik yapılar izne tabidir; izinsiz yapıya ağır para cezası uygulanır.")],
 kaynak=[K7584, TK5403], ilgili=["tarim-arazisi-bolunme-5403", "tarlaya-ev-yapilir-mi"])

rehber(slug="tarlaya-ev-yapilir-mi", title="Tarlaya ev yapılır mı? Bağ evi, tarımsal yapı ve izinler (2026)", h1="Tarlaya ev yapılır mı?",
 desc="Tarım arazisine ev, bağ evi veya tarımsal yapı yapma şartları, tarım dışı kullanım izni, imar mevzuatı ve 2026'daki izinsiz yapı cezaları.",
 cevap="Tarlaya izin almadan ev yapılamaz. Tarımsal amaçlı yapılar (ahır, depo, sera, çiftçi barınağı) ve belirli şartlarda bağ evi için önce tarım dışı kullanım veya tarımsal yapı izni, ardından imar mevzuatına göre yapı ruhsatı gerekir. 2026'dan itibaren izinsiz yapılara ağır cezalar ve altyapı bağlantı yasağı uygulanır.",
 bolumler=[
  ("Hangi yapılar mümkün?", "- **Tarımsal yapılar:** Ahır, ağıl, depo, sera, ürün işleme ve çiftçi barınağı gibi tarımsal üretime yönelik yapılar, il tarım ve orman müdürlüğünün uygun görüşü ve imar izniyle yapılabilir.\n- **Bağ evi:** Plansız alanlarda belirli asgari arazi büyüklüğü ve yapı alanı sınırlarıyla yapılabilir; sınırlar 2026'da yönetmelikle değişmiştir, başvurudan önce güncel şartları belediye veya il özel idaresinden öğrenin.\n- **Konut:** Tarım arazisinde tarımsal amaç dışında konut için tarım dışı kullanım izni ve imar planı değişikliği gerekir; bu çoğu zaman mümkün değildir."),
  ("İzin süreci", "Başvuru, arazinin bulunduğu yere göre belediyeye veya il özel idaresine yapılır; bu kurumlar talebi TAD Portal üzerinden il tarım ve orman müdürlüğüne iletir. Ayrıntı için [tarım dışı kullanım izni](/rehber/tarim-disi-kullanim-izni) rehberine bakın."),
  ("İzinsiz yapının cezası", "7584 sayılı Kanun'la izinsiz yapı için idari para cezasının taban katsayısı m² başına 2.500 TL'ye çıkarıldı. İzinsiz yapılara elektrik, su ve doğal gaz aboneliği verilmez; yapı yıktırılabilir ve tapuya şerh düşülebilir."),
 ],
 sss=[("Tarlaya konteyner ev koymak serbest mi?", "Hayır; kalıcı kullanıma yönelik konteyner de yapı sayılır ve izne tabidir."), ("Tarlaya ahır yapmak için izin gerekir mi?", "Evet; il tarım ve orman müdürlüğünün görüşü ve yapı ruhsatı gerekir.")],
 kaynak=[TK5403, K7584, TADYON, IMAR], ilgili=["tarim-disi-kullanim-izni", "tarla-imara-nasil-acilir", "hobi-bahcesi-kooperatif-hissesi"])

rehber(slug="tarim-disi-kullanim-izni", title="Tarım dışı kullanım izni nasıl alınır? TAD Portal başvurusu (2026)", h1="Tarım dışı kullanım izni nasıl alınır?",
 desc="5403 sayılı Kanun'un 13. maddesine göre tarım arazisinin tarım dışı kullanımı için izin: başvuru yeri, TAD Portal, etüt raporu, Toprak Koruma Kurulu, süreler ve itiraz.",
 cevap="Tarım arazisini tarım dışı amaçla kullanmak için belediye veya il özel idaresine başvurulur; bu kurumlar talebi TAD Portal üzerinden il tarım ve orman müdürlüğüne iletir. Arazi etüdü yapılır, gerekirse Toprak Koruma Kurulu görüşü alınır ve valilik veya Bakanlık karar verir. İzin tek başına yapı ruhsatı değildir.",
 bolumler=[
  ("Başvuru nereye yapılır?", "- Belediye ve mücavir alan sınırları içinde: belediyeye\n- Bu sınırlar dışında: il özel idaresine\nBu kurumlar başvuruyu TAD Portal'a kaydedip il tarım ve orman müdürlüğüne iletir. Doğrudan il müdürlüğüne yapılan başvurular genellikle iade edilir; bazı enerji ve maden projeleri ile tarımsal yapı başvuruları istisnadır."),
  ("Süreç", "- Arazi etüdü: en az iki ziraat mühendisi rapor hazırlar.\n- DSİ, il özel idaresi ve belediyeden kurum görüşleri alınır.\n- Alternatif alan araştırılır; alternatif yoksa gerekçesi yazılır.\n- Gerekirse toprak koruma projesi hazırlanır.\n- Valilik veya Toprak Koruma Kurulu karar verir; büyük ovalar ve kamu yararı gerektiren durumlarda Bakanlık karar verir.\n- İzinden sonra imar planı ve yapı ruhsatı aşamaları ayrıca tamamlanır."),
  ("Süreler ve itiraz", "Eksik belge için kamu kurumlarından istenenlerde 6 ay, diğerlerinde 3 ay süre verilir. İzin, bildirimden itibaren 2 yıl geçerlidir. Ret kararına 1 yıl içinde valilik aracılığıyla Bakanlığa bir kez itiraz edilebilir; idari dava süresi 60 gündür."),
  ("2026 değişikliği", "4 Nisan 2026'da yayımlanan Tarım Arazilerinin Korunması ve Kullanılması Hakkında Yönetmelik başvuru ve denetim sürecini yeniden düzenledi ve TAD Portal'ı merkeze aldı."),
 ],
 sss=[("Tarım dışı kullanım izni ne kadar sürer?", "Dosyanın tamlığına ve kurul toplantılarına göre birkaç aydan bir yıla kadar sürebilir."), ("İzin alınca ev yapabilir miyim?", "Hayır; izin yalnızca tarım dışı kullanıma onaydır. İmar planı ve yapı ruhsatı ayrıca gerekir.")],
 kaynak=[TK5403, TADYON], ilgili=["tarla-imara-nasil-acilir", "tarlaya-ev-yapilir-mi"])

rehber(slug="tarla-imara-nasil-acilir", title="Tarla imara nasıl açılır? Süreç, şartlar ve gerçekler", h1="Tarla imara nasıl açılır?",
 desc="Tarım arazisinin imara açılması için imar planı, tarım dışı kullanım izni ve kurum görüşleri; bireysel başvurunun sınırları ve 'imara açılacak' tarla alırken dikkat edilecekler.",
 cevap="Bir tarla, tek başına malikin başvurusuyla imara açılmaz. İmar, belediye veya yetkili idarenin yaptığı imar planlarıyla belirlenir; tarım arazisinin plana alınabilmesi için ayrıca 5403 sayılı Kanun'a göre tarım dışı kullanım izni ve kurum görüşleri gerekir. 'Yakında imara açılacak' vaadiyle satılan tarlalarda dikkatli olunmalıdır.",
 bolumler=[
  ("İmar planı nasıl değişir?", "İmar planları ve plan değişiklikleri belediye meclisleri (plansız alanlarda il özel idaresi) tarafından yapılır ve onaylanır. Malik plan değişikliği talebinde bulunabilir; ancak talep kamu yararı, üst ölçekli planlar ve kurum görüşleriyle uyumlu olmalıdır."),
  ("Tarım arazisinde ek şartlar", "Tarım arazisinin plan içine alınması için il tarım ve orman müdürlüğünden tarım dışı kullanım izni alınması gerekir. Mutlak tarım arazileri, büyük ova koruma alanları ve sulu tarım alanlarında bu izin çok sınırlı verilir. Süreç için [tarım dışı kullanım izni](/rehber/tarim-disi-kullanim-izni) rehberine bakın."),
  ("İmar durumunu öğrenmek", "Bir parselin bugünkü imar durumu belediyeden (imar durum belgesi veya e-imar sistemi) öğrenilir. Bunun için [imar durumu nasıl öğrenilir](/rehber/imar-durumu-nasil-ogrenilir) rehberine bakın."),
  ("'İmara açılacak' tarla alırken", "Satıcının sözlü vaadi bağlayıcı değildir. Belediyede onaylanmış ya da askıya çıkmış bir plan yoksa imar beklentisi spekülatiftir. Çevre düzeni planında arazinin 'tarım alanı' gösterilip gösterilmediğini kontrol edin."),
 ],
 sss=[("Tarlamı kendim imara açtırabilir miyim?", "Plan değişikliği talep edebilirsiniz; ancak karar belediye meclisinin ve ilgili kurumların görüşüne bağlıdır."), ("İmara açılan tarlanın değeri artar mı?", "Genellikle belirgin artar; ancak imar uygulamasında düzenleme ortaklık payı (DOP) kesintisi yapılır.")],
 kaynak=[IMAR, TK5403, TADYON], ilgili=["imar-durumu-nasil-ogrenilir", "tarim-disi-kullanim-izni", "arsa-alirken-dikkat-edilecekler"])

rehber(slug="imar-durumu-nasil-ogrenilir", title="İmar durumu nasıl öğrenilir? e-İmar, imar durum belgesi ve plan notları", h1="İmar durumu nasıl öğrenilir?",
 desc="Arsa veya tarlanın imar durumunu belediyenin e-imar sisteminden ve imar durum belgesiyle öğrenme; emsal, TAKS, KAKS, kat sayısı ve çekme mesafeleri.",
 cevap="İmar durumu, taşınmazın bulunduğu belediyenin imar müdürlüğünden imar durum belgesiyle veya belediyenin e-imar sisteminden ada ve parsel numarasıyla öğrenilir. Belgede taşınmazın kullanım fonksiyonu (konut, ticaret, tarım), yapılaşma şartları (emsal/KAKS, TAKS, kat yüksekliği) ve plan notları yer alır.",
 bolumler=[
  ("e-İmar sistemi", "Büyükşehir ve birçok il belediyesinin internet sitesinde e-imar sayfası bulunur. İlçe, mahalle, ada ve parsel girilerek plan lejantı ve yapılaşma koşulları görülebilir. Bu bilgiler ön inceleme içindir; resmî işlem için imar durum belgesi alınır."),
  ("İmar durum belgesi", "Belediyenin imar müdürlüğüne tapu fotokopisi ve dilekçeyle başvurularak alınır; ücreti belediyeye göre değişir. Belgede parselin plandaki kullanım kararı, emsal (KAKS), taban alanı katsayısı (TAKS), azami kat yüksekliği ve çekme mesafeleri yazar."),
  ("Terimler", "- **Emsal / KAKS:** Parsel alanının kaç katı inşaat alanı yapılabileceği. 1.000 m² parselde emsal 1,00 ise toplam 1.000 m² inşaat yapılabilir.\n- **TAKS:** Binanın zemine oturacağı alanın parsel alanına oranı.\n- **Hmax / kat:** İzin verilen en yüksek bina yüksekliği veya kat sayısı.\n- **Plansız alan:** İmar planı olmayan alanlarda Plansız Alanlar İmar Yönetmeliği uygulanır."),
  ("Tarım arazileri", "Plansız alandaki tarım arazilerinde yapılaşma 5403 sayılı Kanun ve Plansız Alanlar İmar Yönetmeliği'ne tabidir. Tarlaya yapı yapma şartları için [tarlaya ev yapılır mı](/rehber/tarlaya-ev-yapilir-mi) rehberine bakın."),
 ],
 sss=[("İmar durumu e-Devlet'ten öğrenilir mi?", "Bazı belediyeler e-Devlet üzerinden hizmet verir; çoğunda belediyenin kendi e-imar sistemi kullanılır."), ("Emsal 0,30 ne demek?", "Parsel alanının %30'u kadar toplam inşaat alanı yapılabilir demektir.")],
 kaynak=[IMAR], ilgili=["tarla-imara-nasil-acilir", "arsa-alirken-dikkat-edilecekler", "tapu-senedi-nasil-okunur"])

rehber(slug="arsa-alirken-dikkat-edilecekler", title="Arsa alırken dikkat edilecekler: 12 maddelik kontrol listesi", h1="Arsa alırken dikkat edilmesi gerekenler",
 desc="Arsa veya imarlı parsel alırken tapu kaydı, imar durumu, yol, altyapı, şerhler, hisse, zemin ve vergiler için kontrol listesi.",
 cevap="Arsa alırken tapu kaydını, imar durumunu, yola cephesini, şerh ve ipotekleri, hisse durumunu, altyapıyı ve toplam maliyeti satın almadan önce kontrol edin. Sözlü vaatlere değil, resmî belgelere güvenin.",
 bolumler=[
  ("Kontrol listesi", "- Tapu kaydı: malik, hisse, şerh, beyan, ipotek ([şerh ve ipotek rehberi](/rehber/tapuda-serh-beyan-ipotek))\n- İmar durumu: kullanım kararı, emsal, TAKS, kat ([imar durumu rehberi](/rehber/imar-durumu-nasil-ogrenilir))\n- Parsel sınırları ve yüzölçümü: [parsel sorgulama](/parsel-sorgu) ile yerinde kontrol\n- Yola cephe: kadastral yola cephesi olmayan parselde yapı ruhsatı alınamayabilir\n- Altyapı: elektrik, su, kanalizasyon ve doğal gaz durumu\n- Düzenleme ortaklık payı (DOP): imar uygulaması yapılmamış alanlarda kesinti olabilir\n- Zemin: heyelan, dere yatağı, sit alanı veya askeri bölge gibi kısıtlar\n- Emlak vergisi borcu: belediyeden sorgulayın\n- Komşu parseller ve çevre gelişimi\n- Toplam maliyet: tapu harcı, döner sermaye, varsa KDV ([tapu harcı hesaplama](/araclar/tapu-harci-hesaplama))\n- Ödeme güvenliği: bedeli tapu işlemi sırasında veya güvenli ödeme sistemiyle ödeyin\n- Satıcının kimliği ve vekâletname kontrolü"),
  ("İcra veya hazineden almak", "Piyasanın altında fiyat için icra ve hazine ihalelerine bakabilirsiniz. Güncel ilanlar [ihaleler](/ihaleler) sayfasında il ve ilçeye göre listelenir."),
 ],
 sss=[("Arsa alırken en önemli belge nedir?", "Tapu kaydı ve imar durum belgesi."), ("Yolu olmayan arsaya ev yapılır mı?", "Kadastral yola cephesi olmayan parsellerde genellikle yapı ruhsatı alınamaz; geçit hakkı veya plan çözümü gerekir.")],
 kaynak=[TKGM, IMAR], ilgili=["tarla-alirken-dikkat-edilecekler", "imar-durumu-nasil-ogrenilir", "tapu-devri-nasil-yapilir"])

rehber(slug="emlak-vergisi-arsa-tarla", title="Arsa ve tarla emlak vergisi ne kadar? Oranlar ve ödeme (2026)", h1="Arsa ve tarla için emlak vergisi",
 desc="Emlak vergisi oranları: arazi (tarla) binde 1, arsa binde 3, büyükşehirlerde iki kat. Ödeme taksitleri, beyan ve 2026 değer artış sınırı.",
 cevap="Emlak vergisi, taşınmazın emlak vergi değeri üzerinden belediyeye ödenir. Tarla gibi araziler için oran binde 1, arsalar için binde 3'tür; büyükşehir belediyesi sınırlarında bu oranlar iki kat uygulanır. Vergi yılda iki taksitte, Mayıs ve Kasım aylarında ödenir.",
 bolumler=[
  ("Oranlar", "- Arazi (tarla, bağ, bahçe): binde 1 (büyükşehirde binde 2)\n- Arsa: binde 3 (büyükşehirde binde 6)\n- Konut: binde 1 (büyükşehirde binde 2)\n- Diğer binalar (işyeri vb.): binde 2 (büyükşehirde binde 4)"),
  ("Emlak vergi değeri ve 2026", "Vergi değeri, belediyenin belirlediği arsa birim değerleri üzerinden hesaplanır. 2026 yılı için yapılan yeniden değerlemede vergi değerinin 2025'e göre artışına kanunla bir üst sınır getirildi; kendi taşınmazınızın değerini belediyeden veya e-Devlet'ten öğrenebilirsiniz."),
  ("Beyan ve ödeme", "Taşınmazı yeni alan kişi, alımı izleyen yıl şubat ayı sonuna kadar belediyeye emlak vergisi beyannamesi verir (bazı belediyeler tapu bilgisini otomatik alır, yine de kontrol edin). Vergi Mayıs ve Kasım aylarında iki eşit taksitte ödenir."),
  ("Tapu harcıyla ilişkisi", "Tapuda beyan edilen satış bedeli emlak vergi değerinin altında olamaz. Ayrıntı için [tapu harcı](/rehber/tapu-harci-nedir) rehberine bakın."),
 ],
 sss=[("Tarlanın emlak vergisi ne kadar?", "Vergi değerinin binde 1'i; büyükşehirlerde binde 2'si."), ("Emlak vergisi ne zaman ödenir?", "Mayıs ve Kasım aylarında iki taksitte.")],
 kaynak=[EVK], ilgili=["tapu-harci-nedir", "deger-artis-kazanci-vergisi"])

rehber(slug="deger-artis-kazanci-vergisi", title="Arsa ve tarla satışında değer artış kazancı vergisi: 5 yıl kuralı", h1="Değer artış kazancı vergisi: 5 yıl içinde satılan taşınmazlar",
 desc="Satın alındıktan sonra 5 yıl içinde satılan arsa, tarla veya evde değer artış kazancı vergisi, endeksleme, istisna tutarı ve beyan zamanı.",
 cevap="Satın alınan bir taşınmaz, alım tarihinden itibaren 5 yıl içinde satılırsa satış kazancı değer artış kazancı olarak gelir vergisine tabidir. Alış bedeli Yİ-ÜFE ile endekslenebilir, yıllık istisna tutarı düşülür ve kalan kazanç ertesi yıl mart ayında beyan edilir. Miras yoluyla edinilen taşınmazlarda bu vergi doğmaz.",
 bolumler=[
  ("Kimler öder?", "Taşınmazı satın alıp beş yıl dolmadan satan kişiler. Beş yıl, tapudaki alış ve satış tarihleri arasında hesaplanır. Miras yoluyla edinilen taşınmazların satışı bu kapsamda değildir."),
  ("Nasıl hesaplanır?", "- Kazanç = satış bedeli − (alış bedeli + alım masrafları)\n- Alış bedeli, Yİ-ÜFE artışı %10'u aşıyorsa endekslenerek artırılabilir.\n- O yıl için belirlenen istisna tutarı düşülür.\n- Kalan tutar gelir vergisi tarifesine göre vergilendirilir."),
  ("Beyan", "Satışı izleyen yılın mart ayında yıllık gelir vergisi beyannamesiyle beyan edilir. İstisna tutarı her yıl değişir; güncel tutarı Gelir İdaresi Başkanlığı'ndan kontrol edin."),
  ("Düşük bedel göstermenin sonucu", "Alışta tapuya düşük bedel gösterildiyse satışta kazanç yüksek görünür ve vergi artar. Bu yüzden tapuda gerçek bedelin gösterilmesi uzun vadede satıcının da yararınadır."),
 ],
 sss=[("Miras kalan tarlayı satınca vergi öder miyim?", "Miras yoluyla edinilen taşınmazların satışında değer artış kazancı vergisi doğmaz."), ("5 yıl nasıl hesaplanır?", "Tapudaki alım tarihinden satış tarihine kadar geçen süreye bakılır.")],
 kaynak=[GVK, ("Gelir İdaresi Başkanlığı", "https://www.gib.gov.tr")], ilgili=["tapu-harci-nedir", "emlak-vergisi-arsa-tarla"])

rehber(slug="hazine-arazisi-kiralama", title="Hazine arazisi nasıl kiralanır? Tarım amaçlı kiralama ve ihaleler", h1="Hazine arazisi kiralama",
 desc="Milli Emlak'ın tarım, hayvancılık ve tıbbi-aromatik bitki amaçlı hazine arazisi kiralama ihaleleri: başvuru, ihale usulü, süre ve bedeller.",
 cevap="Hazine arazileri Milli Emlak birimleri tarafından 2886 sayılı Devlet İhale Kanunu'na göre ihaleyle kiraya verilir. Tarım ve hayvancılık amaçlı kiralama ilanları Milli Emlak'ın sitesinde ve Topraklık'ın ihaleler sayfasında listelenir; ihaleye teminat yatırılarak katılınır.",
 bolumler=[
  ("Hangi amaçlarla kiralanır?", "- Tarımsal üretim (tarla bitkileri, bahçe)\n- Hayvancılık (besi, ağıl, mera amaçlı alanlar)\n- Arıcılık\n- Tıbbi ve aromatik bitki ile süs bitkisi yetiştiriciliği\n- Yenilenebilir enerji ve diğer amaçlar"),
  ("Nasıl başvurulur?", "Kiralama ilanında ihale tarihi, saati, yeri, tahmini yıllık kira bedeli ve geçici teminat yazar. İhale saatinden önce teminatı yatırıp kimlik ve tebligat adresi belgeleriyle ilgili Milli Emlak müdürlüğüne başvurursunuz. İhale genellikle açık teklif usulüyle yapılır."),
  ("İlanlar nerede?", "Güncel hazine kiralama ilanlarını [ihaleler sayfasında 'Hazine (Milli Emlak)' ve 'Kiralama'](/ihaleler?tur=hazine&tip=kira) seçerek görebilirsiniz. İlanların aslı Milli Emlak'ın sitesindedir."),
  ("Dikkat edilecekler", "Kira süresi, bedel artışı, kullanım amacı dışına çıkmama ve yapılaşma yasağı gibi şartlar şartnamede yazar. Amacı dışında kullanım sözleşmenin feshine yol açar."),
 ],
 sss=[("Hazine arazisi kaç yıllığına kiralanır?", "Süre ilana ve kullanım amacına göre değişir; şartnamede belirtilir."), ("Hazine arazisi kiralamak için çiftçi olmak gerekir mi?", "Bazı tarımsal kiralamalarda Çiftçi Kayıt Sistemi kaydı veya üretici belgesi istenebilir; ilanın şartlarına bakın.")],
 kaynak=[DIK, MILLIEMLAK], ilgili=["hazine-arazisi-nasil-alinir", "/ihaleler"])

rehber(slug="kadastro-ada-parsel-nedir", title="Ada ve parsel nedir? Kadastro, pafta ve parsel numarası nasıl bulunur?", h1="Ada ve parsel nedir?",
 desc="Ada, parsel ve pafta kavramları; kadastro haritası, parsel numarası nasıl bulunur ve ada parsel ile taşınmaz sorgulama.",
 cevap="Ada, yollarla çevrili kadastro bloğunun numarasıdır; parsel ise bu blok içindeki her bir taşınmaza verilen numaradır. İl, ilçe, mahalle, ada ve parsel bilgisi bir taşınmazı Türkiye'de tek başına tanımlar.",
 bolumler=[
  ("Kavramlar", "- **Ada:** Kadastro çalışmasında yollar, dereler gibi sınırlarla çevrilen bölge.\n- **Parsel:** Ada içindeki taşınmaz birimi; her parselin sınırları ve yüzölçümü kadastro haritasında kayıtlıdır.\n- **Pafta:** Kadastro haritasının ölçekli sayfası.\n- **Köy/mahalle:** Ada ve parsel numaraları mahalle veya köy bazında verilir; farklı mahallelerde aynı numaralar bulunabilir."),
  ("Parsel numarası nasıl bulunur?", "Tapu senedinde yazar. Kendi taşınmazlarınızı e-Devlet'teki Tapu Bilgileri Sorgulama hizmetinden görebilirsiniz. Bir arazinin konumundan parsel numarasını bulmak için harita tabanlı [parsel sorgulama](/parsel-sorgu) kullanılır."),
  ("Kadastro güncellemesi", "Bazı bölgelerde 3402 sayılı Kanun'un 22/a maddesi kapsamında yenileme çalışmaları yapılır ve ada-parsel numaraları değişebilir. Eski tapuyla yeni numara arasındaki bağlantıyı tapu müdürlüğü verir."),
 ],
 sss=[("Ada parsel ile taşınmazın sahibini öğrenebilir miyim?", "Hayır; malik bilgisi kişisel veridir ve yalnızca hak sahiplerine verilir."), ("Ada parsel sorgulama ücretli mi?", "TKGM'nin parsel sorgu hizmeti ve Topraklık'ın parsel aracı ücretsizdir.")],
 kaynak=[TKGM, EDEVLET], ilgili=["/parsel-sorgu", "tapu-senedi-nasil-okunur"])

rehber(slug="tarla-kiralama-sozlesmesi", title="Tarla kiralama: kira sözleşmesi, ortakçılık ve kira bedeli", h1="Tarla kiralama ve kira sözleşmesi",
 desc="Tarla kiralarken veya kiraya verirken sözleşmede olması gerekenler, ürün kirası ve ortakçılık, ÇKS kaydı, destek ödemeleri ve kira bedeli belirleme.",
 cevap="Tarla kiralamada yazılı sözleşme yapmak, taraflar arasında süre, bedel, ödeme zamanı, kullanım şekli ve desteklerin kime ait olacağını netleştirir. Kiracı Çiftçi Kayıt Sistemi'ne kira sözleşmesiyle kaydolarak tarımsal destekleri alabilir.",
 bolumler=[
  ("Sözleşmede neler olmalı?", "- Tarafların kimlik bilgileri ve tarlanın il, ilçe, ada, parsel bilgisi\n- Kira süresi (genellikle bir veya birkaç üretim sezonu)\n- Kira bedeli ve ödeme zamanı (peşin, hasat sonrası veya ürün olarak)\n- Ekilecek ürün ve kullanım sınırları\n- Sulama, kuyu ve elektrik giderlerinin kime ait olduğu\n- Tarımsal desteklerin (ÇKS) kime ait olacağı\n- Sözleşme sonunda tarlanın teslim şekli"),
  ("Ortakçılık (yarıcılık)", "Kira yerine ürünün belirli bir oranının arazi sahibine verildiği düzenlemedir. Oranlar bölgeye ve masrafları kimin karşıladığına göre değişir; sözleşmeye açıkça yazılmalıdır."),
  ("Kira bedeli nasıl belirlenir?", "Bölgedeki benzer tarlaların kira bedelleri, sulama imkânı ve tarlanın verimi belirleyicidir. Ekilecek ürünün tahmini gelirini [ürün rehberlerindeki kazanç hesaplayıcıyla](/urun) görüp kira bedelini 'arazi kirası' kutusuna girerek kârlılığı hesaplayabilirsiniz."),
  ("Hazine arazisi kiralama", "Milli Emlak'ın tarım amaçlı kiralama ihaleleri için [hazine arazisi kiralama](/rehber/hazine-arazisi-kiralama) rehberine bakın."),
 ],
 sss=[("Kiraladığım tarla için destek alabilir miyim?", "Evet; kira sözleşmesiyle ÇKS'ye kaydolarak alan bazlı desteklerden yararlanabilirsiniz."), ("Tarla kira sözleşmesi noterden mi yapılmalı?", "Zorunlu değildir; ancak noter onayı veya tapuya kira şerhi verilmesi tarafları daha iyi korur.")],
 kaynak=[("Tarım ve Orman Bakanlığı", "https://www.tarimorman.gov.tr")], ilgili=["hazine-arazisi-kiralama", "/urun"])

OUT = pathlib.Path(__file__).resolve().parents[2] / "worker" / "rehberler.json"
slugs = set()
for r in R:
    assert r["slug"] not in slugs, r["slug"]; slugs.add(r["slug"])
    for k in ("title", "h1", "desc", "cevap", "bolumler", "sss", "kaynak"):
        assert r.get(k), (r["slug"], k)
OUT.write_text(json.dumps(R, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(len(R), "rehber ->", OUT, OUT.stat().st_size // 1024, "KB")
