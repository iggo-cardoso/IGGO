// ═══════════════════════════════════════════════════════════════
// MOMENTUM SCROLL — preserva position:sticky e position:fixed
//
// Técnica: intercepta a roda do mouse e teclado, acumula um
// "target" virtual e usa lerp a cada rAF para mover o scroll
// real (window.scrollTo). Nenhum elemento é wrappado em
// container fixo, então sticky e fixed funcionam normalmente.
//
// No mobile/touch o LERP é desativado completamente — o scroll
// nativo por touch é acelerado por hardware e não precisa de
// nenhuma interceptação. Qualquer interferência causa tranco.
// ═══════════════════════════════════════════════════════════════

// ── Detecta touch/mobile ─────────────────────────────────────────
const isTouchDevice = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
  navigator.maxTouchPoints > 0;

// Se for mobile/touch, não registra nada e sai imediatamente.
// O scroll nativo cuida de tudo com suavidade de hardware.
if (isTouchDevice()) {
  document.documentElement.style.scrollBehavior = 'auto';
} else {

  // ── Configuração ────────────────────────────────────────────────
  const LERP_SPEED = 8;    // velocidade independente de framerate (ex-0.08 fixo)
  const WHEEL_MULT = 1.2;  // amplifica sensibilidade da roda
  const KEYS_STEP  = 120;  // px por tecla Arrow
  // ────────────────────────────────────────────────────────────────

  let target   = window.scrollY;
  let current  = window.scrollY;
  let rafId    = null;
  let lastTime = null;

  function onWheel(e) {
    e.preventDefault();

    const delta = e.deltaMode === 1
      ? e.deltaY * 40
      : e.deltaY * WHEEL_MULT;

    target += delta;
    target  = Math.max(0, Math.min(target, maxScroll()));
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
      target += map[e.key];
      target  = Math.max(0, Math.min(target, maxScroll()));
      startLoop();
    }
  }

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  // Loop lerp com delta de tempo — independente de framerate
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // seg, cap 50ms
    lastTime = timestamp;

    const diff = target - current;

    if (Math.abs(diff) < 0.5) {
      current  = target;
      lastTime = null;
      window.scrollTo(0, current);
      rafId = null;
      return;
    }

    // Fator exponencial — idêntico em 60fps, 90fps, 120fps e 30fps
    const factor = 1 - Math.exp(-LERP_SPEED * dt);
    current += diff * factor;
    window.scrollTo(0, current);
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (!rafId) {
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
  }

  document.documentElement.style.scrollBehavior = 'auto';

  window.addEventListener('wheel',   onWheel,   { passive: false });
  window.addEventListener('keydown', onKeydown, { passive: false });

  window.addEventListener('scroll', () => {
    if (!rafId) {
      target  = window.scrollY;
      current = window.scrollY;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    target = Math.min(target, maxScroll());
  });

}