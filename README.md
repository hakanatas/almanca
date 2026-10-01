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

## 4. Proje yapısı

```
index.html        Ekranlar (ana menü, oyun, sonuç)
css/style.css     Görünüm, animasyonlar, karanlık mod
js/data.js        TÜM İÇERİK: temalar, kelimeler, cümleler, fiiller, artikel kuralları
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

## 5. Yol haritası (sonraki adımlar)

- [ ] **Sınıf modu:** Öğretmen bir kod paylaşır, öğrenciler aynı anda yarışır (canlı liderlik tablosu)
- [ ] **Aralıklı tekrar (spaced repetition):** Yanlış yapılan kelimeler daha sık sorulsun
- [ ] **Konuşma oyunu:** Mikrofonla kelimeyi söyle, konuşma tanıma ile kontrol et
- [ ] **Çoğul hali (Plural)** ve **akkusativ** (einen/eine/ein) mini oyunları
- [ ] A2 seviyesi temaları (Stadt, Kleidung, Wetter, Körper…)
- [ ] Gerçek ses kayıtları (anadil konuşucusu) ve çizim karakterler
- [ ] Çevrimdışı çalışma için service worker, mağaza için Capacitor/React Native paketi
