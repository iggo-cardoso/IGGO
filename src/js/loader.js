import { LiquidGlassLogo } from './components/liquid-glass-logo.js';

const overlay = document.getElementById('site-loader');
const speed = 2.85;

let resolveReady;
export const assetsReady = new Promise(resolve => { resolveReady = resolve; });

async function run() {
  if (!overlay) {
    resolveReady();
    return;
  }

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  overlay.replaceChildren(LiquidGlassLogo({
    logo: '/logos/png/logo-dark.png',
    ending: 'logo',
    theme: 'light',
    speed,
    style: { height: 480 },
  }));

  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : Math.round(2400 / speed) + 140;
  await new Promise(resolve => setTimeout(resolve, duration));
  overlay.classList.add('loader-done');
  document.body.style.overflow = previousOverflow;
  resolveReady();
  setTimeout(() => overlay.remove(), 320);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', run, { once: true })
  : run();
