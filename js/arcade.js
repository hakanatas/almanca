// Atari oyunları: Artikel Koşusu, Artikel Ninja, Uçan Max, Artikel Yılanı.
// Hepsi tuval (canvas) üzerinde çizilir; Max ise gardırobuyla birlikte SVG olarak üstte durur.
// app.js'ten önce yüklenir; answer, addScore, finish, speak gibi yardımcıları oyun başlayınca kullanır.

const ARC = (() => {
  const ARTS = ['der', 'die', 'das'];
  const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  const BRUSH = (px) => `${Math.round(px)}px "Caveat Brush", "Comic Sans MS", cursive`;
  const SERIF = (px, it = false) => `${it ? 'italic ' : ''}${Math.round(px)}px Fraunces, Georgia, serif`;
  const MONO = (px) => `${Math.round(px)}px "JetBrains Mono", ui-monospace, monospace`;
  const EMO = (px) => `${Math.round(px)}px ${EMOJI_FONT}`;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let C = null;
  const colors = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, d) => (cs.getPropertyValue(n).trim() || d);
    C = { ink: v('--ink', '#171411'), paper: v('--paper', '#f1eadc'), paper2: v('--paper-2', '#e9dfcb'),
      der: v('--der', '#2f5c8f'), die: v('--die', '#c4432b'), das: v('--das', '#4d7a3a'),
      amber: v('--amber', '#e8a33d'), amberDeep: v('--amber-deep', '#b8741a'), seal: v('--seal', '#c4432b'),
      soft: 'rgba(23,20,17,.55)', faint: 'rgba(23,20,17,.14)', hi: '#fffcf4' };
    return C;
  };

  // ---------- Sahne: kapsayıcı + tuval + üst katman ----------
  function stage(area, cls, html = '') {
    colors();
    area.insertAdjacentHTML('beforeend', `<div class="arc ${cls}" tabindex="0"><canvas></canvas><div class="arc-msg" hidden></div>${html}</div>`);
    const wrap = area.querySelector('.arc:last-of-type');
    const cv = wrap.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const st = { wrap, cv, ctx, W: 0, H: 0, onResize: null };
    st.fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h || (w === st.W && h === st.H)) return;
      st.W = w; st.H = h;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (st.onResize) st.onResize(w, h);
    };
    st.fit();
    const ro = new ResizeObserver(() => st.fit());
    ro.observe(wrap);
    st.dispose = () => ro.disconnect();
    st.msg = (htmlText, kind = '', ms = 900) => {
      const m = wrap.querySelector('.arc-msg');
      m.innerHTML = htmlText; m.className = 'arc-msg ' + kind; m.hidden = false;
      clearTimeout(st.msg.t);
      if (ms) st.msg.t = setTimeout(() => { m.hidden = true; }, ms);
    };
    st.hideMsg = () => { wrap.querySelector('.arc-msg').hidden = true; };
    return st;
  }

  // requestAnimationFrame döngüsü; oyun bitince ya da çıkılınca kendiliğinden durur
  function loop(s, fn) {
    let last = 0, raf = 0, stopped = false;
    const tick = (t) => {
      if (stopped || session !== s || !s.active) return;
      const dt = Math.min(0.045, last ? (t - last) / 1000 : 0); last = t;
      fn(dt, t / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  function countdown(s, st, done) {
    let n = 3;
    st.msg(`<b class="count">${n}</b>`, 'count', 0);
    const iv = setInterval(() => {
      if (session !== s || !s.active) { clearInterval(iv); return; }
      n--;
      if (n > 0) st.msg(`<b class="count">${n}</b>`, 'count', 0);
      else { clearInterval(iv); st.msg('Los!', 'count', 600); done(); }
    }, 600);
  }

  const hearts = (lives, max = 3, extra = '') => {
    $('#hud-info').innerHTML = `<span class="hearts">${'❤️'.repeat(Math.max(0, lives))}${'🤍'.repeat(Math.max(0, max - lives))}${extra}</span>`;
  };

  // ---------- Efektler: mürekkep sıçraması, uçan yazı, sarsıntı ----------
  function makeFx() {
    const parts = [], texts = [], stains = [];
    let shakeT = 0, shakeA = 0;
    return {
      splat(x, y, color, n = 14, power = 1) {
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), sp = rand(60, 320) * power;
          parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: rand(2, 7) * power, life: rand(0.45, 0.9), t: 0, color });
        }
        for (let i = 0; i < 3; i++) stains.push({ x: x + rand(-18, 18), y: y + rand(-14, 14), r: rand(5, 13) * power, color, life: 1.6, t: 0 });
      },
      text(x, y, str, color, size = 26) { texts.push({ x, y, str, color, size, t: 0, life: 1.1 }); },
      shake(a = 8) { shakeA = Math.max(shakeA, a); shakeT = 0.32; },
      update(dt, g = 700) {
        for (const p of parts) { p.t += dt; p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        for (const s of stains) s.t += dt;
        for (const t of texts) { t.t += dt; t.y -= 38 * dt; }
        for (const arr of [parts, stains, texts]) for (let i = arr.length - 1; i >= 0; i--) if (arr[i].t >= arr[i].life) arr.splice(i, 1);
        if (shakeT > 0) shakeT -= dt;
      },
      offset() { if (shakeT <= 0) return [0, 0]; const k = shakeT / 0.32 * shakeA; return [rand(-k, k), rand(-k, k)]; },
      drawBack(ctx) {
        for (const s of stains) { ctx.globalAlpha = 0.22 * (1 - s.t / s.life); ctx.fillStyle = s.color; blob(ctx, s.x, s.y, s.r); }
        ctx.globalAlpha = 1;
      },
      draw(ctx) {
        for (const p of parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - p.t / p.life * 0.5), 0, Math.PI * 2); ctx.fill(); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const t of texts) {
          const k = t.t / t.life;
          ctx.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
          ctx.font = BRUSH(t.size * (k < 0.12 ? 0.6 + k / 0.12 * 0.4 : 1));
          ctx.lineWidth = 5; ctx.strokeStyle = C.hi; ctx.lineJoin = 'round';
          ctx.strokeText(t.str, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  // Düzensiz mürekkep lekesi
  function blob(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = i / 10 * Math.PI * 2, rr = r * (0.8 + 0.25 * Math.sin(i * 2.7 + x));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Kâğıt kart (merkez x,y): emoji + kelime (+ isteğe bağlı küçük satır)
  function wordCard(ctx, w, x, y, scale = 1, opt = {}) {
    const cw = 112 * scale, ch = 78 * scale;
    ctx.save();
    ctx.translate(x, y);
    if (opt.rot) ctx.rotate(opt.rot);
    ctx.shadowColor = 'rgba(60,40,10,.28)'; ctx.shadowBlur = 10 * scale; ctx.shadowOffsetY = 5 * scale;
    rr(ctx, -cw / 2, -ch / 2, cw, ch, 12 * scale);
    ctx.fillStyle = opt.fill || C.hi; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2.6 * scale; ctx.strokeStyle = opt.stroke || C.ink; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = EMO(30 * scale); ctx.fillText(w.e, 0, -ch * 0.17);
    ctx.fillStyle = C.ink;
    ctx.font = BRUSH(fitFont(ctx, w.de, 25 * scale, cw - 14 * scale));
    ctx.fillText(w.de, 0, ch * 0.27);
    ctx.restore();
    return { cw, ch };
  }
  function fitFont(ctx, text, size, maxW) {
    ctx.font = BRUSH(size);
    const m = ctx.measureText(text).width;
    return m > maxW ? size * maxW / m : size;
  }

  // Max (SVG) tuvalin üstünde, gardırobuyla
  function maxSprite(wrap, cls = 'run') {
    const d = document.createElement('div');
    d.className = 'arc-max';
    d.innerHTML = maxSVG(cls);
    wrap.appendChild(d);
    return {
      el: d,
      place(x, y, w, rot = 0) {
        d.style.width = `${w}px`;
        d.style.transform = `translate(${x - w / 2}px, ${y - w * 160 / 240 / 2}px) rotate(${rot}rad)`;
      },
      pose(c, on = true) { d.firstElementChild.classList.toggle(c, on); },
    };
  }

  // Doğru cevap kartı: "der Hund" renkli
  const artWord = (w) => `<b class="t-${w.art}">${w.art}</b> ${w.de}`;
  const say = (w) => speak(`${w.art} ${w.de}`, 1);

  // Kelime kuyruğu (tükenince karıştırıp baştan)
  function deck() {
    let list = shuffle(wordPool()), i = 0;
    const next = (filter) => {
      for (let tries = 0; tries < list.length * 2; tries++) {
        if (i >= list.length) { list = shuffle(wordPool()); i = 0; }
        const w = list[i++];
        if (!filter || filter(w)) return w;
      }
      return list[0];
    };
    return { next, has: (art) => list.some((w) => w.art === art) };
  }

  // =====================================================================
  // 1) ARTİKEL NİNJA: yukarı fırlayan kelimelerden yalnızca istenen artikeli kes
  // =====================================================================
  const ninja = {
    name: 'Artikel Ninja', de: 'Der Artikel-Ninja', code: 'SCHNITT!', len: '3 can', skill: 'Artikeli bir bakışta tanıyabilme',
    desc: 'Kelimeler havaya fırlıyor! Parmağınla yalnızca istenen artikeldekileri kes. Yanlışı ya da bombayı kesersen can gider; tek hamlede birkaç kelime kes, kombo kazan.',
    start(area, s) {
      const st = stage(area, 'arc-ninja', '<div class="arc-target" aria-live="polite"></div>');
      area.insertAdjacentHTML('beforeend', '<p class="hint">Parmağını (ya da fareyi basılı tutup) kelimelerin üstünden kaydır. Yalnızca üstte yazan artikeli kes!</p>');
      const { ctx, cv, wrap } = st;
      const fx = makeFx();
      const words = deck();
      const targetEl = wrap.querySelector('.arc-target');
      let lives = 3, items = [], halves = [], trail = [], down = false, stroke = null;
      let target = pick(ARTS), phase = 'play', phaseT = 0, spawnIn = 0.6, elapsed = 0, sliced = 0, over = false, nextSwitch = 13;
      const g = () => st.H * 1.25;
      const scale = () => clamp(Math.min(st.W / 430, st.H / 430), 0.72, 1.15);
      hearts(lives);
      const showTarget = (big) => {
        targetEl.className = `arc-target t-${target}${big ? ' big' : ''}`;
        targetEl.innerHTML = `Yalnızca <b>${target.toUpperCase()}</b> kes!`;
      };
      showTarget(true);
      setTimeout(() => showTarget(false), 1400);

      const spawnWave = () => {
        const lvl = Math.min(1, elapsed / 90);
        const n = 1 + Math.floor(Math.random() * (1.6 + lvl * 2.4));
        let hasTarget = false;
        for (let k = 0; k < n; k++) {
          const bomb = elapsed > 15 && Math.random() < 0.08 + lvl * 0.06;
          const wantTarget = !hasTarget || Math.random() < 0.45;
          const w = bomb ? null : words.next(wantTarget ? (x) => x.art === target : (x) => x.art !== target);
          if (w && w.art === target) hasTarget = true;
          const x = rand(st.W * 0.15, st.W * 0.85);
          const apex = rand(0.25, 0.55) * st.H;          // tepe noktası (üstten)
          const vy = -Math.sqrt(2 * g() * (st.H - apex + 40));
          items.push({ w, bomb, x, y: st.H + 50, vx: (st.W / 2 - x) * rand(0.15, 0.45), vy: vy * rand(0.97, 1.03),
            rot: rand(-0.3, 0.3), vr: rand(-1.2, 1.2), delay: k * rand(0.12, 0.3) });
        }
        spawnIn = rand(1.2, 1.9) - lvl * 0.5;
      };

      const hitR = () => 46 * scale();
      const segHits = (ax, ay, bx, by, cx, cy, r) => {
        const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
        const t = clamp(((cx - ax) * dx + (cy - ay) * dy) / L, 0, 1);
        const px = ax + dx * t - cx, py = ay + dy * t - cy;
        return px * px + py * py <= r * r;
      };
      const slice = (it, ang) => {
        it.dead = true;
        const sc = scale();
        if (it.bomb) {
          fx.splat(it.x, it.y, C.ink, 30, 1.6); fx.shake(16);
          fx.text(it.x, it.y - 30, 'BUM!', C.seal, 38);
          beep(false); loseLife('💣 Bombayı kestin!');
          return;
        }
        const ok = it.w.art === target;
        halves.push({ ...it, side: -1, ang, vx: it.vx - Math.cos(ang + Math.PI / 2) * 120, vy: it.vy - 80, t: 0 },
          { ...it, side: 1, ang, vx: it.vx + Math.cos(ang + Math.PI / 2) * 120, vy: it.vy - 60, t: 0 });
        fx.splat(it.x, it.y, C[it.w.art], 18, sc);
        answer(ok, '', { q: it.w.de, expected: it.w.art, given: target }, { quiet: true });
        say(it.w);
        if (ok) {
          sliced++;
          stroke.hits++;
          fx.text(it.x, it.y - 34 * sc, `${it.w.art} ${it.w.de}`, C[it.w.art], 28 * sc);
          if (stroke.hits >= 2) {
            addScore(5 * stroke.hits);
            fx.text(it.x, it.y - 70 * sc, `Kombo x${stroke.hits}!`, C.amberDeep, 34 * sc);
          }
          if (session.combo > 0 && session.combo % 10 === 0) { st.msg(`🔥 ${session.combo} seri!`, 'ok', 900); addScore(20); }
        } else {
          fx.text(it.x, it.y - 34 * sc, `${it.w.art} ${it.w.de} ✗`, C.seal, 28 * sc);
          fx.shake(10);
          loseLife(`Bu ${artWord(it.w)} — ${target} değil!`);
        }
      };
      const loseLife = (why) => {
        lives--; hearts(lives);
        wrap.classList.remove('hurt'); void wrap.offsetWidth; wrap.classList.add('hurt');
        st.msg(why, 'bad', 1500);
        if (lives <= 0 && !over) {
          over = true;
          setTimeout(() => { if (session === s && s.active) finish(); }, 1300);
        }
      };

      // Dokunma / fare
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); down = true; stroke = { hits: 0 }; const [x, y] = pos(e); trail = [{ x, y, t: 0 }]; });
      cv.addEventListener('pointermove', (e) => {
        if (!down || over) return;
        const [x, y] = pos(e);
        const p = trail[trail.length - 1];
        trail.push({ x, y, t: 0 });
        if (!p || phase !== 'play' && phase !== 'switch') return;
        const ang = Math.atan2(y - p.y, x - p.x);
        for (const it of items) if (!it.dead && it.delay <= 0 && segHits(p.x, p.y, x, y, it.x, it.y, hitR())) slice(it, ang);
      });
      const up = () => { down = false; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

      const stop = loop(s, (dt) => {
        if (!over) elapsed += dt;
        phaseT += dt;
        fx.update(dt, g() * 0.6);
        // Hedef artikel değişimi: önce ekran boşalır, sonra yeni hedef duyurulur
        if (!over && phase === 'play' && elapsed >= nextSwitch - 2.2) { phase = 'drain'; phaseT = 0; }
        if (phase === 'drain' && items.every((i) => i.dead || i.y > st.H + 40) && phaseT > 1) {
          target = pick(ARTS.filter((a) => a !== target));
          phase = 'switch'; phaseT = 0; showTarget(true); beepCoin();
        }
        if (phase === 'switch' && phaseT > 1.3) { phase = 'play'; showTarget(false); nextSwitch = elapsed + rand(11, 15); spawnIn = 0.2; }
        if (!over && phase === 'play') { spawnIn -= dt; if (spawnIn <= 0) spawnWave(); }

        for (const it of items) {
          if (it.delay > 0) { it.delay -= dt; continue; }
          it.vy += g() * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
          if (!it.dead && it.vy > 0 && it.y > st.H + 60) {
            it.dead = true;
            if (!it.bomb && it.w.art === target && !over) { session.combo = 0; fx.text(it.x, st.H - 30, 'kaçtı', C.soft, 20); }
          }
        }
        items = items.filter((i) => !i.dead);
        for (const h of halves) { h.t += dt; h.vy += g() * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.side * 2.5 * dt; }
        halves = halves.filter((h) => h.y < st.H + 120 && h.t < 2);
        for (const p of trail) p.t += dt;
        trail = trail.filter((p) => p.t < 0.16);
        setProgress(Math.min(1, sliced / 40));

        // Çizim
        const [ox, oy] = fx.offset();
        ctx.save();
        ctx.clearRect(0, 0, st.W, st.H);
        ctx.translate(ox, oy);
        fx.drawBack(ctx);
        const sc = scale();
        for (const it of items) {
          if (it.delay > 0) continue;
          if (it.bomb) drawBomb(ctx, it.x, it.y, sc, it.rot);
          else wordCard(ctx, it.w, it.x, it.y, sc, { rot: it.rot });
        }
        for (const h of halves) {
          ctx.save();
          ctx.globalAlpha = clamp(1.6 - h.t, 0, 1);
          ctx.translate(h.x, h.y); ctx.rotate(h.ang);
          ctx.beginPath(); ctx.rect(-200, h.side < 0 ? -200 : 0, 400, 200); ctx.clip();
          ctx.rotate(-h.ang); ctx.translate(-h.x, -h.y);
          wordCard(ctx, h.w, h.x, h.y, sc, { rot: h.rot, stroke: C[h.w.art] });
          ctx.restore();
        }
        // Kılıç izi
        if (trail.length > 1) {
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1], b = trail[i], k = 1 - b.t / 0.16;
            ctx.strokeStyle = `rgba(23,20,17,${0.85 * k})`; ctx.lineWidth = 2 + 9 * k;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        fx.draw(ctx);
        ctx.restore();
      });
      s.cleanup = () => { stop(); st.dispose(); };
      wrap.focus({ preventScroll: true });
    },
  };

  function drawBomb(ctx, x, y, sc, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 6 * sc, 30 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-10 * sc, -4 * sc, 7 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.moveTo(8 * sc, -20 * sc); ctx.quadraticCurveTo(18 * sc, -34 * sc, 28 * sc, -30 * sc); ctx.stroke();
    ctx.fillStyle = Math.random() < 0.5 ? C.amber : C.seal; ctx.beginPath(); ctx.arc(29 * sc, -31 * sc, 5 * sc + Math.random() * 3 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  return { ARTS, BRUSH, SERIF, MONO, EMO, rand, clamp, colors, stage, loop, countdown, hearts, makeFx, blob, rr, wordCard, fitFont, maxSprite, artWord, say, deck, ninja };
})();

// =====================================================================
// 2) UÇAN MAX: dokunarak uç, kelimenin artikelinin yazdığı boşluktan geç
// =====================================================================
ARC.fly = {
  name: 'Uçan Max', de: 'Der fliegende Max', code: 'FLIEG!', len: '3 can', skill: 'Artikeli baskı altında doğru seçebilme',
  desc: 'Dokun, Max kanat çırpsın! Her duvarda der, die ve das yazan üç boşluk var. Yukarıda yazan kelimenin artikelinden geç; duvara ya da yanlış kapıya çarpma.',
  start(area, s) {
    const { ARTS, BRUSH, EMO, rand, clamp, stage, loop, hearts, makeFx, rr, maxSprite, artWord, say, deck, fitFont } = ARC;
    const st = stage(area, 'arc-fly', '<div class="arc-word" aria-live="polite"></div>');
    area.insertAdjacentHTML('beforeend', '<p class="hint">Ekrana dokun, boşluk tuşuna ya da ↑ okuna bas: Max yukarı zıplar. Kelimenin artikeli olan kapıdan geç!</p>');
    const { ctx, wrap } = st;
    const C = ARC.colors();
    const fx = makeFx();
    const words = deck();
    const max = maxSprite(wrap, 'run');
    const wordEl = wrap.querySelector('.arc-word');
    let lives = 3, walls = [], y = 0, vy = 0, started = false, over = false, invul = 0, dist = 0, passed = 0, cloudX = 0;
    const MX = () => st.W * 0.24;
    const mw = () => clamp(st.H * 0.17, 60, 96);
    const speed = () => st.W * (0.27 + Math.min(0.2, passed * 0.008));
    const GAP = 0.22, CENTERS = [0.18, 0.5, 0.82];
    st.onResize = () => { if (!started) y = st.H * 0.5; };
    y = st.H * 0.5;
    hearts(lives);

    const nextWall = () => {
      const w = words.next();
      walls.push({ x: st.W + 60, w, order: shuffle(ARTS.slice()), done: false, hit: false });
    };
    const upcoming = () => walls.find((w) => !w.done);
    const showWord = () => {
      const w = upcoming();
      wordEl.innerHTML = w ? `<span class="e">${w.w.e}</span><b>${w.w.de}</b><small>${w.w.tr}</small>` : '';
    };
    const flap = () => {
      if (over) return;
      if (!started) { started = true; st.hideMsg(); nextWall(); showWord(); }
      vy = -st.H * 0.72;
    };
    const onKey = (e) => { if ([' ', 'ArrowUp', 'w'].includes(e.key)) { e.preventDefault(); flap(); } };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); flap(); });
    st.msg('Dokun ve uç!', 'count', 0);

    const lose = (why) => {
      lives--; hearts(lives); invul = 1.4;
      fx.shake(12); beep(false);
      wrap.classList.remove('hurt'); void wrap.offsetWidth; wrap.classList.add('hurt');
      st.msg(why, 'bad', 1600);
      if (lives <= 0) { over = true; max.pose('sad'); setTimeout(() => { if (session === s && s.active) finish(); }, 1300); }
    };
    const gapOf = (yy) => CENTERS.findIndex((c) => Math.abs(yy - c * st.H) <= GAP * st.H / 2);

    const stop = loop(s, (dt, t) => {
      const W = st.W, H = st.H, ww = clamp(W * 0.11, 46, 80);
      fx.update(dt);
      if (invul > 0) invul -= dt;
      if (started && !over) {
        vy += H * 2.1 * dt; vy = Math.min(vy, H * 1.2);
        y += vy * dt;
        const v = speed();
        dist += v * dt; cloudX += v * dt * 0.2;
        for (const w of walls) w.x -= v * dt;
        const last = walls[walls.length - 1];
        if (!last || last.x < W - clamp(W * 0.62, 260, 520)) nextWall();
        walls = walls.filter((w) => w.x > -ww);
        // Tavan ve zemin
        if (y < 14) { y = 14; vy = Math.max(vy, 0); }
        if (y > H - 14) {
          y = H - 14; vy = -H * 0.75;
          if (invul <= 0) lose('Yere çarptın! Daha sık dokun.');
        }
        // Duvarlar
        const hb = mw() * 0.22;   // Max'in çarpışma yarıçapı
        for (const w of walls) {
          const inX = MX() + hb > w.x - ww / 2 && MX() - hb < w.x + ww / 2;
          if (inX && !w.hit && invul <= 0) {
            const g = gapOf(y);
            const inGap = g >= 0 && Math.abs(y - CENTERS[g] * H) + hb * 0.7 <= GAP * H / 2;
            if (!inGap) { w.hit = true; w.done = true; showWord(); lose(`Duvara çarptın! Doğrusu: ${artWord(w.w)}`); }
          }
          if (!w.done && w.x <= MX()) {
            w.done = true;
            const g = gapOf(y);
            if (g >= 0) {
              const given = w.order[g], ok = given === w.w.art;
              answer(ok, '', { q: w.w.de, expected: w.w.art, given }, { quiet: true });
              say(w.w);
              passed++;
              if (ok) {
                fx.splat(MX(), y, C[w.w.art], 14, 0.8);
                fx.text(MX() + 40, y - 40, `${w.w.art} ${w.w.de}`, C[w.w.art], 28);
                if (session.combo > 0 && session.combo % 5 === 0) { addScore(10); st.msg(`🔥 ${session.combo} seri! +10`, 'ok', 900); }
              } else if (invul <= 0) lose(`Yanlış kapı! Doğrusu: ${artWord(w.w)}`);
            }
            showWord();
          }
        }
        setProgress(Math.min(1, passed / 30));
      } else if (!started) {
        y = H * 0.5 + Math.sin(t * 3) * 10;
      }

      // Çizim
      const [ox, oy] = fx.offset();
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.translate(ox, oy);
      // Bulutlar ve tepeler (paralaks)
      ctx.strokeStyle = C.faint; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 260 - cloudX) % (W + 260) + W + 260) % (W + 260) - 130, cy = H * (0.12 + (i % 3) * 0.2);
        ctx.beginPath(); ctx.arc(cx, cy, 16, Math.PI, 0); ctx.arc(cx + 22, cy - 6, 20, Math.PI, 0); ctx.arc(cx + 46, cy, 14, Math.PI, 0); ctx.stroke();
      }
      fx.drawBack(ctx);
      for (const w of walls) drawWall(ctx, w, W, H, ww);
      fx.draw(ctx);
      ctx.restore();
      const blink = invul > 0 && Math.floor(invul * 10) % 2 === 0;
      max.el.style.opacity = blink ? 0.35 : 1;
      max.place(MX() + ox, y + oy, mw(), clamp(vy / (H * 2.4), -0.45, 0.6));
    });

    function drawWall(ctx, w, W, H, ww) {
      const x = w.x - ww / 2;
      const segs = [[0, CENTERS[0] - GAP / 2], [CENTERS[0] + GAP / 2, CENTERS[1] - GAP / 2], [CENTERS[1] + GAP / 2, CENTERS[2] - GAP / 2], [CENTERS[2] + GAP / 2, 1]];
      ctx.globalAlpha = w.done && !w.hit ? 0.45 : 1;
      for (const [a, b] of segs) {
        const y0 = a * H, h = (b - a) * H;
        ctx.fillStyle = C.paper2; ctx.fillRect(x, y0, ww, h);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y0, ww, h); ctx.clip();
        ctx.strokeStyle = 'rgba(23,20,17,.22)'; ctx.lineWidth = 1.4;
        for (let k = -H; k < H; k += 9) { ctx.beginPath(); ctx.moveTo(x + k, y0); ctx.lineTo(x + k + h, y0 + h); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; ctx.strokeRect(x, y0, ww, h);
      }
      // Kapı etiketleri
      CENTERS.forEach((c, i) => {
        const art = w.order[i], cy = c * H;
        ctx.strokeStyle = C[art]; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 2, cy - GAP * H / 2 + 3); ctx.lineTo(x - 2, cy + GAP * H / 2 - 3); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = BRUSH(clamp(H * 0.075, 20, 36));
        ctx.lineWidth = 5; ctx.strokeStyle = C.hi; ctx.strokeText(art, w.x, cy);
        ctx.fillStyle = C[art]; ctx.fillText(art, w.x, cy);
      });
      ctx.globalAlpha = 1;
    }

    s.cleanup = () => { stop(); st.dispose(); document.removeEventListener('keydown', onKey); };
    wrap.focus({ preventScroll: true });
  },
};

// =====================================================================
// 3) ARTİKEL YILANI: yılan yalnızca kendi rengindeki artikelin kelimelerini yer
// =====================================================================
ARC.snake = {
  name: 'Artikel Yılanı', de: 'Die Artikel-Schlange', code: 'SSSCHLANGE', len: '3 can', skill: 'Artikelleri renkle eşleştirip pekiştirme',
  desc: 'Yılanın rengi hangi artikelse yalnızca o kelimeleri ye ve uza. Yanlış kelimeyi yersen ya da kendini ısırırsan can gider. Yılan arada renk değiştirir!',
  start(area, s) {
    const { ARTS, BRUSH, EMO, MONO, clamp, stage, loop, hearts, makeFx, rr, artWord, say, deck } = ARC;
    const st = stage(area, 'arc-snake', '<div class="arc-target" aria-live="polite"></div>');
    area.insertAdjacentHTML('beforeend', `
      <div class="dpad" aria-label="Yön düğmeleri">
        <button data-d="0,-1" aria-label="Yukarı">▲</button><button data-d="-1,0" aria-label="Sol">◀</button>
        <button data-d="0,1" aria-label="Aşağı">▼</button><button data-d="1,0" aria-label="Sağ">▶</button>
      </div>
      <p class="hint">Ok tuşları, ekranda kaydırma ya da düğmeler. Kenardan çıkınca öbür taraftan girersin.</p>`);
    const { ctx, wrap } = st;
    const C = ARC.colors();
    const fx = makeFx();
    const words = deck();
    const targetEl = wrap.querySelector('.arc-target');
    let cols = 12, rows = 12, cell = 30, offX = 0, offY = 0;
    let snake = [], dir = [1, 0], queue = [], grow = 0, foods = [], art = pick(ARTS), eaten = 0, lives = 3;
    let stepT = 0, stepEvery = 0.24, over = false, started = false, invul = 0, flashT = 0;
    hearts(lives);

    const layout = () => {
      cols = st.W < 520 ? 11 : 15;
      cell = Math.floor(Math.min(st.W / cols, st.H / 11));
      rows = Math.floor(st.H / cell);
      offX = Math.floor((st.W - cols * cell) / 2); offY = Math.floor((st.H - rows * cell) / 2);
    };
    st.onResize = layout; layout();
    const reset = () => {
      const cy = Math.floor(rows / 2);
      snake = [[4, cy], [3, cy], [2, cy]]; dir = [1, 0]; queue = [];
    };
    reset();
    const showArt = (big) => {
      targetEl.className = `arc-target t-${art}${big ? ' big' : ''}`;
      targetEl.innerHTML = `Yılan <b>${art.toUpperCase()}</b> yiyor`;
    };
    showArt(true);
    const occupied = (x, y) => snake.some(([a, b]) => a === x && b === y) || foods.some((f) => f.x === x && f.y === y);
    const freeCell = () => {
      for (let i = 0; i < 300; i++) {
        const x = Math.floor(Math.random() * cols), y = 2 + Math.floor(Math.random() * (rows - 3));
        const [hx, hy] = snake[0];
        const crowded = foods.some((f) => Math.abs(f.x - x) <= 1 && Math.abs(f.y - y) <= 1);
        if (!occupied(x, y) && !crowded && Math.abs(x - hx) + Math.abs(y - hy) > 2) return [x, y];
      }
      return null;
    };
    const addFood = (want) => {
      const c = freeCell(); if (!c) return;
      const w = words.next(want ? (x) => x.art === art : (x) => x.art !== art);
      foods.push({ x: c[0], y: c[1], w, born: 0 });
    };
    const fillFoods = () => {
      while (foods.filter((f) => f.w.art === art).length < 2) addFood(true);
      while (foods.length < 5) addFood(Math.random() < 0.3);
    };
    fillFoods();

    const turn = (dx, dy) => {
      if (over) return;
      const last = queue.length ? queue[queue.length - 1] : dir;
      if (dx === -last[0] && dy === -last[1]) return;
      if (dx === last[0] && dy === last[1]) return;
      if (queue.length < 2) queue.push([dx, dy]);
      if (!started) { started = true; st.hideMsg(); showArt(false); }
    };
    const onKey = (e) => {
      const k = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (k) { e.preventDefault(); turn(...k); }
    };
    document.addEventListener('keydown', onKey);
    area.querySelectorAll('.dpad button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); turn(...b.dataset.d.split(',').map(Number)); }));
    let t0 = null;
    wrap.addEventListener('pointerdown', (e) => { t0 = [e.clientX, e.clientY]; });
    wrap.addEventListener('pointerup', (e) => {
      if (!t0) return;
      const dx = e.clientX - t0[0], dy = e.clientY - t0[1]; t0 = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { if (!started) turn(...dir); return; }
      if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
    });
    wrap.style.touchAction = 'none';
    st.msg('Bir yöne bas ve başla!', 'count', 0);

    const lose = (why) => {
      lives--; hearts(lives); invul = 1.2;
      fx.shake(10); beep(false);
      wrap.classList.remove('hurt'); void wrap.offsetWidth; wrap.classList.add('hurt');
      st.msg(why, 'bad', 1700);
      if (lives <= 0) { over = true; setTimeout(() => { if (session === s && s.active) finish(); }, 1300); }
    };
    const cx = (x) => offX + x * cell + cell / 2, cy = (y) => offY + y * cell + cell / 2;

    const step = () => {
      if (queue.length) dir = queue.shift();
      const [hx, hy] = snake[0];
      const nx = (hx + dir[0] + cols) % cols, ny = (hy + dir[1] + rows) % rows;
      // Kendini ısırma: kuyruğu o noktadan kes
      const bite = snake.findIndex(([a, b], i) => i > 0 && a === nx && b === ny);
      snake.unshift([nx, ny]);
      if (grow > 0) grow--; else snake.pop();
      if (bite > 0 && invul <= 0) {
        fx.splat(cx(nx), cy(ny), C[art], 16);
        snake = snake.slice(0, Math.max(3, bite));
        lose('Ay! Kendini ısırdın.');
      }
      const fi = foods.findIndex((f) => f.x === nx && f.y === ny);
      if (fi >= 0) {
        const f = foods.splice(fi, 1)[0];
        const ok = f.w.art === art;
        answer(ok, '', { q: f.w.de, expected: f.w.art, given: art }, { quiet: true });
        say(f.w);
        if (ok) {
          grow += 1; eaten++;
          fx.splat(cx(nx), cy(ny), C[art], 12, 0.8);
          fx.text(cx(nx), cy(ny) - cell, `${f.w.art} ${f.w.de}`, C[art], 26);
          stepEvery = Math.max(0.12, stepEvery - 0.005);
          if (eaten % 4 === 0) {
            art = pick(ARTS.filter((a) => a !== art));
            showArt(true); flashT = 1; beepCoin();
            setTimeout(() => { if (!over) showArt(false); }, 1500);
            // Ekrandaki kelimelerin bir kısmını yeni renge göre tazele
            foods = foods.filter(() => Math.random() < 0.5);
          }
        } else {
          fx.text(cx(nx), cy(ny) - cell, `${f.w.art} ${f.w.de} ✗`, C.seal, 26);
          snake = snake.slice(0, Math.max(3, snake.length - 2));
          lose(`Bu ${artWord(f.w)}! Yılan ${art} yiyor.`);
        }
        fillFoods();
        setProgress(Math.min(1, eaten / 24));
      }
    };

    const stop = loop(s, (dt, t) => {
      fx.update(dt);
      if (invul > 0) invul -= dt;
      if (flashT > 0) flashT -= dt;
      for (const f of foods) f.born += dt;
      if (started && !over) { stepT += dt; while (stepT >= stepEvery) { stepT -= stepEvery; step(); } }
      const W = st.W, H = st.H;
      const [ox, oy] = fx.offset();
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.translate(ox, oy);
      // Tahta: noktalı kâğıt
      ctx.fillStyle = 'rgba(23,20,17,.13)';
      for (let x = 0; x <= cols; x++) for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.arc(offX + x * cell, offY + y * cell, 1.3, 0, Math.PI * 2); ctx.fill(); }
      if (flashT > 0) { ctx.fillStyle = C[art]; ctx.globalAlpha = flashT * 0.12; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      fx.drawBack(ctx);
      // Kelimeler
      for (const f of foods) {
        const k = Math.min(1, f.born * 4), x = cx(f.x), y = cy(f.y);
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = EMO(cell * 0.62); ctx.fillText(f.w.e, 0, -cell * 0.04);
        const fs = clamp(cell * 0.42, 11, 18);
        ctx.font = BRUSH(fs);
        const tw = ctx.measureText(f.w.de).width + 10;
        rr(ctx, -tw / 2, cell * 0.36, tw, fs + 4, 5);
        ctx.fillStyle = 'rgba(255,252,244,.92)'; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = C.ink; ctx.fillText(f.w.de, 0, cell * 0.36 + fs / 2 + 2);
        ctx.restore();
      }
      // Yılan: kalın mürekkep çizgisi (kenardan geçişte çizgiyi böl)
      const blink = invul > 0 && Math.floor(invul * 10) % 2 === 0;
      ctx.globalAlpha = blink ? 0.4 : 1;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => {
        ctx.beginPath();
        snake.forEach(([x, y], i) => {
          const p = snake[i - 1];
          if (i === 0 || Math.abs(p[0] - x) > 1 || Math.abs(p[1] - y) > 1) ctx.moveTo(cx(x), cy(y)); else ctx.lineTo(cx(x), cy(y));
        });
      };
      path(); ctx.strokeStyle = C.ink; ctx.lineWidth = cell * 0.78; ctx.stroke();
      path(); ctx.strokeStyle = C[art]; ctx.lineWidth = cell * 0.6; ctx.stroke();
      // Pullar
      ctx.fillStyle = 'rgba(255,252,244,.35)';
      snake.forEach(([x, y], i) => { if (i % 2) { ctx.beginPath(); ctx.arc(cx(x), cy(y), cell * 0.09, 0, Math.PI * 2); ctx.fill(); } });
      // Baş
      const [hx, hy] = snake[0], hX = cx(hx), hY = cy(hy);
      ctx.save(); ctx.translate(hX, hY); ctx.rotate(Math.atan2(dir[1], dir[0]));
      ctx.fillStyle = C[art]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(cell * 0.08, 0, cell * 0.48, cell * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fffcf4';
      for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(cell * 0.2, sy * cell * 0.17, cell * 0.11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = C.ink;
      for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(cell * 0.24, sy * cell * 0.17, cell * 0.05, 0, Math.PI * 2); ctx.fill(); }
      if (Math.sin(t * 9) > 0.2) { ctx.strokeStyle = C.seal; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cell * 0.5, 0); ctx.lineTo(cell * 0.72, 0); ctx.lineTo(cell * 0.82, -cell * 0.08); ctx.moveTo(cell * 0.72, 0); ctx.lineTo(cell * 0.82, cell * 0.08); ctx.stroke(); }
      ctx.restore();
      ctx.globalAlpha = 1;
      // Uzunluk
      ctx.font = MONO(12); ctx.fillStyle = C.soft; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(`uzunluk ${snake.length}`, W - 8, H - 6);
      fx.draw(ctx);
      ctx.restore();
    });
    s.cleanup = () => { stop(); st.dispose(); document.removeEventListener('keydown', onKey); };
    wrap.focus({ preventScroll: true });
  },
};

// =====================================================================
// 4) ARTİKEL KOŞUSU: zıpla, engelleri aş; artikel kapısında doğru yüksekliğe çık
//    yerde = alt balon, tek zıplama = orta, çift zıplama = üst balon
// =====================================================================
ARC.run = {
  name: 'Artikel Koşusu', de: 'Der Artikel-Lauf', code: 'SPRING!', len: '3 can', skill: 'Artikeli hızlı ve otomatik tanıyabilme',
  desc: 'Max koşuyor! Taşların üstünden zıpla, kuşların altından geç. Artikel kapısı gelince doğru balona dokun: yerde kal, zıpla ya da havadayken bir daha zıpla.',
  start(area, s) {
    const { ARTS, BRUSH, EMO, MONO, rand, clamp, stage, loop, countdown, hearts, makeFx, maxSprite, artWord, say, deck, wordCard } = ARC;
    const st = stage(area, 'arc-run', '<div class="arc-word" aria-live="polite"></div>');
    area.insertAdjacentHTML('beforeend', `
      <button class="arc-jump" type="button">Zıpla</button>
      <p class="hint">Ekrana dokun, boşluk ya da ↑: zıpla. Havadayken bir daha: çift zıplama. Kapıda: yerde kal = alt, zıpla = orta, çift zıpla = üst balon.</p>`);
    const { ctx, wrap } = st;
    const C = ARC.colors();
    const fx = makeFx();
    const words = deck();
    const max = maxSprite(wrap, 'run');
    const wordEl = wrap.querySelector('.arc-word');
    const bestDist = state.runDist || 0;
    let lives = 3, shield = false, star = 0, objs = [], rise = 0, vy = 0, jumps = 0, over = false, started = false, invul = 0;
    let dist = 0, speedK = 1, gateIn = 4.5, obstIn = 1.8, coinIn = 1, gates = 0, hillX = 0, flagShown = false;
    const G = () => st.H * 0.84;                  // zemin çizgisi
    const MX = () => st.W * 0.2;
    const mw = () => clamp(st.H * 0.26, 74, 140);
    const mh = () => mw() * 160 / 240;
    const grav = () => st.H * 3.3;
    const V1 = () => Math.sqrt(2 * grav() * st.H * 0.27);   // tek zıplama ≈ 0.27H
    const V2 = () => Math.sqrt(2 * grav() * st.H * 0.3);    // ikinci zıplama +0.3H
    const BAND = () => [0, st.H * 0.27, st.H * 0.55];        // balonların yükselişi
    const speed = () => st.W * 0.42 * speedK;
    hearts(lives);

    const jump = () => {
      if (over) return;
      if (!started) return;
      if (rise <= 0.5 && jumps === 0) { vy = V1(); jumps = 1; }
      else if (jumps === 1) { vy = V2(); jumps = 2; fx.splat(MX(), G() - rise, C.faint, 6, 0.6); }
    };
    const onKey = (e) => { if ([' ', 'ArrowUp', 'w'].includes(e.key)) { e.preventDefault(); jump(); } };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
    area.querySelector('.arc-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });

    const hud = () => hearts(lives, 3, (shield ? '🛡️' : '') + (star > 0 ? '⭐' : ''));
    const lose = (why) => {
      if (shield) { shield = false; hud(); invul = 1; st.msg('🛡 Kalkan korudu!', 'ok', 900); return; }
      lives--; hud(); invul = 1.5; speedK = Math.max(1, speedK - 0.15);
      fx.shake(12); beep(false);
      wrap.classList.remove('hurt'); void wrap.offsetWidth; wrap.classList.add('hurt');
      st.msg(why, 'bad', 1700);
      if (lives <= 0) {
        over = true; max.pose('sad');
        state.runDist = Math.max(bestDist, Math.round(dist / 40));
        setTimeout(() => { if (session === s && s.active) finish(); }, 1400);
      }
    };

    // Nesneler: rock (taş), bird (kuş), coin, power (kalkan/kalp/yıldız), gate (artikel kapısı)
    const spawnGate = () => {
      const w = words.next();
      const order = shuffle(ARTS.slice());
      objs.push({ k: 'gate', x: st.W + 80, w, order });
      wordEl.className = 'arc-word coming';
      wordEl.innerHTML = `<span class="e">${w.e}</span><b>${w.de}</b><small>${w.tr}</small>`;
      gateIn = rand(5.5, 7.5);
      obstIn = Math.max(obstIn, 2.6);
    };
    const spawnObst = () => {
      const r = Math.random();
      if (r < 0.62 || dist < 1500) objs.push({ k: 'rock', x: st.W + 40, s: rand(0.8, 1.15) });
      else objs.push({ k: 'bird', x: st.W + 40, h: st.H * rand(0.2, 0.24), ph: rand(0, 6) });
      obstIn = rand(1.1, 2) / Math.sqrt(speedK);
    };
    const spawnCoins = () => {
      const arc = Math.random() < 0.5, n = 5;
      for (let i = 0; i < n; i++) objs.push({ k: 'coin', x: st.W + 40 + i * 34, h: arc ? Math.sin(i / (n - 1) * Math.PI) * st.H * 0.22 + 20 : 22 });
      if (Math.random() < 0.18) {
        const p = lives < 3 && Math.random() < 0.4 ? 'heart' : !shield && Math.random() < 0.6 ? 'shield' : 'star';
        objs.push({ k: 'power', p, x: st.W + 40 + n * 34 + 40, h: st.H * 0.3 });
      }
      coinIn = rand(1.6, 3);
    };

    const hitGate = (o) => {
      const r = rise, b = BAND();
      const g = r < (b[0] + b[1]) / 2 ? 0 : r < (b[1] + b[2]) / 2 ? 1 : 2;
      const given = o.order[g], ok = given === o.w.art;
      o.done = true; o.chosen = g; o.ok = ok;
      answer(ok, '', { q: o.w.de, expected: o.w.art, given }, { quiet: true });
      say(o.w);
      gates++;
      wordEl.className = 'arc-word'; wordEl.innerHTML = '';
      if (ok) {
        if (star > 0) addScore(session.combo > 1 ? 12 : 10);
        fx.splat(MX() + 20, G() - r - mh() / 2, C[o.w.art], 20, 1);
        fx.text(MX() + 60, G() - r - mh(), `${o.w.art} ${o.w.de}`, C[o.w.art], 30);
        speedK = Math.min(2.1, speedK + 0.05);
        if (session.combo > 0 && session.combo % 5 === 0) { addScore(15); st.msg(`🔥 ${session.combo} seri! +15`, 'ok', 900); }
      } else lose(`Doğrusu: ${artWord(o.w)}`);
      setProgress(Math.min(1, gates / 25));
    };

    countdown(s, st, () => { started = true; });

    const stop = loop(s, (dt, t) => {
      const W = st.W, H = st.H;
      fx.update(dt);
      if (invul > 0) invul -= dt;
      if (star > 0) { star -= dt; if (star <= 0) hud(); }
      if (started && !over) {
        const v = speed();
        dist += v * dt; hillX += v * dt;
        // Max fiziği
        if (rise > 0 || vy > 0) { vy -= grav() * dt; rise += vy * dt; if (rise <= 0) { rise = 0; vy = 0; jumps = 0; } }
        rise = Math.min(rise, H * 0.72);
        gateIn -= dt; obstIn -= dt; coinIn -= dt;
        const gateNear = objs.some((o) => o.k === 'gate' && !o.done && o.x > MX() - 40);
        if (gateIn <= 0 && !gateNear) spawnGate();
        if (obstIn <= 0 && !gateNear && gateIn > 1.2) spawnObst();
        if (coinIn <= 0 && !gateNear) spawnCoins();
        const mx = MX(), my = G() - rise - mh() * 0.45, hw = mw() * 0.3, hh = mh() * 0.32;
        for (const o of objs) {
          o.x -= v * dt;
          if (o.done) continue;
          if (o.k === 'gate') { if (o.x <= mx) hitGate(o); continue; }
          if (o.k === 'rock') {
            const rw = 30 * o.s, rh = H * 0.08 * o.s;
            if (Math.abs(o.x - mx) < hw + rw / 2 && G() - rh < my + hh && invul <= 0) { o.done = true; lose('Taşa takıldın!'); }
          } else if (o.k === 'bird') {
            const by = G() - o.h;
            if (Math.abs(o.x - mx) < hw + 16 && Math.abs(by - my) < hh + 12 && invul <= 0) { o.done = true; lose('Kuşa çarptın!'); }
          } else if (o.k === 'coin' || o.k === 'power') {
            const cy = G() - o.h;
            if (Math.abs(o.x - mx) < hw + 12 && Math.abs(cy - my) < hh + 16) {
              o.done = true; o.gone = true;
              if (o.k === 'coin') { addScore(star > 0 ? 2 : 1); beepCoin(); }
              else if (o.p === 'heart') { lives = Math.min(3, lives + 1); st.msg('❤ +1 can', 'ok', 800); }
              else if (o.p === 'shield') { shield = true; st.msg('🛡 Kalkan!', 'ok', 800); }
              else { star = 8; st.msg('⭐ 8 sn çift puan!', 'ok', 900); }
              if (o.k === 'power') hud();
            }
          }
        }
        objs = objs.filter((o) => o.x > -120 && !o.gone);
        if (!flagShown && bestDist > 0 && dist / 40 > bestDist) { flagShown = true; st.msg('🏁 Yeni rekor mesafe!', 'ok', 1200); }
      }

      // Çizim
      const [ox, oy] = fx.offset();
      ctx.save(); ctx.clearRect(0, 0, W, H); ctx.translate(ox, oy);
      // Uzak tepeler ve ağaçlar (paralaks)
      ctx.strokeStyle = 'rgba(23,20,17,.12)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) { const X = x + hillX * 0.15; const y = G() - H * 0.18 - Math.sin(X / 120) * H * 0.05 - Math.sin(X / 47) * 6; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(23,20,17,.2)';
      for (let i = 0; i < 6; i++) {
        const x = ((i * 190 - hillX * 0.4) % (W + 190) + W + 190) % (W + 190) - 60, base = G() - 4;
        ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - 34); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, base - 46, 16, 0, Math.PI * 2); ctx.stroke();
      }
      // Rekor bayrağı
      if (bestDist > 0) {
        const fxp = MX() + (bestDist * 40 - dist);
        if (fxp > -20 && fxp < W + 20) {
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(fxp, G()); ctx.lineTo(fxp, G() - H * 0.34); ctx.stroke();
          ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(fxp, G() - H * 0.34); ctx.lineTo(fxp + 34, G() - H * 0.3); ctx.lineTo(fxp, G() - H * 0.26); ctx.fill(); ctx.stroke();
          ctx.font = MONO(11); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText('rekor', fxp + 4, G() - H * 0.22);
        }
      }
      // Zemin
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, G()); ctx.lineTo(W, G()); ctx.stroke();
      ctx.strokeStyle = 'rgba(23,20,17,.25)'; ctx.lineWidth = 2;
      for (let x = -(hillX % 46); x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x, G() + 12); ctx.lineTo(x + 20, G() + 12); ctx.stroke(); }
      fx.drawBack(ctx);
      for (const o of objs) drawObj(o, t);
      fx.draw(ctx);
      // Mesafe
      ctx.font = MONO(12); ctx.fillStyle = C.soft; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(dist / 40)} m${bestDist ? ` · rekor ${bestDist} m` : ''}`, 10, 8);
      ctx.restore();
      max.el.style.opacity = invul > 0 && Math.floor(invul * 10) % 2 === 0 ? 0.35 : 1;
      max.el.classList.toggle('shielded', shield);
      max.place(MX() + ox, G() - rise - mh() / 2 + 4 + oy, mw(), rise > 0 ? clamp(-vy / (st.H * 6), -0.25, 0.25) : 0);
    });

    function drawObj(o, t) {
      const H = st.H, g = G();
      if (o.k === 'rock') {
        const w = 30 * o.s, h = H * 0.08 * o.s;
        ctx.fillStyle = C.paper2; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(o.x - w / 2 - 4, g); ctx.quadraticCurveTo(o.x - w / 2, g - h, o.x - 2, g - h); ctx.quadraticCurveTo(o.x + w / 2 + 4, g - h * 0.9, o.x + w / 2 + 4, g); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(23,20,17,.3)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(o.x - 4, g - h * 0.6); ctx.lineTo(o.x + 6, g - h * 0.35); ctx.stroke();
      } else if (o.k === 'bird') {
        const y = g - o.h, f = Math.sin(t * 14 + o.ph) * 9;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(o.x - 18, y - f); ctx.quadraticCurveTo(o.x - 8, y - 6, o.x, y); ctx.quadraticCurveTo(o.x + 8, y - 6, o.x + 18, y - f); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(o.x, y + 1, 4, 0, Math.PI * 2); ctx.fill();
      } else if (o.k === 'coin') {
        const y = g - o.h;
        ctx.fillStyle = C.amber; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(o.x, y, 8 * Math.abs(Math.cos(t * 4 + o.x / 50)) + 2, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (o.k === 'power') {
        const y = g - o.h + Math.sin(t * 4) * 5;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = EMO(26);
        ctx.fillText({ heart: '❤️', shield: '🛡️', star: '⭐' }[o.p], o.x, y);
      } else if (o.k === 'gate') {
        const b = BAND(), r = clamp(H * 0.085, 24, 40);
        // Direk
        ctx.strokeStyle = 'rgba(23,20,17,.35)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(o.x, g); ctx.lineTo(o.x, g - mh() * 0.45 - b[2] - r); ctx.stroke(); ctx.setLineDash([]);
        o.order.forEach((art, i) => {
          const y = g - mh() * 0.45 - b[i];
          const dim = o.done && i !== o.chosen && art !== o.w.art;
          ctx.globalAlpha = dim ? 0.25 : 1;
          ctx.fillStyle = o.done && art === o.w.art ? C[art] : C.hi;
          ctx.strokeStyle = C[art]; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(o.x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = BRUSH(r * 0.95);
          ctx.fillStyle = o.done && art === o.w.art ? C.hi : C[art];
          ctx.fillText(art, o.x, y + 1);
          if (o.done && i === o.chosen && !o.ok) { ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x - r * 0.7, y - r * 0.7); ctx.lineTo(o.x + r * 0.7, y + r * 0.7); ctx.stroke(); }
          ctx.globalAlpha = 1;
        });
      }
    }

    s.cleanup = () => { stop(); st.dispose(); document.removeEventListener('keydown', onKey); };
    wrap.focus({ preventScroll: true });
  },
};
