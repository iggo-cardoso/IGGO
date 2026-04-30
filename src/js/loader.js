// loader.js — v2
// Pré-carrega E pré-decodifica todos os assets críticos antes de liberar a página.
// img.decode() força o decode JPEG/PNG/WebP na GPU antes da primeira exibição,
// eliminando o jank de ~200-400ms que ocorre quando o browser decodifica on-demand.

const CRITICAL_IMAGES = [
  'img/profie-iggo.png',
  'img/me_da_so_202604211709.png',
];

function getCardImages() {
  const imgs = [];
  document.querySelectorAll('[data-slides]').forEach(el => {
    try {
      JSON.parse(el.dataset.slides || '[]').forEach(s => {
        if (s.img) imgs.push(s.img);
      });
    } catch(e) {}
  });
  return imgs;
}

// Faz download + decode completo antes de resolver.
// img.decode() retorna Promise que só resolve quando a imagem
// está totalmente decodificada e pronta para composite — zero jank depois.
function preloadAndDecode(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      // decode() após load garante que o raster está na memória da GPU
      if (typeof img.decode === 'function') {
        img.decode().then(resolve).catch(resolve); // nunca bloqueia em erro
      } else {
        resolve();
      }
    };
    img.onerror = resolve; // imagem quebrada não bloqueia o loader
    img.src = src;
  });
}

function preloadFont(family) {
  if (!document.fonts) return Promise.resolve();
  return document.fonts.load('1em ' + family).catch(() => {});
}

// ── Overlay ───────────────────────────────────────────────────
const overlay   = document.getElementById('site-loader');
const loaderBar = document.getElementById('loader-bar');

function setProgress(p) {
  if (loaderBar) loaderBar.style.transform = 'scaleX(' + p + ')';
}

function hideLoader() {
  if (!overlay) return;
  overlay.classList.add('loader-done');
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}

// ── Main ──────────────────────────────────────────────────────
let resolveReady;
export const assetsReady = new Promise(r => { resolveReady = r; });

async function run() {
  document.body.style.overflow = 'hidden';

  const images = [...CRITICAL_IMAGES, ...getCardImages()];
  const fonts  = ['Figtree', 'Stretch Pro'];
  const total  = images.length + fonts.length;
  let done = 0;

  function tick() { setProgress(++done / total); }

  await Promise.all([
    ...images.map(src => preloadAndDecode(src).then(tick)),
    ...fonts.map(f   => preloadFont(f).then(tick)),
    new Promise(r => setTimeout(r, 600)),
  ]);

  setProgress(1);
  await new Promise(r => setTimeout(r, 200));

  hideLoader();
  document.body.style.overflow = '';
  resolveReady();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', run)
  : run();
