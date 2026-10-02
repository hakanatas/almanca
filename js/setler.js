// Rapor paneli: Hafıza oyunu için kelime setleri (hafiza_setleri koleksiyonu).
// Öğretmen js/data.js'teki kelime havuzundan seçer; öğrenciler oyunu açınca bu setlerden birini seçer.

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const low = (s) => String(s || '').trim().toLocaleLowerCase('tr');
const keyOf = (w) => `${w.art} ${w.de}`;
const MIN = 4, MAX = 60;

const POOL = THEMES.flatMap((t) => t.words.map((w) => ({ ...w, theme: t })));
const BY_KEY = new Map(POOL.map((w) => [keyOf(w), w]));

let SETS = [];
let CLASSES = [];
let edit = null;   // { id|null, picked: Set<key>, classes: Set<sinif> }

async function loadSets() {
  const { fb } = window.Okul;
  const [snap, rsnap] = await Promise.all([
    fb.getDocs(fb.collection(fb.db, 'hafiza_setleri')),
    fb.getDocs(fb.collection(fb.db, 'sinif_listesi')),
  ]);
  SETS = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.ad).localeCompare(String(b.ad), 'tr', { numeric: true }));
  CLASSES = [...new Set(rsnap.docs.map((d) => d.data().sinif).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  renderList();
}

function renderList() {
  const box = $('#s-list');
  if (!SETS.length) {
    box.innerHTML = '<p class="muted">Henüz kelime seti yok. Set yoksa öğrenciler hafıza oyununu seçtikleri temanın kelimeleriyle oynar.</p>';
    return;
  }
  box.innerHTML = SETS.map((x) => {
    const words = (x.kelimeler || []).map((k) => BY_KEY.get(k)).filter(Boolean);
    const missing = (x.kelimeler || []).length - words.length;
    const who = (x.siniflar || []).length ? x.siniflar.map(esc).join(', ') : 'Bütün sınıflar';
    return `<article class="s-card" data-id="${esc(x.id)}">
      <div class="s-card-top"><b>${esc(x.ad)}</b><button type="button" class="btn ghost small" data-edit="${esc(x.id)}">Düzenle</button></div>
      <p class="s-meta">${words.length} kelime · ${who}${missing ? ` · <span class="warn">${missing} kelime havuzda yok</span>` : ''}</p>
      <p class="s-words">${words.slice(0, 14).map((w) => `<span>${w.e} <i class="t-${w.art}">${w.art}</i> ${esc(w.de)}</span>`).join('')}${words.length > 14 ? `<span>+${words.length - 14}</span>` : ''}</p>
    </article>`;
  }).join('');
  box.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEditor(SETS.find((x) => x.id === b.dataset.edit))));
}

function openEditor(set) {
  edit = {
    id: set ? set.id : null,
    picked: new Set((set?.kelimeler || []).filter((k) => BY_KEY.has(k))),
    classes: new Set(set?.siniflar || []),
  };
  $('#s-name').value = set ? set.ad : '';
  $('#s-q').value = '';
  $('#s-status').textContent = '';
  $('#s-delete').hidden = !set;
  $('#s-delete').textContent = 'Seti sil';
  delete $('#s-delete').dataset.armed;
  $('#s-editor').hidden = false;
  $('#s-new').hidden = true;
  renderClasses();
  renderPool();
  $('#s-name').focus();
  $('#s-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeEditor() {
  edit = null;
  $('#s-editor').hidden = true;
  $('#s-new').hidden = false;
}

function renderClasses() {
  const box = $('#s-classes');
  const all = !edit.classes.size;
  box.innerHTML = `<button type="button" class="chip" aria-pressed="${all}" data-all>Bütün sınıflar</button>`
    + CLASSES.map((c) => `<button type="button" class="chip" aria-pressed="${edit.classes.has(c)}" data-c="${esc(c)}">${esc(c)}</button>`).join('')
    + (CLASSES.length ? '' : '<span class="muted small">Sınıf listesi yüklenince sınıflar burada çıkar.</span>');
  box.querySelector('[data-all]').onclick = () => { edit.classes.clear(); renderClasses(); };
  box.querySelectorAll('[data-c]').forEach((b) => {
    b.onclick = () => { const c = b.dataset.c; if (edit.classes.has(c)) edit.classes.delete(c); else edit.classes.add(c); renderClasses(); };
  });
}

function renderPool() {
  const q = low($('#s-q').value);
  const match = (w) => !q || low(w.de).includes(q) || low(w.tr).includes(q) || low(keyOf(w)).includes(q);
  const pool = $('#s-pool');
  pool.innerHTML = THEMES.map((t) => {
    const ws = t.words.filter(match);
    if (!ws.length) return '';
    const allOn = ws.every((w) => edit.picked.has(keyOf(w)));
    return `<div class="s-theme">
      <div class="s-theme-head"><h3>${t.icon} ${esc(t.tr)} <small>${esc(t.de)}</small></h3>
        <button type="button" class="link" data-theme="${esc(t.id)}">${allOn ? 'Hiçbirini seçme' : 'Hepsini seç'}</button></div>
      <div class="chips">${ws.map((w) => `<button type="button" class="chip word" aria-pressed="${edit.picked.has(keyOf(w))}" data-k="${esc(keyOf(w))}">
        <span class="e">${w.e}</span><i class="t-${w.art}">${w.art}</i> ${esc(w.de)}<small>${esc(w.tr)}</small></button>`).join('')}</div>
    </div>`;
  }).join('') || '<p class="muted">Aramaya uyan kelime yok.</p>';
  pool.querySelectorAll('[data-k]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k;
      if (edit.picked.has(k)) edit.picked.delete(k); else if (edit.picked.size < MAX) edit.picked.add(k);
      b.setAttribute('aria-pressed', String(edit.picked.has(k)));
      renderCount();
    };
  });
  pool.querySelectorAll('[data-theme]').forEach((b) => {
    b.onclick = () => {
      const t = THEMES.find((x) => x.id === b.dataset.theme);
      const ws = t.words.filter(match);
      const allOn = ws.every((w) => edit.picked.has(keyOf(w)));
      ws.forEach((w) => { if (allOn) edit.picked.delete(keyOf(w)); else if (edit.picked.size < MAX) edit.picked.add(keyOf(w)); });
      renderPool();
    };
  });
  renderCount();
}

function renderCount() {
  const n = edit.picked.size;
  $('#s-count').innerHTML = `<b>${n}</b> kelime seçildi ${n < MIN ? `· en az ${MIN}` : n >= MAX ? `· en fazla ${MAX}` : ''}`;
  $('#s-save').disabled = n < MIN;
  const picked = [...edit.picked].map((k) => BY_KEY.get(k)).filter(Boolean);
  $('#s-picked').innerHTML = picked.length
    ? picked.map((w) => `<button type="button" class="chip on" data-rm="${esc(keyOf(w))}" title="Setten çıkar">${w.e} <i class="t-${w.art}">${w.art}</i> ${esc(w.de)} ×</button>`).join('')
    : '<span class="muted small">Aşağıdan kelimelere tıklayarak sete ekleyin.</span>';
  $('#s-picked').querySelectorAll('[data-rm]').forEach((b) => { b.onclick = () => { edit.picked.delete(b.dataset.rm); renderPool(); }; });
}

async function saveSet() {
  const { fb, user } = window.Okul;
  const ad = $('#s-name').value.trim();
  if (!ad) { $('#s-status').textContent = 'Sete bir ad verin.'; $('#s-name').focus(); return; }
  if (edit.picked.size < MIN) return;
  const data = {
    ad: ad.slice(0, 60),
    kelimeler: [...edit.picked],
    siniflar: [...edit.classes],
    olusturan: user.email,
    guncelleme: fb.serverTimestamp(),
  };
  $('#s-save').disabled = true;
  $('#s-status').textContent = 'Kaydediliyor…';
  try {
    if (edit.id) await fb.setDoc(fb.doc(fb.db, 'hafiza_setleri', edit.id), data);
    else await fb.addDoc(fb.collection(fb.db, 'hafiza_setleri'), data);
    closeEditor();
    await loadSets();
  } catch (e) {
    $('#s-status').textContent = e.code === 'permission-denied'
      ? 'Kaydedilemedi: Firestore kuralları güncel değil (README\'deki adımla yeniden yayımlayın).'
      : `Kaydedilemedi (${e.code || e.message}).`;
    $('#s-save').disabled = false;
  }
}

async function deleteSet(btn) {
  if (!btn.dataset.armed) {
    btn.dataset.armed = '1';
    btn.textContent = 'Emin misiniz? Tekrar basın';
    setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = 'Seti sil'; } }, 4000);
    return;
  }
  const { fb } = window.Okul;
  $('#s-status').textContent = 'Siliniyor…';
  try {
    await fb.deleteDoc(fb.doc(fb.db, 'hafiza_setleri', edit.id));
    closeEditor();
    await loadSets();
  } catch (e) {
    $('#s-status').textContent = `Silinemedi (${e.code || e.message}).`;
  }
}

$('#s-new').addEventListener('click', () => openEditor(null));
$('#s-cancel').addEventListener('click', closeEditor);
$('#s-save').addEventListener('click', saveSet);
$('#s-delete').addEventListener('click', (e) => deleteSet(e.currentTarget));
$('#s-q').addEventListener('input', () => edit && renderPool());

window.Okul.onReady((user) => {
  if (window.Okul.demo || !user.admin) return;
  loadSets().catch((e) => {
    $('#s-list').innerHTML = `<p class="muted">Kelime setleri okunamadı (${esc(e.code || e.message)}). Firestore kurallarının güncel olduğundan emin olun.</p>`;
  });
});
