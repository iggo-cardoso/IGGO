// loader.js
// Exibe overlay de loading, pré-carrega assets críticos,
// e libera a página só quando tudo estiver pronto.
// Exporta uma Promise `assetsReady` para outros módulos aguardarem.

const CRITICAL_IMAGES = [
  'img/profie-iggo.png',
  'img/me_da_so_202604211709.png',
];

// Extrai imagens do expand-card do JSON inline no HTML
function getCardImages() {
  const cards = document.querySelectorAll('[data-slides]');
  const imgs = [];
  cards.forEach(el => {
    try {
      const slides = JSON.parse(el.dataset.slides || '[]');
      slides.forEach(s => { if (s.img) imgs.push(s.img); });
    } catch(e) {}
  });
  return imgs;
}

function preloadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = resolve;
    img.onerror = resolve; // não bloqueia se falhar
    img.src = src;
  });
}

function preloadFont(family) {
  if (!document.fonts) return Promise.resolve();
  return document.fonts.load('1em ' + family).catch(() => {});
}

// ── Overlay ──────────────────────────────────────────────────────
const overlay = document.getElementById('site-loader');
const loaderBar = document.getElementById('loader-bar');

function setProgress(p) {
  if (loaderBar) loaderBar.style.transform = 'scaleX(' + p + ')';
}

function hideLoader() {
  if (!overlay) return;
  overlay.classList.add('loader-done');
  // Após a transição de saída, remove do DOM
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}

// ── Main ─────────────────────────────────────────────────────────
let resolveReady;
export const assetsReady = new Promise(r => { resolveReady = r; });

async function run() {
  // Bloqueia scroll durante loading
  document.body.style.overflow = 'hidden';

  const images = [...CRITICAL_IMAGES, ...getCardImages()];
  const fonts  = ['Figtree', 'Stretch Pro'];

  const total = images.length + fonts.length;
  let done = 0;

  function tick() {
    done++;
    setProgress(done / total);
  }

  // Pré-carrega tudo em paralelo, atualizando a barra a cada item
  await Promise.all([
    ...images.map(src => preloadImage(src).then(tick)),
    ...fonts.map(f   => preloadFont(f).then(tick)),
    // Garante pelo menos 600ms de loading (evita flash instantâneo)
    new Promise(r => setTimeout(r, 600)),
  ]);

  // Barra cheia antes de sair
  setProgress(1);

  // Pequena pausa para o usuário ver 100%
  await new Promise(r => setTimeout(r, 200));

  hideLoader();

  // Libera scroll
  document.body.style.overflow = '';

  resolveReady();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
