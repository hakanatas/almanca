// Grafik varlıklar: maskot Max (vektör Dackel) ve oyun ikonları.
// Renkler CSS'teki token'lardan gelir, animasyonlar style.css içinde.

function maxSVG(extraClass = '') {
  return `
<svg class="max ${extraClass}" viewBox="0 0 230 150" aria-hidden="true">
  <ellipse class="mx-shadow" cx="118" cy="141" rx="84" ry="6"/>
  <g class="mx-all">
    <g class="mx-tail"><path d="M44 82 Q20 66 26 42" fill="none" stroke-width="10" stroke-linecap="round"/></g>
    <rect class="mx-shade" x="56" y="102" width="16" height="36" rx="8"/>
    <rect class="mx-shade" x="140" y="102" width="16" height="36" rx="8"/>
    <rect class="mx-fur" x="70" y="104" width="16" height="34" rx="8"/>
    <rect class="mx-fur" x="154" y="104" width="16" height="34" rx="8"/>
    <g class="mx-body">
      <rect class="mx-fur" x="36" y="68" width="146" height="52" rx="26"/>
      <path class="mx-belly" d="M66 112 Q112 126 160 112 Q150 122 112 124 Q76 122 66 112Z"/>
      <path class="mx-spot" d="M86 72 Q104 66 118 74 Q104 82 86 78Z"/>
    </g>
    <g class="mx-head">
      <path class="mx-collar" d="M146 84 Q166 98 190 88" fill="none" stroke-width="7" stroke-linecap="round"/>
      <circle class="mx-tag" cx="168" cy="96" r="5"/>
      <circle class="mx-fur" cx="172" cy="58" r="30"/>
      <ellipse class="mx-fur" cx="198" cy="70" rx="24" ry="15"/>
      <ellipse class="mx-muzzle" cx="204" cy="74" rx="15" ry="9"/>
      <ellipse class="mx-nose" cx="220" cy="66" rx="7" ry="6"/>
      <g class="mx-eye">
        <circle class="mx-ink" cx="182" cy="50" r="5.5"/>
        <circle class="mx-glint" cx="184" cy="48" r="1.8"/>
      </g>
      <path class="mx-brow" d="M174 38 Q182 34 190 38" fill="none" stroke-width="3" stroke-linecap="round"/>
      <g class="mx-happy">
        <path class="mx-mouth" d="M196 80 Q205 88 214 80" fill="none" stroke-width="3" stroke-linecap="round"/>
        <path class="mx-tongue" d="M202 84 Q205 94 210 84Z"/>
      </g>
      <path class="mx-sad mx-mouth" d="M198 86 Q206 79 214 86" fill="none" stroke-width="3" stroke-linecap="round"/>
      <g class="mx-ear"><path class="mx-shade" d="M156 34 Q136 38 138 74 Q142 92 156 86 Q166 62 164 36Z"/></g>
    </g>
  </g>
</svg>`;
}

const ICONS = {
  // Hedef tahtası + ok
  artikel: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="22" cy="26" r="17" class="i-soft"/><circle cx="22" cy="26" r="11" class="i-main"/><circle cx="22" cy="26" r="5" class="i-soft"/>
    <path d="M22 26 L40 8" class="i-line" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M36 4 L44 4 L44 12 L40 8Z" class="i-main"/></svg>`,
  // İki kart
  memory: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="5" y="10" width="22" height="30" rx="5" class="i-soft" transform="rotate(-10 16 25)"/>
    <rect x="20" y="8" width="22" height="30" rx="5" class="i-main" transform="rotate(8 31 23)"/>
    <path d="M31 17 l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.8 2.7 1-5.3-4-3.7 5.4-.6Z" class="i-paper" transform="rotate(8 31 23)"/></svg>`,
  // Hoparlör + dalgalar
  listen: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M6 18 h8 l11-9 v30 l-11-9 h-8z" class="i-main"/>
    <path d="M31 17 q5 7 0 14" class="i-line" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M36 11 q10 13 0 26" class="i-line i-faint" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  // Lokomotif
  satz: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="6" y="14" width="18" height="20" rx="3" class="i-main"/>
    <rect x="22" y="22" width="20" height="12" rx="3" class="i-main"/>
    <rect x="10" y="18" width="10" height="7" rx="2" class="i-paper"/>
    <rect x="32" y="12" width="6" height="10" rx="2" class="i-soft"/>
    <circle cx="14" cy="37" r="5" class="i-soft"/><circle cx="34" cy="37" r="5" class="i-soft"/>
    <path d="M2 43 H46" class="i-line" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  // Roket
  verb: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 4 C34 10 36 22 32 32 H16 C12 22 14 10 24 4Z" class="i-main"/>
    <circle cx="24" cy="18" r="4.5" class="i-paper"/>
    <path d="M16 26 L9 34 L16 33Z M32 26 L39 34 L32 33Z" class="i-soft"/>
    <path d="M19 34 Q24 48 29 34Z" class="i-flame"/></svg>`,
};

const UI_ICONS = {
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-4.5 3-6 .3 2 1.3 3 2.3 3C11 8 11 5 12 2z"/></svg>`,
  medal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l2 5H9zM13 2h4l-2 5h-4z" opacity=".55"/><circle cx="12" cy="15" r="7"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>`,
  timer: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 9v4l2.5 2M9 2h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
