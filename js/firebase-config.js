// Firebase projesinin ayarları. Firebase konsolu → Proje ayarları → "Uygulamalarınız"
// → Web uygulaması → "SDK kurulumu ve yapılandırması" bölümündeki değerleri buraya yapıştırın.
// Bu değerler gizli değildir; güvenliği firebase/firestore.rules sağlar.
// apiKey boş kalırsa oyun girişsiz "deneme modunda" çalışır ve hiçbir veri gönderilmez.
window.FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Giriş yapabilecek okul alan adları (sunucudaki kural da aynı listeyi uygular).
window.OKUL_ALAN_ADLARI = ['alkev.k12.tr', 'stu.alkev.k12.tr'];
