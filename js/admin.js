// Yönetici rapor paneli: sessions ve users koleksiyonlarını okuyup özetler.
// Veriler tarayıcıda hesaplanır; Firestore kuralları yalnızca yöneticinin okumasına izin verir.

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Uygulama ve oyun adları (yeni uygulama eklendikçe buraya eklenir; bilinmeyenler kimliğiyle görünür)
const APPS = {
  almanca: {
    name: 'Deutsch Macerası',
    games: { artikel: 'Artikel Avı', memory: 'Hafıza Kartları', listen: 'Hör zu!', satz: 'Cümle Treni', verb: 'Fiil Roketi' },
  },
};
const appName = (a) => APPS[a]?.name || a;
const gameName = (a, g) => APPS[a]?.games?.[g] || g;

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

let ALL = [];        // oturumlar (seçili dönem)
let USERS = [];      // tüm kullanıcı profilleri
let sortState = { key: 'time', dir: -1 };
let selectedUid = null;

// ---------- Veri ----------
async function load() {
  const { fb } = window.Okul;
  const days = Number($('#f-range').value);
  const since = new Date(Date.now() - days * 86400000);
  $('#status').textContent = 'Kayıtlar yükleniyor…';
  const q = fb.query(fb.collection(fb.db, 'sessions'), fb.where('endedAt', '>=', since), fb.orderBy('endedAt', 'desc'), fb.limit(10000));
  const [snap, usnap] = await Promise.all([fb.getDocs(q), fb.getDocs(fb.collection(fb.db, 'users'))]);
  ALL = snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, ...x, endedAt: toDate(x.endedAt) || toDate(x.startedAt), startedAt: toDate(x.startedAt) };
  });
  USERS = usnap.docs.map((d) => ({ uid: d.id, ...d.data(), lastSeen: toDate(d.data().lastSeen) }));
  fillSelects();
  render();
  $('#status').textContent = `${ALL.length} oturum yüklendi · ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    + (ALL.length >= 10000 ? ' · Çok kayıt var, daha kısa bir dönem seçin.' : '');
}

function fillSelects() {
  const appSel = $('#f-app'), gameSel = $('#f-game');
  const curA = appSel.value, curG = gameSel.value;
  const apps = [...new Set(ALL.map((s) => s.app))].sort();
  appSel.innerHTML = '<option value="">Hepsi</option>' + apps.map((a) => `<option value="${esc(a)}">${esc(appName(a))}</option>`).join('');
  appSel.value = apps.includes(curA) ? curA : '';
  const games = [...new Set(ALL.filter((s) => !appSel.value || s.app === appSel.value).map((s) => `${s.app}|${s.game}`))].sort();
  gameSel.innerHTML = '<option value="">Hepsi</option>' + games.map((k) => {
    const [a, g] = k.split('|');
    return `<option value="${esc(k)}">${esc(appSel.value ? gameName(a, g) : `${appName(a)} · ${gameName(a, g)}`)}</option>`;
  }).join('');
  gameSel.value = games.includes(curG) ? curG : '';
}

function filtered() {
  const app = $('#f-app').value, game = $('#f-game').value, kind = $('#f-kind').value;
  const q = $('#f-q').value.trim().toLocaleLowerCase('tr');
  return ALL.filter((s) => (!app || s.app === app)
    && (!game || `${s.app}|${s.game}` === game)
    && (!kind || s.kind === kind)
    && (!q || `${s.name} ${s.email}`.toLocaleLowerCase('tr').includes(q)));
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
  renderStudents(list);
  renderGames(list);
  renderMissed(list);
  if (selectedUid) renderDetail(selectedUid);
}

function tile(label, value, sub = '') {
  return `<div class="tile"><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
}

function renderTiles(list) {
  const t = sumUp(list);
  const active = new Set(list.map((s) => s.uid)).size;
  const kind = $('#f-kind').value;
  const registered = USERS.filter((u) => !kind || u.kind === kind).length;
  $('#tiles').innerHTML = [
    tile('Çalışan kişi', active, `${registered} kayıtlı hesap`),
    tile('Toplam süre', fmtDur(t.time), active ? `kişi başı ${fmtDur(t.time / active)}` : ''),
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

function studentRows(list) {
  const kind = $('#f-kind').value;
  const q = $('#f-q').value.trim().toLocaleLowerCase('tr');
  const by = new Map();
  // Dönemde hiç çalışmamış kayıtlı hesaplar da listede görünsün (filtre uygulama/oyun değilse)
  if (!$('#f-app').value && !$('#f-game').value) {
    USERS.filter((u) => (!kind || u.kind === kind) && (!q || `${u.name} ${u.email}`.toLocaleLowerCase('tr').includes(q)))
      .forEach((u) => by.set(u.uid, { uid: u.uid, name: u.name, email: u.email, list: [] }));
  }
  list.forEach((s) => {
    if (!by.has(s.uid)) by.set(s.uid, { uid: s.uid, name: s.name, email: s.email, list: [] });
    by.get(s.uid).list.push(s);
  });
  return [...by.values()].map((r) => {
    const t = sumUp(r.list);
    const last = r.list.reduce((m, s) => (s.endedAt && (!m || s.endedAt > m) ? s.endedAt : m), null);
    return { ...r, sessions: t.n, time: t.time, total: t.total, correct: t.correct, acc: t.acc, last };
  });
}

function renderStudents(list) {
  const rows = studentRows(list);
  const { key, dir } = sortState;
  rows.sort((a, b) => {
    const va = a[key] ?? (key === 'name' ? '' : -1), vb = b[key] ?? (key === 'name' ? '' : -1);
    if (key === 'name') return dir * String(a.name || a.email).localeCompare(String(b.name || b.email), 'tr');
    return dir * ((va > vb) - (va < vb));
  });
  const th = (k, label, cls = '') => `<th class="${cls}" data-k="${k}" aria-sort="${key === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button">${label}${key === k ? (dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
  $('#t-students').innerHTML = `<thead><tr>${th('name', 'Öğrenci')}${th('sessions', 'Oturum', 'n')}${th('time', 'Süre', 'n')}${th('total', 'Cevap', 'n')}${th('acc', 'Doğruluk', 'n')}${th('last', 'Son çalışma', 'n')}</tr></thead>
    <tbody>${rows.map((r) => `<tr data-uid="${esc(r.uid)}" class="${r.uid === selectedUid ? 'sel' : ''} ${r.sessions ? '' : 'idle'}" tabindex="0">
      <td><b>${esc(r.name || '(adsız)')}</b><small>${esc(r.email)}</small></td>
      <td class="n">${r.sessions}</td><td class="n">${r.sessions ? fmtDur(r.time) : '–'}</td><td class="n">${r.total}</td>
      ${accCell(r.acc)}<td class="n">${r.last ? fmtDate(r.last) : '<span class="muted">çalışmadı</span>'}</td></tr>`).join('')
      || '<tr><td colspan="6" class="muted">Bu filtrelerle kayıt yok.</td></tr>'}</tbody>`;
  $('#t-students').querySelectorAll('th[data-k] button').forEach((b) => {
    b.onclick = () => {
      const k = b.parentElement.dataset.k;
      sortState = { key: k, dir: sortState.key === k ? -sortState.dir : (k === 'name' ? 1 : -1) };
      renderStudents(filtered());
    };
  });
  $('#t-students').querySelectorAll('tbody tr[data-uid]').forEach((tr) => {
    const open = () => { selectedUid = tr.dataset.uid; renderStudents(filtered()); renderDetail(selectedUid); $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    tr.onclick = open;
    tr.onkeydown = (e) => { if (e.key === 'Enter') open(); };
  });
}

function gameStats(list) {
  const by = new Map();
  list.forEach((s) => {
    const k = `${s.app}|${s.game}`;
    if (!by.has(k)) by.set(k, { app: s.app, game: s.game, list: [], people: new Set() });
    by.get(k).list.push(s); by.get(k).people.add(s.uid);
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

function renderDetail(uid) {
  const all = filtered().filter((s) => s.uid === uid);
  const u = USERS.find((x) => x.uid === uid) || all[0] || {};
  const t = sumUp(all);
  const games = gameStats(all);
  const missed = missedItems(all, 1).slice(0, 15);
  const box = $('#detail');
  box.hidden = false;
  box.innerHTML = `
    <div class="panel-head">
      <h2 class="section-title">${esc(u.name || u.email || 'Öğrenci')}</h2>
      <button type="button" class="btn ghost small" id="d-close">Kapat</button>
    </div>
    <p class="section-sub">${esc(u.email || '')}${u.lastSeen ? ` · son giriş ${fmtDateTime(u.lastSeen)}` : ''}</p>
    <div class="tiles">${[
      tile('Süre', fmtDur(t.time)), tile('Oturum', t.n), tile('Cevap', t.total), tile('Doğruluk', fmtPct(t.acc)),
    ].join('')}</div>
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
  $('#d-close').onclick = () => { selectedUid = null; box.hidden = true; renderStudents(filtered()); };
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
  downloadCSV(`ogrenciler-${dayKey(new Date())}.csv`, ['Ad', 'E-posta', 'Oturum', 'Süre (dk)', 'Cevap', 'Doğru', 'Doğruluk %', 'Son çalışma'],
    rows.map((r) => [r.name, r.email, r.sessions, Math.round(r.time / 60), r.total, r.correct, r.acc ?? '', r.last ? dayKey(r.last) : '']));
};
$('#csv-sessions').onclick = () => {
  downloadCSV(`oturumlar-${dayKey(new Date())}.csv`, ['Tarih', 'Ad', 'E-posta', 'Uygulama', 'Oyun', 'Tema', 'Süre (sn)', 'Cevap', 'Doğru', 'Yanlış', 'Puan', 'Tamamlandı'],
    filtered().map((s) => [s.endedAt ? s.endedAt.toISOString() : '', s.name, s.email, appName(s.app), gameName(s.app, s.game), s.theme, s.durationSec, s.total, s.correct, s.wrong, s.score, s.completed ? 'evet' : 'hayır']));
};

// ---------- Başlat ----------
['#f-app', '#f-game', '#f-kind'].forEach((id) => $(id).addEventListener('change', () => { if (id === '#f-app') fillSelects(); render(); }));
$('#f-q').addEventListener('input', () => render());
$('#f-range').addEventListener('change', () => load().catch(showError));
$('#f-refresh').addEventListener('click', () => load().catch(showError));
function showError(e) {
  $('#status').textContent = e.code === 'permission-denied'
    ? 'Erişim reddedildi: bu hesap yönetici olarak tanımlı değil.'
    : `Kayıtlar yüklenemedi (${e.code || e.message}).`;
}

window.Okul.onReady((user) => {
  if (window.Okul.demo) {
    $('#denied').hidden = false;
    $('#denied').innerHTML = '<b>Firebase henüz yapılandırılmadı.</b> js/firebase-config.js dosyasına proje ayarlarını girdikten sonra rapor paneli çalışır.';
    return;
  }
  if (!user.admin) { $('#denied').hidden = false; return; }
  $('#report').hidden = false;
  load().catch(showError);
});
