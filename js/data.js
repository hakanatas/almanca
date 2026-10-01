// Oyun içeriği: A1 seviyesi, MEB ikinci yabancı dil (Almanca) ünitelerine yakın temalar.
// Yeni kelime/cümle eklemek için sadece bu dosyayı düzenlemek yeterli.

const THEMES = [
  {
    id: 'familie', de: 'Familie', tr: 'Aile', icon: '👨‍👩‍👧',
    words: [
      { de: 'Vater', art: 'der', tr: 'baba', e: '👨' },
      { de: 'Mutter', art: 'die', tr: 'anne', e: '👩' },
      { de: 'Kind', art: 'das', tr: 'çocuk', e: '🧒' },
      { de: 'Bruder', art: 'der', tr: 'erkek kardeş', e: '👦' },
      { de: 'Schwester', art: 'die', tr: 'kız kardeş', e: '👧' },
      { de: 'Baby', art: 'das', tr: 'bebek', e: '👶' },
      { de: 'Opa', art: 'der', tr: 'dede', e: '👴' },
      { de: 'Oma', art: 'die', tr: 'nine', e: '👵' },
      { de: 'Familie', art: 'die', tr: 'aile', e: '👪' },
      { de: 'Mädchen', art: 'das', tr: 'kız', e: '👱‍♀️' },
    ],
    sentences: [
      { de: ['Das', 'ist', 'meine', 'Mutter.'], tr: 'Bu benim annem.' },
      { de: ['Ich', 'habe', 'einen', 'Bruder.'], tr: 'Bir erkek kardeşim var.' },
      { de: ['Mein', 'Vater', 'heißt', 'Ali.'], tr: 'Babamın adı Ali.' },
      { de: ['Meine', 'Oma', 'wohnt', 'in', 'Izmir.'], tr: 'Ninem İzmir\'de yaşıyor.' },
    ],
  },
  {
    id: 'schule', de: 'Schule', tr: 'Okul', icon: '🏫',
    words: [
      { de: 'Buch', art: 'das', tr: 'kitap', e: '📕' },
      { de: 'Heft', art: 'das', tr: 'defter', e: '📓' },
      { de: 'Kuli', art: 'der', tr: 'tükenmez kalem', e: '🖊️' },
      { de: 'Bleistift', art: 'der', tr: 'kurşun kalem', e: '✏️' },
      { de: 'Tasche', art: 'die', tr: 'çanta', e: '🎒' },
      { de: 'Lehrerin', art: 'die', tr: 'kadın öğretmen', e: '👩‍🏫' },
      { de: 'Lehrer', art: 'der', tr: 'erkek öğretmen', e: '👨‍🏫' },
      { de: 'Schere', art: 'die', tr: 'makas', e: '✂️' },
      { de: 'Lineal', art: 'das', tr: 'cetvel', e: '📏' },
      { de: 'Computer', art: 'der', tr: 'bilgisayar', e: '💻' },
      { de: 'Uhr', art: 'die', tr: 'saat', e: '⏰' },
      { de: 'Schule', art: 'die', tr: 'okul', e: '🏫' },
    ],
    sentences: [
      { de: ['Ich', 'gehe', 'in', 'die', 'Schule.'], tr: 'Okula gidiyorum.' },
      { de: ['Das', 'Buch', 'ist', 'neu.'], tr: 'Kitap yeni.' },
      { de: ['Wir', 'lernen', 'Deutsch.'], tr: 'Almanca öğreniyoruz.' },
      { de: ['Heute', 'haben', 'wir', 'Mathe.'], tr: 'Bugün matematik dersimiz var.' },
    ],
  },
  {
    id: 'essen', de: 'Essen & Trinken', tr: 'Yiyecek & İçecek', icon: '🍎',
    words: [
      { de: 'Apfel', art: 'der', tr: 'elma', e: '🍎' },
      { de: 'Banane', art: 'die', tr: 'muz', e: '🍌' },
      { de: 'Brot', art: 'das', tr: 'ekmek', e: '🍞' },
      { de: 'Käse', art: 'der', tr: 'peynir', e: '🧀' },
      { de: 'Milch', art: 'die', tr: 'süt', e: '🥛' },
      { de: 'Wasser', art: 'das', tr: 'su', e: '💧' },
      { de: 'Ei', art: 'das', tr: 'yumurta', e: '🥚' },
      { de: 'Tomate', art: 'die', tr: 'domates', e: '🍅' },
      { de: 'Kuchen', art: 'der', tr: 'kek / pasta', e: '🍰' },
      { de: 'Pizza', art: 'die', tr: 'pizza', e: '🍕' },
      { de: 'Eis', art: 'das', tr: 'dondurma', e: '🍦' },
      { de: 'Tee', art: 'der', tr: 'çay', e: '🍵' },
    ],
    sentences: [
      { de: ['Ich', 'esse', 'gern', 'Pizza.'], tr: 'Pizza yemeyi severim.' },
      { de: ['Trinkst', 'du', 'Tee?'], tr: 'Çay içer misin?' },
      { de: ['Der', 'Apfel', 'ist', 'rot.'], tr: 'Elma kırmızı.' },
      { de: ['Zum', 'Frühstück', 'esse', 'ich', 'Käse.'], tr: 'Kahvaltıda peynir yerim.' },
    ],
  },
  {
    id: 'tiere', de: 'Tiere', tr: 'Hayvanlar', icon: '🐶',
    words: [
      { de: 'Hund', art: 'der', tr: 'köpek', e: '🐶' },
      { de: 'Katze', art: 'die', tr: 'kedi', e: '🐱' },
      { de: 'Pferd', art: 'das', tr: 'at', e: '🐴' },
      { de: 'Vogel', art: 'der', tr: 'kuş', e: '🐦' },
      { de: 'Maus', art: 'die', tr: 'fare', e: '🐭' },
      { de: 'Schwein', art: 'das', tr: 'domuz', e: '🐷' },
      { de: 'Fisch', art: 'der', tr: 'balık', e: '🐟' },
      { de: 'Kuh', art: 'die', tr: 'inek', e: '🐮' },
      { de: 'Kaninchen', art: 'das', tr: 'tavşan', e: '🐰' },
      { de: 'Löwe', art: 'der', tr: 'aslan', e: '🦁' },
      { de: 'Ente', art: 'die', tr: 'ördek', e: '🦆' },
      { de: 'Schaf', art: 'das', tr: 'koyun', e: '🐑' },
    ],
    sentences: [
      { de: ['Die', 'Katze', 'schläft.'], tr: 'Kedi uyuyor.' },
      { de: ['Ich', 'habe', 'einen', 'Hund.'], tr: 'Bir köpeğim var.' },
      { de: ['Der', 'Vogel', 'kann', 'fliegen.'], tr: 'Kuş uçabilir.' },
      { de: ['Hast', 'du', 'ein', 'Haustier?'], tr: 'Evcil hayvanın var mı?' },
    ],
  },
  {
    id: 'haus', de: 'Haus & Wohnung', tr: 'Ev', icon: '🏠',
    words: [
      { de: 'Haus', art: 'das', tr: 'ev', e: '🏠' },
      { de: 'Tisch', art: 'der', tr: 'masa', e: '🪑' },
      { de: 'Bett', art: 'das', tr: 'yatak', e: '🛏️' },
      { de: 'Tür', art: 'die', tr: 'kapı', e: '🚪' },
      { de: 'Fenster', art: 'das', tr: 'pencere', e: '🪟' },
      { de: 'Lampe', art: 'die', tr: 'lamba', e: '💡' },
      { de: 'Schlüssel', art: 'der', tr: 'anahtar', e: '🔑' },
      { de: 'Küche', art: 'die', tr: 'mutfak', e: '🍳' },
      { de: 'Sofa', art: 'das', tr: 'kanepe', e: '🛋️' },
      { de: 'Garten', art: 'der', tr: 'bahçe', e: '🌳' },
    ],
    sentences: [
      { de: ['Mein', 'Zimmer', 'ist', 'klein.'], tr: 'Odam küçük.' },
      { de: ['Die', 'Lampe', 'ist', 'auf', 'dem', 'Tisch.'], tr: 'Lamba masanın üstünde.' },
      { de: ['Wir', 'wohnen', 'in', 'einem', 'Haus.'], tr: 'Bir evde oturuyoruz.' },
    ],
  },
  {
    id: 'freizeit', de: 'Freizeit', tr: 'Boş Zaman', icon: '⚽',
    words: [
      { de: 'Ball', art: 'der', tr: 'top', e: '⚽' },
      { de: 'Fahrrad', art: 'das', tr: 'bisiklet', e: '🚲' },
      { de: 'Musik', art: 'die', tr: 'müzik', e: '🎵' },
      { de: 'Gitarre', art: 'die', tr: 'gitar', e: '🎸' },
      { de: 'Spiel', art: 'das', tr: 'oyun', e: '🎮' },
      { de: 'Film', art: 'der', tr: 'film', e: '🎬' },
      { de: 'Kamera', art: 'die', tr: 'kamera', e: '📷' },
      { de: 'Handy', art: 'das', tr: 'cep telefonu', e: '📱' },
      { de: 'Strand', art: 'der', tr: 'plaj', e: '🏖️' },
      { de: 'Zeitung', art: 'die', tr: 'gazete', e: '📰' },
    ],
    sentences: [
      { de: ['Ich', 'spiele', 'gern', 'Fußball.'], tr: 'Futbol oynamayı severim.' },
      { de: ['Am', 'Wochenende', 'fahre', 'ich', 'Fahrrad.'], tr: 'Hafta sonu bisiklete binerim.' },
      { de: ['Was', 'machst', 'du', 'heute?'], tr: 'Bugün ne yapıyorsun?' },
      { de: ['Sie', 'hört', 'Musik.'], tr: 'O (kız) müzik dinliyor.' },
    ],
  },
];

// Fiil çekimleri: [ich, du, er/sie/es, wir, ihr, sie/Sie]
const PRONOUNS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
const PRONOUN_TR = ['ben', 'sen', 'o (erkek)', 'biz', 'siz', 'onlar'];

const VERBS = [
  { inf: 'spielen', tr: 'oynamak', obj: 'Fußball', forms: ['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'] },
  { inf: 'lernen', tr: 'öğrenmek', obj: 'Deutsch', forms: ['lerne', 'lernst', 'lernt', 'lernen', 'lernt', 'lernen'] },
  { inf: 'wohnen', tr: 'oturmak', obj: 'in Berlin', forms: ['wohne', 'wohnst', 'wohnt', 'wohnen', 'wohnt', 'wohnen'] },
  { inf: 'kommen', tr: 'gelmek', obj: 'aus der Türkei', forms: ['komme', 'kommst', 'kommt', 'kommen', 'kommt', 'kommen'] },
  { inf: 'trinken', tr: 'içmek', obj: 'Wasser', forms: ['trinke', 'trinkst', 'trinkt', 'trinken', 'trinkt', 'trinken'] },
  { inf: 'heißen', tr: '…adında olmak', obj: 'Max', forms: ['heiße', 'heißt', 'heißt', 'heißen', 'heißt', 'heißen'] },
  { inf: 'sein', tr: 'olmak', obj: 'müde', forms: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'] },
  { inf: 'haben', tr: 'sahip olmak', obj: 'Hunger', forms: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'] },
  { inf: 'essen', tr: 'yemek', obj: 'Brot', forms: ['esse', 'isst', 'isst', 'essen', 'esst', 'essen'] },
  { inf: 'lesen', tr: 'okumak', obj: 'ein Buch', forms: ['lese', 'liest', 'liest', 'lesen', 'lest', 'lesen'] },
  { inf: 'sprechen', tr: 'konuşmak', obj: 'Türkisch', forms: ['spreche', 'sprichst', 'spricht', 'sprechen', 'sprecht', 'sprechen'] },
  { inf: 'fahren', tr: '(araçla) gitmek', obj: 'Bus', forms: ['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'] },
  { inf: 'machen', tr: 'yapmak', obj: 'Hausaufgaben', forms: ['mache', 'machst', 'macht', 'machen', 'macht', 'machen'] },
];

// Artikel ipuçları: kelime sonuna göre (sadece doğru artikelle uyuşuyorsa gösterilir)
const ARTIKEL_REGELN = [
  { re: /(ung|heit|keit|schaft|ion|tät|ik)$/i, art: 'die', tip: '-ung, -heit, -keit, -schaft, -ion, -tät, -ik ile biten kelimeler hep DIE alır.' },
  { re: /(chen|lein)$/i, art: 'das', tip: '-chen ve -lein ile biten küçültme kelimeleri hep DAS alır. (das Mädchen!)' },
  { re: /e$/i, art: 'die', tip: '-e ile biten kelimelerin çoğu DIE alır (die Katze, die Tasche).' },
  { re: /(er|en)$/i, art: 'der', tip: '-er / -en ile biten kelimeler çoğunlukla DER alır (der Lehrer, der Kuchen).' },
  { re: /^ge/i, art: 'das', tip: 'Ge- ile başlayan kelimelerin çoğu DAS alır.' },
];

const MASKOT_SOZLERI = {
  dogru: ['Super!', 'Toll!', 'Sehr gut!', 'Prima!', 'Klasse!', 'Wunderbar!', 'Genau!'],
  yanlis: ['Schade!', 'Fast!', 'Nicht schlimm!', 'Weiter so!', 'Noch einmal!'],
};
