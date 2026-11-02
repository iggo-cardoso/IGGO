// Entrada curta: imagens e fontes carregam sem bloquear a navegação.

// ── Overlay ───────────────────────────────────────────────────
const overlay = document.getElementById('site-loader');

function startLoaderMorph() {
  const stage = overlay?.querySelector('.loader-morph');
  const cards = [...(stage?.querySelectorAll('.loader-morph__card') || [])];
  if (!stage || !cards.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stiffness = 22;
  const damping = 9;
  const states = cards.map((card, index) => {
    const seed = index + 1;
    const state = {
      x: Math.sin(seed * 12.9898) * innerWidth * .62,
      y: Math.sin(seed * 78.233) * innerHeight * .48,
      rotation: Math.sin(seed * 37.719) * 90,
      scale: .6,
      opacity: 0,
      vx: 0, vy: 0, vr: 0, vs: 0, vo: 0,
    };
    card.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg) scale(${state.scale})`;
    return state;
  });

  const targetFor = (index, elapsed) => {
    if (elapsed < 80) return states[index];
    if (elapsed < 500) {
      const spacing = 70;
      return {
        x: index * spacing - cards.length * spacing / 2,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
      };
    }

    const radius = Math.min(Math.min(innerWidth, innerHeight) * .35, 350);
    const angle = index / cards.length * Math.PI * 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: angle * 180 / Math.PI + 90,
      scale: 1,
      opacity: 1,
    };
  };

  const spring = (state, key, velocityKey, target, dt) => {
    const acceleration = (target - state[key]) * stiffness - state[velocityKey] * damping;
    state[velocityKey] += acceleration * dt;
    state[key] += state[velocityKey] * dt;
  };
  const startedAt = performance.now();
  let previous = startedAt;
  let circleAnnounced = false;

  const frame = now => {
    const elapsed = now - startedAt;
    const dt = Math.min((now - previous) / 1000, .033);
    previous = now;

    if (elapsed >= 500 && !circleAnnounced) {
      circleAnnounced = true;
      stage.classList.add('is-circle');
    }

    states.forEach((state, index) => {
      const target = targetFor(index, elapsed);
      spring(state, 'x', 'vx', target.x, dt);
      spring(state, 'y', 'vy', target.y, dt);
      spring(state, 'rotation', 'vr', target.rotation, dt);
      spring(state, 'scale', 'vs', target.scale, dt);
      spring(state, 'opacity', 'vo', target.opacity, dt);
      cards[index].style.opacity = Math.max(0, Math.min(1, state.opacity));
      cards[index].style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg) scale(${state.scale})`;
    });

    if (elapsed < 1000) requestAnimationFrame(frame);
    else stage.classList.add('is-complete');
  };

  requestAnimationFrame(frame);
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

  overlay?.classList.add('loader-ready');
  startLoaderMorph();
  await new Promise(r => setTimeout(r, 1000));

  hideLoader();
  document.body.style.overflow = '';
  resolveReady();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', run)
  : run();
