// Sınıf Düellosu: Kahoot tarzı canlı yarışma (Firestore ile).
// Öğretmen (yönetici) düello açar, kodu tahtaya yansıtır; öğrenciler telefondan katılır.
//   duels/{kod}                    durum, sıradaki soru (doğru cevap OLMADAN), başlangıç zamanı, cevap dağılımı
//   duels/{kod}/secret/key         soruların doğru cevapları (yalnızca öğretmen okur)
//   duels/{kod}/players/{uid}      ad, puan, son soru sonucu (puanı yalnızca öğretmen yazar)
//   duels/{kod}/answers/{qi_uid}   öğrencinin cevabı + sunucu saati (bir kez yazılır)
// Puan: doğru cevap 500 + hız bonusu (en fazla 500). Süreyi sunucu saati ölçer.

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const SHAPES = ['▲', '◆', '●', '■'];
const ART_IDX = { der: 0, die: 1, das: 2 };

const views = ['v-demo', 'v-start', 'v-host', 'v-player'];
// /v2/ sayfaları <base href="../"> kullanır; kendi aralarındaki bağlantılar bu klasöre göre kurulur
const HOME = () => window.OKUL_HOME_URL || '';
const show = (id) => views.forEach((v) => { $('#' + v).hidden = v !== id; });

// ---------- Ses (kayıtlı dosya varsa onu çal) ----------
const clip = new Audio();
function speak(text) {
  const src = (typeof AUDIO_CLIPS !== 'undefined' && AUDIO_CLIPS[text]) || null;
  try {
    if (src) { clip.src = src; clip.play().catch(() => {}); return; }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; u.rate = 0.9; speechSynthesis.speak(u);
    }
  } catch (e) { /* ses yok */ }
}

// ---------- Soru üretimi (js/data.js'teki içerikten) ----------
function makeQuestions({ theme, count, kinds }) {
  const themes = theme === 'all' ? THEMES : THEMES.filter((t) => t.id === theme);
  const words = shuffle(themes.flatMap((t) => t.words));
  const allWords = THEMES.flatMap((t) => t.words);
  const out = [];
  let wi = 0;
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    if (kind === 'fiil') {
      const v = pick(VERBS), p = Math.floor(Math.random() * 6);
      const correct = v.forms[p];
      const opts = shuffle([correct, ...shuffle([...new Set(v.forms)].filter((f) => f !== correct)).slice(0, 3)]);
      const subj = PRONOUNS[p][0].toUpperCase() + PRONOUNS[p].slice(1);
      out.push({ kind, prompt: `${subj} ___ ${v.obj}.`, sub: `${v.inf} = ${v.tr}`, emoji: '🚀', options: opts, answer: opts.indexOf(correct), say: verbSentence(v, p) });
      continue;
    }
    const w = words[wi++ % words.length];
    if (kind === 'artikel') {
      out.push({ kind, prompt: `___ ${w.de}`, sub: w.tr, emoji: w.e, options: ['der', 'die', 'das'], answer: ART_IDX[w.art], say: `${w.art} ${w.de}` });
    } else if (kind === 'anlam') {
      const others = shuffle(allWords.filter((x) => x.tr !== w.tr)).slice(0, 3).map((x) => x.tr);
      const opts = shuffle([w.tr, ...others]);
      out.push({ kind, prompt: `${w.art} ${w.de}`, sub: 'Türkçesi ne?', emoji: '', options: opts, answer: opts.indexOf(w.tr), say: `${w.art} ${w.de}` });
    } else {
      const right = `${w.art} ${w.de}`;
      const wrongArt = `${pick(['der', 'die', 'das'].filter((a) => a !== w.art))} ${w.de}`;
      const others = shuffle(allWords.filter((x) => x.de !== w.de)).slice(0, 2).map((x) => `${x.art} ${x.de}`);
      const opts = shuffle([right, wrongArt, ...others]);
      out.push({ kind: 'ters', prompt: w.tr, sub: 'Almancası hangisi?', emoji: w.e, options: opts, answer: opts.indexOf(right), say: right });
    }
  }
  return out;
}
const publicQ = (q) => ({ kind: q.kind, prompt: q.prompt, sub: q.sub, emoji: q.emoji, options: q.options });

function optionsHTML(q, { reveal, mine, counts, total } = {}) {
  return q.options.map((o, i) => {
    const color = q.kind === 'artikel' ? ['der', 'die', 'das'][i] : `o${i}`;
    const cls = ['qopt', color, reveal != null ? (i === reveal ? 'right' : 'dim') : '', mine === i ? 'mine' : ''].join(' ');
    const bar = counts ? `<i class="bar" style="width:${total ? Math.round((counts[i] / total) * 100) : 0}%"></i><em>${counts[i]}</em>` : '';
    return `<button type="button" class="${cls}" data-i="${i}"><span class="shape">${SHAPES[i]}</span><span class="otext">${esc(o)}</span>${bar}</button>`;
  }).join('');
}
const promptHTML = (q) => `${q.emoji ? `<span class="emoji">${q.emoji}</span>` : ''}<b>${esc(q.prompt)}</b>${q.sub ? `<small>${esc(q.sub)}</small>` : ''}`;

function confetti() {
  const c = $('#confetti');
  const colors = ['var(--ink)', 'var(--amber)', 'var(--seal)', 'var(--der)', 'var(--das)'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = pick(colors);
    p.style.animationDelay = Math.random() * 0.8 + 's';
    if (Math.random() < 0.5) p.className = 'blot';
    c.appendChild(p);
  }
  setTimeout(() => { c.innerHTML = ''; }, 3600);
}

// ---------- ÖĞRETMEN ----------
async function createDuel(fb, user) {
  const kinds = ['artikel', 'anlam', 'ters', 'fiil'].filter((k) => $('#k-' + k).checked);
  if (!kinds.length) { $('#host-msg').textContent = 'En az bir soru türü seçin.'; return; }
  const settings = { theme: $('#h-theme').value, count: Number($('#h-count').value), seconds: Number($('#h-secs').value), kinds };
  const questions = makeQuestions(settings);
  $('#host-msg').textContent = 'Düello açılıyor…';
  let code;
  for (let tries = 0; tries < 8; tries++) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const snap = await fb.getDoc(fb.doc(fb.db, 'duels', code)).catch(() => null);
    if (snap && !snap.exists()) break;
  }
  const ref = fb.doc(fb.db, 'duels', code);
  await fb.setDoc(ref, {
    host: user.uid, hostEmail: user.email, hostName: user.name || '', state: 'lobby', qi: -1, total: questions.length,
    seconds: settings.seconds, theme: settings.theme, q: null, qStartedAt: null, reveal: null, createdAt: fb.serverTimestamp(),
  });
  await fb.setDoc(fb.doc(fb.db, 'duels', code, 'secret', 'key'), { questions });
  history.replaceState(null, '', `?host=${code}`);
  runHost(fb, code, questions, settings.seconds);
}

async function runHost(fb, code, questions, seconds) {
  show('v-host');
  const ref = fb.doc(fb.db, 'duels', code);
  const joinUrl = new URL(HOME() + 'duello.html', document.baseURI).href;
  $('#h-code').textContent = code.replace(/(\d{3})(\d{3})/, '$1 $2');
  $('#h-url').textContent = joinUrl.replace(/^https?:\/\//, '');
  const drawQR = () => { if (window.QRCode) { $('#h-qr').innerHTML = ''; new QRCode($('#h-qr'), { text: `${joinUrl}?kod=${code}`, width: 148, height: 148, colorDark: '#171411', colorLight: '#fffcf4' }); } };
  drawQR(); if (!window.QRCode) setTimeout(drawQR, 1500);

  let players = [];
  let qi = -1, timer = null, revealed = false, answeredN = 0, unsubAns = null;
  fb.onSnapshot(fb.collection(fb.db, 'duels', code, 'players'), (snap) => {
    players = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    $('#h-players-n').textContent = players.length;
    $('#h-start').disabled = !players.length;
    if (qi < 0) {
      $('#h-names').innerHTML = players.length
        ? players.map((p) => `<span class="name-chip">${esc(p.name || p.email)}</span>`).join('')
        : '<p class="muted">Öğrenciler katıldıkça adları burada belirir…</p>';
    }
  });

  const leaderHTML = (n = 5) => {
    const top = players.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, n);
    return `<h3>Sıralama</h3><ol>${top.map((p) => `<li><span>${esc(p.name || p.email)}</span><b>${p.score || 0}</b></li>`).join('')}</ol>`;
  };

  const ask = async () => {
    qi++; revealed = false; answeredN = 0;
    const q = questions[qi];
    $('#h-lobby').hidden = true; $('#h-question').hidden = false; $('#h-leader').hidden = true;
    $('#h-next').hidden = true; $('#h-reveal').hidden = false;
    $('#h-phase').textContent = 'Soru';
    $('#h-qn').textContent = `Soru ${qi + 1} / ${questions.length}`;
    $('#h-prompt').innerHTML = promptHTML(q);
    $('#h-options').innerHTML = optionsHTML(q);
    $('#h-answered').textContent = `0 / ${players.length} cevap`;
    await fb.updateDoc(ref, { state: 'question', qi, q: publicQ(q), qStartedAt: fb.serverTimestamp(), reveal: null });
    if (unsubAns) unsubAns();
    unsubAns = fb.onSnapshot(fb.query(fb.collection(fb.db, 'duels', code, 'answers'), fb.where('qi', '==', qi)), (snap) => {
      answeredN = snap.size;
      $('#h-answered').textContent = `${answeredN} / ${players.length} cevap`;
      if (players.length && answeredN >= players.length) reveal();
    });
    let left = seconds;
    $('#h-timer').textContent = left;
    clearInterval(timer);
    timer = setInterval(() => { left--; $('#h-timer').textContent = Math.max(0, left); if (left <= 0) reveal(); }, 1000);
  };

  const reveal = async () => {
    if (revealed) return;
    revealed = true;
    clearInterval(timer);
    $('#h-timer').textContent = '✓';
    if (unsubAns) { unsubAns(); unsubAns = null; }
    $('#h-reveal').hidden = true;
    $('#h-phase').textContent = 'Sonuç';
    await new Promise((r) => setTimeout(r, 1200));   // son saniyede gönderilen cevaplar için kısa bekleme
    const q = questions[qi];
    const [dsnap, asnap] = await Promise.all([fb.getDoc(ref), fb.getDocs(fb.query(fb.collection(fb.db, 'duels', code, 'answers'), fb.where('qi', '==', qi)))]);
    const startMs = dsnap.data().qStartedAt?.toMillis?.() || Date.now();
    const counts = q.options.map(() => 0);
    const byUid = new Map();
    asnap.docs.forEach((d) => {
      const a = d.data();
      if (a.choice >= 0 && a.choice < counts.length) counts[a.choice]++;
      byUid.set(a.uid, a);
    });
    const batch = fb.writeBatch(fb.db);
    players.forEach((p) => {
      const a = byUid.get(p.uid);
      const ok = !!a && a.choice === q.answer;
      const ms = a && a.at?.toMillis ? Math.max(0, a.at.toMillis() - startMs) : seconds * 1000;
      const pts = ok ? 500 + Math.round(500 * Math.max(0, 1 - ms / (seconds * 1000))) : 0;
      const streak = ok ? (p.streak || 0) + 1 : 0;
      const bonus = ok && streak >= 3 ? 100 : 0;
      p.score = (p.score || 0) + pts + bonus; p.streak = streak;
      batch.update(fb.doc(fb.db, 'duels', code, 'players', p.uid), {
        score: p.score, streak, last: { qi, ok, pts: pts + bonus, choice: a ? a.choice : -1 },
      });
    });
    batch.update(ref, { state: 'reveal', reveal: { correct: q.answer, counts } });
    await batch.commit();
    $('#h-options').innerHTML = optionsHTML(q, { reveal: q.answer, counts, total: asnap.size });
    $('#h-leader').innerHTML = leaderHTML(); $('#h-leader').hidden = false;
    speak(q.say);
    if (qi + 1 < questions.length) { $('#h-next').textContent = 'Sonraki soru'; }
    else { $('#h-next').textContent = 'Sonuçları göster'; }
    $('#h-next').hidden = false;
  };

  const finish = async () => {
    await fb.updateDoc(ref, { state: 'end', q: null });
    $('#h-question').hidden = true; $('#h-end').hidden = false; $('#h-phase').textContent = 'Bitti';
    const ranked = players.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    const place = (p, n, cls) => (p ? `<div class="place ${cls}"><b>${esc(p.name || p.email)}</b><span>${p.score || 0}</span><i>${n}</i></div>` : `<div class="place ${cls} empty"><i>${n}</i></div>`);
    $('#h-podium').innerHTML = place(ranked[1], 2, 'p2') + place(ranked[0], 1, 'p1') + place(ranked[2], 3, 'p3');
    $('#h-final').innerHTML = ranked.map((p) => `<li><span>${esc(p.name || p.email)}</span><b>${p.score || 0}</b></li>`).join('');
    $('#h-csv').onclick = () => {
      const rows = [['Sıra', 'Ad', 'E-posta', 'Puan'], ...ranked.map((p, i) => [i + 1, p.name, p.email, p.score || 0])];
      const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `duello-${code}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    };
    confetti();
  };

  $('#h-start').onclick = () => { $('#h-start').disabled = true; ask(); };
  $('#h-reveal').onclick = () => reveal();
  $('#h-next').onclick = () => (qi + 1 < questions.length ? ask() : finish());
}

// ---------- ÖĞRENCİ ----------
async function joinDuel(fb, user, code) {
  code = String(code || '').replace(/\D/g, '');
  const msg = $('#join-msg');
  if (code.length !== 6) { msg.textContent = 'Kod 6 haneli olmalı.'; return; }
  msg.textContent = 'Bağlanılıyor…';
  const ref = fb.doc(fb.db, 'duels', code);
  let snap;
  try { snap = await fb.getDoc(ref); } catch (e) { msg.textContent = `Bağlanılamadı (${e.code || e.message}).`; return; }
  if (!snap.exists()) { msg.textContent = 'Bu kodla bir düello bulunamadı. Kodu kontrol edin.'; return; }
  if (snap.data().state === 'end') { msg.textContent = 'Bu düello bitmiş.'; return; }
  const pref = fb.doc(fb.db, 'duels', code, 'players', user.uid);
  const existing = await fb.getDoc(pref);
  if (!existing.exists()) {
    try { await fb.setDoc(pref, { name: user.name || user.email, email: user.email, score: 0, streak: 0, joinedAt: fb.serverTimestamp() }); }
    catch (e) { msg.textContent = `Katılınamadı (${e.code || e.message}).`; return; }
  }
  history.replaceState(null, '', `?kod=${code}`);
  runPlayer(fb, user, code);
}

function runPlayer(fb, user, code) {
  show('v-player');
  $('#p-code').textContent = `Düello ${code.replace(/(\d{3})(\d{3})/, '$1 $2')}`;
  $('#p-max').innerHTML = maxSVG('jump');
  let me = { score: 0 }, players = [], curQi = -1, myChoice = -1, timer = null, d = {}, sessionStarted = false;
  const rankOf = () => 1 + players.filter((p) => (p.score || 0) > (me.score || 0)).length;

  fb.onSnapshot(fb.collection(fb.db, 'duels', code, 'players'), (snap) => {
    players = snap.docs.map((x) => ({ uid: x.id, ...x.data() }));
    me = players.find((p) => p.uid === user.uid) || me;
    $('#p-score').textContent = `${me.score || 0} puan`;
    if (d.state === 'reveal') renderReveal();
  });

  const renderReveal = () => {
    if (!d.q || !d.reveal) return;
    const last = me.last && me.last.qi === d.qi ? me.last : null;
    const ok = last && last.ok;
    $('#p-question').hidden = true;
    $('#p-result').hidden = false;
    $('#p-result').className = 'p-result ' + (ok ? 'ok' : 'bad');
    $('#p-result').innerHTML = `
      <div class="p-max">${maxSVG(ok ? 'jump' : 'sad')}</div>
      <h2 class="duel-title center">${ok ? 'Doğru!' : myChoice < 0 ? 'Süre doldu' : 'Yanlış'}</h2>
      <p class="center big-pts">${ok ? `+${last.pts}` : '+0'}</p>
      <p class="center">Doğrusu: <b>${esc(d.q.options[d.reveal.correct])}</b></p>
      <p class="center muted">Sıralama: <b>${rankOf()}</b> / ${players.length}</p>`;
  };

  fb.onSnapshot(fb.doc(fb.db, 'duels', code), (snap) => {
    d = snap.data() || {};
    if (d.state === 'lobby') {
      $('#p-wait').hidden = false; $('#p-question').hidden = true; $('#p-result').hidden = true;
      $('#p-wait-title').textContent = 'Katıldın!';
      $('#p-wait-sub').textContent = 'Öğretmen başlatınca soru burada çıkacak.';
    } else if (d.state === 'question' && d.q && d.qi !== curQi) {
      curQi = d.qi; myChoice = -1;
      if (!sessionStarted && window.Okul) { Okul.startSession({ app: 'almanca', game: 'duello', theme: d.theme || '' }); sessionStarted = true; }
      $('#p-wait').hidden = true; $('#p-result').hidden = true; $('#p-question').hidden = false;
      $('#p-qn').textContent = `Soru ${d.qi + 1} / ${d.total}`;
      $('#p-prompt').innerHTML = promptHTML(d.q);
      $('#p-options').innerHTML = optionsHTML(d.q);
      $('#p-options').querySelectorAll('.qopt').forEach((b) => {
        b.onclick = async () => {
          if (myChoice >= 0) return;
          myChoice = Number(b.dataset.i);
          b.classList.add('mine');
          $('#p-options').classList.add('locked');
          try {
            await fb.setDoc(fb.doc(fb.db, 'duels', code, 'answers', `${d.qi}_${user.uid}`), { uid: user.uid, qi: d.qi, choice: myChoice, at: fb.serverTimestamp() });
          } catch (e) {
            $('#p-qn').textContent = e.code === 'permission-denied' ? 'Süre doldu, cevap alınmadı.' : `Gönderilemedi (${e.code || e.message})`;
          }
        };
      });
      $('#p-options').classList.remove('locked');
      let left = d.seconds;
      $('#p-timer').textContent = left;
      clearInterval(timer);
      timer = setInterval(() => { left--; $('#p-timer').textContent = Math.max(0, left); if (left <= 0) { clearInterval(timer); $('#p-options').classList.add('locked'); } }, 1000);
    } else if (d.state === 'reveal') {
      clearInterval(timer);
      if (window.Okul && d.q && d.reveal && !renderReveal.recorded?.has(d.qi)) {
        renderReveal.recorded = renderReveal.recorded || new Set();
        renderReveal.recorded.add(d.qi);
        Okul.record({ q: d.q.prompt, expected: d.q.options[d.reveal.correct], given: myChoice >= 0 ? d.q.options[myChoice] : '(süre doldu)', ok: myChoice === d.reveal.correct });
      }
      renderReveal();
    } else if (d.state === 'end') {
      clearInterval(timer);
      $('#p-question').hidden = true; $('#p-wait').hidden = true; $('#p-result').hidden = false;
      const r = rankOf();
      $('#p-result').className = 'p-result end';
      $('#p-result').innerHTML = `
        <div class="p-max">${maxSVG(r <= 3 ? 'jump' : '')}</div>
        <h2 class="duel-title center">${r === 1 ? 'Birincisin! 🏆' : r <= 3 ? `${r}. oldun!` : 'Düello bitti'}</h2>
        <p class="center big-pts">${me.score || 0} puan</p>
        <p class="center muted">Sıralama: <b>${r}</b> / ${players.length}</p>
        <div class="row"><a class="btn" href="${HOME() || './'}">Oyunlara dön</a></div>`;
      if (r <= 3) confetti();
      if (window.Okul && sessionStarted) { Okul.endSession({ completed: true, score: me.score || 0 }); sessionStarted = false; }
    }
  });
}

// ---------- Başlat ----------
const waitOkul = () => new Promise((res) => { const t = () => (window.Okul ? res(window.Okul) : setTimeout(t, 50)); t(); });
waitOkul().then((Okul) => Okul.onReady((user) => {
  if (Okul.demo) { show('v-demo'); return; }
  const fb = Okul.fb;
  const params = new URLSearchParams(location.search);
  show('v-start');
  if (user.admin) {
    $('#host-box').hidden = false;
    $('#h-theme').innerHTML = `<option value="all">Bütün temalar</option>` + THEMES.map((t) => `<option value="${t.id}">${esc(t.tr)} · ${esc(t.de)}</option>`).join('');
    $('#host-form').onsubmit = (e) => { e.preventDefault(); createDuel(fb, user).catch((err) => { $('#host-msg').textContent = `Açılamadı (${err.code || err.message}).`; }); };
  }
  $('#join-form').onsubmit = (e) => { e.preventDefault(); joinDuel(fb, user, $('#join-code').value); };
  const host = params.get('host');
  if (host && user.admin) {
    // Sayfa yenilendiyse: öğretmen kendi düellosuna geri döner
    Promise.all([fb.getDoc(fb.doc(fb.db, 'duels', host)), fb.getDoc(fb.doc(fb.db, 'duels', host, 'secret', 'key'))]).then(([d, k]) => {
      if (d.exists() && k.exists() && d.data().host === user.uid && d.data().state === 'lobby') runHost(fb, host, k.data().questions, d.data().seconds);
    }).catch(() => {});
  }
  const kod = params.get('kod');
  if (kod) { $('#join-code').value = kod; joinDuel(fb, user, kod); }
}));
