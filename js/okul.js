// Okul hesabıyla giriş + çalışma kaydı. Her uygulamada aynı dosya kullanılır:
//   <script src="js/firebase-config.js"></script>
//   <script type="module" src="js/okul.js"></script>
// Uygulama tarafı yalnızca window.Okul üzerinden konuşur:
//   Okul.onReady(fn(user, progress))  giriş tamamlanınca (deneme modunda user.uid = 'local')
//   Okul.startSession({ app, game, theme })
//   Okul.record({ q, expected, given, ok })     her cevapta
//   Okul.endSession({ completed, score, total, correct, ... })
//   Okul.saveProgress(app, obj)                  XP/rozet gibi ilerleme
// Sayfada id="okul-gate" olan bir giriş katmanı ve id="okul-who" olan bir kullanıcı alanı bekler.

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
const cfg = window.FIREBASE_CONFIG || {};
const DOMAINS = (window.OKUL_ALAN_ADLARI || []).map((d) => d.toLowerCase());
const DEMO = !cfg.apiKey;
const MAX_ITEMS = 300;
const MIN_SECONDS = 10; // bundan kısa ve cevapsız oturumlar kaydedilmez

const readyFns = [];
let user = null;          // { uid, email, name, photo, kind, admin }
let session = null;
let fb = null;            // Firebase modülleri ve örnekleri

const isSchoolEmail = (email) => {
  const e = String(email || '').toLowerCase();
  return DOMAINS.some((d) => e.endsWith('@' + d));
};
const kindOf = (email) => (String(email).toLowerCase().endsWith('@stu.alkev.k12.tr') ? 'ogrenci' : 'ogretmen');
const clip = (v, n = 120) => (v == null ? '' : String(v).slice(0, n));
const localDay = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// ---------- Etkin süre: sekme görünmezken saat durur ----------
function activeSeconds(s) {
  const extra = document.hidden || s.pausedAt ? 0 : Date.now() - s.resumedAt;
  return Math.round((s.activeMs + extra) / 1000);
}
document.addEventListener('visibilitychange', () => {
  if (!session) return;
  if (document.hidden) { session.activeMs += Date.now() - session.resumedAt; session.pausedAt = Date.now(); }
  else { session.resumedAt = Date.now(); session.pausedAt = 0; }
});

// ---------- Giriş katmanı ----------
const gate = () => document.getElementById('okul-gate');
function gateState(state, msg) {
  const g = gate();
  if (!g) return;
  g.hidden = state === 'open';
  g.dataset.state = state;
  const m = g.querySelector('[data-okul-msg]');
  if (m) m.innerHTML = msg || '';
}
function renderWho() {
  const w = document.getElementById('okul-who');
  if (!w) return;
  if (!user || DEMO) {
    w.innerHTML = DEMO ? '<span class="okul-demo">Deneme modu · giriş kapalı, kayıt tutulmuyor</span>' : '';
    return;
  }
  w.innerHTML = `
    ${user.photo ? `<img src="${user.photo}" alt="" referrerpolicy="no-referrer">` : ''}
    <span class="okul-name">${user.name || user.email}<small>${user.email}</small></span>
    ${user.kind === 'ogretmen' ? '<span class="okul-demo" title="Öğretmen hesabıyla oynanan oyunlar rapora yazılmaz">Öğretmen · denemeler rapora yazılmaz</span>' : ''}
    ${user.admin ? `<a class="okul-admin" href="${window.OKUL_ADMIN_URL || 'admin.html'}">Rapor paneli</a>` : ''}
    <button type="button" class="okul-out">Çıkış</button>`;
  w.querySelector('.okul-out').onclick = () => fb.signOut(fb.auth);
}

async function loadFirebase() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  // Yerel test: http://localhost/...?emulator=1
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('emulator')) {
    A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // Otomatik testler için: emülatörde Google penceresini atlayarak giriş
    window.__okulTestSignIn = (email, name) => A.signInWithCredential(auth,
      A.GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name })));
  }
  return { ...A, ...F, auth, db };
}

async function signIn() {
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  gateState('busy', 'Google penceresi açılıyor…');
  try {
    await fb.signInWithPopup(fb.auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      return fb.signInWithRedirect(fb.auth, provider);
    }
    const msg = e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request'
      ? 'Giriş penceresi kapatıldı. Tekrar deneyin.'
      : `Giriş yapılamadı (${e.code || e.message}). İnternet bağlantınızı kontrol edip tekrar deneyin.`;
    gateState('signin', msg);
  }
}

async function onSignedIn(u) {
  const email = (u.email || '').toLowerCase();
  if (!isSchoolEmail(email) || !u.emailVerified) {
    await fb.signOut(fb.auth);
    gateState('signin', `<b>${clip(email, 80) || 'Bu hesap'}</b> ile giriş yapılamaz. Bu uygulamaya yalnızca
      <b>@alkev.k12.tr</b> ve <b>@stu.alkev.k12.tr</b> uzantılı okul hesaplarıyla girilebilir.
      Google penceresinde okul hesabınızı seçin.`);
    return;
  }
  gateState('busy', 'Hesabınız hazırlanıyor…');
  const ref = fb.doc(fb.db, 'users', u.uid);
  let data = {};
  try {
    const snap = await fb.getDoc(ref);
    data = snap.exists() ? snap.data() : {};
    let admin = false;
    try { admin = (await fb.getDoc(fb.doc(fb.db, 'admins', email))).exists(); } catch (_) { /* yetki yok */ }
    user = { uid: u.uid, email, name: u.displayName || '', photo: u.photoURL || '', kind: kindOf(email), admin };
    await fb.setDoc(ref, {
      email, name: user.name, photo: user.photo, kind: user.kind,
      lastSeen: fb.serverTimestamp(),
      ...(snap.exists() ? {} : { firstSeen: fb.serverTimestamp() }),
    }, { merge: true });
  } catch (e) {
    gateState('signin', `Sunucuya bağlanılamadı (${e.code || e.message}). Sayfayı yenileyip tekrar deneyin.`);
    return;
  }
  renderWho();
  gateState('open');
  Okul.user = user;
  Okul.progress = data.progress || {};
  Okul.fb = fb;
  Okul.ready = true;
  readyFns.splice(0).forEach((fn) => fn(user, Okul.progress));
}

// ---------- Kayıt ----------
let progressTimer = null;
const pendingProgress = {};
let classPromise = null;
const league = { hafta: '', pending: 0, last: 0, timer: null };
const leagueLater = (ms) => { clearTimeout(league.timer); league.timer = setTimeout(() => leagueFlush().catch(() => {}), ms); };
async function leagueFlush() {
  const mine = await Okul.myClass();
  if (!mine || league.pending <= 0) return false;
  const wait = league.last + 21000 - Date.now();
  if (wait > 0) { leagueLater(wait); return false; }
  const add = Math.min(500, league.pending);
  const ref = fb.doc(fb.db, 'lig', league.hafta, 'oyuncular', user.uid);
  league.last = Date.now();
  try {
    await fb.setDoc(ref, { ad: shortName(mine.ad || user.name || user.email), sinif: mine.sinif, xp: fb.increment(add), guncelleme: fb.serverTimestamp() }, { merge: true });
    league.pending -= add;
    if (league.pending > 0) leagueLater(21000);
    return true;
  } catch (e) {
    // Büyük olasılıkla 20 sn sınırı (başka cihazdan da yazılmış olabilir): biraz sonra yeniden dene
    console.warn('Lig puanı yazılamadı, yeniden denenecek', e);
    leagueLater(21000);
    return false;
  }
}
// "Ali Rıza Yılmaz" → "Ali Rıza Y." (ligde tam soyad görünmez)
const shortName = (full) => {
  const parts = String(full).split('@')[0].trim().split(/\s+/);
  if (parts.length < 2) return clip(parts[0], 40);
  const last = parts.pop();
  return clip(`${parts.join(' ')} ${last[0].toLocaleUpperCase('tr')}.`, 40);
};

const Okul = {
  ready: false,
  demo: DEMO,
  user: null,
  progress: {},

  onReady(fn) { if (Okul.ready) fn(Okul.user, Okul.progress); else readyFns.push(fn); },

  startSession({ app, game, theme = '' }) {
    if (session) Okul.endSession({ completed: false });
    session = {
      app: clip(app, 40), game: clip(game, 40), theme: clip(theme, 40),
      startedAt: new Date(), activeMs: 0, resumedAt: Date.now(), pausedAt: document.hidden ? Date.now() : 0,
      items: [], last: Date.now(),
    };
  },

  record({ q, expected, given, ok }) {
    if (!session) return;
    const now = Date.now();
    if (session.items.length < MAX_ITEMS) {
      session.items.push({ q: clip(q), expected: clip(expected), given: clip(given), ok: !!ok, ms: Math.min(now - session.last, 600000) });
    }
    session.last = now;
  },

  endSession(summary = {}) {
    const s = session;
    session = null;
    // Öğretmenler oyunları deneyebilir ama oturumları rapora yazılmaz (kural da yalnızca öğrenci kaydını kabul eder)
    if (!s || DEMO || !user || user.kind !== 'ogrenci') return Promise.resolve();
    const durationSec = Math.min(activeSeconds(s), 14400);
    const total = s.items.length;
    const correct = s.items.filter((i) => i.ok).length;
    if (!total && durationSec < MIN_SECONDS) return Promise.resolve();
    const doc = {
      uid: user.uid, email: user.email, name: user.name, kind: user.kind,
      app: s.app, game: s.game, theme: s.theme,
      startedAt: s.startedAt, endedAt: fb.serverTimestamp(), day: localDay(s.startedAt),
      durationSec, total, correct, wrong: total - correct,
      score: Number(summary.score) || 0,
      completed: !!summary.completed,
      items: s.items,
    };
    return fb.addDoc(fb.collection(fb.db, 'sessions'), doc).catch((e) => console.warn('Oturum kaydedilemedi', e));
  },

  // Öğrencinin kendi son oturumları (yeniden eskiye). Kurallar yalnızca kendi kayıtlarını okutur.
  // (uid, endedAt) bileşik indeksi yoksa sırasız okuyup tarayıcıda sıralar.
  async mySessions(app, n = 30) {
    if (DEMO || !user || !fb) return [];
    const col = fb.collection(fb.db, 'sessions');
    const toList = (snap) => snap.docs.map((d) => {
      const x = d.data();
      return { ...x, endedAt: x.endedAt?.toDate ? x.endedAt.toDate() : x.startedAt?.toDate ? x.startedAt.toDate() : null };
    }).filter((x) => !app || x.app === app);
    try {
      return toList(await fb.getDocs(fb.query(col, fb.where('uid', '==', user.uid), fb.orderBy('endedAt', 'desc'), fb.limit(n))));
    } catch (e) {
      if (e.code !== 'failed-precondition') throw e;
      const all = toList(await fb.getDocs(fb.query(col, fb.where('uid', '==', user.uid), fb.limit(300))));
      return all.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0)).slice(0, n);
    }
  },

  // Uygulama ilerlemesi users/{uid}.progress.{app} altında tutulur (2 sn gecikmeyle toplu yazılır).
  saveProgress(app, obj) {
    if (DEMO || !user) return;
    pendingProgress[clip(app, 40)] = obj;
    clearTimeout(progressTimer);
    progressTimer = setTimeout(() => {
      const ref = fb.doc(fb.db, 'users', user.uid);
      const patch = { email: user.email, progress: { ...pendingProgress } };
      fb.setDoc(ref, patch, { merge: true }).catch((e) => console.warn('İlerleme kaydedilemedi', e));
    }, 2000);
  },

  // ---------- Haftalık Sınıf Ligi ----------
  // lig/{hafta}/oyuncular/{uid} = { ad: "Ali Y.", sinif, xp, guncelleme }. Sınıf, öğretmenin yüklediği listeden okunur.
  weekId(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day); // ISO: haftanın perşembesi yılı belirler
    const y = t.getUTCFullYear();
    const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return `${y}-W${String(w).padStart(2, '0')}`;
  },
  lastWeekId() { return Okul.weekId(new Date(Date.now() - 7 * 86400000)); },

  // Öğrencinin listedeki sınıfı ve adı (yoksa null)
  myClass() {
    if (DEMO || !user || user.kind !== 'ogrenci') return Promise.resolve(null);
    if (!classPromise) {
      classPromise = fb.getDoc(fb.doc(fb.db, 'sinif_listesi', user.email))
        .then((d) => (d.exists() ? { sinif: d.data().sinif, ad: d.data().ad || '' } : null))
        .catch(() => null);
    }
    return classPromise;
  },

  // Oyun bitince kazanılan XP'yi bu haftanın lig satırına ekler.
  // Kural tek yazışta 500 XP ve iki yazış arasında 20 sn sınırı koyar; fazlası sonraki yazışa kalır.
  async leagueAdd(xp) {
    xp = Math.max(0, Math.round(Number(xp) || 0));
    if (!xp || DEMO || !user || user.kind !== 'ogrenci') return false;
    const hafta = Okul.weekId();
    if (league.hafta !== hafta) Object.assign(league, { hafta, pending: 0 });
    league.pending += xp;
    return leagueFlush();
  },

  // Hafıza oyunu için öğretmenin kelime setleri. Öğrenci yalnızca kendi sınıfına (ya da herkese) açık setleri görür.
  async wordSets() {
    if (DEMO || !user || !fb) return [];
    const snap = await fb.getDocs(fb.collection(fb.db, 'hafiza_setleri'));
    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (user.kind === 'ogrenci') {
      const mine = await Okul.myClass();
      list = list.filter((x) => !(x.siniflar || []).length || (mine && x.siniflar.includes(mine.sinif)));
    }
    return list.sort((a, b) => String(a.ad).localeCompare(String(b.ad), 'tr', { numeric: true }));
  },

  // Bir sınıfın o haftaki sıralaması (çoktan aza)
  async leagueTable(sinif, hafta = Okul.weekId()) {
    if (DEMO || !user || !fb || !sinif) return [];
    const snap = await fb.getDocs(fb.query(fb.collection(fb.db, 'lig', hafta, 'oyuncular'), fb.where('sinif', '==', sinif)));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => b.xp - a.xp);
  },

  // Haftanın bütün sınıfları (öğretmen görünümü için)
  async leagueClasses(hafta = Okul.weekId()) {
    if (DEMO || !user || !fb) return [];
    const snap = await fb.getDocs(fb.collection(fb.db, 'lig', hafta, 'oyuncular'));
    const by = {};
    snap.docs.forEach((d) => { const x = d.data(); (by[x.sinif] = by[x.sinif] || { sinif: x.sinif, xp: 0, n: 0 }); by[x.sinif].xp += x.xp; by[x.sinif].n += 1; });
    return Object.values(by).sort((a, b) => a.sinif.localeCompare(b.sinif, 'tr', { numeric: true }));
  },
};
window.Okul = Okul;
// Sayfa kapanırken yarım kalan oturumu göndermeyi dene
window.addEventListener('pagehide', () => { if (session) Okul.endSession({ completed: false }); });

// ---------- Başlat ----------
(async () => {
  if (DEMO) {
    user = { uid: 'local', email: '', name: '', kind: '', admin: false };
    Okul.user = user;
    renderWho();
    gateState('open');
    Okul.ready = true;
    readyFns.splice(0).forEach((fn) => fn(user, {}));
    return;
  }
  gateState('busy', 'Yükleniyor…');
  try {
    fb = await loadFirebase();
  } catch (e) {
    gateState('signin', 'Giriş hizmeti yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.');
    return;
  }
  const btn = gate() && gate().querySelector('[data-okul-signin]');
  if (btn) btn.onclick = signIn;
  fb.getRedirectResult(fb.auth).catch(() => {});
  fb.onAuthStateChanged(fb.auth, (u) => {
    if (u) onSignedIn(u);
    else {
      if (user && user.uid !== 'local') { location.reload(); return; } // çıkış yapıldı → temiz başla
      // Reddedilen hesaptan sonra gelen çıkış olayı uyarıyı silmesin
      const g = gate();
      gateState('signin', g && g.dataset.state === 'signin' ? g.querySelector('[data-okul-msg]').innerHTML : '');
    }
  });
})();
