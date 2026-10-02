// Yönetici rapor paneli: sessions, users ve sinif_listesi koleksiyonlarını okuyup özetler.
// Veriler tarayıcıda hesaplanır; Firestore kuralları yalnızca yöneticinin okumasına izin verir.
// Öğrenciler e-posta adresiyle eşleştirilir; sınıf bilgisi öğretmenin yüklediği sınıf listesinden gelir.

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Uygulama, oyun ve rozet adları (yeni uygulama eklendikçe buraya eklenir; bilinmeyenler kimliğiyle görünür)
const APPS = {
  almanca: {
    name: 'Deutsch Macerası',
    games: { run: 'Artikel Koşusu', duello: 'Sınıf Düellosu', artikel: 'Artikel Avı', memory: 'Hafıza Kartları', listen: 'Hör zu!', satz: 'Cümle Treni', verb: 'Fiil Roketi' },
    badges: { ilk: 'İlk Adım', kombo10: 'Artikel Ninja', mukemmel: 'Kusursuz', kasif: 'Kaşif', seri3: 'Ateşli', seviye5: 'Deutsch-König' },
  },
};
const appName = (a) => APPS[a]?.name || a;
const gameName = (a, g) => APPS[a]?.games?.[g] || g;
const levelOf = (xp) => Math.floor(Math.sqrt((xp || 0) / 50)) + 1;   // js/app.js ile aynı formül
const NO_CLASS = '__yok__';

const fmtDur = (sec) => {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h) return `${h} sa ${m} dk`;
  if (m) return `${m} dk`;
  return `${sec} sn`;
};
const pct = (c, t) => (t ? Math.round((c / t) * 100) : null);
const fmtPct = (p) => (p == null ? '–' : `%${p}`);
const toDate = (v) => (v?.toDate ? v.toDate() : v instanceof Date ? v : v ? new Date(v) : null);
const fmtDate = (d) => (d ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '–');
const fmtDateTime = (d) => (d ? d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
const dayKey = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const low = (s) => String(s || '').trim().toLocaleLowerCase('tr');
// "9-A", "10-B", "Hazırlık-A" gibi sınıfları doğal sırayla diz
const classSort = (a, b) => a.localeCompare(b, 'tr', { numeric: true });

let ALL = [];        // oturumlar (seçili dönem)
let USERS = [];      // tüm kullanıcı profilleri
let ROSTER = new Map();  // e-posta → { sinif, ad }
let sortState = { key: 'sinif', dir: 1 };
let selectedEmail = null;

const userByEmail = () => new Map(USERS.map((u) => [low(u.email), u]));
const classOf = (email) => ROSTER.get(low(email))?.sinif || '';
const nameOf = (email, fallback) => ROSTER.get(low(email))?.ad || fallback || '';

// ---------- Veri ----------
async function load() {
  const { fb } = window.Okul;
  const days = Number($('#f-range').value);
  const since = new Date(Date.now() - days * 86400000);
  $('#status').textContent = 'Kayıtlar yükleniyor…';
  const q = fb.query(fb.collection(fb.db, 'sessions'), fb.where('endedAt', '>=', since), fb.orderBy('endedAt', 'desc'), fb.limit(10000));
  const [snap, usnap, rsnap] = await Promise.all([
    fb.getDocs(q), fb.getDocs(fb.collection(fb.db, 'users')), fb.getDocs(fb.collection(fb.db, 'sinif_listesi')),
  ]);
  // Öğretmen hesaplarının (eski) oturumları rapora alınmaz
  ALL = snap.docs.filter((d) => d.data().kind === 'ogrenci').map((d) => {
    const x = d.data();
    return { id: d.id, ...x, email: low(x.email), endedAt: toDate(x.endedAt) || toDate(x.startedAt), startedAt: toDate(x.startedAt) };
  });
  USERS = usnap.docs.map((d) => ({ uid: d.id, ...d.data(), email: low(d.data().email), lastSeen: toDate(d.data().lastSeen) }));
  ROSTER = new Map(rsnap.docs.map((d) => [low(d.id), d.data()]));
  fillSelects();
  render();
  renderRosterSummary();
  $('#status').textContent = `${ALL.length} oturum · ${ROSTER.size} öğrenci listede · ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    + (ALL.length >= 10000 ? ' · Çok kayıt var, daha kısa bir dönem seçin.' : '');
}

function fillSelects() {
  const appSel = $('#f-app'), gameSel = $('#f-game'), clsSel = $('#f-sinif');
  const curA = appSel.value, curG = gameSel.value, curC = clsSel.value;
  const apps = [...new Set(ALL.map((s) => s.app))].sort();
  appSel.innerHTML = '<option value="">Hepsi</option>' + apps.map((a) => `<option value="${esc(a)}">${esc(appName(a))}</option>`).join('');
  appSel.value = apps.includes(curA) ? curA : '';
  const games = [...new Set(ALL.filter((s) => !appSel.value || s.app === appSel.value).map((s) => `${s.app}|${s.game}`))].sort();
  gameSel.innerHTML = '<option value="">Hepsi</option>' + games.map((k) => {
    const [a, g] = k.split('|');
    return `<option value="${esc(k)}">${esc(appSel.value ? gameName(a, g) : `${appName(a)} · ${gameName(a, g)}`)}</option>`;
  }).join('');
  gameSel.value = games.includes(curG) ? curG : '';
  const classes = [...new Set([...ROSTER.values()].map((r) => r.sinif))].sort(classSort);
  clsSel.innerHTML = '<option value="">Bütün sınıflar</option>' + classes.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')
    + `<option value="${NO_CLASS}">Listede olmayanlar</option>`;
  clsSel.value = [...classes, NO_CLASS].includes(curC) ? curC : '';
}

// Kişi filtreleri (sınıf, kim, arama) hem oturumlara hem öğrenci satırlarına aynı şekilde uygulanır
function personMatches(email, kind, name) {
  const cls = $('#f-sinif').value, k = 'ogrenci', q = low($('#f-q').value);   // rapor yalnızca öğrencileri gösterir
  const c = classOf(email);
  if (cls === NO_CLASS ? c : cls && c !== cls) return false;
  if (k && kind !== k) return false;
  if (q && !low(`${nameOf(email, name)} ${name} ${email}`).includes(q)) return false;
  return true;
}

function filtered() {
  const app = $('#f-app').value, game = $('#f-game').value;
  return ALL.filter((s) => (!app || s.app === app)
    && (!game || `${s.app}|${s.game}` === game)
    && personMatches(s.email, s.kind, s.name));
}

function sumUp(list) {
  const total = list.reduce((a, s) => a + (s.total || 0), 0);
  const correct = list.reduce((a, s) => a + (s.correct || 0), 0);
  const time = list.reduce((a, s) => a + (s.durationSec || 0), 0);
  return { n: list.length, total, correct, time, acc: pct(correct, total) };
}

// ---------- Çizim ----------
function render() {
  const list = filtered();
  renderTiles(list);
  renderChart(list);
  renderClasses();
  renderStudents(list);
  renderGames(list);
  renderMissed(list);
  if (selectedEmail) renderDetail(selectedEmail); else $('#detail').hidden = true;
}

function tile(label, value, sub = '') {
  return `<div class="tile"><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
}

function renderTiles(list) {
  const t = sumUp(list);
  const rows = studentRows(list);
  const active = rows.filter((r) => r.sessions).length;
  $('#tiles').innerHTML = [
    tile('Çalışan öğrenci', active, `${rows.length} öğrenciden`),
    tile('Toplam süre', fmtDur(t.time), active ? `çalışan başına ${fmtDur(t.time / active)}` : ''),
    tile('Oturum', t.n, `${list.filter((s) => s.completed).length} tanesi tamamlandı`),
    tile('Doğruluk', fmtPct(t.acc), `${t.correct} / ${t.total} cevap`),
  ].join('');
}

function renderChart(list) {
  const days = Math.min(Number($('#f-range').value), 60);
  const byDay = new Map();
  list.forEach((s) => { if (s.endedAt) { const k = dayKey(s.endedAt); byDay.set(k, (byDay.get(k) || 0) + (s.durationSec || 0)); } });
  const keys = [];
  for (let i = days - 1; i >= 0; i--) keys.push(dayKey(new Date(Date.now() - i * 86400000)));
  const vals = keys.map((k) => (byDay.get(k) || 0) / 60);
  const max = Math.max(10, ...vals);
  const step = max > 120 ? 60 : max > 60 ? 30 : max > 30 ? 15 : 5;
  const top = Math.ceil(max / step) * step;
  const W = 720, H = 200, L = 44, B = 26, T = 10, R = 8;
  const bw = (W - L - R) / keys.length;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Günlük toplam çalışma süresi (dakika)">`;
  for (let v = 0; v <= top; v += step) {
    svg += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  keys.forEach((k, i) => {
    const v = vals[i], x = L + i * bw, h = Math.max(0, y(0) - y(v));
    const w = Math.max(2, bw - 2);
    const d = new Date(k + 'T12:00:00');
    if (v > 0) svg += `<path class="bar" d="M${x + 1} ${y(0)} V${y(0) - h + Math.min(4, h)} q0 -${Math.min(4, h)} ${Math.min(4, w / 2)} -${Math.min(4, h)} H${x + 1 + w - Math.min(4, w / 2)} q${Math.min(4, w / 2)} 0 ${Math.min(4, w / 2)} ${Math.min(4, h)} V${y(0)} Z"/>`;
    svg += `<rect class="hit" x="${x}" y="${T}" width="${bw}" height="${H - T - B}" data-tip="${esc(d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }))} · ${Math.round(v)} dk"/>`;
    const every = keys.length > 31 ? 7 : keys.length > 10 ? 3 : 1;
    if ((keys.length - 1 - i) % every === 0) svg += `<text class="ax" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${d.getDate()}.${d.getMonth() + 1}</text>`;
  });
  svg += '</svg>';
  $('#chart').innerHTML = svg;
  $('#chart-note').textContent = `dakika · son ${days} gün`;
  $('#chart').querySelectorAll('.hit').forEach((r) => {
    r.addEventListener('pointerenter', (e) => showTip(e, r.dataset.tip));
    r.addEventListener('pointermove', (e) => showTip(e, r.dataset.tip));
    r.addEventListener('pointerleave', hideTip);
  });
}
function showTip(e, text) {
  const t = $('#tip');
  t.textContent = text; t.hidden = false;
  t.style.left = Math.min(e.clientX + 12, innerWidth - t.offsetWidth - 8) + 'px';
  t.style.top = (e.clientY - 36) + 'px';
}
function hideTip() { $('#tip').hidden = true; }

function accCell(p) {
  if (p == null) return '<td class="n muted">–</td>';
  return `<td class="n"><span class="meter"><i style="width:${p}%"></i></span>%${p}</td>`;
}

// Bir öğrencinin uygulama ilerlemesi (XP, rozetler, rekorlar) — users/{uid}.progress.{app}
function progressOf(u, app = 'almanca') { return (u && u.progress && u.progress[app]) || null; }

// Öğrenci satırları: sınıf listesindeki herkes + giriş yapmış hesaplar + oturumu olanlar (e-postaya göre)
function studentRows(list) {
  const byEmail = userByEmail();
  const rows = new Map();
  const add = (email, name, kind) => {
    email = low(email);
    if (!email || rows.has(email) || !personMatches(email, kind, name)) return;
    rows.set(email, { email, list: [] });
  };
  const sessionFilter = $('#f-app').value || $('#f-game').value;
  if (!sessionFilter) {
    ROSTER.forEach((r, email) => add(email, r.ad, 'ogrenci'));
    USERS.forEach((u) => add(u.email, u.name, u.kind));
  }
  list.forEach((s) => { add(s.email, s.name, s.kind); rows.get(s.email)?.list.push(s); });
  return [...rows.values()].map((r) => {
    const u = byEmail.get(r.email);
    const t = sumUp(r.list);
    const last = r.list.reduce((m, s) => (s.endedAt && (!m || s.endedAt > m) ? s.endedAt : m), null);
    const p = progressOf(u);
    return {
      ...r, uid: u?.uid || '', name: nameOf(r.email, u?.name || r.list[0]?.name), sinif: classOf(r.email),
      joined: !!u, lastSeen: u?.lastSeen || null, xp: p ? p.xp || 0 : null, level: p ? levelOf(p.xp) : null,
      badges: p && Array.isArray(p.badges) ? p.badges.length : null,
      sessions: t.n, time: t.time, total: t.total, correct: t.correct, acc: t.acc, last,
    };
  });
}

function renderStudents(list) {
  const rows = studentRows(list);
  const { key, dir } = sortState;
  rows.sort((a, b) => {
    if (key === 'name') return dir * String(a.name || a.email).localeCompare(String(b.name || b.email), 'tr');
    if (key === 'sinif') return dir * (classSort(a.sinif || '~', b.sinif || '~') || String(a.name || a.email).localeCompare(String(b.name || b.email), 'tr'));
    const va = a[key] ?? -1, vb = b[key] ?? -1;
    return dir * ((va > vb) - (va < vb));
  });
  const th = (k, label, cls = '') => `<th class="${cls}" data-k="${k}" aria-sort="${key === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button">${label}${key === k ? (dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
  $('#t-students').innerHTML = `<thead><tr>${th('name', 'Öğrenci')}${th('sinif', 'Sınıf')}${th('level', 'Seviye', 'n')}${th('badges', 'Rozet', 'n')}${th('sessions', 'Oturum', 'n')}${th('time', 'Süre', 'n')}${th('acc', 'Doğruluk', 'n')}${th('last', 'Son çalışma', 'n')}</tr></thead>
    <tbody>${rows.map((r) => `<tr data-email="${esc(r.email)}" class="${r.email === selectedEmail ? 'sel' : ''} ${r.sessions ? '' : 'idle'}" tabindex="0">
      <td><b>${esc(r.name || '(adsız)')}</b><small>${esc(r.email)}</small></td>
      <td>${r.sinif ? esc(r.sinif) : '<span class="muted">listede yok</span>'}</td>
      <td class="n">${r.level != null ? `${r.level}<small>${r.xp} XP</small>` : '<span class="muted">–</span>'}</td>
      <td class="n">${r.badges ?? '<span class="muted">–</span>'}</td>
      <td class="n">${r.sessions}</td><td class="n">${r.sessions ? fmtDur(r.time) : '–'}</td>
      ${accCell(r.acc)}<td class="n">${r.last ? fmtDate(r.last) : `<span class="muted">${r.joined ? 'çalışmadı' : 'hiç girmedi'}</span>`}</td></tr>`).join('')
      || '<tr><td colspan="8" class="muted">Bu filtrelerle kayıt yok.</td></tr>'}</tbody>`;
  $('#t-students').querySelectorAll('th[data-k] button').forEach((b) => {
    b.onclick = () => {
      const k = b.parentElement.dataset.k;
      sortState = { key: k, dir: sortState.key === k ? -sortState.dir : (k === 'name' || k === 'sinif' ? 1 : -1) };
      renderStudents(filtered());
    };
  });
  $('#t-students').querySelectorAll('tbody tr[data-email]').forEach((tr) => {
    const open = () => { selectedEmail = tr.dataset.email; renderStudents(filtered()); renderDetail(selectedEmail); $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    tr.onclick = open;
    tr.onkeydown = (e) => { if (e.key === 'Enter') open(); };
  });
}

// Sınıf özeti: sınıf listesindeki her sınıf için (dönem, uygulama ve oyun filtreleri uygulanır)
function renderClasses() {
  $('#classes-empty').hidden = ROSTER.size > 0;
  $('#t-classes').parentElement.hidden = !ROSTER.size;
  if (!ROSTER.size) return;
  const app = $('#f-app').value, game = $('#f-game').value;
  const byEmail = userByEmail();
  const sessions = ALL.filter((s) => (!app || s.app === app) && (!game || `${s.app}|${s.game}` === game));
  const classes = new Map();
  ROSTER.forEach((r, email) => {
    if (!classes.has(r.sinif)) classes.set(r.sinif, { sinif: r.sinif, emails: new Set() });
    classes.get(r.sinif).emails.add(email);
  });
  const rows = [...classes.values()].sort((a, b) => classSort(a.sinif, b.sinif)).map((c) => {
    const list = sessions.filter((s) => c.emails.has(s.email));
    const t = sumUp(list);
    const active = new Set(list.map((s) => s.email)).size;
    const joined = [...c.emails].filter((e) => byEmail.has(e)).length;
    return { ...c, list, t, active, joined };
  });
  const cur = $('#f-sinif').value;
  $('#t-classes').innerHTML = `<thead><tr><th>Sınıf</th><th class="n">Listede</th><th class="n">Giriş yapan</th><th class="n">Bu dönemde çalışan</th><th class="n">Toplam süre</th><th class="n">Çalışan başına</th><th class="n">Doğruluk</th></tr></thead>
    <tbody>${rows.map((r) => `<tr data-sinif="${esc(r.sinif)}" class="${cur === r.sinif ? 'sel' : ''}" tabindex="0">
      <td><b>${esc(r.sinif)}</b></td><td class="n">${r.emails.size}</td><td class="n">${r.joined}</td>
      <td class="n">${r.active}<small>%${Math.round((r.active / r.emails.size) * 100)}</small></td>
      <td class="n">${r.t.time ? fmtDur(r.t.time) : '–'}</td><td class="n">${r.active ? fmtDur(r.t.time / r.active) : '–'}</td>${accCell(r.t.acc)}</tr>`).join('')}</tbody>`;
  $('#t-classes').querySelectorAll('tbody tr[data-sinif]').forEach((tr) => {
    const pickRow = () => { $('#f-sinif').value = $('#f-sinif').value === tr.dataset.sinif ? '' : tr.dataset.sinif; render(); };
    tr.onclick = pickRow;
    tr.onkeydown = (e) => { if (e.key === 'Enter') pickRow(); };
  });
}

function gameStats(list) {
  const by = new Map();
  list.forEach((s) => {
    const k = `${s.app}|${s.game}`;
    if (!by.has(k)) by.set(k, { app: s.app, game: s.game, list: [], people: new Set() });
    by.get(k).list.push(s); by.get(k).people.add(s.email);
  });
  return [...by.values()].map((g) => ({ ...g, ...sumUp(g.list) })).sort((a, b) => b.time - a.time);
}

function renderGames(list) {
  const rows = gameStats(list);
  $('#t-games').innerHTML = `<thead><tr><th>Uygulama · oyun</th><th class="n">Oturum</th><th class="n">Kişi</th><th class="n">Süre</th><th class="n">Cevap</th><th class="n">Doğruluk</th></tr></thead>
    <tbody>${rows.map((g) => `<tr><td><b>${esc(gameName(g.app, g.game))}</b><small>${esc(appName(g.app))}</small></td>
      <td class="n">${g.n}</td><td class="n">${g.people.size}</td><td class="n">${fmtDur(g.time)}</td><td class="n">${g.total}</td>${accCell(g.acc)}</tr>`).join('')
      || '<tr><td colspan="6" class="muted">Kayıt yok.</td></tr>'}</tbody>`;
}

function missedItems(list, minAsked = 3) {
  const by = new Map();
  list.forEach((s) => (s.items || []).forEach((it) => {
    const k = `${s.app}|${s.game}|${it.q}|${it.expected}`;
    if (!by.has(k)) by.set(k, { app: s.app, game: s.game, q: it.q, expected: it.expected, asked: 0, wrong: 0, givens: new Map() });
    const r = by.get(k);
    r.asked++;
    if (!it.ok) { r.wrong++; r.givens.set(it.given, (r.givens.get(it.given) || 0) + 1); }
  }));
  return [...by.values()].filter((r) => r.asked >= minAsked && r.wrong > 0)
    .map((r) => ({ ...r, rate: r.wrong / r.asked, top: [...r.givens.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '' }))
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong);
}

function renderMissed(list) {
  const rows = missedItems(list).slice(0, 25);
  $('#t-missed').innerHTML = `<thead><tr><th>Soru</th><th>Doğrusu</th><th>En sık verilen yanlış</th><th class="n">Yanlış / soruldu</th><th class="n">Yanlış oranı</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td><b>${esc(r.q)}</b><small>${esc(gameName(r.app, r.game))}</small></td><td>${esc(r.expected)}</td><td class="wrong">${esc(r.top)}</td>
      <td class="n">${r.wrong} / ${r.asked}</td>${accCell(Math.round(r.rate * 100))}</tr>`).join('')
      || '<tr><td colspan="5" class="muted">Henüz yeterli veri yok.</td></tr>'}</tbody>`;
}

function renderDetail(email) {
  const app = $('#f-app').value, game = $('#f-game').value;
  const all = ALL.filter((s) => s.email === email && (!app || s.app === app) && (!game || `${s.app}|${s.game}` === game));
  const u = userByEmail().get(email);
  const name = nameOf(email, u?.name || all[0]?.name);
  const t = sumUp(all);
  const games = gameStats(all);
  const missed = missedItems(all, 1).slice(0, 15);
  const p = progressOf(u);
  const badgeNames = (p?.badges || []).map((b) => APPS.almanca.badges[b] || b);
  const best = Object.entries(p?.best || {});
  const box = $('#detail');
  box.hidden = false;
  box.innerHTML = `
    <div class="panel-head">
      <h2 class="section-title">${esc(name || email)}</h2>
      <button type="button" class="btn ghost small" id="d-close">Kapat</button>
    </div>
    <p class="section-sub">${esc(email)}${classOf(email) ? ` · <b>${esc(classOf(email))}</b>` : ' · sınıf listesinde yok'}${u?.lastSeen ? ` · son giriş ${fmtDateTime(u.lastSeen)}` : ' · henüz giriş yapmadı'}</p>
    <div class="tiles">${[
      tile('Seviye', p ? levelOf(p.xp) : '–', p ? `${p.xp || 0} XP` : 'ilerleme yok'),
      tile('Gün serisi', p ? p.streak || 0 : '–', p?.lastDay ? `son gün ${p.lastDay}` : ''),
      tile('Süre (dönem)', fmtDur(t.time), `${t.n} oturum`),
      tile('Doğruluk (dönem)', fmtPct(t.acc), `${t.correct} / ${t.total} cevap`),
    ].join('')}</div>
    <div class="cols">
      <div>
        <h3 class="sub-title">Rozetler</h3>
        <p>${badgeNames.length ? badgeNames.map((b) => `<span class="pill">${esc(b)}</span>`).join(' ') : '<span class="muted">Henüz rozet yok.</span>'}</p>
      </div>
      <div>
        <h3 class="sub-title">Rekorlar</h3>
        <p>${best.length ? best.map(([g, v]) => `<span class="pill">${esc(gameName('almanca', g))}: ${v}</span>`).join(' ') : '<span class="muted">Henüz rekor yok.</span>'}</p>
      </div>
    </div>
    <div class="cols">
      <div>
        <h3 class="sub-title">Oyunlara göre</h3>
        <div class="table-wrap"><table><thead><tr><th>Oyun</th><th class="n">Oturum</th><th class="n">Süre</th><th class="n">Doğruluk</th></tr></thead>
        <tbody>${games.map((g) => `<tr><td>${esc(gameName(g.app, g.game))}<small>${esc(appName(g.app))}</small></td><td class="n">${g.n}</td><td class="n">${fmtDur(g.time)}</td>${accCell(g.acc)}</tr>`).join('') || '<tr><td colspan="4" class="muted">Bu dönemde çalışma yok.</td></tr>'}</tbody></table></div>
      </div>
      <div>
        <h3 class="sub-title">Yanlış yaptıkları</h3>
        <div class="table-wrap"><table><thead><tr><th>Soru</th><th>Doğrusu</th><th>Verdiği</th><th class="n">Kez</th></tr></thead>
        <tbody>${missed.map((r) => `<tr><td>${esc(r.q)}<small>${esc(gameName(r.app, r.game))}</small></td><td>${esc(r.expected)}</td><td class="wrong">${esc(r.top)}</td><td class="n">${r.wrong}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Yanlış cevap yok.</td></tr>'}</tbody></table></div>
      </div>
    </div>
    <h3 class="sub-title">Oturumlar</h3>
    <div class="table-wrap"><table><thead><tr><th>Ne zaman</th><th>Oyun</th><th class="n">Süre</th><th class="n">Doğru</th><th class="n">Puan</th><th>Durum</th></tr></thead>
    <tbody>${all.slice(0, 100).map((s) => `<tr><td>${fmtDateTime(s.endedAt)}</td><td>${esc(gameName(s.app, s.game))}<small>${esc(appName(s.app))}</small></td>
      <td class="n">${fmtDur(s.durationSec)}</td><td class="n">${s.correct} / ${s.total}</td><td class="n">${s.score ?? 0}</td>
      <td>${s.completed ? 'tamamladı' : '<span class="muted">yarıda bıraktı</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Oturum yok.</td></tr>'}</tbody></table></div>`;
  $('#d-close').onclick = () => { selectedEmail = null; box.hidden = true; renderStudents(filtered()); };
}

// ---------- Sınıf listesi yükleme ----------
// Excel'den kopyalanan satırlar (sekmeyle ayrılmış) ya da CSV (; veya ,) kabul edilir.
// Her satırda e-posta (@ içeren hücre) ve sınıf (ör. 9-A, 9A, 9/A, 10 B, Hazırlık A) bulunur; kalan hücreler ad soyaddır.
const CLASS_RE = /^\s*(\d{1,2}|haz[ıi]rl[ıi]k|hz)\s*[-/.\s]?\s*([a-zçğıöşü])?\s*(\.?\s*s[ıi]n[ıi]f)?\s*$/i;
function normClass(cell) {
  const m = String(cell).match(CLASS_RE);
  if (!m) return null;
  const grade = /^\d/.test(m[1]) ? String(Number(m[1])) : 'Hazırlık';
  return m[2] ? `${grade}-${m[2].toLocaleUpperCase('tr')}` : grade;
}
function parseRoster(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: [], bad: [] };
  const sep = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.includes(';')) ? ';' : ',';
  const ok = new Map(), bad = [];
  lines.forEach((line, i) => {
    const cells = line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
    const emailCell = cells.find((c) => c.includes('@'));
    if (!emailCell) {
      // İlk satır başlık olabilir ("E-posta;Sınıf;Ad Soyad") — sessizce atla
      if (i > 0 || !/posta|mail|s[ıi]n[ıi]f|ad/i.test(line)) bad.push({ line, why: 'e-posta yok' });
      return;
    }
    const email = low(emailCell);
    if (!/^[^@\s]+@(stu\.)?alkev\.k12\.tr$/.test(email)) { bad.push({ line, why: 'okul e-postası değil' }); return; }
    const rest = cells.filter((c) => c !== emailCell && c);
    const clsCell = rest.find((c) => normClass(c));
    if (!clsCell) { bad.push({ line, why: 'sınıf bulunamadı' }); return; }
    const ad = rest.filter((c) => c !== clsCell).join(' ').replace(/\s+/g, ' ').slice(0, 80);
    ok.set(email, { email, sinif: normClass(clsCell), ad });
  });
  return { ok: [...ok.values()], bad };
}

let pending = null;
function previewRoster(text) {
  pending = parseRoster(text);
  const { ok, bad } = pending;
  const per = new Map();
  ok.forEach((r) => per.set(r.sinif, (per.get(r.sinif) || 0) + 1));
  const changed = ok.filter((r) => { const cur = ROSTER.get(r.email); return !cur || cur.sinif !== r.sinif || (r.ad && cur.ad !== r.ad); }).length;
  $('#r-preview').innerHTML = !ok.length && !bad.length ? '' : `
    <p><b>${ok.length}</b> öğrenci okundu · ${[...per.entries()].sort((a, b) => classSort(a[0], b[0])).map(([c, n]) => `<span class="pill">${esc(c)}: ${n}</span>`).join(' ')}</p>
    <p class="muted">${changed} kayıt yeni ya da değişecek.${bad.length ? ` <b class="wrong">${bad.length} satır okunamadı</b> (aşağıda).` : ''}</p>
    ${ok.length ? `<div class="table-wrap short"><table><thead><tr><th>E-posta</th><th>Sınıf</th><th>Ad soyad</th></tr></thead><tbody>${ok.slice(0, 8).map((r) => `<tr><td>${esc(r.email)}</td><td>${esc(r.sinif)}</td><td>${esc(r.ad)}</td></tr>`).join('')}${ok.length > 8 ? `<tr><td colspan="3" class="muted">… ve ${ok.length - 8} öğrenci daha</td></tr>` : ''}</tbody></table></div>` : ''}
    ${bad.length ? `<div class="table-wrap short"><table><thead><tr><th>Okunamayan satır</th><th>Neden</th></tr></thead><tbody>${bad.slice(0, 20).map((b) => `<tr><td>${esc(b.line)}</td><td class="wrong">${b.why}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  $('#r-save').disabled = !ok.length;
}

async function saveRoster() {
  const { fb, user } = window.Okul;
  const rows = pending?.ok || [];
  if (!rows.length) return;
  $('#r-save').disabled = true;
  $('#r-status').textContent = 'Kaydediliyor…';
  try {
    for (let i = 0; i < rows.length; i += 400) {   // Firestore toplu yazma sınırı 500
      const batch = fb.writeBatch(fb.db);
      rows.slice(i, i + 400).forEach((r) => {
        const data = { sinif: r.sinif, guncelleyen: user.email, guncelleme: fb.serverTimestamp() };
        if (r.ad) data.ad = r.ad;
        batch.set(fb.doc(fb.db, 'sinif_listesi', r.email), data, { merge: true });
      });
      await batch.commit();
    }
    $('#r-status').textContent = `${rows.length} öğrenci kaydedildi.`;
    $('#r-text').value = ''; pending = null; $('#r-preview').innerHTML = '';
    await load();
  } catch (e) {
    $('#r-status').textContent = `Kaydedilemedi (${e.code || e.message}).`;
    $('#r-save').disabled = false;
  }
}

function renderRosterSummary() {
  const per = new Map();
  ROSTER.forEach((r) => per.set(r.sinif, (per.get(r.sinif) || 0) + 1));
  const joinedEmails = new Set(USERS.filter((u) => u.kind === 'ogrenci').map((u) => u.email));
  const notListed = [...joinedEmails].filter((e) => !ROSTER.has(e)).length;
  $('#r-current').innerHTML = ROSTER.size
    ? `Şu an listede <b>${ROSTER.size}</b> öğrenci: ${[...per.entries()].sort((a, b) => classSort(a[0], b[0])).map(([c, n]) => `<span class="pill">${esc(c)}: ${n}</span>`).join(' ')}`
      + (notListed ? `<br><span class="wrong">${notListed} öğrenci giriş yapmış ama listede yok</span> (Öğrenciler tablosunda "listede yok" olarak görünür).` : '')
    : 'Henüz sınıf listesi yüklenmedi.';
  $('#r-clear').hidden = !ROSTER.size;
}

async function clearRoster(btn) {
  if (!btn.dataset.armed) {
    btn.dataset.armed = '1';
    btn.textContent = `Emin misiniz? ${ROSTER.size} kayıt silinecek — tekrar basın`;
    setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'Listeyi temizle'; }, 5000);
    return;
  }
  delete btn.dataset.armed;
  const { fb } = window.Okul;
  const emails = [...ROSTER.keys()];
  $('#r-status').textContent = 'Siliniyor…';
  try {
    for (let i = 0; i < emails.length; i += 400) {
      const batch = fb.writeBatch(fb.db);
      emails.slice(i, i + 400).forEach((e) => batch.delete(fb.doc(fb.db, 'sinif_listesi', e)));
      await batch.commit();
    }
    $('#r-status').textContent = 'Sınıf listesi temizlendi.';
    btn.textContent = 'Listeyi temizle';
    await load();
  } catch (e) { $('#r-status').textContent = `Silinemedi (${e.code || e.message}).`; }
}

// ---------- CSV ----------
function downloadCSV(name, header, rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$('#csv-students').onclick = () => {
  const rows = studentRows(filtered());
  downloadCSV(`ogrenciler-${dayKey(new Date())}.csv`, ['Ad', 'E-posta', 'Sınıf', 'Seviye', 'XP', 'Rozet', 'Oturum', 'Süre (dk)', 'Cevap', 'Doğru', 'Doğruluk %', 'Son çalışma'],
    rows.map((r) => [r.name, r.email, r.sinif, r.level ?? '', r.xp ?? '', r.badges ?? '', r.sessions, Math.round(r.time / 60), r.total, r.correct, r.acc ?? '', r.last ? dayKey(r.last) : '']));
};
$('#csv-sessions').onclick = () => {
  downloadCSV(`oturumlar-${dayKey(new Date())}.csv`, ['Tarih', 'Ad', 'E-posta', 'Sınıf', 'Uygulama', 'Oyun', 'Tema', 'Süre (sn)', 'Cevap', 'Doğru', 'Yanlış', 'Puan', 'Tamamlandı'],
    filtered().map((s) => [s.endedAt ? s.endedAt.toISOString() : '', nameOf(s.email, s.name), s.email, classOf(s.email), appName(s.app), gameName(s.app, s.game), s.theme, s.durationSec, s.total, s.correct, s.wrong, s.score, s.completed ? 'evet' : 'hayır']));
};

// ---------- Başlat ----------
['#f-app', '#f-game', '#f-sinif'].forEach((id) => $(id).addEventListener('change', () => { if (id === '#f-app') fillSelects(); render(); }));
$('#f-q').addEventListener('input', () => render());
$('#f-range').addEventListener('change', () => load().catch(showError));
$('#f-refresh').addEventListener('click', () => load().catch(showError));
$('#r-text').addEventListener('input', () => previewRoster($('#r-text').value));
$('#r-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const buf = await f.arrayBuffer();
  // Excel'in "CSV" kaydı Türkçe Windows'ta UTF-8 olmayabilir: önce UTF-8, bozuksa Windows-1254 dene
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('windows-1254').decode(buf);
  $('#r-text').value = text;
  previewRoster(text);
});
$('#r-save').addEventListener('click', saveRoster);
$('#r-clear').addEventListener('click', (e) => clearRoster(e.currentTarget));
function showError(e) {
  $('#status').textContent = e.code === 'permission-denied'
    ? 'Erişim reddedildi: bu hesap yönetici olarak tanımlı değil ya da Firestore kuralları güncel değil.'
    : `Kayıtlar yüklenemedi (${e.code || e.message}).`;
}

window.Okul.onReady((user) => {
  if (window.Okul.demo) {
    $('#denied').hidden = false;
    $('#denied').innerHTML = '<b>Firebase henüz yapılandırılmadı.</b> v2/firebase-config.js dosyasına proje ayarlarını girdikten sonra rapor paneli çalışır.';
    return;
  }
  if (!user.admin) { $('#denied').hidden = false; return; }
  $('#report').hidden = false;
  load().catch(showError);
});
