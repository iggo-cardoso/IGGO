const overlay = document.getElementById('site-loader');
const finalFrameHold = 1200;

let resolveReady;
export const assetsReady = new Promise(resolve => { resolveReady = resolve; });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  if (!overlay) { resolveReady(); return; }

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const frame = document.createElement('img');
  frame.className = 'site-loader__final';
  frame.src = '/img/iggo-intro-final.png';
  frame.alt = '';
  frame.decoding = 'async';

  const video = document.createElement('video');
  video.className = 'site-loader__video';
  video.src = '/img/iggo-intro.mp4';
  video.poster = frame.src;
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  overlay.replaceChildren(frame, video);

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const completed = new Promise(resolve => {
      video.addEventListener('ended', resolve, { once: true });
      video.addEventListener('error', resolve, { once: true });
    });
    try {
      await Promise.race([video.play().then(() => completed), delay(5000)]);
    } catch {
      // The final artwork remains visible if autoplay is unavailable.
    }
  }

  overlay.classList.add('site-loader--final');
  video.pause();
  await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : finalFrameHold);
  overlay.classList.add('loader-done');
  document.body.style.overflow = previousOverflow;
  resolveReady();
  setTimeout(() => overlay.remove(), 400);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', run, { once: true })
  : run();
