// ═══════════════════════════════════════════════════════════════
// MOMENTUM SCROLL — preserva position:sticky e position:fixed
//
// Técnica: intercepta a roda do mouse e teclado, acumula um
// "target" virtual e usa lerp a cada rAF para mover o scroll
// real (window.scrollTo). Nenhum elemento é wrappado em
// container fixo, então sticky e fixed funcionam normalmente.
// ═══════════════════════════════════════════════════════════════

// ── Configuração ────────────────────────────────────────────────
const LERP       = 0.08;   // 0.04 = gelo · 0.08 = patinação · 0.15 = suave
const WHEEL_MULT = 1.2;    // amplifica a sensibilidade da roda
const KEYS_STEP  = 120;    // px por tecla Arrow
// ────────────────────────────────────────────────────────────────

// Impede o scroll instantâneo nativo do browser
// (só funciona com { passive: false })
const stopNative = (e) => e.preventDefault();

let target  = window.scrollY;
let current = window.scrollY;
let rafId   = null;
let ticking = false;

// Acumula delta da roda no target virtual
function onWheel(e) {
  e.preventDefault();

  // Normaliza delta entre trackpad e mouse físico
  const delta = e.deltaMode === 1
    ? e.deltaY * 40          // unidades de linha → px
    : e.deltaY * WHEEL_MULT;

  target += delta;
  target  = Math.max(0, Math.min(target, maxScroll()));
  startLoop();
}

// Suporte a teclas de navegação (setas, PgUp/PgDn, Home/End)
function onKeydown(e) {
  const map = {
    ArrowDown:  KEYS_STEP,
    ArrowUp:   -KEYS_STEP,
    PageDown:   window.innerHeight * 0.9,
    PageUp:    -window.innerHeight * 0.9,
    End:        maxScroll(),
    Home:      -maxScroll(),
  };

  // Só interfere se nenhum input/textarea estiver focado
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

// Loop lerp — roda só enquanto há diferença perceptível
function loop() {
  const diff = target - current;

  if (Math.abs(diff) < 0.5) {
    // Chegou — para o loop e sincroniza exato
    current = target;
    window.scrollTo(0, current);
    rafId = null;
    return;
  }

  current += diff * LERP;
  window.scrollTo(0, current);
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (!rafId) rafId = requestAnimationFrame(loop);
}

// ── Inicialização ────────────────────────────────────────────────
// Desativa scroll-behavior:smooth do CSS para não conflitar
document.documentElement.style.scrollBehavior = 'auto';

window.addEventListener('wheel',   onWheel,   { passive: false });
window.addEventListener('keydown', onKeydown, { passive: false });

// Sincroniza target se o usuário usar a scrollbar nativa
// (arrastando a barra lateral, por exemplo)
window.addEventListener('scroll', () => {
  // Só atualiza target quando o loop não está rodando
  // (caso contrário o scroll natural do nosso lerp acionaria isto)
  if (!rafId) {
    target  = window.scrollY;
    current = window.scrollY;
  }
}, { passive: true });

// Recalcula ao redimensionar
window.addEventListener('resize', () => {
  target = Math.min(target, maxScroll());
});