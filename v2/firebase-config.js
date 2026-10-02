// /v2/ sürümünün Firebase ayarları (okul hesabıyla giriş + çalışma kaydı).
// Kök sürüm (/almanca/) js/firebase-config.js'i kullanır; o dosya boş kalmalı ki kök girişsiz çalışsın.
// Firebase konsolu → Proje ayarları → "Uygulamalarınız" → Web uygulaması → "SDK kurulumu ve yapılandırması"
// bölümündeki değerleri buraya yapıştırın. Bu değerler gizli değildir; güvenliği firebase/firestore.rules sağlar.
// apiKey boş kalırsa /v2/ de girişsiz "deneme modunda" çalışır.
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

// Kullanıcı çubuğundaki "Rapor paneli" bağlantısı (sayfalar <base href="../"> kullandığı için köke göre)
window.OKUL_ADMIN_URL = 'v2/admin.html';
