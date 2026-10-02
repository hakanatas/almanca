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

1. **🎯 Artikel Avı** — 60 saniye. Kelime ve resmi çıkar, *der / die / das*
   butonlarından birine bas. Üst üste doğrular kombo puanı verir (x2'ye kadar bonus).
2. **🃏 Hafıza Kartları** — 6 çift kart. Almanca kelime kartını resim kartıyla eşleştir.
   Az hamle = yüksek yıldız.
3. **👂 Hör zu!** — 10 tur. Hoparlöre bas, Almanca kelimeyi dinle, 4 resimden doğrusunu seç.
4. **🚂 Cümle Treni** — 6 cümle. Türkçe anlamı verilen cümlenin kelime vagonlarını
   trene sırayla tak. Doğruysa tren yola çıkar.
5. **🚀 Fiil Roketi** — 10 tur. `Du ___ Fußball. (spielen)` → *spielst*. Doğruysa roket uçar.

Hepsi seçilen **temaya** göre çalışır: Aile, Okul, Yiyecek & İçecek, Hayvanlar,
Ev, Boş Zaman (veya hepsi karışık). Temalar MEB 2. yabancı dil Almanca A1
ünitelerine paralel seçildi.

## 3. Oyunlaştırma sistemi

- **XP ve seviye:** Her oyun sonunda `puan/2 + yıldız×5` XP. Seviye eşikleri
  0, 50, 200, 450, 800… XP (giderek zorlaşır).
- **Yıldızlar:** %90+ ⭐⭐⭐, %70+ ⭐⭐, %40+ ⭐
- **Günlük seri 🔥:** Her gün en az bir oyun oynayınca artar, bir gün atlanırsa sıfırlanır.
- **Rozetler:** İlk Adım, Artikel Ninja (10'luk seri), Kusursuz, Kaşif (5 oyunun hepsi),
  Ateşli (3 gün seri), Deutsch-König (5. seviye).
- İlerleme cihazda (`localStorage`) saklanır; hesap/sunucu gerekmez.

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
js/firebase-config.js  Firebase proje ayarları
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
yönetici `admin.html` sayfasında hepsini tek yerde görür ve CSV olarak indirir.
Altyapı Firebase'dir (Google girişi + Firestore veritabanı), ücretsiz katman bir okul için yeterlidir.

**Güvenlik nasıl sağlanıyor?** Alan adı kontrolü yalnızca tarayıcıda değil, sunucudaki
`firebase/firestore.rules` kurallarında da yapılır: başka bir Google hesabıyla giren kişi
hiçbir veriyi okuyamaz, yazamaz. Öğrenci yalnızca kendi kayıtlarını görür, kayıtlar
sonradan değiştirilemez, toplu raporu yalnızca yönetici okur. Kurallar Firestore emülatöründe
28 senaryoyla test edildi (sahte alan adları, başkası adına kayıt, yetkisiz öğretmen vb.).

`js/firebase-config.js` boşken oyun **deneme modunda** girişsiz çalışır ve hiçbir veri göndermez.

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
   verip kaydedin. Gösterilen `firebaseConfig` değerlerini `js/firebase-config.js`
   içine yapıştırın. (Bu değerler gizli değildir.)
8. **Yayın:** GitHub'da depo → *Settings → Pages → Deploy from a branch → main / (root)*.
   Oyun `https://hakanatas.github.io/almanca/`, rapor paneli
   `https://hakanatas.github.io/almanca/admin.html` adresinde açılır.

> **Öğrenciler "Bu uygulama engellendi" görürse:** Google Workspace for Education, 18 yaş
> altı kullanıcıların tanımadığı uygulamalara Google ile girmesini varsayılan olarak engeller.
> Okulun Workspace yöneticisi *Admin konsolu → Güvenlik → Erişim ve veri kontrolü →
> API denetimleri → Üçüncü taraf uygulama erişimini yönet* bölümünde bu uygulamayı
> (Firebase'in oluşturduğu OAuth istemcisi) **Güvenilir** olarak işaretlemelidir.

> **Kişisel veriler:** Kaydedilen bilgiler ad, okul e-postası ve oyun sonuçlarıdır. Öğrencileri
> ve velileri bilgilendirmeniz (KVKK aydınlatma) önerilir.

### Kaydedilen veriler

| Koleksiyon | İçerik | Kim okur |
|---|---|---|
| `users/{uid}` | ad, e-posta, öğrenci/öğretmen, ilk ve son giriş, uygulama ilerlemesi (XP, rozetler) | kişinin kendisi, yönetici |
| `sessions/{id}` | uygulama, oyun, tema, başlangıç/bitiş, etkin süre (sekme arkadayken saat durur), doğru/yanlış sayısı, puan, tamamlandı mı, her cevap (soru, doğrusu, verilen, süre) | kişinin kendisi, yönetici |
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
# js/firebase-config.js'e projectId: 'demo-almanca', apiKey: 'demo' yazıp
# http://localhost:8000/index.html?emulator=1 adresini açın
```

## 7. Yol haritası (sonraki adımlar)

- [x] Okul hesabıyla giriş, çalışma kaydı ve yönetici rapor paneli
- [ ] **Sınıf ve şube** bilgisi (raporu sınıfa göre süzmek için)
- [ ] **Sınıf modu:** Öğretmen bir kod paylaşır, öğrenciler aynı anda yarışır (canlı liderlik tablosu)
- [ ] **Aralıklı tekrar (spaced repetition):** Yanlış yapılan kelimeler daha sık sorulsun
- [ ] **Konuşma oyunu:** Mikrofonla kelimeyi söyle, konuşma tanıma ile kontrol et
- [ ] **Çoğul hali (Plural)** ve **akkusativ** (einen/eine/ein) mini oyunları
- [ ] A2 seviyesi temaları (Stadt, Kleidung, Wetter, Körper…)
- [ ] Gerçek ses kayıtları (anadil konuşucusu) ve çizim karakterler
- [ ] Çevrimdışı çalışma için service worker, mağaza için Capacitor/React Native paketi
