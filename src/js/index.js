// ═══════════════════════════════════════════════════════════════
// MOMENTUM SCROLL — v2 (mobile-safe)
//
// PROBLEMA ORIGINAL:
//   onTouchMove chamava e.preventDefault() com { passive: false }.
//   Isso cancela o scroll nativo do browser e força o JS a
//   controlar toda a rolagem manualmente — muito mais pesado
//   no mobile, causa jank e "engasgo" em scrolls rápidos.
//
// CORREÇÃO:
//   Em mobile (touch), desativa completamente o momentum JS
//   e deixa o scroll nativo do browser operar (que é acelerado
//   por hardware e tem física de inércia nativa muito melhor).
//   O momentum JS só roda em desktop (mouse wheel + teclado).
// ═══════════════════════════════════════════════════════════════

const IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches
             || navigator.maxTouchPoints > 0;

// Em mobile: sem interceptação de touch. O browser cuida disso.
// Os outros efeitos (expand-card, scroll-effects) leem window.scrollY
// normalmente via evento scroll { passive: true }, então não há impacto.
if (!IS_TOUCH) {
  const LERP_SPEED = 8;
  const WHEEL_MULT = 1.2;
  const KEYS_STEP  = 120;

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

  window.addEventListener('scroll', () => {
    if (!rafId) { target = window.scrollY; current = window.scrollY; }
  }, { passive: true });

  window.addEventListener('resize', () => {
    target = Math.min(target, maxScroll());
  });

  document.documentElement.style.scrollBehavior = 'auto';
  window.addEventListener('wheel',   onWheel,   { passive: false });
  window.addEventListener('keydown', onKeydown, { passive: false });
}
