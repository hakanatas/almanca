// /v2/ sürümünün Firebase ayarları (okul hesabıyla giriş + çalışma kaydı).
// Kök sürüm (/almanca/) js/firebase-config.js'i kullanır; o dosya boş kalmalı ki kök girişsiz çalışsın.
// Firebase konsolu → Proje ayarları → "Uygulamalarınız" → Web uygulaması → "SDK kurulumu ve yapılandırması"
// bölümündeki değerleri buraya yapıştırın. Bu değerler gizli değildir; güvenliği firebase/firestore.rules sağlar.
// Firebase projesi: almanca-2a4f8 (https://console.firebase.google.com/project/almanca-2a4f8)
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCgVF5upjDUhFIUS6RrrSwI8VN1f7yprJA',
  authDomain: 'almanca-2a4f8.firebaseapp.com',
  projectId: 'almanca-2a4f8',
  storageBucket: 'almanca-2a4f8.firebasestorage.app',
  messagingSenderId: '309070766562',
  appId: '1:309070766562:web:599cfee64f133037e5d9bb',
};

// Giriş yapabilecek okul alan adları (sunucudaki kural da aynı listeyi uygular).
window.OKUL_ALAN_ADLARI = ['alkev.k12.tr', 'stu.alkev.k12.tr'];

// Kullanıcı çubuğundaki "Rapor paneli" bağlantısı (sayfalar <base href="../"> kullandığı için köke göre)
window.OKUL_ADMIN_URL = 'v2/admin.html';

// Sayfaların kendi aralarındaki bağlantılar için v2 ana klasörü (köke göre)
window.OKUL_HOME_URL = 'v2/';
