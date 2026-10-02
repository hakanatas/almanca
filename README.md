# 🐕 Deutsch Macerası

İkinci yabancı dili **Almanca** olan öğrenciler (ortaokul / lise, A1 seviyesi) için
oyunlaştırılmış bir dil öğrenme uygulaması. Maskotumuz **Max** adlı bir dakhund
(Dackel) köpeği; öğrenciye her adımda Almanca tepkiler verir: *Super! Toll! Schade!*

Kurulum gerektirmez: `index.html` dosyasını tarayıcıda açmak yeterli. Telefonda
da çalışır (mobil öncelikli tasarım, PWA manifesti var).

```bash
# Yerel sunucu ile çalıştırmak için (isteğe bağlı)
python3 -m http.server 8000   # → http://localhost:8000
```

---

## 1. Tasarım hedefleri

| Sorun (Türk öğrenci için) | Oyundaki çözüm |
|---|---|
| Türkçede cinsiyet/artikel yok → **der/die/das** en zor konu | *Artikel Avı*: renk kodlu (mavi/kırmızı/yeşil) hız oyunu + kelime sonu kuralları ile ipucu |
| Kelime ezberi sıkıcı | *Hafıza Kartları*: resim ↔ kelime eşleştirme, artikel renkli gösterilir |
| Telaffuz ve dinleme pratiği azdır | *Hör zu!*: tarayıcının Almanca sesiyle (TTS) dinle, resmi bul; yavaş dinleme modu |
| Türkçe SOV, Almanca **V2** (fiil 2. sırada) → cümle kurmak zor | *Cümle Treni*: kelime vagonlarını doğru sıraya diz |
| Fiil çekimleri (ich spiele, du spielst…) | *Fiil Roketi*: bağlam içinde doğru çekimi seç, hata olursa tüm tablo gösterilir |
| Motivasyon düşüklüğü | XP, seviye, günlük seri 🔥, rozetler, rekorlar, kombo, konfeti |

**Pedagojik ilkeler**

- **Hep artikelle birlikte:** Her kelime her yerde `der Hund`, `die Katze` şeklinde
  gösterilir ve seslendirilir — öğrenci artikeli kelimenin parçası olarak öğrenir.
- **Renk kodu tutarlılığı:** der = mavi, die = kırmızı, das = yeşil (Almanya'daki
  okul kitaplarında yaygın sistem). Tüm oyunlarda aynı renkler kullanılır.
- **Hata = öğrenme anı:** Yanlış cevapta sadece "yanlış" denmez; doğru cevap,
  varsa bir kural (ör. *-ung ile bitenler hep DIE*) veya tam çekim tablosu gösterilir.
- **Ana dil desteği:** Arayüz Türkçe, içerik Almanca. Her kelimenin Türkçe anlamı ve
  emoji resmi vardır; yabancı dili doğrudan görselle ilişkilendirmeyi destekler.
- **Kısa oturumlar:** Her oyun 1–3 dakika sürer; teneffüste veya ders başında
  "ısınma" olarak oynanabilir.

## 2. Oyun modları

**Atari oyunları** (`js/arcade.js`, tuval üzerinde; Max gardırobuyla birlikte oynar):

- **🥷 Artikel Ninja** — kelime kartları havaya fırlar; parmağınla yalnızca üstte yazan artikeldekileri
  kes. Yanlış artikeli ya da bombayı kesmek can götürür; tek hamlede birkaç kelime = kombo.
  Hedef artikel 11-15 saniyede bir değişir.
- **🐕 Uçan Max** — Flappy Bird tarzı. Dokundukça Max yükselir; her duvarda der/die/das yazan üç
  boşluk var, üstte yazan kelimenin artikelinden geçmelisin.
- **🐍 Artikel Yılanı** — yılanın rengi hangi artikelse yalnızca o kelimeleri ye. Yanlışı yemek ya da
  kendini ısırmak can götürür; her 4 kelimede yılan renk değiştirir.

Diğer oyunlar:

- **🎯 Artikel Avı** — 60 saniye. Kelime ve resmi çıkar, *der / die / das*
   butonlarından birine bas. Üst üste doğrular kombo puanı verir (x2'ye kadar bonus).
- **🃏 Hafıza Kartları** — 6 çift kart. Almanca kelime kartını resim kartıyla eşleştir.
   Az hamle = yüksek yıldız.
- **👂 Hör zu!** — 10 tur. Hoparlöre bas, Almanca kelimeyi dinle, 4 resimden doğrusunu seç.
- **🚂 Cümle Treni** — 6 cümle. Türkçe anlamı verilen cümlenin kelime vagonlarını
   trene sırayla tak. Doğruysa tren yola çıkar.
- **🚀 Fiil Roketi** — 10 tur. `Du ___ Fußball. (spielen)` → *spielst*. Doğruysa roket uçar.

**⚔️ Sınıf Düellosu** (yalnızca girişli `/v2/` sürümünde, `duello.html`) — Kahoot tarzı canlı
yarışma. Yönetici listesindeki öğretmen tema, soru sayısı, süre ve soru türlerini (der/die/das,
Almanca→Türkçe, Türkçe→Almanca, fiil çekimi) seçip düello açar; 6 haneli kod ve QR kod tahtaya
yansıtılır. Öğrenciler telefondan kodla katılır, herkes aynı soruya aynı anda cevap verir.
Doğru cevap 500 puan + hız bonusu (en fazla 500), üst üste 3 doğruya +100. Her sorudan sonra
cevap dağılımı ve ilk 5; sonunda podyum ve CSV. Doğru cevaplar yalnızca öğretmenin okuyabildiği
`duels/{kod}/secret` belgesinde durur; cevap süresini sunucu saati ölçer, süre dolunca cevap
kabul edilmez. Öğrencinin düellosu rapor paneline "Sınıf Düellosu" oturumu olarak kaydedilir.

Hepsi seçilen **temaya** göre çalışır: Aile, Okul, Yiyecek & İçecek, Hayvanlar,
Ev, Boş Zaman (veya hepsi karışık). Temalar MEB 2. yabancı dil Almanca A1
ünitelerine paralel seçildi.

## 3. Oyunlaştırma sistemi

- **XP ve seviye:** Her oyun sonunda `puan/2 + yıldız×5` XP. Seviye eşikleri
  0, 50, 200, 450, 800… XP (giderek zorlaşır).
- **Yıldızlar:** %90+ ⭐⭐⭐, %70+ ⭐⭐, %40+ ⭐
- **Günlük seri 🔥:** Her gün en az bir oyun oynayınca artar, bir gün atlanırsa sıfırlanır.
- **Rozetler:** İlk Adım, Seri Ustası (artikel oyunlarında 10'luk seri), Kusursuz, Kaşif (bütün oyunlar),
  Ateşli (3 gün seri), Deutsch-König (5. seviye).
- **Max'in Gardırobu:** Seviye atladıkça ve rozet kazandıkça Max'e eşya açılır (kep, Bavyera
  şapkası, kral tacı, güneş gözlüğü, yuvarlak gözlük, atkılar, papyon; Ninja bandı "Artikel
  Ninja" rozetiyle). Seçilen eşyalar ana sayfadaki Max'te görünür; yeni açılan eşya sonuç
  ekranında duyurulur.
- **Haftalık Sınıf Ligi** (yalnızca girişli `/v2/` sürümünde): Öğrencinin bu hafta oyunlardan
  kazandığı XP, sınıf arkadaşlarıyla birlikte ana sayfada sıralanır (ad "Ali Y." biçiminde,
  soyad kısaltılır). Lig her Pazartesi sıfırlanır; geçen haftanın ilk üçü "Geçen haftanın
  yıldızları" olarak görünür. Sınıf, öğretmenin yüklediği sınıf listesinden gelir; listede
  olmayan öğrenci lige girmez. Öğretmenler ligde yarışmaz, sınıf seçip tabloyu görebilir.
- İlerleme cihazda (`localStorage`) saklanır; girişli sürümde ayrıca hesaba yazılır.

## 4. Görsel stil

*Nokta'nın Filmleri* ile aynı mürekkep dünyası: kâğıt dokulu zemin, siyah mürekkep
çizgiler, kehribar vurgu, mühür kırmızısı. Başlıklar el yazısı fırça (Caveat Brush),
metin serif (Fraunces), etiketler daktilo (JetBrains Mono). Maskot Max SVG ile çizilmiş
bir Dackel; kontürü el çizimi animasyonlardaki gibi hafifçe "kaynar". Artikel renkleri
mürekkep tonlarında: **der** mavi mürekkep, **die** mühür kırmızısı, **das** yeşil mürekkep.

## 5. Proje yapısı

```
index.html        Ekranlar (ana menü, oyun, sonuç)
css/style.css     Görünüm, animasyonlar, karanlık mod
js/data.js        TÜM İÇERİK: temalar, kelimeler, cümleler, fiiller, artikel kuralları
js/okul.js        Okul hesabıyla giriş + çalışma kaydı (bütün uygulamalar için ortak)
js/firebase-config.js  Kök sürümün Firebase ayarları (boş kalır → girişsiz)
v2/               Girişli sürüm: v2/firebase-config.js + üretilen v2/index.html, v2/admin.html
js/admin.js       Yönetici rapor paneli (admin.html)
firebase/         Firestore güvenlik kuralları ve indeksler
js/art.js         Maskot Max ve ikonların SVG çizimleri
js/app.js         Oyun motoru, 5 mini oyun, XP/rozet sistemi
manifest.json     Ana ekrana eklenebilir uygulama (PWA) bilgisi
```

### Yeni içerik eklemek (öğretmenler için)

`js/data.js` içinde ilgili temaya satır eklemek yeterli:

```js
{ de: 'Hund', art: 'der', tr: 'köpek', e: '🐶' },
```

Cümle eklemek (kelimeler doğru sırada yazılır, oyun kendisi karıştırır):

```js
{ de: ['Ich', 'habe', 'einen', 'Hund.'], tr: 'Bir köpeğim var.' },
```

Yeni tema için `THEMES` dizisine aynı yapıda yeni bir nesne eklenir; menüde otomatik görünür.

## 6. Okul hesabıyla giriş ve çalışma raporları

Oyuna yalnızca **@alkev.k12.tr** ve **@stu.alkev.k12.tr** Google hesaplarıyla girilir.
Her oyun oturumu (hangi oyun, ne kadar süre, hangi soruya ne cevap verildi) kaydedilir;
yönetici `v2/admin.html` sayfasında hepsini tek yerde görür ve CSV olarak indirir.

**İki adres:**

| Adres | Ne |
|---|---|
| `https://hakanatas.github.io/almanca/` | Girişsiz sürüm (herkese açık, kayıt tutulmaz). `js/firebase-config.js` boş kalır. |
| `https://hakanatas.github.io/almanca/v2/` | Okul hesabıyla giriş + çalışma kaydı. Ayarları `v2/firebase-config.js`. |
| `https://hakanatas.github.io/almanca/v2/admin.html` | Yönetici rapor paneli. |

İki sürüm aynı `css/`, `js/`, `audio/` dosyalarını kullanır; oyunda yapılan her değişiklik ikisine de yansır.
`v2/index.html` ve `v2/admin.html` kökteki sayfalardan üretilir (yalnızca `<base href="../">` ve ayar dosyası farklı).
Kökteki `index.html`, `admin.html` ya da `duello.html` değişince: `python3 tools/build_v2.py`
Altyapı Firebase'dir (Google girişi + Firestore veritabanı), ücretsiz katman bir okul için yeterlidir.

**Güvenlik nasıl sağlanıyor?** Alan adı kontrolü yalnızca tarayıcıda değil, sunucudaki
`firebase/firestore.rules` kurallarında da yapılır: başka bir Google hesabıyla giren kişi
hiçbir veriyi okuyamaz, yazamaz. Öğrenci yalnızca kendi kayıtlarını görür, kayıtlar
sonradan değiştirilemez, toplu raporu yalnızca yönetici okur. Kurallar Firestore emülatöründe
63 senaryoyla test edildi (sahte alan adları, başkası adına kayıt, yetkisiz öğretmen vb.).

Ayar dosyası boşken oyun **deneme modunda** girişsiz çalışır ve hiçbir veri göndermez.

### Kurulum (bir kez, yaklaşık 15 dakika)

1. **Proje:** [console.firebase.google.com](https://console.firebase.google.com) → *Proje ekle*
   (Google Analytics gerekmez).
2. **Google girişi:** *Authentication → Başlayın → Sign-in method → Google → Etkinleştir*,
   destek e-postası seçip kaydedin.
3. **Yetkili alan adı:** *Authentication → Settings → Yetkili alan adları → Alan adı ekle*:
   `hakanatas.github.io`
4. **Veritabanı:** *Firestore Database → Veritabanı oluştur* → konum olarak Avrupa
   (`eur3` veya `europe-west`) → *Üretim modunda başlat*.
5. **Kurallar:** *Firestore → Kurallar* sekmesine `firebase/firestore.rules` dosyasının tamamını
   yapıştırıp *Yayınla*'ya basın.
6. **Yönetici:** *Firestore → Veri → Koleksiyon başlat* → koleksiyon kimliği `admins`,
   belge kimliği **e-posta adresiniz, küçük harfle** (ör. `ad.soyad@alkev.k12.tr`),
   bir alan ekleyin (ör. `not` = `yönetici`). Başka yönetici eklemek için aynı koleksiyona
   yeni belge eklemeniz yeterli.
7. **Web uygulaması:** *Proje ayarları (⚙) → Genel → Uygulamalarınız → Web (</>)* → takma ad
   verip kaydedin. Gösterilen `firebaseConfig` değerlerini **`v2/firebase-config.js`**
   içine yapıştırın. (Bu değerler gizli değildir.)
8. **Yayın:** GitHub'da depo → *Settings → Pages → Deploy from a branch → main / (root)*.
   Girişli oyun `https://hakanatas.github.io/almanca/v2/`, rapor paneli
   `https://hakanatas.github.io/almanca/v2/admin.html` adresinde açılır; kök adres girişsiz kalır.

> **Öğrenciler "Bu uygulama engellendi" görürse:** Google Workspace for Education, 18 yaş
> altı kullanıcıların tanımadığı uygulamalara Google ile girmesini varsayılan olarak engeller.
> Okulun Workspace yöneticisi *Admin konsolu → Güvenlik → Erişim ve veri kontrolü →
> API denetimleri → Üçüncü taraf uygulama erişimini yönet* bölümünde bu uygulamayı
> (Firebase'in oluşturduğu OAuth istemcisi) **Güvenilir** olarak işaretlemelidir.

> **Kişisel veriler:** Kaydedilen bilgiler ad, okul e-postası ve oyun sonuçlarıdır. Öğrencileri
> ve velileri bilgilendirmeniz (KVKK aydınlatma) önerilir.

### Öğretmen hesapları

Öğretmenler (@alkev.k12.tr) bütün oyunları ve düelloyu deneyebilir; oynadıkları **rapora yazılmaz**.
Bu hem oyunda (öğretmen oturumu gönderilmez, üst çubukta "Öğretmen · denemeler rapora yazılmaz"
notu görünür) hem de Firestore kuralında (oturum kaydını yalnızca @stu.alkev.k12.tr hesapları yazabilir)
uygulanır. Rapor paneli yalnızca öğrencileri gösterir. Öğretmenin XP ve rozetleri kendi hesabında tutulur.

### Sınıf listesi ve öğretmen raporu

Öğrenciler sınıf seçmez; sınıfları öğretmen yükler. Rapor panelinin (`v2/admin.html`) altındaki
**Sınıf listesi** bölümüne Excel'den *e-posta*, *sınıf* ve isterseniz *ad soyad* sütunlarını kopyalayıp
yapıştırın ya da CSV dosyası seçin. Sütun sırası önemli değil; "9A", "9/A", "9 A" hepsi `9-A` olarak okunur.
Önizlemede okunamayan satırlar nedeniyle listelenir; **Listeyi kaydet** ile yüklenir. Aynı e-posta tekrar
yüklenirse sınıfı güncellenir. Liste Firestore'da `sinif_listesi` koleksiyonunda durur, GitHub'a yazılmaz.

Panelde: sınıf filtresi, sınıf özet tablosu (listede / giriş yapan / çalışan / süre / doğruluk),
öğrenci tablosunda sınıf, seviye, XP, rozet; öğrenci ayrıntısında rozetler, rekorlar, oyunlara göre
doğruluk, yanlış yaptıkları ve bütün oturumları. Listede olup hiç girmemiş öğrenciler "hiç girmedi",
girip listede olmayanlar "listede yok" olarak görünür.

Öğrenci de oyunun ana ekranındaki **Çalışmalarım** bölümünde kendi son oyunlarını ve en çok yanlış
yaptığı kelimeleri görür.

> Kurallar değiştiyse (`firebase/firestore.rules`) Firebase konsolunda *Firestore → Rules* sekmesine
> dosyanın güncel hâlini yapıştırıp **Publish** etmeyi unutmayın.

### Kaydedilen veriler

| Koleksiyon | İçerik | Kim okur |
|---|---|---|
| `users/{uid}` | ad, e-posta, öğrenci/öğretmen, ilk ve son giriş, uygulama ilerlemesi (XP, rozetler) | kişinin kendisi, yönetici |
| `sessions/{id}` | uygulama, oyun, tema, başlangıç/bitiş, etkin süre (sekme arkadayken saat durur), doğru/yanlış sayısı, puan, tamamlandı mı, her cevap (soru, doğrusu, verilen, süre) | kişinin kendisi, yönetici |
| `duels/{kod}` (+ `players`, `answers`, `secret`) | canlı düello: durum, oyuncu puanları, cevaplar, cevap anahtarı | öğrenci: kendi katılımı ve sıralama; cevap anahtarı ve cevaplar yalnızca düelloyu açan öğretmen |
| `sinif_listesi/{e-posta}` | sınıf, ad soyad (öğretmenin yüklediği liste) | yönetici; öğrenci yalnızca kendi kaydını |
| `lig/{hafta}/oyuncular/{uid}` | Haftalık Sınıf Ligi: kısaltılmış ad, sınıf, haftalık XP (hafta: `2026-W40`) | okulun bütün hesapları |
| `admins/{e-posta}` | yönetici listesi (yalnızca konsoldan düzenlenir) | — |

### Başka bir uygulamaya eklemek (ör. Nokta'nın Filmleri)

Aynı Firebase projesi bütün uygulamalara yeter; raporlar tek panelde birleşir.

1. `js/firebase-config.js` ve `js/okul.js` dosyalarını uygulamaya kopyalayın, sayfaya ekleyin:
   ```html
   <script src="js/firebase-config.js"></script>
   <script type="module" src="js/okul.js"></script>
   ```
2. Giriş katmanını ekleyin: `id="okul-gate"` olan bir kutu, içinde `data-okul-signin`
   özellikli bir düğme ve `data-okul-msg` özellikli bir mesaj alanı (örnek: `index.html`).
   Kullanıcı adı ve çıkış düğmesi için `id="okul-who"` olan bir alan.
3. Uygulamada çalışmayı bildirin:
   ```js
   Okul.startSession({ app: 'nokta', game: 'kac-otobus' });          // başlarken
   Okul.record({ q: '370 ÷ 45', expected: '9', given: '8', ok: false }); // her cevapta
   Okul.endSession({ completed: true, score: 80 });                   // biterken
   ```
4. Paneldeki adlar için `js/admin.js` içindeki `APPS` listesine uygulamayı ekleyin.

### Kuralları yerelde test etmek (geliştiriciler için)

```bash
npm i -g firebase-tools
firebase emulators:start --only auth,firestore --project demo-almanca
# v2/firebase-config.js'e projectId: 'demo-almanca', apiKey: 'demo' yazıp
# http://localhost:8000/v2/?emulator=1 adresini açın
```

## 7. Seslendirme

Oyun önce **önceden kaydedilmiş ses dosyasını** çalar (`js/audio.js` → `audio/*.mp3`),
kayıt yoksa cihazın tarayıcı sesine düşer. Kayıtlar `tools/generate_audio.py` ile
`js/data.js`'teki bütün kelime ve cümlelerden tek komutla üretilir; ses değiştirilince
hepsi yeniden kaydedilir.

**Kullanılan ses: Google Cloud Text-to-Speech, Chirp 3 HD "Charon"** (erkek ses, hız 0.92).
171 kaydın tamamı bu sesle üretildi; Piper'a göre yaklaşık %35 daha yavaş ve tane tane
konuşuyor (A1 öğrencisi için daha uygun). Bizim hacmimiz (yaklaşık 3.000–40.000 karakter)
aylık 1 milyon karakterlik ücretsiz kotanın içinde kalır.

Yeni kelime eklenince (anahtar `GOOGLE_TTS_API_KEY` ortam değişkeninde olmalı; yalnızca
yeni metinler kaydedilir, eskiler korunur):

```bash
python3 tools/generate_audio.py --engine google --voice de-DE-Chirp3-HD-Charon
```

Başka bir Chirp 3 HD sesine geçmek için `--voice` değiştirilir (ör. kadın ses
`de-DE-Chirp3-HD-Kore`); ses değişince bütün kayıtlar otomatik yeniden üretilir.
Sesleri karşılaştırma sayfası:
`python3 tools/voice-test/compare_voices.py --auto --whisper --collection round2`
→ `tools/voice-test/ses-karsilastirma.html`.

**Önceki ses: Piper "Thorsten"** (ücretsiz, çevrimdışı, CC0). Google anahtarı yokken
yedek olarak kullanılabilir: `python3 tools/generate_audio.py --engine piper --model yol/de_DE-thorsten-high.onnx`

| Ses | Whisper denetimi (26 zor metin) | Not |
|---|---|---|
| Piper "Thorsten" (CC0) | 17/26 | ilk turda öğretmen oylarını aldı (9 oyun 8'i); bazı ö/ü/ä kelimelerinde zayıf |
| Chatterbox Multilingual (MIT) | 14/26 | daha doğal ama kısa kelimelerde fazladan ses üretiyor |

## 8. Yol haritası (sonraki adımlar)

- [x] Okul hesabıyla giriş, çalışma kaydı ve yönetici rapor paneli
- [x] **Sınıf ve şube** bilgisi (öğretmenin yüklediği sınıf listesi)
- [x] **Sınıf Düellosu:** Öğretmen bir kod paylaşır, öğrenciler aynı anda yarışır
- [x] Atari oyunları (Ninja, Uçan Max, Yılan), Max'in Gardırobu ve Haftalık Sınıf Ligi
- [ ] **Aralıklı tekrar (spaced repetition):** Yanlış yapılan kelimeler daha sık sorulsun
- [ ] **Konuşma oyunu:** Mikrofonla kelimeyi söyle, konuşma tanıma ile kontrol et
- [ ] **Çoğul hali (Plural)** ve **akkusativ** (einen/eine/ein) mini oyunları
- [ ] A2 seviyesi temaları (Stadt, Kleidung, Wetter, Körper…)
- [x] Önceden kaydedilmiş Almanca sesler (Google Chirp 3 HD)
- [ ] Gerçek ses kayıtları (anadil konuşucusu) ve çizim karakterler
- [ ] Çevrimdışı çalışma için service worker, mağaza için Capacitor/React Native paketi
