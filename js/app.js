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
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
} catch (e) { /* gizli sekme vb. – kayıtsız devam */ }
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* yoksay */ } };

// Seviye n için gereken toplam XP: 50 * (n-1)^2  → 0, 50, 200, 450, 800...
const levelOf = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;
const xpFor = (lvl) => 50 * (lvl - 1) ** 2;

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

const canSpeak = 'speechSynthesis' in window;
let deVoice = null;
function loadVoice() {
  if (!canSpeak) return;
  const voices = speechSynthesis.getVoices();
  deVoice = voices.find((v) => v.lang === 'de-DE') || voices.find((v) => v.lang && v.lang.startsWith('de')) || null;
}
if (canSpeak) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
function speak(text, rate = 0.85) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
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
  [{ id: 'all', icon: '🌍', tr: 'Hepsi', de: 'Alles' }, ...THEMES].forEach((t) => {
    const b = el('button', 'chip' + (state.theme === t.id ? ' on' : ''), `<span>${t.icon}</span> ${t.tr}<small>${t.de}</small>`);
    b.onclick = () => { state.theme = t.id; save(); renderHome(); };
    tl.appendChild(b);
  });

  const gl = $('#game-list');
  gl.innerHTML = '';
  Object.entries(GAMES).forEach(([id, g]) => {
    const best = state.best[id];
    const card = el('button', `game-card c-${id}`, `
      <span class="g-icon">${g.icon}</span>
      <span class="g-name">${g.name}</span>
      <span class="g-desc">${g.desc}</span>
      <span class="g-best">${best != null ? '🏆 Rekor: ' + best : 'Yeni!'}</span>`);
    card.onclick = () => startGame(id);
    gl.appendChild(card);
  });

  const bl = $('#badge-list');
  bl.innerHTML = '';
  BADGES.forEach((b) => {
    const has = state.badges.includes(b.id);
    bl.appendChild(el('div', 'badge' + (has ? ' got' : ''), `<span>${has ? b.icon : '🔒'}</span><b>${b.name}</b><small>${b.desc}</small>`));
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
  g.start($('#game-area'), session);
}

// Oyun bittikten / çıkıldıktan sonra bekleyen zamanlayıcılar çalışmasın
const later = (s, fn, ms) => setTimeout(() => { if (session === s && s.active) fn(); }, ms);

function setProgress(p) { $('#hud-progress').style.width = `${Math.min(100, p * 100)}%`; }
function addScore(n) { session.score += n; $('#hud-score').textContent = session.score; }

// Doğru/yanlış kaydı + kısa geri bildirim
function answer(ok, detail) {
  session.total++;
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
  const fb = $('#feedback');
  fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
  fb.innerHTML = `<b>${ok ? '🐕 ' + pick(MASKOT_SOZLERI.dogru) : '🐕 ' + pick(MASKOT_SOZLERI.yanlis)}</b>`
    + (session.combo >= 3 ? ` <span class="combo">🔥 x${session.combo}</span>` : '')
    + (detail ? `<div>${detail}</div>` : '');
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
  if (s.id === 'artikel' && s.maxCombo >= 10) give('kombo10');
  if (s.total >= 5 && s.mistakes === 0) give('mukemmel');
  if (Object.keys(GAMES).every((g) => state.played[g])) give('kasif');
  if (state.streak >= 3) give('seri3');
  if (levelOf(state.xp) >= 5) give('seviye5');
  save();

  const titles = ['Weiter üben!', 'Gut gemacht!', 'Sehr gut!', 'Ausgezeichnet!'];
  $('#res-title').textContent = titles[stars];
  $('#res-mascot').textContent = stars >= 2 ? '🐕‍🦺' : '🐕';
  $('#res-stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('');
  $('#res-text').innerHTML = `${s.total} sorudan <b>${s.correct}</b> doğru · Puan: <b>${s.score}</b>`
    + (newRecord && s.score > 0 ? '<br>🏆 Yeni rekor!' : '')
    + (s.maxCombo >= 3 ? `<br>En uzun seri: 🔥 ${s.maxCombo}` : '');
  const newLvl = levelOf(state.xp);
  $('#res-xp').innerHTML = `+${xpGain} XP` + (newLvl > oldLvl ? ` · <b>Seviye ${newLvl}! 🎊</b>` : '');
  $('#res-badges').innerHTML = earned.map((b) => `<div class="new-badge">${b.icon} Yeni rozet: <b>${b.name}</b></div>`).join('');
  show('screen-result');
  if (stars >= 2 || earned.length) confetti();
}

function confetti() {
  const c = $('#confetti');
  const colors = ['#000', '#dd0000', '#ffcc00', '#3b82f6', '#22c55e'];
  for (let i = 0; i < 60; i++) {
    const p = el('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = pick(colors);
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
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
      onDone(ok);
    };
    wrap.appendChild(b);
  });
  container.appendChild(wrap);
  return wrap;
}

// ---------- OYUNLAR ----------
const GAMES = {
  // 1) Der-Die-Das: 60 saniyelik hız oyunu
  artikel: {
    icon: '🎯', name: 'Artikel Avı', desc: 'der, die, das? 60 saniyede en çok doğruyu bul!',
    start(area, s) {
      let time = 60;
      let words = shuffle(wordPool());
      let i = 0;
      const info = $('#hud-info');
      info.textContent = '⏱ 60';
      const timer = setInterval(() => {
        time--;
        info.textContent = '⏱ ' + time;
        setProgress((60 - time) / 60);
        if (time <= 0) finish();
      }, 1000);
      s.cleanup = () => clearInterval(timer);

      area.innerHTML = `
        <div class="prompt big-word">
          <div class="emoji" id="a-emoji"></div>
          <div class="word"><span class="blank" id="a-blank">?</span> <span id="a-word"></span></div>
          <div class="tr" id="a-tr"></div>
        </div>
        <div class="art-buttons">
          <button class="art der" data-a="der">der</button>
          <button class="art die" data-a="die">die</button>
          <button class="art das" data-a="das">das</button>
        </div>
        <p class="hint">Renk kodu: <b class="t-der">der = mavi</b>, <b class="t-die">die = kırmızı</b>, <b class="t-das">das = yeşil</b></p>`;
      let busy = false;
      const next = () => {
        if (i >= words.length) { words = shuffle(wordPool()); i = 0; }
        const w = words[i++];
        s.word = w;
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
          answer(ok, ok ? '' : `Doğrusu: <b class="t-${w.art}">${w.art} ${w.de}</b><br><small>💡 ${artikelTipp(w)}</small>`);
          later(s, next, ok ? 450 : 1500);
        };
      });
      next();
    },
  },

  // 2) Hafıza kartları: Almanca kelime ↔ resim
  memory: {
    icon: '🃏', name: 'Hafıza Kartları', desc: 'Almanca kelimeyi resmiyle eşleştir.',
    start(area, s) {
      const words = shuffle(wordPool()).slice(0, 6);
      const cards = shuffle(words.flatMap((w, k) => [
        { k, type: 'de', html: `<b class="t-${w.art}">${w.art}</b> ${w.de}`, w },
        { k, type: 'pic', html: `<span class="emoji">${w.e}</span><small>${w.tr}</small>`, w },
      ]));
      let open = [];
      let found = 0;
      let moves = 0;
      $('#hud-info').textContent = '🃏 0 hamle';
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
            $('#hud-info').textContent = `🃏 ${moves} hamle`;
            const [x, y] = open;
            if (x.c.k === y.c.k) {
              found++;
              setProgress(found / words.length);
              x.b.classList.add('done'); y.b.classList.add('done');
              answer(true, `<b class="t-${x.c.w.art}">${x.c.w.art} ${x.c.w.de}</b> = ${x.c.w.tr}`);
              open = [];
              if (found === words.length) later(s, finish, 900);
            } else {
              // Yanlış eşleşme sadece seriyi bozar; doğruluk oranı hamle sayısına göre hesaplanır
              s.combo = 0;
              s.mistakes++;
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
    icon: '👂', name: 'Hör zu!', desc: 'Kelimeyi dinle, doğru resmi seç.',
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
        const play = el('button', 'speaker', '🔊');
        play.onclick = () => speak(`${w.art} ${w.de}`);
        p.appendChild(play);
        const slow = el('button', 'link', '🐢 Yavaş dinle');
        slow.onclick = () => speak(`${w.art} ${w.de}`, 0.55);
        p.appendChild(slow);
        if (!canSpeak) p.appendChild(el('p', 'hint', `Tarayıcın sesi desteklemiyor. Kelime: <b>${w.art} ${w.de}</b>`));
        area.appendChild(p);
        const wrap = choiceButtons(area, opts, w, (ok) => {
          answer(ok, `<b class="t-${w.art}">${w.art} ${w.de}</b> = ${w.e} ${w.tr}`);
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
    icon: '🚂', name: 'Cümle Treni', desc: 'Vagonları sıraya diz, cümleyi kur.',
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
          <div class="prompt"><div class="tr big">🇹🇷 ${sent.tr}</div></div>
          <div class="train" id="train"><span class="loco">🚂</span></div>
          <div class="wagons" id="wagons"></div>
          <div class="row"><button class="btn" id="check" disabled>Kontrol et ✔</button></div>
          <p class="hint">💡 Düz cümlede çekimli fiil hep <b>2. sırada</b> olur. Soru cümlesinde başa geçer.</p>`;
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
          answer(ok, ok ? full : `Doğrusu: <b>${full}</b>`);
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
    icon: '🚀', name: 'Fiil Roketi', desc: 'Doğru fiil çekimini seç, roketi uçur!',
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
            <div class="rocket" id="rocket">🚀</div>
            <div class="word">${subj} <span class="blank">?</span> ${v.obj}.</div>
            <div class="tr"><b>${v.inf}</b> = ${v.tr} · <i>${PRONOUNS[p]}</i> = ${PRONOUN_TR[p]}</div>
          </div>`;
        choiceButtons(area, options, correct, (ok) => {
          const sentence = `${subj} ${correct} ${v.obj}.`;
          area.querySelector('.blank').textContent = correct;
          area.querySelector('.blank').classList.add('filled');
          if (ok) $('#rocket').classList.add('fly');
          speak(sentence);
          const table = PRONOUNS.map((pr, i) => `${pr} <b>${v.forms[i]}</b>`).join(' · ');
          answer(ok, ok ? sentence : `Doğrusu: <b>${sentence}</b><br><small>${table}</small>`);
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
  if (session) { session.active = false; if (session.cleanup) session.cleanup(); }
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

renderHome();
