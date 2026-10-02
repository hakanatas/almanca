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
