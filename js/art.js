// Grafik varlıklar: mürekkep çizimi maskot Max (Dackel), oyun ikonları, el çizimi detaylar.
// Renkler style.css'teki token'lardan gelir; animasyonlar da orada.

// Sayfaya bir kez eklenen ortak SVG tanımları: mürekkep titreşimi filtreleri ve gölge dolgusu.
const INK_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="ink1" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
    <filter id="ink2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
    <filter id="ink3" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="13"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
    <radialGradient id="mx-grey" cx=".38" cy=".3" r=".8">
      <stop offset="0" stop-color="#ece7dc"/><stop offset=".62" stop-color="#bdb5a7"/><stop offset="1" stop-color="#857c6f"/>
    </radialGradient>
    <radialGradient id="mx-ear" cx=".4" cy=".3" r=".9">
      <stop offset="0" stop-color="#7b7366"/><stop offset="1" stop-color="#3d3830"/>
    </radialGradient>
  </defs>
</svg>`;

// Max'in Gardırobu: seçilen aksesuarlar (window.MAX_OUTFIT = { hat, eyes, neck }) başa çizilir
const ACCESSORIES = {
  kep:      { slot: 'hat',  name: 'Kep',               level: 2, svg: `<path class="acc" style="--c:var(--der)" d="M168 35 C166 19 200 12 207 31 Z"/><path class="acc" style="--c:var(--der)" d="M201 31 Q216 28 227 34 Q214 39 201 36 Z"/><circle class="acc" style="--c:var(--paper)" cx="186" cy="18" r="2.5"/>` },
  tiroler:  { slot: 'hat',  name: 'Bavyera şapkası',   level: 4, svg: `<ellipse class="acc" style="--c:var(--das)" cx="188" cy="31" rx="26" ry="5.5"/><path class="acc" style="--c:var(--das)" d="M172 31 C172 14 202 11 205 30 Z"/><path class="acc-line" style="--c:var(--die)" d="M173 26 Q188 22 204 25"/><path class="acc" style="--c:var(--amber)" d="M200 24 C206 10 214 4 216 2 C212 12 208 20 203 26 Z"/>` },
  tac:      { slot: 'hat',  name: 'Kral tacı',         level: 6, svg: `<path class="acc" style="--c:var(--amber)" d="M171 33 L174 12 L182 23 L189 8 L196 23 L204 12 L206 33 Z"/><circle class="acc" style="--c:var(--die)" cx="189" cy="27" r="2.6"/><circle class="acc" style="--c:var(--der)" cx="179" cy="28" r="2"/><circle class="acc" style="--c:var(--das)" cx="199" cy="28" r="2"/>` },
  ninja:    { slot: 'hat',  name: 'Ninja bandı',       badge: 'kombo10', svg: `<path class="acc-line" style="--c:var(--die);stroke-width:7" d="M161 41 Q186 31 210 37"/><path class="acc-line" style="--c:var(--die);stroke-width:5" d="M163 41 Q152 46 146 54 M163 41 Q150 40 143 44"/>` },
  gunes:    { slot: 'eyes', name: 'Güneş gözlüğü',     level: 3, svg: `<path class="acc-line" d="M185 46 L166 43"/><path class="acc" style="--c:var(--ink)" d="M184 45 H206 Q206 58 195 58 Q184 58 184 45 Z"/><path class="acc-line" style="--c:var(--paper);stroke-width:1.6" d="M189 48 L193 48"/>` },
  yuvarlak: { slot: 'eyes', name: 'Yuvarlak gözlük',   level: 5, svg: `<path class="acc-line" d="M187 48 L167 44"/><circle class="acc-ring" cx="195" cy="50" r="8"/>` },
  atki:     { slot: 'neck', name: 'Kırmızı atkı',      level: 2, svg: `<path class="acc-line" style="--c:var(--die);stroke-width:10" d="M156 81 Q172 99 197 89"/><path class="acc" style="--c:var(--die)" d="M166 90 L160 110 L170 112 L174 93 Z"/>` },
  papyon:   { slot: 'neck', name: 'Papyon',            level: 4, svg: `<path class="acc" style="--c:var(--seal)" d="M176 96 L164 89 L164 103 Z M176 96 L188 89 L188 103 Z"/><circle class="acc" style="--c:var(--seal)" cx="176" cy="96" r="3"/>` },
  bayrak:   { slot: 'neck', name: 'Almanya atkısı',    level: 5, svg: `<path class="acc-line" style="--c:var(--ink);stroke-width:12" d="M156 81 Q172 99 197 89"/><path class="acc-line" style="--c:var(--die);stroke-width:7" d="M156 81 Q172 99 197 89"/><path class="acc-line" style="--c:var(--amber);stroke-width:2.6" d="M156 81 Q172 99 197 89"/>` },
};
function outfitLayers(slot) {
  const o = (typeof window !== 'undefined' && window.MAX_OUTFIT) || {};
  const a = ACCESSORIES[o[slot]];
  return a && a.slot === slot ? `<g class="acc-${slot}">${a.svg}</g>` : '';
}

function maxSVG(extraClass = '') {
  const neck = outfitLayers('neck');
  return `
<svg class="max ${extraClass}${neck ? ' has-neck' : ''}" viewBox="0 0 240 160" aria-hidden="true">
  <g class="mx-ground">
    <path d="M6 146 C60 143 120 148 178 145 S226 146 236 145" fill="none" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="40" cy="150" r="1.4"/><circle cx="70" cy="152" r="1"/><circle cx="150" cy="151" r="1.5"/><circle cx="196" cy="150" r="1"/><circle cx="214" cy="152" r="1.3"/>
  </g>
  <g class="mx-all">
    <g class="mx-sparks">
      <path d="M150 20 l10 -6"/><path d="M176 10 l2 -10"/><path d="M204 16 l8 -8"/><path d="M226 34 l10 -2"/>
    </g>
    <g class="mx-inked">
      <g class="mx-tail"><path d="M54 90 C38 84 28 72 26 54" class="mx-stroke" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>
      <g class="mx-legs">
        <path d="M70 112 L67 140"/><path d="M86 114 L88 140"/><path d="M156 112 L153 140"/><path d="M172 110 L175 140"/>
        <ellipse cx="64" cy="141" rx="6" ry="3"/><ellipse cx="91" cy="141" rx="6" ry="3"/><ellipse cx="150" cy="141" rx="6" ry="3"/><ellipse cx="178" cy="141" rx="6" ry="3"/>
      </g>
      <g class="mx-body">
        <path class="mx-fill" d="M52 94 C50 72 70 64 102 64 L150 63 C176 62 190 76 188 94 C186 112 172 120 148 120 L92 120 C66 120 54 112 52 94Z"/>
        <path class="mx-hatch" d="M84 112 l7 -7 M98 114 l7 -7 M112 115 l7 -7 M126 115 l7 -7 M140 114 l7 -7"/>
      </g>
      <path class="mx-neck" d="M150 72 C156 60 164 52 172 50 L186 86 C174 92 160 90 150 86Z"/>
      <path class="mx-neckline" d="M150 70 C155 60 162 54 168 51"/>
      <g class="mx-head">
        <path class="mx-collar" d="M158 84 Q172 98 194 90"/>
        <circle class="mx-tag" cx="172" cy="96" r="4.5"/>
        <path class="mx-fill" d="M160 52 C158 36 172 28 186 29 C200 30 208 40 208 52 C218 54 230 60 229 71 C228 81 218 85 206 85 C196 88 184 89 176 86 C162 82 160 68 160 52Z"/>
        <ellipse class="mx-nose" cx="227" cy="64" rx="5.5" ry="4.6"/>
        <g class="mx-eye"><ellipse class="mx-dot" cx="194" cy="50" rx="4" ry="4.6"/><circle class="mx-glint" cx="195.6" cy="48.4" r="1.3"/></g>
        <path class="mx-brow" d="M186 38 Q194 34 202 38"/>
        <path class="mx-happy mx-line" d="M204 77 Q212 84 221 77"/>
        <path class="mx-sad mx-line" d="M205 82 Q213 75 221 82"/>
        <path class="mx-cheek" d="M200 64 q4 2 8 0"/>
        <g class="mx-ear"><path class="mx-earfill" d="M172 34 C158 34 152 50 155 70 C157 81 168 82 170 72 C172 58 176 46 172 34Z"/></g>
        <path class="mx-hair" d="M184 29 q-2 -8 3 -12 M189 29 q1 -7 6 -9"/>
        ${neck}${outfitLayers('eyes')}${outfitLayers('hat')}
      </g>
    </g>
  </g>
</svg>`;
}

// Mürekkep çizimi oyun ikonları: siyah kontür, kehribar vurgu.
const ICONS = {
  run: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M4 42 L16 8 M24 42 V8 M44 42 L32 8" class="i-line" stroke-width="2" stroke-dasharray="4 4"/>
    <rect x="15" y="13" width="18" height="11" rx="2" class="i-soft"/>
    <circle cx="24" cy="34" r="7" class="i-main"/>
    <path d="M9 30 h-6 M10 36 h-7" class="i-line" stroke-width="2.4"/></svg>`,
  hunt: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M44 4 L27 19" class="i-line" stroke-width="5" stroke-linecap="round" opacity=".35"/>
    <circle cx="21" cy="24" r="10" class="i-soft"/>
    <circle cx="18" cy="21" r="2.6" class="i-paper"/><circle cx="24" cy="28" r="1.8" class="i-paper"/>
    <path d="M10 46 L21 26" class="i-line" stroke-width="2.4"/>
    <path d="M6 40 L10 46 L14 40 Z" class="i-ink"/>
    <path d="M38 30 l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5Z" class="i-main"/></svg>`,
  artikel: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="22" cy="26" r="17" class="i-soft"/><circle cx="22" cy="26" r="10.5" class="i-main"/><circle cx="22" cy="26" r="4" class="i-ink"/>
    <path d="M22 26 L40 8" class="i-line" stroke-width="2.6"/>
    <path d="M37 3 L45 3 L45 11 Z" class="i-ink"/></svg>`,
  memory: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="5" y="11" width="21" height="29" rx="3" class="i-soft" transform="rotate(-10 15 25)"/>
    <rect x="21" y="8" width="21" height="29" rx="3" class="i-main" transform="rotate(8 31 22)"/>
    <path d="M31 15 l2.3 4.8 5.2.6-3.9 3.6 1 5.1-4.6-2.6-4.6 2.6 1-5.1-3.9-3.6 5.2-.6Z" class="i-ink" transform="rotate(8 31 22)"/></svg>`,
  listen: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M5 18 h8 l11 -9 v30 l-11 -9 h-8 z" class="i-main"/>
    <path d="M30 17 q5 7 0 14" class="i-line" stroke-width="2.6"/>
    <path d="M35 11 q10 13 0 26" class="i-line" stroke-width="2.6"/></svg>`,
  satz: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="22" y="14" width="18" height="20" rx="2" class="i-soft"/>
    <rect x="5" y="22" width="20" height="12" rx="2" class="i-main"/>
    <rect x="27" y="18" width="9" height="7" rx="1.5" class="i-paper"/>
    <rect x="9" y="12" width="6" height="10" rx="1.5" class="i-soft"/>
    <circle cx="14" cy="37" r="4.5" class="i-ink"/><circle cx="33" cy="37" r="4.5" class="i-ink"/>
    <path d="M2 43 C14 42 30 44 46 43" class="i-line" stroke-width="2"/></svg>`,
  verb: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 4 C34 10 36 22 32 32 H16 C12 22 14 10 24 4Z" class="i-soft"/>
    <circle cx="24" cy="18" r="4.5" class="i-main"/>
    <path d="M16 25 L9 34 L16 33Z M32 25 L39 34 L32 33Z" class="i-ink"/>
    <path d="M19 34 Q24 48 29 34Z" class="i-flame"/></svg>`,
};

const UI_ICONS = {
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6 C10 9.5 14 14 17.5 18 M18 6.2 C14 10 10 14 6 17.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-4.5 3-6 .3 2 1.3 3 2.3 3C11 8 11 5 12 2z"/></svg>`,
};

// Elle çizilmiş daire (numara ve mühür çerçevesi)
const HAND_CIRCLE = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M33 6 C49 6 59 18 58 33 C57 49 45 58 31 58 C16 58 6 46 6 31 C7 17 19 7 36 8" /></svg>`;
// Fırça çizgisi
const BRUSHLINE = `<svg class="brushline" viewBox="0 0 1200 22" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14 C 180 6, 380 18, 600 11 S 1000 6, 1196 13"/></svg>`;
