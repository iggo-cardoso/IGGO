// ═══════════════════════════════════════════════════════════════
// MOMENTUM SCROLL,  v2 (mobile-safe)
//
// PROBLEMA ORIGINAL:
//   onTouchMove chamava e.preventDefault() com { passive: false }.
//   Isso cancela o scroll nativo do browser e força o JS a
//   controlar toda a rolagem manualmente,  muito mais pesado
//   no mobile, causa jank e "engasgo" em scrolls rápidos.
//
// CORREÇÃO:
//   Em mobile (touch), desativa completamente o momentum JS
//   e deixa o scroll nativo do browser operar (que é acelerado
//   por hardware e tem física de inércia nativa muito melhor).
//   O momentum JS só roda em desktop (mouse wheel + teclado).
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// DETECÇÃO DE TOUCH,  v3 (confirmação por evento real)
//
// PROBLEMA:
//   matchMedia('(hover: none) and (pointer: coarse)') e
//   navigator.maxTouchPoints dão falso positivo em alguns browsers
//   baseados em Firefox (Zen incluso) com certos touchpads/drivers,
//   fazendo o device passar por "touch" mesmo sendo desktop e
//   desativando o lerp inteiro sem nenhum aviso.
//
// CORREÇÃO:
//   O hint estático só decide o estado INICIAL (evita um flash de
//   lerp em celular de verdade). A palavra final é do evento que
//   realmente acontecer primeiro: um 'wheel' real confirma desktop
//   e liga o lerp; um 'touchstart' real confirma touch e desliga.
// ═══════════════════════════════════════════════════════════════

const IS_TOUCH_HINT = window.matchMedia('(hover: none) and (pointer: coarse)').matches
                   || navigator.maxTouchPoints > 0;

// EASE por frame,  não por tempo. Zen/Firefox reduz a precisão do
// timestamp do requestAnimationFrame (proteção anti-fingerprinting),
// então dt real ficava 0 em vários frames seguidos e o lerp travava
// sem se mover,  achando que tava suavizando quando na real congelava.
// Fator fixo assume ~60fps e não depende de timestamp nenhum.
const EASE       = 0.09;
const WHEEL_MULT = 1.2;
const KEYS_STEP  = 120;

let target      = window.scrollY;
let current     = window.scrollY;
let rafId       = null;
let lerpActive  = false;
let touchLocked = false;

function maxScroll() {
  return document.documentElement.scrollHeight - window.innerHeight;
}

function startLoop() {
  if (!rafId) rafId = requestAnimationFrame(loop);
}

function loop() {
  const diff = target - current;

  if (Math.abs(diff) < 0.5) {
    current = target;
    window.scrollTo(0, current);
    rafId = null;
    return;
  }

  current += diff * EASE;
  window.scrollTo(0, current);
  rafId = requestAnimationFrame(loop);
}

function onWheel(e) {
  e.preventDefault();
  const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY * WHEEL_MULT;
  target = Math.max(0, Math.min(target + delta, maxScroll()));
  startLoop();
}

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

function onSyncScroll() {
  if (!rafId) { target = window.scrollY; current = window.scrollY; }
}

function onResize() {
  target = Math.min(target, maxScroll());
}

function enableLerpScroll() {
  if (lerpActive || touchLocked) return;
  lerpActive = true;
  target  = window.scrollY;
  current = window.scrollY;
  document.documentElement.style.scrollBehavior = 'auto';
  window.addEventListener('wheel',   onWheel,   { passive: false });
  window.addEventListener('keydown', onKeydown, { passive: false });

  // Hook pra permitir que outros módulos (ex: scrollbar customizada)
  // controlem o mesmo alvo do lerp em vez de brigar com ele.
  window.__scrollLerp = {
    getTarget: () => target,
    setTarget: (v) => {
      target = Math.max(0, Math.min(v, maxScroll()));
      startLoop();
    },
    // pula direto pro topo sem animação,  usado ao trocar de página
    reset: () => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      target = 0;
      current = 0;
      window.scrollTo(0, 0);
    },
    maxScroll,
  };
}

function disableLerpScroll() {
  touchLocked = true;
  if (lerpActive) {
    lerpActive = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    window.removeEventListener('wheel',   onWheel,   { passive: false });
    window.removeEventListener('keydown', onKeydown, { passive: false });
    document.documentElement.style.scrollBehavior = '';
  }
  // Em touch não há lerp,  expõe um shim que age direto no scroll nativo,
  // assim quem usa __scrollLerp funciona igual nos dois casos.
  window.__scrollLerp = {
    getTarget: () => window.scrollY,
    setTarget: (v) => window.scrollTo(0, v),
    reset: () => window.scrollTo(0, 0),
    maxScroll,
  };
}

window.addEventListener('scroll', onSyncScroll, { passive: true });
window.addEventListener('resize', onResize);

if (IS_TOUCH_HINT) {
  disableLerpScroll();
} else {
  enableLerpScroll();
}

// Confirma touch de verdade e trava o modo nativo, mesmo que o hint
// inicial tenha ficado no lerp por engano.
window.addEventListener('touchstart', disableLerpScroll, { passive: true, once: true });

// Se o hint disse "touch" errado (falso positivo do Firefox/Zen),
// o primeiro wheel real prova que é desktop e liga o lerp na hora.
window.addEventListener('wheel', function onFirstRealWheel(e) {
  if (!touchLocked && !lerpActive) {
    enableLerpScroll();
    onWheel(e);
  }
}, { passive: false, once: true });