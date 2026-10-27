import json
U = "2026-10-26T18:00:00Z"
S_HUK = {"name": "Hukuki Haber: İcra satışlarında 2026 değişiklikleri", "url": "https://www.hukukihaber.net/icra-satislarinda-yeni-donem-2026-yilinda-neler-degisti-2"}
S_129 = {"name": "Hukukçular Evi: Asgari ihale bedeli (İİK 129)", "url": "https://hukukcularevi.com/asgari-ihale-bedeli-nasil-hesaplanir-muhammen-kiymetin-yuzde-elli-kurali-iik-129/"}
S_130 = {"name": "Hukukçular Evi: İhaleden sonra bedel, tescil, teslim", "url": "https://hukukcularevi.com/ihaleyi-kazandim-sonra-ne-oluyor-bedel-tescil-teslim-iik-130-135/"}
S_TEM = {"name": "Hukuki Haber: Açık artırmada teminat", "url": "https://www.hukukihaber.net/7343-sayili-kanunla-iikde-yapilan-degisiklikler-cercevesinde-acik-artirmada-teminat-cenk-akil"}
S_5403 = {"name": "Hukukçular Evi: Tarım arazisinde bölünme yasağı (5403 m.8)", "url": "https://hukukcularevi.com/tarim-arazisinde-ifraz-bolunme-yasagi-miras-5403-8-madde/"}
S_UYAP = {"name": "UYAP Elektronik Satış Portalı", "url": "https://esatis.uyap.gov.tr"}
S_KKYD = {"name": "Ekonomi Gazetesi: Kırsal kalkınma projelerine hibe (Nisan 2026)", "url": "https://www.ekonomigazetesi.com/kose-yazisi/kirsal-kalkinma-projelerine-30-milyon-liraya-kadar-hibe-destegi-76632"}
S_IPARD = {"name": "Politikam: IPARD III 2026 çağrısı", "url": "https://www.politikam.com/tkdk-ipard-iii-30-milyon-avro-hibe-basvurulari-basliyor-2026"}
S_TKDK = {"name": "TKDK", "url": "https://www.tkdk.gov.tr"}
S_GG = {"name": "Kahramanmaraş İl Tarım ve Orman Müdürlüğü: 2026 Genç Girişimci çağrı kılavuzu", "url": "https://kahramanmaras.tarimorman.gov.tr/Lists/Duyuru/Attachments/409/2.%202.%20Kahramanmara_%20Gen%c3%a7%20%c3%87ift%c3%a7i%20Hibe%20%c3%87a_r1%20Klavuzu.pdf"}
S_TOB = {"name": "Tarım ve Orman Bakanlığı", "url": "https://www.tarimorman.gov.tr"}
S_ME = {"name": "Milli Emlak Genel Müdürlüğü", "url": "https://www.milliemlak.gov.tr"}

P = []
def page(section, slug, sort, title, desc, answer, body, faq, sources, h1=None):
    P.append(dict(section=section, slug=slug, sort=sort, title=title, h1=h1 or title, description=desc, answer=answer,
                  body_html=body.strip(), faq_json=json.dumps(faq, ensure_ascii=False), sources_json=json.dumps(sources, ensure_ascii=False), updated_at=U))

page("rehber", "icra-ihalesine-nasil-girilir", 1,
 "İcra ihalesine nasıl girilir? Adım adım rehber (2026)",
 "İcradan tarla ve arsa almak için e-Devlet ile UYAP e-Satış'a giriş, %10 teminat, teklif, 7 günde ödeme ve tapu tescili adım adım.",
 "İcra ihaleleri UYAP Elektronik Satış Portalı'nda e-Devlet şifresiyle yapılır. Muhammen bedelin %10'u kadar teminat yatırıp teklif verirsiniz; kazanırsanız bedeli 7 gün içinde ödersiniz, satış kesinleşince tapu adınıza tescil edilir.",
 """
<h2>1. İlanı bulun ve okuyun</h2>
<p>Taşınmaz satışları <a href="https://esatis.uyap.gov.tr" target="_blank" rel="noopener">UYAP e-Satış</a> portalında ve Basın İlan Kurumu'nun ilan portalında yayınlanır. Topraklık'taki ihale listesi bu ilanlara link verir. İlanda şunlara bakın:</p>
<ul><li><b>Muhammen (tahmin edilen) bedel:</b> bilirkişinin biçtiği değer; teminat ve alt sınır buna göre hesaplanır.</li>
<li><b>Ada / parsel, yüzölçümü, niteliği:</b> tarla, arsa, bağ vb. Parsel sorgudan sınırını ve konumunu kontrol edin.</li>
<li><b>Artırma tarihleri:</b> birinci ve ikinci artırmanın başlangıç ve bitiş saatleri.</li>
<li><b>Şartname:</b> hangi masrafın alıcıya ait olduğu, KDV, tapu harcı ve özel şartlar burada yazar.</li></ul>
<h2>2. Taşınmazı yerinde görün</h2>
<p>Satış "olduğu gibi" yapılır. Yola cephe, su, elektrik, içindeki ağaç veya yapı, kiracı ya da işgalci olup olmadığını yerinde kontrol edin. Tapu kaydındaki şerhleri (ipotek, haciz, şufa, kira şerhi) icra dairesindeki dosyadan ya da şartnameden öğrenin.</p>
<h2>3. Teminatı yatırın</h2>
<p>Teklif verebilmek için muhammen bedelin <b>%10'u</b> kadar teminat gerekir. Teminat portal üzerinden banka aracılığıyla elektronik olarak yatırılır. İhaleyi kazanamazsanız iade edilir.</p>
<h2>4. Teklif verin</h2>
<ul><li>Teklifler e-Devlet şifresiyle portala girerek, artırma süresi içinde verilir.</li>
<li>Satış için teklifin <b>muhammen bedelin %50'sini</b> geçmesi, ayrıca varsa öncelikli (rüçhanlı) alacaklarla satış masraflarını karşılaması gerekir. Bu şartla birinci ve ikinci artırma yapılır.</li>
<li>Payların tamamı mirasçılara ait taşınmazlarda ortaklığın giderilmesi satışında, 2026 değişikliğiyle ilk artırma yalnızca mirasçılar arasında ve muhammen bedelin %100'ü üzerinden yapılır; ikinci artırmada genel %50 kuralı geçerlidir.</li></ul>
<h2>5. Kazandıysanız 7 gün içinde ödeyin</h2>
<p>İhale bedeli, sonuç tutanağının bildiriminden itibaren <b>7 gün</b> içinde ödenir; eski uygulamadaki süre uzatma imkânı kaldırılmıştır. Ödemezseniz teminat yanar ve 31 Temmuz 2026'dan sonra ilan edilen satışlarda ayrıca teklifin <b>%5'i</b> kadar idari para cezası uygulanır.</p>
<h2>6. Kesinleşme, tescil ve teslim</h2>
<ul><li>İhaleden sonra <b>7 gün</b> içinde ihalenin feshi istenebilir; istenmezse ya da reddedilirse satış kesinleşir.</li>
<li>Kesinleşince icra dairesi tapuya tescil yazısı gönderir; ayrı dava açmanız gerekmez.</li>
<li>Tescilden sonra icra dairesinden tahliye ve teslim isteyebilirsiniz (İİK m.135).</li></ul>
<p class="note">Masrafları hesaplamak için <a href="/rehber/icra-ihalesi-masraflari">icra ihalesi masrafları rehberine</a> ve ana sayfadaki ihale hesaplayıcısına bakın.</p>
""",
 [{"q": "İcra ihalesine katılmak için avukat gerekir mi?", "a": "Hayır. e-Devlet şifresi olan herkes portal üzerinden teminat yatırıp teklif verebilir. Tapu kaydı karmaşık veya işgalli taşınmazlarda bir avukata danışmak faydalıdır."},
  {"q": "Teminatı ne zaman geri alırım?", "a": "İhaleyi kazanamazsanız teminat iade edilir. Kazanır ve bedeli süresinde ödemezseniz teminat iade edilmez."},
  {"q": "İhaleyi kazandıktan sonra vazgeçebilir miyim?", "a": "Vazgeçerseniz teminat yanar; 31 Temmuz 2026 sonrası ilan edilen satışlarda ayrıca teklifinizin %5'i oranında idari para cezası uygulanır."},
  {"q": "Taşınmazda kiracı veya işgalci varsa ne olur?", "a": "Tescilden sonra icra dairesinden tahliye ve teslim talep edilebilir (İİK m.135); ayrı tahliye davası gerekmez."}],
 [S_UYAP, S_TEM, S_129, S_130, S_HUK])

page("rehber", "icra-ihalesi-masraflari", 2,
 "İcra ihalesi masrafları: teminat, tapu harcı, damga vergisi ve KDV",
 "İcradan tarla veya arsa alırken teklife ek olarak ödenecek tapu harcı, damga vergisi ve %10 KDV; örnek hesap.",
 "Teklif bedeline ek olarak genellikle tapu alım harcı (%2), ihale kararı damga vergisi (binde 5,69) ve arsa/arazi satışlarında KDV ödenir. Topraklık hesaplayıcısı KDV'yi %10 alır; şartnamede %20 yazıyorsa onu esas alın.",
 """
<h2>Ödeyeceğiniz kalemler</h2>
<table><thead><tr><th>Kalem</th><th>Oran</th><th>Not</th></tr></thead><tbody>
<tr><td>Teminat</td><td>Muhammen bedelin %10'u</td><td>Teklif vermeden önce yatırılır; kazanırsanız bedelden düşülür, kazanamazsanız iade edilir.</td></tr>
<tr><td>Tapu alım harcı</td><td>Satış bedelinin %2'si</td><td>Hangi tarafın harcının alıcıya ait olduğu şartnamede yazar.</td></tr>
<tr><td>Damga vergisi</td><td>Binde 5,69</td><td>İhale kararı üzerinden.</td></tr>
<tr><td>KDV</td><td>%10 (şartnamede belirtilirse %20)</td><td>Arsa ve arazi satışlarında genel uygulama %10'dur; şartnamedeki oran esas alınır.</td></tr>
</tbody></table>
<h2>Örnek hesap</h2>
<p>Muhammen bedeli 2.000.000 TL olan bir tarla için 1.200.000 TL teklif verip kazandığınızı düşünelim:</p>
<table><tbody>
<tr><td>Teklif</td><td>1.200.000 TL</td></tr>
<tr><td>Tapu alım harcı (%2)</td><td>24.000 TL</td></tr>
<tr><td>Damga vergisi (binde 5,69)</td><td>6.828 TL</td></tr>
<tr><td>KDV (%10)</td><td>120.000 TL</td></tr>
<tr><td><b>Toplam</b></td><td><b>1.350.828 TL</b></td></tr>
</tbody></table>
<p>Başvuruda bunun dışında 200.000 TL teminat (muhammen bedelin %10'u) yatırılır; kazanırsanız ödemenizden düşülür.</p>
<h2>Gözden kaçan masraflar</h2>
<ul><li>Taşınmaza kayıtlı geçmiş yıl emlak vergisi borcu ve şartnamede alıcıya bırakılan diğer borçlar</li>
<li>Tahliye ve teslim masrafları</li>
<li>Sınır tespiti için harita mühendisi (aplikasyon) ücreti</li></ul>
<p class="note">Kendi rakamlarınızla hesaplamak için ana sayfadaki <a href="/#araclar">ihale hesaplayıcısını</a> kullanın.</p>
""",
 [{"q": "İcra ihalesinde KDV ödenir mi?", "a": "Satıcı KDV mükellefiyse ve şartnamede belirtilmişse ödenir. Arsa ve arazi satışlarında genel uygulama %10'dur; şartnamede %20 yazıyorsa o oran uygulanır."},
  {"q": "Tapu harcını kim öder?", "a": "Alım harcı genellikle alıcıya aittir; satıcı payının nasıl ödeneceği şartnamede belirtilir."},
  {"q": "Bedeli ödemezsem ne kaybederim?", "a": "Teminat yanar; 31 Temmuz 2026'dan sonra ilan edilen satışlarda ayrıca teklifin %5'i kadar idari para cezası uygulanır."}],
 [S_TEM, S_130, S_HUK])

page("rehber", "hisseli-tarla-almak", 3,
 "Hisseli tarla almak: 2026 kuralları ve riskler",
 "Tarım arazisinde hisse satışı, asgari büyüklük (20 dekar, 5 dekar, 3 dekar), Bakanlık izni, ön alım hakkı ve kooperatif üzerinden hisse satışı tuzağı.",
 "Tarım arazilerinde hisse devri ve bölme Tarım ve Orman Bakanlığı iznine bağlıdır. Asgari büyüklüğün altındaki araziler bölünemez, hisseleri üçüncü kişilere satılamaz. İşlemden önce il/ilçe tarım müdürlüğünden görüş alın.",
 """
<h2>Asgari tarımsal arazi büyüklükleri</h2>
<table><thead><tr><th>Arazi türü</th><th>En küçük büyüklük</th></tr></thead><tbody>
<tr><td>Mutlak, marjinal ve özel ürün arazisi</td><td>2 hektar (20 dekar)</td></tr>
<tr><td>Dikili arazi (bağ, bahçe)</td><td>0,5 hektar (5 dekar)</td></tr>
<tr><td>Örtü altı (sera)</td><td>0,3 hektar (3 dekar)</td></tr></tbody></table>
<p>Bunlar kanundaki alt sınırlardır; Bakanlık bazı yerlerde daha yükseğini belirleyebilir. Ayrıca her il ve ilçe için "yeter gelirli tarımsal arazi büyüklüğü" listesi vardır.</p>
<h2>Hisse alırken bilmeniz gerekenler</h2>
<ul><li><b>Bakanlık izni:</b> Tarım arazisinde pay devri, ifraz (bölme), hisselendirme ve vasıf değişikliği Bakanlık iznine bağlıdır (5403 sayılı Kanun m.8/B). Tapuda işlemden önce tarım müdürlüğü görüşü istenir.</li>
<li><b>Asgari büyüklüğün altı:</b> Bu arazilerde hisse sayısı artırılamaz; paylar üçüncü kişilere satılamaz, devredilemez, ipotek edilemez.</li>
<li><b>Ön alım (şufa) hakkı:</b> Tarım arazisi satıldığında sınır komşusu çiftçilerin ön alım hakkı vardır (m.8/İ). Paylı mülkiyette diğer paydaşların da yasal ön alım hakkı bulunur; satış bedeliyle aynı şartlarda hisseyi sizden alabilirler.</li>
<li><b>Kullanım:</b> Hisseli tarlada hangi bölümü kullanacağınız tapuda yazmaz; ortaklarla yazılı bir kullanım anlaşması yapın.</li></ul>
<h2>Kooperatif veya şirket üzerinden "hisse" satışı</h2>
<p class="note">Tarım arazisini fiilen hisselere bölüp bir şirket ya da kooperatif üyeliği yoluyla satmak 5403 sayılı Kanun m.21'e göre suçtur: 1–3 yıl hapis ve adli para cezası öngörülür. "Tapusu kooperatifte, size hisse" teklifine dikkat edin.</p>
<p>Kanun 2026'da 7584 sayılı Kanunla yeniden güncellendi. Kesin durum için arazinin bulunduğu ilçe tarım ve orman müdürlüğüne danışın.</p>
""",
 [{"q": "Hisseli tarla alınır mı?", "a": "Alınabilir ama tarım arazisinde pay devri Bakanlık iznine bağlıdır ve asgari büyüklüğün altındaki arazilerde hisse satışı yapılamaz. Önce tarım müdürlüğünden görüş alın."},
  {"q": "Hisseli tarlada ortaklar satışa itiraz edebilir mi?", "a": "Diğer paydaşların ve sınır komşusu çiftçilerin yasal ön alım hakkı vardır; hisseyi aynı bedelle sizden alma hakları doğabilir."},
  {"q": "Tarım arazisi kaç dönümün altında bölünemez?", "a": "Mutlak, marjinal ve özel ürün arazilerinde 20 dekar, dikili arazide 5 dekar, örtü altında 3 dekar kanuni alt sınırdır."}],
 [S_5403, S_TOB])

page("rehber", "tarla-alirken-dikkat-edilecekler", 4,
 "Tarla alırken dikkat edilecek 12 şey",
 "Tarla satın almadan önce tapu, imar, yol, su, toprak, şerhler ve masraflar için kontrol listesi.",
 "Tarla almadan önce tapu kaydını ve şerhleri, parselin gerçek sınırını, yola cepheyi, suyu, imar ve tarım arazisi sınıfını, toplam masrafı kontrol edin. Aşağıdaki liste en sık yapılan hataları kapsar.",
 """
<h2>Tapu ve hukuki durum</h2>
<ol><li><b>Tapu kaydı:</b> Malik, hisse durumu ve niteliği (tarla, bağ, arsa) e-Devlet'te veya tapu müdürlüğünde kontrol edin.</li>
<li><b>Şerhler:</b> İpotek, haciz, şufa, kira, intifa şerhi varsa satın almadan önce ne anlama geldiğini öğrenin.</li>
<li><b>Hisseli mi?</b> Hisseli tarla için <a href="/rehber/hisseli-tarla-almak">hisseli tarla rehberine</a> bakın.</li>
<li><b>Ön alım hakkı:</b> Sınır komşusu çiftçilerin ön alım hakkı satışınızı etkileyebilir.</li></ol>
<h2>Arazi</h2>
<ol start="5"><li><b>Gerçek sınır:</b> Parselin haritadaki sınırıyla arazideki çit ve işaretler aynı mı? Gerekirse harita mühendisine aplikasyon yaptırın.</li>
<li><b>Yol:</b> Kadastral yola cephesi var mı, yoksa komşu tarlalardan mı geçiliyor?</li>
<li><b>Su:</b> Sulama kanalı, kuyu izni (DSİ) veya yakın su kaynağı var mı?</li>
<li><b>Toprak ve eğim:</b> Taşlılık, eğim ve taban suyu verimi doğrudan etkiler. Komşu çiftçilere ne ektiklerini sorun.</li>
<li><b>Elektrik:</b> Sulama pompası veya ileride ev için en yakın elektrik hattı ne kadar uzakta?</li></ol>
<h2>Plan ve para</h2>
<ol start="10"><li><b>İmar ve arazi sınıfı:</b> Belediye veya il özel idaresinden imar durumu; tarım müdürlüğünden arazinin sınıfını (mutlak, marjinal vb.) öğrenin. Tarım arazisine yapı kısıtlıdır.</li>
<li><b>Emsal fiyat:</b> Aynı köy ve mahalledeki son satışlara bakın; Topraklık değerleme aracı bir başlangıç tahmini verir.</li>
<li><b>Toplam masraf:</b> Tapu harcı (alıcı ve satıcı için ayrı ayrı %2), döner sermaye ve varsa KDV'yi hesaba katın.</li></ol>
""",
 [{"q": "Tarlanın sınırını nasıl öğrenirim?", "a": "TKGM Parsel Sorgu'dan ada/parsel ile yaklaşık sınırı görebilirsiniz. Kesin sınır için lisanslı harita mühendisine aplikasyon yaptırın."},
  {"q": "Tarla alırken tapu masrafı ne kadar?", "a": "Tapu harcı beyan edilen bedel üzerinden alıcı ve satıcı için ayrı ayrı %2'dir; ayrıca döner sermaye ücreti ödenir."}],
 [S_5403, S_TOB])

page("rehber", "hazine-arazisi-nasil-alinir", 5,
 "Hazine (Milli Emlak) arazisi nasıl alınır?",
 "Milli Emlak satış ihalelerini bulma, şartnameyi okuma, teminat ve ihaleye katılma adımları.",
 "Hazineye ait arazi ve arsalar Milli Emlak müdürlüklerinin ihaleleriyle satılır. İlanı bulup şartnameyi alır, geçici teminatı yatırır ve ihale günü teklif verirsiniz. Peşin veya taksitli ödeme şartları ilana göre değişir.",
 """
<h2>Adımlar</h2>
<ol><li><b>İlanı bulun:</b> <a href="https://www.milliemlak.gov.tr" target="_blank" rel="noopener">Milli Emlak</a> sitesinde ve gazetelerin resmî ilan bölümlerinde il il yayınlanır. Topraklık ihale listesinde "Hazine" etiketiyle gösterilir.</li>
<li><b>Şartnameyi inceleyin:</b> Tahmini bedel, geçici teminat tutarı, ödeme şekli (peşin/taksit), ihale usulü ve özel şartlar burada yazar.</li>
<li><b>Taşınmazı görün:</b> Yerinde bakın; ada/parseli harita üzerinde kontrol edin.</li>
<li><b>Geçici teminatı yatırın:</b> Şartnamede yazan tutar ihaleden önce yatırılır ve makbuzu dosyaya eklenir.</li>
<li><b>Belgeleri hazırlayın:</b> Kimlik, tebligat adresi, teminat makbuzu ve şartnamede istenen diğer belgeler.</li>
<li><b>İhaleye katılın:</b> İhale, ilanda yazan gün ve saatte komisyon önünde (veya ilanda belirtilen elektronik yolla) yapılır.</li>
<li><b>Ödeme ve tapu:</b> İhale onaylanınca bedeli şartnamedeki sürede ödersiniz, tapu adınıza tescil edilir.</li></ol>
<p class="note">Hazine satışlarında ödeme şartları, taksit imkânı ve vergi muafiyetleri ilandan ilana değişir. Rakamlar için her zaman ilgili ihalenin şartnamesine bakın.</p>
""",
 [{"q": "Hazine arazisi taksitle alınabilir mi?", "a": "Bazı satışlarda peşin veya taksitli ödeme imkânı sunulur; şartları ilgili ihalenin şartnamesinde yazar."},
  {"q": "Hazine ihalesi ile icra ihalesi arasındaki fark nedir?", "a": "Hazine ihalesinde satıcı devlettir ve Milli Emlak müdürlüğü ihaleyi yapar; icra ihalesinde bir borç nedeniyle haczedilmiş taşınmaz UYAP e-Satış'ta satılır."}],
 [S_ME])

page("hibe", "kirsal-kalkinma-yatirimlari-hibesi", 1,
 "Kırsal Kalkınma Yatırımları hibesi 2026: %50–70 destek",
 "Tarım ve Orman Bakanlığı Kırsal Kalkınma Yatırımlarının Desteklenmesi programı: hibe oranı, proje limitleri (100 bin – 30 milyon TL), kimler başvurabilir.",
 "2026 programında hibe oranı %50 ile %70 arasındadır. Proje alt limiti 100 bin TL, üst limiti 30 milyon TL; aile işletmesi faaliyetlerinde üst limit 8 milyon TL'dir. Program 81 ilde uygulanır.",
 """
<h2>Program özeti (2026)</h2>
<table><tbody>
<tr><th>Hibe oranı</th><td>%50–70 (dijitalleşme, akıllı tarım, sensör gibi öncelikli yatırımlar dahil)</td></tr>
<tr><th>Proje alt limiti</th><td>100.000 TL</td></tr>
<tr><th>Proje üst limiti</th><td>30.000.000 TL</td></tr>
<tr><th>Aile işletmesi faaliyetleri</th><td>Üst limit 8.000.000 TL</td></tr>
<tr><th>Kapsam</th><td>81 il</td></tr>
<tr><th>Tebliğ</th><td>Resmî Gazete, 3 Nisan 2026</td></tr></tbody></table>
<h2>Kimler başvurabilir?</h2>
<ul><li>Gerçek ve tüzel kişiler (mikro, küçük ve orta ölçekli işletmeler)</li>
<li>Önceliklendirilenler: tarımsal örgütler, kadın girişimciler, genç girişimciler</li>
<li>Kiralık arazide en az 7 yıllık noter onaylı kira sözleşmesiyle başvurulabilir</li></ul>
<h2>Kimler başvuramaz?</h2>
<ul><li>Vadesi geçmiş vergi veya SGK prim borcu olanlar</li>
<li>Kamu kurumları, il özel idareleri ve belediyeler</li>
<li>Aynı proje için başka kamu desteği alanlar</li></ul>
<p>Her başvuru sahibi ülke genelinde tek proje sunabilir. Hangi ilde hangi yatırım konularının destekleneceği Bakanlığın uygulama rehberinde ve il müdürlüklerinin duyurularında açıklanır.</p>
""",
 [{"q": "Kırsal kalkınma hibesi geri ödenir mi?", "a": "Hayır, hibe kısmı geri ödenmez; projenin kalan kısmını yatırımcı kendi kaynağından karşılar."},
  {"q": "Nereye başvurulur?", "a": "Başvuru yöntemi ve tarihleri Bakanlığın uygulama rehberinde duyurulur; projeler il ve merkez değerlendirme komisyonlarında puanlanır. İl tarım ve orman müdürlüğünün duyurularını takip edin."}],
 [S_KKYD, S_TOB])

page("hibe", "ipard-iii-tkdk-hibesi", 2,
 "IPARD III (TKDK) hibesi: 2026 çağrısı",
 "AB ve Türkiye destekli IPARD III programı: 2026 çağrısında süt, et, su ürünleri, meyve-sebze işleme ve depolama yatırımlarına hibe; başvuru tarihleri ve şartlar.",
 "IPARD III, Tarım ve Kırsal Kalkınmayı Destekleme Kurumu (TKDK) tarafından yürütülen AB–Türkiye ortak hibe programıdır. 12 Haziran 2026'da açılan çağrı 30 milyon avro bütçeyle tarım ve balıkçılık ürünlerini işleme ve pazarlama yatırımlarını destekledi.",
 """
<h2>2026 çağrısı</h2>
<table><tbody>
<tr><th>Tedbir</th><td>Tarım ve balıkçılık ürünlerinin işlenmesi ve pazarlanmasına yönelik fiziki varlık yatırımları</td></tr>
<tr><th>Bütçe</th><td>30 milyon avro (geri ödemesiz)</td></tr>
<tr><th>Sektörler</th><td>Süt, kırmızı et ve kanatlı eti işleme; su ürünleri, yumurta, meyve ve sebze işleme/depolama</td></tr>
<tr><th>Yatırımcı başına üst sınır</th><td>Program dönemi boyunca 3 milyon avro</td></tr>
<tr><th>Başvuru</th><td>12 Haziran – 13 Temmuz 2026 (çevrim içi), fiziki dosya son günü 20 Temmuz 2026</td></tr>
<tr><th>Tamamlama süresi</th><td>Sadece makine: en fazla 9 ay; inşaatlı: en geç 18 ay</td></tr></tbody></table>
<p>Başvuru sahibinin kadın olması veya %40–59 ortopedik engelliliği olup işletmede en az %50 payının bulunması öncelik puanı getirir.</p>
<h2>Nasıl başvurulur?</h2>
<ol><li>TKDK'nın yayımladığı çağrı rehberini ve hibe oranlarını inceleyin.</li>
<li>Projeyi TKDK çevrim içi başvuru sisteminden girin.</li>
<li>Fiziki dosyayı yatırımın yapılacağı ildeki TKDK il koordinatörlüğüne teslim edin.</li></ol>
<p class="note">Yeni çağrılar açıldığında Topraklık hibe haberleri bölümünde ve kayan duyurularda yayınlanır.</p>
""",
 [{"q": "IPARD hibesi kaç ilde geçerli?", "a": "2026 çağrısı 81 ilde başvuruya açıldı."},
  {"q": "IPARD hibe oranı nedir?", "a": "Oranlar tedbire ve başvuru sahibine göre değişir; güncel oranlar TKDK çağrı rehberinde yer alır."}],
 [S_IPARD, S_TKDK])

page("hibe", "genc-girisimci-kurulum-hibesi", 3,
 "Genç girişimci (genç çiftçi) kurulum hibesi 2026",
 "18–40 yaş genç girişimcilere tarım, gıda ve hayvancılık işletmesi kurmak için %70'e varan hibe: şartlar, tutar ve başvuru (Kahramanmaraş 2026 örneği).",
 "Bazı illerde 18–40 yaş arası genç girişimcilere çiftlik içi ve dışı işletme kurmaları için hibe veriliyor. Kahramanmaraş 2026 çağrısında hibe oranı %70, üst sınır KDV hariç 800.000 TL'dir. Program il ve ilçeye göre değişir.",
 """
<h2>Kahramanmaraş 2026 çağrısı (örnek)</h2>
<table><tbody>
<tr><th>Program</th><td>Kurulum Hibesi – Genç Girişimciler (çiftlik içi ve dışı)</td></tr>
<tr><th>Hibe oranı</th><td>Uygun giderlerin %70'i (kalan %30 başvuru sahibinden)</td></tr>
<tr><th>Üst sınır</th><td>KDV hariç 800.000 TL hibe (hibeye esas yatırım en fazla 1.142.857 TL)</td></tr>
<tr><th>Yaş</th><td>18 yaşını doldurmuş, 41 yaşından gün almamış</td></tr>
<tr><th>Başvuru</th><td>23 Mart – 10 Nisan 2026, il tarım ve orman müdürlüğüne şahsen</td></tr></tbody></table>
<h2>Başvuru şartları</h2>
<ul><li>Programın genç çiftçi / girişimci eğitimini tamamlamış olmak</li>
<li>Program kapsamındaki köy veya mahallede en az 6 aydır ikamet etmek</li>
<li>Kamu veya özel sektörde çalışmıyor olmak</li>
<li>Gerçek kişi olmak; hayvancılık veya arıcılık projelerinde güncel kayıt (HBS/AKS)</li></ul>
<h2>Örnek proje konuları</h2>
<p>Büyükbaş hayvan yetiştiriciliği, sera kurulumu ve yöresel gıda işleme tesisleri (tarhana, şıra, yoğurt, Antep fıstığı işleme, pelet üretimi).</p>
<p class="note">Bu hibe her ilde açılmaz; ilçe listesi ve konular çağrıya göre değişir. İl tarım ve orman müdürlüğünüzün duyurularını takip edin. Yeni çağrılar Topraklık haberlerinde yayınlanır.</p>
""",
 [{"q": "Genç çiftçi hibesi kaç TL?", "a": "Tutar programa ve ile göre değişir. Kahramanmaraş 2026 genç girişimci kurulum hibesinde üst sınır KDV hariç 800.000 TL, hibe oranı %70'tir."},
  {"q": "Kimler başvurabilir?", "a": "18–40 yaş arası, programın eğitimini almış, kapsamdaki köyde ikamet eden ve başka bir işte çalışmayan gerçek kişiler."}],
 [S_GG, S_TOB])

json.dump(P, open("/mnt/user-data/outputs/Topraklik/icerik/faz1.json", "w"), ensure_ascii=False)
print(len(P), sum(len(json.dumps(p, ensure_ascii=False)) for p in P))
