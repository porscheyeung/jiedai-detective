let ctx = null;
let soundOn = true;
let calm = false;

export function setFx(opts) {
  if ('sound' in opts) soundOn = opts.sound;
  if ('calm' in opts) calm = opts.calm;
}

function tone(freq, start, dur, type = 'sine', gain = 0.12) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function sound(kind) {
  if (!soundOn) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { return; }
  if (kind === 'good') { tone(660, 0, 0.14, 'triangle'); tone(880, 0.1, 0.14, 'triangle'); tone(1175, 0.2, 0.22, 'triangle'); }
  else if (kind === 'bad') { tone(330, 0, 0.16, 'sine', 0.08); tone(262, 0.12, 0.22, 'sine', 0.08); }
  else if (kind === 'tap') tone(990, 0, 0.06, 'square', 0.03);
  else if (kind === 'stamp') { tone(140, 0, 0.18, 'square', 0.1); tone(523, 0.15, 0.12, 'triangle'); tone(784, 0.27, 0.12, 'triangle'); tone(1047, 0.39, 0.3, 'triangle'); }
  else if (kind === 'reveal') { tone(520, 0, 0.3, 'sine', 0.06); tone(780, 0.08, 0.4, 'sine', 0.06); }
}

export function confetti(n = 36) {
  if (calm || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  box.setAttribute('aria-hidden', 'true');
  const colors = ['#ffc93c', '#ff7a59', '#14857a', '#7b6cf6', '#3fa9f5', '#ff5fa2'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + 'vw';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.4 + 's';
    s.style.animationDuration = 1.4 + Math.random() * 1.2 + 's';
    s.style.setProperty('--x', (Math.random() * 160 - 80) + 'px');
    s.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3200);
}

export function stamp(text) {
  const el = document.createElement('div');
  el.className = 'stamp-pop';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${text}</span>`;
  document.body.appendChild(el);
  sound('stamp');
  confetti(60);
  setTimeout(() => el.classList.add('out'), 1500);
  setTimeout(() => el.remove(), 2000);
}

export function mascot(mood = 'happy', size = 110) {
  const mouths = {
    happy: '<path d="M48 82 Q60 94 72 82" stroke="#3a2412" stroke-width="4" fill="none" stroke-linecap="round"/>',
    think: '<path d="M52 86 Q60 82 70 86" stroke="#3a2412" stroke-width="4" fill="none" stroke-linecap="round"/>',
    wow: '<ellipse cx="60" cy="86" rx="7" ry="8" fill="#3a2412"/><ellipse cx="60" cy="89" rx="4" ry="3" fill="#ff8a80"/>',
    proud: '<path d="M46 80 Q60 98 74 80 Z" fill="#3a2412"/><path d="M52 88 Q60 94 68 88" fill="#ff8a80"/>',
  };
  const pupil = mood === 'think' ? 4 : 0;
  return `<svg class="mascot mood-${mood}" viewBox="0 0 130 130" width="${size}" height="${size}" aria-hidden="true">
    <ellipse cx="62" cy="124" rx="34" ry="5" fill="#00000018"/>
    <g class="m-body">
      <circle cx="60" cy="72" r="44" fill="#2bb3a3"/>
      <circle cx="60" cy="78" r="30" fill="#c9f2ea"/>
      <path d="M18 46 Q60 6 102 46 Q60 36 18 46 Z" fill="#9a6a3a"/>
      <path d="M22 44 Q60 18 98 44" stroke="#6e4823" stroke-width="3" fill="none"/>
      <rect x="54" y="20" width="12" height="8" rx="3" fill="#6e4823"/>
      <path d="M14 48 Q10 58 22 56" fill="#9a6a3a"/>
      <path d="M106 48 Q110 58 98 56" fill="#9a6a3a"/>
      <g class="m-eyes">
        <ellipse cx="45" cy="64" rx="10" ry="12" fill="#fff"/>
        <ellipse cx="75" cy="64" rx="10" ry="12" fill="#fff"/>
        <circle cx="${46 + pupil}" cy="${66 - pupil}" r="5.5" fill="#1f2d4a"/>
        <circle cx="${76 + pupil}" cy="${66 - pupil}" r="5.5" fill="#1f2d4a"/>
        <circle cx="${48 + pupil}" cy="${63 - pupil}" r="1.8" fill="#fff"/>
        <circle cx="${78 + pupil}" cy="${63 - pupil}" r="1.8" fill="#fff"/>
      </g>
      <circle cx="34" cy="80" r="5" fill="#ff9e9e" opacity=".7"/>
      <circle cx="86" cy="80" r="5" fill="#ff9e9e" opacity=".7"/>
      ${mouths[mood] || mouths.happy}
    </g>
    <g class="m-lens">
      <line x1="104" y1="104" x2="120" y2="122" stroke="#6e4823" stroke-width="7" stroke-linecap="round"/>
      <circle cx="96" cy="94" r="15" fill="#bfe9ff" fill-opacity=".75" stroke="#ffc93c" stroke-width="5"/>
      <path d="M89 88 Q93 84 98 85" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;
}
