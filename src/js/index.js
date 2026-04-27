// ═══════════════════════════════════════════════════════════════
// MOMENTUM SCROLL — desktop (wheel/keyboard) + mobile (touch)
//
// Técnica: acumula um "target" virtual e usa lerp exponencial
// independente de framerate a cada rAF para mover window.scrollTo.
// Funciona em todos os dispositivos — sem branches mobile/desktop.
// ═══════════════════════════════════════════════════════════════

const LERP_SPEED = 8;
const WHEEL_MULT = 1.2;
const KEYS_STEP  = 120;
const TOUCH_MULT = 1.8;  // amplifica arrasto do dedo

let target   = window.scrollY;
let current  = window.scrollY;
let rafId    = null;
let lastTime = null;

function maxScroll() {
  return document.documentElement.scrollHeight - window.innerHeight;
}

function startLoop() {
  if (!rafId) {
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt   = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime   = timestamp;

  const diff = target - current;

  if (Math.abs(diff) < 0.5) {
    current  = target;
    lastTime = null;
    window.scrollTo(0, current);
    rafId = null;
    return;
  }

  const factor = 1 - Math.exp(-LERP_SPEED * dt);
  current += diff * factor;
  window.scrollTo(0, current);
  rafId = requestAnimationFrame(loop);
}

// ── Mouse wheel ────────────────────────────────────────────────
function onWheel(e) {
  e.preventDefault();
  const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY * WHEEL_MULT;
  target = Math.max(0, Math.min(target + delta, maxScroll()));
  startLoop();
}

// ── Teclado ────────────────────────────────────────────────────
function onKeydown(e) {
  const map = {
    ArrowDown:  KEYS_STEP,
    ArrowUp:   -KEYS_STEP,
    PageDown:   window.innerHeight * 0.9,
    PageUp:    -window.innerHeight * 0.9,
    End:        maxScroll(),
    Home:      -maxScroll(),
  };

  if (document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA') return;

  if (map[e.key] !== undefined) {
    e.preventDefault();
    target = Math.max(0, Math.min(target + map[e.key], maxScroll()));
    startLoop();
  }
}

// ── Touch ──────────────────────────────────────────────────────
let touchStartY = 0;
let touchLastY  = 0;
let touchVelY   = 0;
let touchLastT  = 0;

function onTouchStart(e) {
  touchStartY = e.touches[0].clientY;
  touchLastY  = touchStartY;
  touchVelY   = 0;
  touchLastT  = performance.now();
  // Sincroniza target com posição atual (caso ainda esteja animando)
  target  = window.scrollY;
  current = window.scrollY;
}

function onTouchMove(e) {
  e.preventDefault();
  const y  = e.touches[0].clientY;
  const now = performance.now();
  const dt  = Math.max(now - touchLastT, 1);

  const delta = (touchLastY - y) * TOUCH_MULT;
  touchVelY   = (touchLastY - y) / dt;  // px/ms
  touchLastY  = y;
  touchLastT  = now;

  target = Math.max(0, Math.min(target + delta, maxScroll()));
  startLoop();
}

function onTouchEnd() {
  // Aplica inércia baseada na velocidade final do dedo
  const inertia = touchVelY * 300; // px de coasting
  target = Math.max(0, Math.min(target + inertia, maxScroll()));
  startLoop();
}

// ── Sincroniza se o scroll mover por outro meio ────────────────
window.addEventListener('scroll', () => {
  if (!rafId) {
    target  = window.scrollY;
    current = window.scrollY;
  }
}, { passive: true });

window.addEventListener('resize', () => {
  target = Math.min(target, maxScroll());
});

document.documentElement.style.scrollBehavior = 'auto';

window.addEventListener('wheel',      onWheel,      { passive: false });
window.addEventListener('keydown',    onKeydown,    { passive: false });
window.addEventListener('touchstart', onTouchStart, { passive: true  });
window.addEventListener('touchmove',  onTouchMove,  { passive: false });
window.addEventListener('touchend',   onTouchEnd,   { passive: true  });
