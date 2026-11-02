import { LiquidGlassLogo } from './components/liquid-glass-logo.js';

const overlay = document.getElementById('site-loader');
const duration = 3000;

let resolveReady;
export const assetsReady = new Promise(resolve => { resolveReady = resolve; });

async function run() {
  if (!overlay) {
    resolveReady();
    return;
  }

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const animation = LiquidGlassLogo({
    logo: '/logos/png/logo-dark.png',
    ending: 'logo',
    theme: 'light',
    duration,
    style: { height: 480 },
  });
  overlay.replaceChildren(animation);

  await Promise.race([animation.finished, new Promise(resolve => setTimeout(resolve, duration + 700))]);
  animation.dispose();
  overlay.classList.add('loader-done');
  document.body.style.overflow = previousOverflow;
  resolveReady();
  setTimeout(() => overlay.remove(), 320);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', run, { once: true })
  : run();
