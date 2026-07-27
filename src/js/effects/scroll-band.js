(function () {
  'use strict';

  /* ---------- CLEANUP DOS LISTENERS/OBSERVERS ANTERIORES ----------
     Antes, cada chamada de setupContainer criava um IntersectionObserver
     e 2 listeners de scroll no window, presos por closure aos elementos
     .scroll-band daquele momento. Quando o page-router troca de página e
     volta pra home, os elementos antigos somem do DOM (viram órfãos) mas
     esses observers/listeners continuam vivos e disparando à toa — e sem
     reinit, os elementos NOVOS (recriados no snapshot) nunca ganhavam os
     seus próprios listeners, ou seja, a section ficava "morta" até dar F5.
     Agora guardamos as funções de limpeza e chamamos antes de reconstruir. */
  let cleanupFns = [];

  function runCleanup() {
    cleanupFns.forEach(fn => { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  function init() {
    runCleanup();

    const containers = document.querySelectorAll('.scroll-bands');
    if (!containers.length) return;

    injectStyles();

    containers.forEach(setupContainer);
  }

  function setupContainer(container) {
    const bands = container.querySelectorAll('.scroll-band');
    if (!bands.length) return;

    // ---------- CONSTRUÇÃO DO CONTEÚDO (só uma vez por container) ----------
    // container.dataset.bandsBuilt é um atributo real do elemento, então
    // sobrevive quando o page-router serializa/restaura o snapshot do
    // #page-root — evita triplicar o innerHTML de novo (e de novo, e de
    // novo...) toda vez que voltamos pra home.
    if (!container.dataset.bandsBuilt) {
      bands.forEach((band, i) => {
        const direction = i % 2 === 0 ? -1 : 1;
        band.dataset.direction = direction;

        const original = band.innerHTML;
        band.innerHTML = original + original + original;

        const singleWidth = band.scrollWidth / 3;
        band.dataset.singleWidth = singleWidth;
      });
      container.dataset.bandsBuilt = '1';
    } else {
      // conteúdo já veio triplicado do snapshot — só recalcula a largura,
      // que pode ter mudado com o layout/viewport atual
      bands.forEach(band => {
        band.dataset.singleWidth = band.scrollWidth / 3;
      });
    }

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

    function onScrollTick() {
      if (visible && !rafId) rafId = requestAnimationFrame(tick);
    }

    function onScrollSync() {
      if (!visible) lastScrollY = window.scrollY;
    }

    window.addEventListener('scroll', onScrollTick, { passive: true });
    window.addEventListener('scroll', onScrollSync, { passive: true });

    cleanupFns.push(() => {
      obs.disconnect();
      window.removeEventListener('scroll', onScrollTick);
      window.removeEventListener('scroll', onScrollSync);
      if (rafId) cancelAnimationFrame(rafId);
    });
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
        padding: 150px 0 150px 0;
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

  document.addEventListener('pagechange', init);
})();
