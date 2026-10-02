'use strict';

// ---------- Yardımcılar ----------
const $ = (s, el = document) => el.querySelector(s);
const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);

// ---------- Kayıt (localStorage) ----------
const SAVE_KEY = 'deutsch-macerasi-v1';
const defaultState = () => ({ xp: 0, streak: 0, lastDay: null, theme: 'all', best: {}, played: {}, badges: [] });
let state = defaultState();
// Her hesabın ilerlemesi ayrı tutulur (okuldaki ortak bilgisayarlar için).
// Girişli kullanımda asıl kayıt buluttadır (Okul.saveProgress); yerel kopya hız içindir.
let saveKey = SAVE_KEY;
const save = () => {
  try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (e) { /* gizli sekme vb. */ }
  if (window.Okul) Okul.saveProgress('almanca', state);
};
function useProfile(uid, cloud) {
  saveKey = uid === 'local' ? SAVE_KEY : `${SAVE_KEY}:${uid}`;
  let local = null;
  try { local = JSON.parse(localStorage.getItem(saveKey) || 'null'); } catch (e) { /* yoksay */ }
  // Hangisi daha ilerideyse onu kullan (başka cihazda oynanmış olabilir)
  const best = [cloud, local].filter((x) => x && typeof x.xp === 'number').sort((a, b) => b.xp - a.xp)[0];
  state = Object.assign(defaultState(), best || {});
  try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (e) { /* yoksay */ }
  renderHome();
}
// Okul modülüne gönderim (modül yüklenmemişse sessizce atlanır)
const okul = (fn, arg) => { try { if (window.Okul) return Okul[fn](arg); } catch (e) { console.warn(e); } };

// Seviye n için gereken toplam XP: 50 * (n-1)^2  → 0, 50, 200, 450, 800...
const levelOf = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;
const xpFor = (lvl) => 50 * (lvl - 1) ** 2;

const el_ = (...a) => el(...a);

// ---------- Ses ----------
let audioCtx;
function beep(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [660, 880] : [220, 180];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = ok ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const t = audioCtx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.16);
    });
  } catch (e) { /* ses desteklenmiyor */ }
}

// Seslendirme: önce önceden kaydedilmiş dosya (js/audio.js → AUDIO_CLIPS), yoksa tarayıcı sesi.
function beepCoin() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
    o.type = 'square'; o.frequency.setValueAtTime(988, t); o.frequency.setValueAtTime(1319, t + 0.05);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 0.13);
  } catch (e) { /* ses yok */ }
}

const canSpeak = 'speechSynthesis' in window;
const CLIPS = typeof AUDIO_CLIPS !== 'undefined' ? AUDIO_CLIPS : {};
const hasClip = (text) => Object.prototype.hasOwnProperty.call(CLIPS, text);
const clipPlayer = new Audio();
clipPlayer.preload = 'auto';
let deVoice = null;
function loadVoice() {
  if (!canSpeak) return;
  // Birden çok Almanca ses varsa en doğal olanı seç (ör. "Google Deutsch", "Anna", "Natural")
  const vs = speechSynthesis.getVoices().filter((v) => /^de(-|_|$)/i.test(v.lang));
  const score = (v) => (/natural|neural|online|premium|enhanced|wavenet/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0)
    + (/anna|katja|helena|petra|markus|yannick|conrad/i.test(v.name) ? 2 : 0) + (v.lang === 'de-DE' ? 1 : 0) - (/espeak/i.test(v.name) ? 5 : 0);
  deVoice = vs.sort((a, b) => score(b) - score(a))[0] || null;
}
if (canSpeak) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
function speak(text, rate = 0.85) {
  if (canSpeak) speechSynthesis.cancel();
  clipPlayer.pause();
  if (hasClip(text)) {
    clipPlayer.src = CLIPS[text];
    // "Yavaş dinle": kayıt yavaşlatılır, ses tonu korunur
    clipPlayer.playbackRate = rate < 0.7 ? 0.75 : 1;
    clipPlayer.preservesPitch = true;
    clipPlayer.play().catch(() => {});
    return;
  }
  if (!canSpeak) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  if (deVoice) u.voice = deVoice;
  u.rate = rate;
  speechSynthesis.speak(u);
}

// ---------- İçerik seçimi ----------
function currentThemes() {
  return state.theme === 'all' ? THEMES : THEMES.filter((t) => t.id === state.theme);
}
const wordPool = () => currentThemes().flatMap((t) => t.words);
const sentencePool = () => currentThemes().flatMap((t) => t.sentences);
const allWords = () => THEMES.flatMap((t) => t.words);

function artikelTipp(w) {
  const r = ARTIKEL_REGELN.find((r) => r.re.test(w.de));
  if (r && r.art === w.art) return r.tip;
  return 'Artikel kelimenin bir parçasıdır: kelimeyi her zaman artikeliyle birlikte ezberle!';
}

// ---------- Rozetler ----------
const BADGES = [
  { id: 'ilk', icon: '🎉', name: 'İlk Adım', desc: 'İlk oyununu bitir' },
  { id: 'kombo10', icon: '⚡', name: 'Artikel Ninja', desc: 'Artikel oyununda 10\'luk seri yap' },
  { id: 'mukemmel', icon: '💯', name: 'Kusursuz', desc: 'Bir oyunu hatasız bitir' },
  { id: 'kasif', icon: '🧭', name: 'Kaşif', desc: 'Beş oyunun hepsini dene' },
  { id: 'seri3', icon: '🔥', name: 'Ateşli', desc: '3 gün üst üste oyna' },
  { id: 'seviye5', icon: '👑', name: 'Deutsch-König', desc: '5. seviyeye ulaş' },
];

// ---------- Ekranlar ----------
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

function renderHome() {
  const lvl = levelOf(state.xp);
  const lo = xpFor(lvl), hi = xpFor(lvl + 1);
  $('#p-level').textContent = lvl;
  $('#p-streak').textContent = state.streak;
  $('#p-badges').textContent = state.badges.length;
  $('#p-xpfill').style.width = `${((state.xp - lo) / (hi - lo)) * 100}%`;
  $('#p-xptext').textContent = `${state.xp - lo} / ${hi - lo} XP`;

  const tl = $('#theme-list');
  tl.innerHTML = '';
  [{ id: 'all', tr: 'Hepsi', de: 'Alles', words: allWords() }, ...THEMES].forEach((t) => {
    const n = t.words ? t.words.length : 0;
    const b = el('button', 'theme', `${t.tr}<small>${t.de} · ${n} kelime</small>`);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(state.theme === t.id));
    b.onclick = () => { state.theme = t.id; save(); renderHome(); };
    tl.appendChild(b);
  });

  const gl = $('#game-list');
  gl.innerHTML = '';
  Object.entries(GAMES).forEach(([id, g], i) => {
    const best = state.best[id];
    const li = el('li', 'step', `
      <div class="num">${HAND_CIRCLE}<b>${i + 1}</b></div>
      <div class="meta">
        <div class="meta-top">
          <div>
            <span class="code">${g.code}</span><span class="dur">${g.len}</span>
            <h3>${g.name}</h3>
            <p class="de">${g.de}</p>
          </div>
          <span class="g-tile">${ICONS[id]}</span>
        </div>
        <p class="what">${g.desc}</p>
        <p class="outcome">${g.skill}</p>
        <div class="links">
          <button class="primary play"><i></i>Oyna</button>
          <span class="best">${best != null ? 'Rekor: ' + best + ' puan' : 'Henüz oynanmadı'}</span>
        </div>
      </div>`);
    li.style.setProperty('--i', i);
    li.querySelector('.play').onclick = () => startGame(id);
    gl.appendChild(li);
  });

  const bl = $('#badge-list');
  bl.innerHTML = '';
  BADGES.forEach((b) => {
    const has = state.badges.includes(b.id);
    bl.appendChild(el('div', 'stamp' + (has ? ' got' : ''), `<span class="seal-ring">${HAND_CIRCLE}${has ? `<span class="emoji">${b.icon}</span>` : UI_ICONS.lock}</span><b>${b.name}</b><small>${b.desc}</small>`));
  });
  show('screen-home');
}

// ---------- Oyun çerçevesi ----------
let session = null;

function startGame(id) {
  if (session && session.cleanup) session.cleanup();
  const g = GAMES[id];
  session = { id, active: true, score: 0, correct: 0, total: 0, mistakes: 0, maxCombo: 0, combo: 0, cleanup: null };
  $('#hud-score').textContent = '0';
  $('#hud-info').textContent = '';
  setProgress(0);
  $('#game-area').innerHTML = '';
  $('#feedback').hidden = true;
  show('screen-game');
  okul('startSession', { app: 'almanca', game: id, theme: state.theme });
  g.start($('#game-area'), session);
}

// Oyun bittikten / çıkıldıktan sonra bekleyen zamanlayıcılar çalışmasın
const later = (s, fn, ms) => setTimeout(() => { if (session === s && s.active) fn(); }, ms);

function setProgress(p) { $('#hud-progress').style.width = `${Math.min(100, p * 100)}%`; }
function addScore(n) { session.score += n; $('#hud-score').textContent = session.score; }

// Doğru/yanlış kaydı + kısa geri bildirim
// opts.quiet: hızlı oyunlarda alttaki bildirim kutusu gösterilmez (ses ve puan yine işler)
function answer(ok, detail, item, opts = {}) {
  session.total++;
  if (item) okul('record', { ...item, ok });
  if (ok) {
    session.correct++;
    session.combo++;
    session.maxCombo = Math.max(session.maxCombo, session.combo);
    addScore(10 + Math.min(session.combo - 1, 5) * 2);
  } else {
    session.mistakes++;
    session.combo = 0;
  }
  beep(ok);
  if (opts.quiet) return;
  const fb = $('#feedback');
  fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
  fb.innerHTML = `<div class="fb-max">${maxSVG(ok ? 'jump' : 'sad')}</div>
    <div class="fb-text"><b>${pick(ok ? MASKOT_SOZLERI.dogru : MASKOT_SOZLERI.yanlis)}</b>`
    + (session.combo >= 3 ? ` <span class="combo">${UI_ICONS.flame} x${session.combo}</span>` : '')
    + (detail ? `<div>${detail}</div>` : '') + '</div>';
  fb.hidden = false;
  clearTimeout(answer.t);
  answer.t = setTimeout(() => { fb.hidden = true; }, ok ? 1100 : 2600);
}

function finish() {
  if (!session.active) return;
  session.active = false;
  if (session.cleanup) session.cleanup();
  const s = session;
  const ratio = s.total ? s.correct / s.total : 0;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0;
  const xpGain = Math.round(s.score / 2) + stars * 5;
  const oldLvl = levelOf(state.xp);
  state.xp += xpGain;
  state.played[s.id] = (state.played[s.id] || 0) + 1;
  const newRecord = state.best[s.id] == null || s.score > state.best[s.id];
  if (newRecord) state.best[s.id] = s.score;

  // Günlük seri
  const today = todayStr();
  if (state.lastDay !== today) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    state.streak = state.lastDay === todayStr(y) ? state.streak + 1 : 1;
    state.lastDay = today;
  }

  // Rozetler
  const earned = [];
  const give = (id) => { if (!state.badges.includes(id)) { state.badges.push(id); earned.push(BADGES.find((b) => b.id === id)); } };
  give('ilk');
  if ((s.id === 'artikel' || s.id === 'run') && s.maxCombo >= 10) give('kombo10');
  if (s.total >= 5 && s.mistakes === 0) give('mukemmel');
  if (Object.keys(GAMES).every((g) => state.played[g])) give('kasif');
  if (state.streak >= 3) give('seri3');
  if (levelOf(state.xp) >= 5) give('seviye5');
  save();
  const ended = okul('endSession', { completed: true, score: s.score });
  if (ended && ended.then) ended.then(() => renderMyWork());

  const titles = ['Weiter üben!', 'Gut gemacht!', 'Sehr gut!', 'Ausgezeichnet!'];
  $('#res-title').textContent = titles[stars];
  $('#res-mascot').innerHTML = maxSVG(stars >= 1 ? 'jump' : 'sad');
  $('#res-stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="--d:${0.25 + i * 0.22}s">${UI_ICONS.star}</span>`).join('');
  $('#res-text').innerHTML = `${s.total} sorudan <b>${s.correct}</b> doğru · <b>${s.score}</b> puan`
    + (newRecord && s.score > 0 ? '<span class="pill gold">Yeni rekor</span>' : '')
    + (s.maxCombo >= 3 ? `<span class="pill">En uzun seri ${s.maxCombo}</span>` : '');
  const newLvl = levelOf(state.xp);
  $('#res-level').innerHTML = newLvl > oldLvl ? ` · <b>Seviye ${newLvl}!</b>` : '';
  countUp($('#res-xp'), xpGain);
  $('#res-badges').innerHTML = earned.map((b) => `<div class="new-badge"><span class="seal-ring">${HAND_CIRCLE}<span class="emoji">${b.icon}</span></span><span>Yeni rozet<b>${b.name}</b></span></div>`).join('');
  show('screen-result');
  if (stars >= 2 || earned.length) confetti();
}

function countUp(node, to) {
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    node.textContent = '+' + Math.round(to * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(step);
  };
  node.textContent = '+0';
  requestAnimationFrame(step);
}

function confetti() {
  const c = $('#confetti');
  const colors = ['var(--ink)', 'var(--ink)', 'var(--amber)', 'var(--amber)', 'var(--seal)'];
  for (let i = 0; i < 60; i++) {
    const p = el('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = pick(colors);
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    if (Math.random() < .5) p.className = 'blot';
    c.appendChild(p);
  }
  setTimeout(() => { c.innerHTML = ''; }, 3200);
}

// Çoktan seçmeli soru için ortak yardımcı
function choiceButtons(container, options, correct, onDone, render = (o) => o) {
  const wrap = el('div', 'choices');
  let locked = false;
  options.forEach((o) => {
    const b = el('button', 'choice', render(o));
    b.onclick = () => {
      if (locked) return;
      locked = true;
      const ok = o === correct;
      b.classList.add(ok ? 'right' : 'wrong');
      if (!ok) [...wrap.children][options.indexOf(correct)].classList.add('right');
      onDone(ok, o);
    };
    wrap.appendChild(b);
  });
  container.appendChild(wrap);
  return wrap;
}

// ---------- OYUNLAR ----------
const GAMES = {
  // 0) Artikel Koşusu: sonsuz koşu. Kelime kapısı gelmeden doğru artikel şeridine geç.
  run: {
    name: 'Artikel Koşusu', de: 'Der Artikel-Lauf', code: 'DER · DIE · DAS', len: '3 can', skill: 'Artikeli hızlı ve otomatik tanıyabilme',
    desc: 'Max koşuyor! Kelime kapısı gelmeden doğru şeride geç: der, die ya da das. Hızlandıkça puan katlanır; kalkan ve kalp topla.',
    start(area, s) {
      const ARTS = ['der', 'die', 'das'];
      const MAX_X = 0.26;                 // Max'in ekrandaki yatay konumu (genişliğe oran)
      let lane = 1, lives = 3, shield = false, passed = 0;
      let travel = 4.2;                   // bir kapının ekranı geçme süresi (sn); doğru bildikçe azalır
      let words = shuffle(wordPool()), wi = 0;
      let objs = [], nextGateIn = 0.6, nextItemIn = 2.2, last = 0, raf = 0, over = false, groundX = 0;

      area.innerHTML = `
        <div class="runner" id="runner" tabindex="0" aria-label="Koşu alanı: yukarı/aşağı okla şerit değiştir">
          ${ARTS.map((a, i) => `<div class="lane lane-${a}" data-lane="${i}"><span class="lane-tag t-${a}">${a}</span></div>`).join('')}
          <div class="runner-max" id="rmax">${maxSVG('run')}</div>
          <div class="runner-objs" id="robjs"></div>
          <div class="runner-msg" id="rmsg" hidden></div>
        </div>
        <div class="art-buttons runner-buttons">
          ${ARTS.map((a, i) => `<button class="art ${a}" data-lane="${i}">${a}</button>`).join('')}
        </div>
        <p class="hint">Düğmeye bas, şeride dokun ya da ↑ ↓ okları. Doğru şeritte kapıdan geç!</p>`;
      const runner = $('#runner'), rmax = $('#rmax'), robjs = $('#robjs');
      const hearts = () => { $('#hud-info').innerHTML = `<span class="hearts">${'❤️'.repeat(lives)}${'🤍'.repeat(3 - lives)}${shield ? '🛡️' : ''}</span>`; };
      hearts();
      const W = () => runner.clientWidth;
      const laneTop = (i) => `calc(${i} * 100% / 3)`;
      const setLane = (i) => {
        if (over) return;
        lane = Math.max(0, Math.min(2, i));
        rmax.style.top = laneTop(lane);
        area.querySelectorAll('.runner-buttons .art').forEach((b) => b.classList.toggle('on', Number(b.dataset.lane) === lane));
      };
      setLane(1);
      area.querySelectorAll('[data-lane]').forEach((el) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); setLane(Number(el.dataset.lane)); }));
      const onKey = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') { setLane(lane - 1); e.preventDefault(); }
        else if (e.key === 'ArrowDown' || e.key === 's') { setLane(lane + 1); e.preventDefault(); }
        else if (['1', '2', '3'].includes(e.key)) setLane(Number(e.key) - 1);
      };
      document.addEventListener('keydown', onKey);
      let touchY = null;
      runner.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
      runner.addEventListener('touchend', (e) => {
        if (touchY == null) return;
        const dy = e.changedTouches[0].clientY - touchY; touchY = null;
        if (Math.abs(dy) > 30) setLane(lane + (dy > 0 ? 1 : -1));
      });

      const spawnGate = () => {
        if (wi >= words.length) { words = shuffle(wordPool()); wi = 0; }
        const w = words[wi++];
        const gold = passed > 4 && Math.random() < 0.12;
        const el = el_('div', 'rgate' + (gold ? ' gold' : ''), `
          <div class="rgate-card"><span class="emoji">${w.e}</span><b>${w.de}</b><small>${w.tr}</small></div>
          ${ARTS.map((a, i) => `<i class="rgate-door door-${a}" style="top:${laneTop(i)}"></i>`).join('')}`);
        robjs.appendChild(el);
        objs.push({ kind: 'gate', w, gold, el, x: 1.05 });
      };
      const spawnItem = () => {
        const r = Math.random();
        const kind = r < 0.12 && lives < 3 ? 'heart' : r < 0.24 && !shield ? 'shield' : 'coin';
        const ln = Math.floor(Math.random() * 3);
        const el = el_('div', 'pickup ' + kind, kind === 'heart' ? '❤' : kind === 'shield' ? '🛡' : '');
        el.style.top = laneTop(ln);
        robjs.appendChild(el);
        objs.push({ kind, lane: ln, el, x: 1.05 });
      };
      const flash = (text, cls) => {
        const m = $('#rmsg'); m.innerHTML = text; m.className = 'runner-msg ' + cls; m.hidden = false;
        clearTimeout(flash.t); flash.t = setTimeout(() => { m.hidden = true; }, cls === 'bad' ? 1400 : 700);
      };

      const hitGate = (o) => {
        const want = ARTS.indexOf(o.w.art), ok = lane === want;
        const item = { q: o.w.de, expected: o.w.art, given: ARTS[lane] };
        o.el.classList.add(ok ? 'pass' : 'fail');
        o.el.querySelector(`.door-${o.w.art}`).classList.add('right');
        speak(`${o.w.art} ${o.w.de}`, 1);
        if (ok) {
          answer(true, '', item, { quiet: true });
          if (o.gold) addScore(20);
          if (session.combo > 0 && session.combo % 5 === 0) addScore(10 * (session.combo / 5));
          travel = Math.max(1.7, travel - 0.11);
          flash(o.gold ? `+${o.gold ? 'x2 ' : ''}${o.w.art} ${o.w.de}` : `${o.w.art} ${o.w.de}` + (session.combo >= 3 ? ` · 🔥${session.combo}` : ''), 'ok');
          rmax.firstElementChild.classList.add('jump'); setTimeout(() => rmax.firstElementChild && rmax.firstElementChild.classList.remove('jump'), 700);
        } else if (shield) {
          shield = false; hearts();
          answer(false, '', item, { quiet: true });
          flash(`🛡 Kalkan korudu! Doğrusu: <b class="t-${o.w.art}">${o.w.art}</b> ${o.w.de}`, 'bad');
        } else {
          lives--; hearts();
          answer(false, '', item, { quiet: true });
          travel = Math.min(4.2, travel + 0.35);
          flash(`Doğrusu: <b class="t-${o.w.art}">${o.w.art}</b> ${o.w.de}`, 'bad');
          runner.classList.remove('hurt'); void runner.offsetWidth; runner.classList.add('hurt');
          if (lives <= 0) end();
        }
        passed++;
        setProgress(Math.min(1, passed / 40));
      };
      const pickUp = (o) => {
        if (o.lane !== lane) return false;
        if (o.kind === 'coin') { addScore(2); beepCoin(); }
        else if (o.kind === 'heart') { lives = Math.min(3, lives + 1); hearts(); flash('❤ +1 can', 'ok'); }
        else if (o.kind === 'shield') { shield = true; hearts(); flash('🛡 Kalkan!', 'ok'); }
        o.el.classList.add('got');
        return true;
      };

      const frame = (t) => {
        if (over) return;
        const dt = Math.min(0.05, last ? (t - last) / 1000 : 0); last = t;
        const v = 1 / travel;                               // ekran genişliği / sn
        groundX = (groundX + v * dt * W()) % 48;
        runner.style.setProperty('--ground', `${-groundX}px`);
        nextGateIn -= dt; nextItemIn -= dt;
        if (nextGateIn <= 0) { spawnGate(); nextGateIn = travel * 0.62 + Math.random() * 0.3; }
        if (nextItemIn <= 0) { spawnItem(); nextItemIn = travel * (0.35 + Math.random() * 0.4); }
        objs = objs.filter((o) => {
          o.x -= v * dt;
          o.el.style.transform = `translateX(${o.x * W()}px)`;
          if (!o.done && o.x <= MAX_X + 0.04) {
            o.done = true;
            if (o.kind === 'gate') hitGate(o); else if (pickUp(o)) { o.el.remove(); return false; }
          }
          if (o.x < -0.25) { o.el.remove(); return false; }
          return true;
        });
        raf = requestAnimationFrame(frame);
      };
      const end = () => {
        over = true;
        cancelAnimationFrame(raf);
        rmax.firstElementChild.classList.add('sad');
        later(s, finish, 1300);
      };
      s.cleanup = () => { over = true; cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
      runner.focus({ preventScroll: true });
      // Kısa geri sayım: 3-2-1
      let n = 3;
      flash('<b class="count">3</b>', 'count');
      const tick = setInterval(() => {
        n--;
        if (session !== s || !s.active) { clearInterval(tick); return; }
        if (n > 0) flash(`<b class="count">${n}</b>`, 'count');
        else { clearInterval(tick); flash('Los!', 'count'); raf = requestAnimationFrame(frame); }
      }, 650);
    },
  },

  // 1) Der-Die-Das: 60 saniyelik hız oyunu
  artikel: {
    name: 'Artikel Avı', de: 'Der, die oder das?', code: 'DER · DIE · DAS', len: '60 sn', skill: 'İsimlerin artikelini tanıyıp hızlıca seçebilme',
    desc: 'Kelime ve resmi çıkar, doğru artikele bas. Üst üste doğrular seriyi büyütür; yanlışta kural ipucu gelir.',
    start(area, s) {
      let time = 60;
      let words = shuffle(wordPool());
      let i = 0;
      const info = $('#hud-info');
      info.textContent = '60 sn';
      const timer = setInterval(() => {
        time--;
        info.textContent = time + ' sn';
        setProgress((60 - time) / 60);
        if (time <= 0) finish();
      }, 1000);
      s.cleanup = () => clearInterval(timer);

      area.innerHTML = `
        <div class="prompt big-word enter">
          <div class="emoji" id="a-emoji"></div>
          <div class="word"><span class="blank" id="a-blank">?</span> <span id="a-word"></span></div>
          <div class="tr" id="a-tr"></div>
        </div>
        <div class="art-buttons">
          <button class="art der" data-a="der">der</button>
          <button class="art die" data-a="die">die</button>
          <button class="art das" data-a="das">das</button>
        </div>
        <p class="hint"><b class="t-der">der</b> mavi · <b class="t-die">die</b> kırmızı · <b class="t-das">das</b> yeşil</p>`;
      let busy = false;
      const next = () => {
        if (i >= words.length) { words = shuffle(wordPool()); i = 0; }
        const w = words[i++];
        s.word = w;
        const card = area.querySelector('.prompt');
        card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
        $('#a-emoji').textContent = w.e;
        $('#a-word').textContent = w.de;
        $('#a-tr').textContent = w.tr;
        const blank = $('#a-blank');
        blank.textContent = '?';
        blank.className = 'blank';
        $('#feedback').hidden = true;
        busy = false;
      };
      area.querySelectorAll('.art').forEach((b) => {
        b.onclick = () => {
          if (busy || time <= 0) return;
          busy = true;
          const w = s.word;
          const ok = b.dataset.a === w.art;
          const blank = $('#a-blank');
          blank.textContent = w.art;
          blank.className = 'blank filled t-' + w.art;
          speak(`${w.art} ${w.de}`);
          answer(ok, ok ? '' : `Doğrusu: <b class="t-${w.art}">${w.art} ${w.de}</b><br><small>İpucu: ${artikelTipp(w)}</small>`,
            { q: w.de, expected: w.art, given: b.dataset.a });
          later(s, next, ok ? 450 : 1500);
        };
      });
      next();
    },
  },

  // 2) Hafıza kartları: Almanca kelime ↔ resim
  memory: {
    name: 'Hafıza Kartları', de: 'Das Gedächtnisspiel', code: 'WORTSCHATZ', len: '6 çift', skill: 'Kelimeyi artikeli ve anlamıyla eşleştirebilme',
    desc: 'Kartları çevir, Almanca kelimeyi resmiyle eşleştir. Ne kadar az hamle, o kadar çok yıldız.',
    start(area, s) {
      const words = shuffle(wordPool()).slice(0, 6);
      const cards = shuffle(words.flatMap((w, k) => [
        { k, type: 'de', html: `<b class="t-${w.art}">${w.art}</b> ${w.de}`, w },
        { k, type: 'pic', html: `<span class="emoji">${w.e}</span><small>${w.tr}</small>`, w },
      ]));
      let open = [];
      let found = 0;
      let moves = 0;
      $('#hud-info').textContent = '0 hamle';
      const grid = el('div', 'memory');
      cards.forEach((c) => {
        const b = el('button', 'mcard', `<div class="back">?</div><div class="front ${c.type}">${c.html}</div>`);
        b.onclick = () => {
          if (b.classList.contains('flip') || open.length === 2) return;
          b.classList.add('flip');
          if (c.type === 'de') speak(`${c.w.art} ${c.w.de}`);
          open.push({ b, c });
          if (open.length === 2) {
            moves++;
            $('#hud-info').textContent = `${moves} hamle`;
            const [x, y] = open;
            if (x.c.k === y.c.k) {
              found++;
              setProgress(found / words.length);
              x.b.classList.add('done'); y.b.classList.add('done');
              answer(true, `<b class="t-${x.c.w.art}">${x.c.w.art} ${x.c.w.de}</b> = ${x.c.w.tr}`,
                { q: `${x.c.w.art} ${x.c.w.de}`, expected: x.c.w.tr, given: x.c.w.tr });
              open = [];
              if (found === words.length) later(s, finish, 900);
            } else {
              // Yanlış eşleşme sadece seriyi bozar; doğruluk oranı hamle sayısına göre hesaplanır
              s.combo = 0;
              s.mistakes++;
              const de = x.c.type === 'de' ? x.c.w : y.c.w, pic = x.c.type === 'de' ? y.c.w : x.c.w;
              okul('record', x.c.type === y.c.type
                ? { q: `${x.c.w.de} / ${y.c.w.de}`, expected: 'kelime + resim', given: 'aynı türden iki kart', ok: false }
                : { q: `${de.art} ${de.de}`, expected: de.tr, given: pic.tr, ok: false });
              beep(false);
              setTimeout(() => { x.b.classList.remove('flip'); y.b.classList.remove('flip'); open = []; }, 900);
            }
            // İdeal: 6 çift → yanlış hamleler başarı oranını düşürür
            s.total = moves;
            s.correct = found;
          }
        };
        grid.appendChild(b);
      });
      area.appendChild(el('p', 'hint', 'Kartları çevir, Almanca kelimeyi doğru resimle eşleştir!'));
      area.appendChild(grid);
    },
  },

  // 3) Dinle ve bul
  listen: {
    name: 'Hör zu!', de: 'Hör gut zu', code: 'HÖREN', len: '10 soru', skill: 'Duyduğu kelimeyi tanıyıp anlamını bulabilme',
    desc: 'Max kelimeyi Almanca söyler, sen dört resimden doğrusunu seçersin. İstersen yavaş dinle.',
    start(area, s) {
      const ROUNDS = 10;
      const pool = shuffle(wordPool());
      let r = 0;
      const round = () => {
        if (r >= ROUNDS) return finish();
        setProgress(r / ROUNDS);
        $('#hud-info').textContent = `${r + 1}/${ROUNDS}`;
        const w = pool[r % pool.length];
        const others = shuffle(allWords().filter((x) => x.e !== w.e && x.tr !== w.tr)).slice(0, 3);
        const opts = shuffle([w, ...others]);
        area.innerHTML = '';
        const p = el('div', 'prompt');
        const play = el('button', 'speaker', ICONS.listen);
        play.setAttribute('aria-label', 'Tekrar dinle');
        play.onclick = () => speak(`${w.art} ${w.de}`);
        p.appendChild(play);
        const slow = el('button', 'link', 'Yavaş dinle');
        slow.onclick = () => speak(`${w.art} ${w.de}`, 0.55);
        p.appendChild(slow);
        if (!canSpeak && !hasClip(`${w.art} ${w.de}`)) p.appendChild(el('p', 'hint', `Tarayıcın sesi desteklemiyor. Kelime: <b>${w.art} ${w.de}</b>`));
        area.appendChild(p);
        const wrap = choiceButtons(area, opts, w, (ok, o) => {
          answer(ok, `<b class="t-${w.art}">${w.art} ${w.de}</b> = ${w.e} ${w.tr}`,
            { q: `${w.art} ${w.de}`, expected: w.tr, given: o.tr });
          r++;
          later(s, round, ok ? 900 : 1900);
        }, (o) => `<span class="emoji">${o.e}</span><small>${o.tr}</small>`);
        wrap.classList.add('pics');
        later(s, () => speak(`${w.art} ${w.de}`), 300);
      };
      round();
    },
  },

  // 4) Cümle treni: kelime vagonlarını doğru sıraya diz
  satz: {
    name: 'Cümle Treni', de: 'Der Satzzug', code: 'SATZBAU', len: '6 cümle', skill: 'Çekimli fiili ikinci sıraya koyarak cümle kurabilme',
    desc: 'Türkçesi verilen cümlenin kelime vagonlarını sırayla trene tak. Doğruysa tren yola çıkar.',
    start(area, s) {
      const list = shuffle(sentencePool()).slice(0, 6);
      let r = 0;
      const round = () => {
        if (r >= list.length) return finish();
        setProgress(r / list.length);
        $('#hud-info').textContent = `${r + 1}/${list.length}`;
        const sent = list[r];
        let tokens = shuffle(sent.de.map((t, i) => ({ t, i })));
        // Karıştırma sonucu doğru sıra çıkarsa tekrar karıştır
        while (tokens.length > 1 && tokens.every((x, i) => x.t === sent.de[i])) tokens = shuffle(tokens);
        const placed = [];
        area.innerHTML = `
          <div class="prompt"><p class="eyebrow">Almancaya çevir</p><div class="tr big">${sent.tr}</div></div>
          <div class="train" id="train"><span class="loco">${ICONS.satz}</span></div>
          <div class="wagons" id="wagons"></div>
          <div class="row"><button class="btn" id="check" disabled>Kontrol et</button></div>
          <p class="hint">İpucu: düz cümlede çekimli fiil hep <b>2. sırada</b> olur. Soru cümlesinde başa geçer.</p>`;
        const draw = () => {
          const train = $('#train'), wag = $('#wagons');
          train.querySelectorAll('.wagon').forEach((n) => n.remove());
          wag.innerHTML = '';
          placed.forEach((x, idx) => {
            const b = el('button', 'wagon', x.t);
            b.onclick = () => { placed.splice(idx, 1); tokens.push(x); draw(); };
            train.appendChild(b);
          });
          tokens.forEach((x, idx) => {
            const b = el('button', 'wagon loose', x.t);
            b.onclick = () => { tokens.splice(idx, 1); placed.push(x); draw(); };
            wag.appendChild(b);
          });
          $('#check').disabled = tokens.length > 0;
        };
        draw();
        $('#check').onclick = () => {
          const ok = placed.map((x) => x.t).join(' ') === sent.de.join(' ');
          const full = sent.de.join(' ');
          speak(full);
          $('#train').classList.add(ok ? 'go' : 'shake');
          answer(ok, ok ? full : `Doğrusu: <b>${full}</b>`,
            { q: sent.tr, expected: full, given: placed.map((x) => x.t).join(' ') });
          $('#check').disabled = true;
          r++;
          later(s, round, ok ? 1500 : 2800);
        };
      };
      round();
    },
  },

  // 5) Fiil çekimi
  verb: {
    name: 'Fiil Roketi', de: 'Die Verbrakete', code: 'KONJUGATION', len: '10 soru', skill: 'Fiili kişi zamirine göre çekimleyebilme',
    desc: 'Cümledeki boşluğa doğru fiil çekimini seç, roketi uçur. Yanlışta bütün çekim tablosu görünür.',
    start(area, s) {
      const ROUNDS = 10;
      let r = 0;
      const round = () => {
        if (r >= ROUNDS) return finish();
        setProgress(r / ROUNDS);
        $('#hud-info').textContent = `${r + 1}/${ROUNDS}`;
        const v = pick(VERBS);
        const p = Math.floor(Math.random() * 6);
        const correct = v.forms[p];
        const opts = shuffle([...new Set(v.forms)]).filter((f) => f !== correct).slice(0, 3);
        const options = shuffle([correct, ...opts]);
        const subj = p === 0 ? 'Ich' : PRONOUNS[p][0].toUpperCase() + PRONOUNS[p].slice(1);
        area.innerHTML = `
          <div class="prompt">
            <div class="rocket" id="rocket">${ICONS.verb}</div>
            <div class="word">${subj} <span class="blank">?</span> ${v.obj}.</div>
            <div class="tr"><b>${v.inf}</b> = ${v.tr} · <i>${PRONOUNS[p]}</i> = ${PRONOUN_TR[p]}</div>
          </div>`;
        choiceButtons(area, options, correct, (ok, chosen) => {
          const sentence = verbSentence(v, p);
          area.querySelector('.blank').textContent = correct;
          area.querySelector('.blank').classList.add('filled');
          if (ok) $('#rocket').classList.add('fly');
          speak(sentence);
          const table = PRONOUNS.map((pr, i) => `${pr} <b>${v.forms[i]}</b>`).join(' · ');
          answer(ok, ok ? sentence : `Doğrusu: <b>${sentence}</b><br><small>${table}</small>`,
            { q: `${subj} ___ ${v.obj} (${v.inf})`, expected: correct, given: chosen });
          r++;
          later(s, round, ok ? 1100 : 3000);
        });
      };
      round();
    },
  },
};

// ---------- Butonlar ----------
$('#btn-quit').onclick = () => {
  if (session) {
    if (session.active) okul('endSession', { completed: false, score: session.score });
    session.active = false;
    if (session.cleanup) session.cleanup();
  }
  renderHome();
};
$('#btn-home').onclick = renderHome;
$('#btn-again').onclick = () => startGame(session.id);
// confirm() bazı gömülü ortamlarda çalışmıyor → iki dokunuşla onay
$('#btn-reset').onclick = (e) => {
  const b = e.currentTarget;
  if (b.dataset.armed) {
    clearTimeout(b._t);
    delete b.dataset.armed;
    b.textContent = 'İlerlemeyi sıfırla';
    state = defaultState(); save(); renderHome();
    return;
  }
  b.dataset.armed = '1';
  b.textContent = 'Emin misin? XP, rozet ve rekorlar silinecek — onaylamak için tekrar dokun';
  b._t = setTimeout(() => { delete b.dataset.armed; b.textContent = 'İlerlemeyi sıfırla'; }, 4000);
};


// ---------- Çalışmalarım (yalnızca okul hesabıyla girişte) ----------
const escH = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function renderMyWork() {
  const box = $('#my-work');
  if (!box || !window.Okul || Okul.demo || !Okul.user || Okul.user.uid === 'local') return;
  let list;
  try { list = await Okul.mySessions('almanca', 40); } catch (e) { console.warn('Çalışmalar okunamadı', e); return; }
  box.hidden = false;
  const name = (g) => (GAMES[g] ? GAMES[g].name : g);
  const fmtSure = (sec) => (sec >= 60 ? `${Math.round(sec / 60)} dk` : `${Math.round(sec)} sn`);
  const weekAgo = Date.now() - 7 * 86400000;
  const week = list.filter((x) => x.endedAt && x.endedAt.getTime() >= weekAgo);
  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
  const wTotal = sum(week, 'total'), wCorrect = sum(week, 'correct');
  $('#my-summary').innerHTML = list.length
    ? `<div><small>Bu hafta</small><b>${fmtSure(sum(week, 'durationSec'))}</b></div>
       <div><small>Oyun</small><b>${week.length}</b></div>
       <div><small>Doğruluk</small><b>${wTotal ? '%' + Math.round((wCorrect / wTotal) * 100) : '–'}</b></div>`
    : '<p class="hint">Henüz kayıtlı oyunun yok. Bir oyun bitirdiğinde burada görünecek.</p>';
  $('#my-list').innerHTML = list.slice(0, 8).map((x) => `<li>
      <span class="my-game">${escH(name(x.game))}</span>
      <span class="my-meta">${x.endedAt ? x.endedAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''} · ${fmtSure(x.durationSec || 0)}${x.completed ? '' : ' · yarıda'}</span>
      <span class="my-score">${Number(x.correct) || 0}/${Number(x.total) || 0}</span></li>`).join('');
  // En çok yanlış yapılan sorular (son 40 oyun)
  const by = new Map();
  list.forEach((x) => (x.items || []).forEach((it) => {
    if (it.ok) return;
    const k = `${x.game}|${it.q}|${it.expected}`;
    const r = by.get(k) || { q: it.q, expected: it.expected, given: it.given, n: 0 };
    r.n++; by.set(k, r);
  }));
  const missed = [...by.values()].sort((a, b) => b.n - a.n).slice(0, 6);
  $('#my-missed').innerHTML = missed.length
    ? missed.map((m) => `<li><b>${escH(m.q)}</b> → <span class="my-ok">${escH(m.expected)}</span><small>Senin cevabın: ${escH(m.given || '–')} · ${m.n} kez</small></li>`).join('')
    : '<li class="hint">Yanlışın yok, harika!</li>';
}

// ---------- Başlangıç ----------
document.body.insertAdjacentHTML('afterbegin', INK_DEFS);
$('#brushline').innerHTML = BRUSHLINE;
document.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = UI_ICONS[n.dataset.icon]; });
$('#hero-max').innerHTML = maxSVG();
if ($('#gate-max')) $('#gate-max').innerHTML = maxSVG();
const HERO_LINES = MAX_SAETZE;
let heroLine = 0;
setInterval(() => {
  const b = $('#hero-bubble');
  if (!b || !$('#screen-home').classList.contains('active')) return;
  heroLine = (heroLine + 1) % HERO_LINES.length;
  b.classList.remove('say'); void b.offsetWidth;
  b.textContent = HERO_LINES[heroLine];
  b.classList.add('say');
}, 4000);

renderHome();
// Giriş tamamlanınca o hesabın ilerlemesini yükle. okul.js bir modül olduğu için bu
// dosyadan sonra çalışır; hazır olduğunda window.Okul tanımlanır.
(function waitForOkul(tries = 0) {
  if (window.Okul) Okul.onReady((u, progress) => {
    useProfile(u.uid, progress.almanca); renderMyWork();
    const card = $('#duel-card');
    if (card && !Okul.demo) {
      card.hidden = false;
      if (u.admin) { $('#duel-card-sub').textContent = 'Tahtaya kod yansıt, sınıf telefonlarla canlı yarışsın.'; $('#duel-card-go').textContent = 'Düello aç →'; }
    }
  });
  else if (tries < 100) setTimeout(() => waitForOkul(tries + 1), 50);
  else useProfile('local', null); // modül yüklenemedi: yerel kayıtla devam
})();
