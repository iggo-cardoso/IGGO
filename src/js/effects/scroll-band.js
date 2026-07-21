(function () {
  'use strict';

  function init() {
    const containers = document.querySelectorAll('.scroll-bands');
    if (!containers.length) return;

    injectStyles();

    containers.forEach(setupContainer);
  }

  function setupContainer(container) {
    const bands = container.querySelectorAll('.scroll-band');
    if (!bands.length) return;

    bands.forEach((band, i) => {
      const direction = i % 2 === 0 ? -1 : 1;
      band.dataset.direction = direction;

      const original = band.innerHTML;
      band.innerHTML = original + original + original;

      const singleWidth = band.scrollWidth / 3;
      band.dataset.singleWidth = singleWidth;
    });

    let lastScrollY      = window.scrollY;
    let visible          = false;
    let rafId            = null;
    const currentOffsets = Array.from(bands).map((band, i) =>
      i % 2 === 0 ? 0 : -parseFloat(band.dataset.singleWidth || 0)
    );

    const SPEED = 0.4;

    function tick() {
      rafId = null;
      const scrollY = window.scrollY;
      const delta   = scrollY - lastScrollY;
      lastScrollY   = scrollY;

      bands.forEach((band, i) => {
        const direction   = parseInt(band.dataset.direction);
        const singleWidth = parseFloat(band.dataset.singleWidth) || band.scrollWidth / 3;

        currentOffsets[i] += delta * SPEED * direction;
        if (currentOffsets[i] < -singleWidth) currentOffsets[i] += singleWidth;
        if (currentOffsets[i] > 0)            currentOffsets[i] -= singleWidth;

        band.style.transform = `translateX(${currentOffsets[i]}px)`;
      });

      if (visible) rafId = requestAnimationFrame(tick);
    }

    function scheduleTick() {
      if (!visible) return;
      lastScrollY = window.scrollY; // evita "salto" ao reentrar na viewport
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    const obs = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) scheduleTick();
    }, { threshold: 0 });

    obs.observe(container);

    window.addEventListener('scroll', () => {
      lastScrollY = lastScrollY; // no-op, mantém compatibilidade
      if (visible && !rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    // sincroniza lastScrollY continuamente fora do RAF também,
    // para que delta não acumule enquanto fora da tela
    window.addEventListener('scroll', () => {
      if (!visible) lastScrollY = window.scrollY;
    }, { passive: true });
  }

  function injectStyles() {
    if (document.getElementById('scroll-band-styles')) return;
    const style = document.createElement('style');
    style.id = 'scroll-band-styles';
    style.textContent = `
      .scroll-bands {
        overflow: hidden;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 150px 0 150px 0 !important;
        user-select: none;
        pointer-events: none;
      }

      .scroll-band {
        display: flex;
        white-space: nowrap;
        will-change: transform;
        font-size: clamp(3rem, 10vw, 9rem);
        font-weight: 400;
        line-height: 1.1;
        letter-spacing: -0.01em;
        color: var(--scroll-band-color, #1a1a1a);
        font-family: var(--scroll-band-font, serif);
        padding: 0.1em 0;
        opacity: var(--scroll-band-opacity, 0.85);
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();