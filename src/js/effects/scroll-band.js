// scroll-band.js
// Faixas de texto gigante que deslizam horizontalmente com o scroll.
// Linhas ímpares (1ª, 3ª) → esquerda | Linha par (2ª) → direita
// Usa separação read/write: lê scrollY uma vez por frame, escreve transforms em batch.

(function () {
  'use strict';

  function init() {
    const bands = document.querySelectorAll('.scroll-band');
    if (!bands.length) return;

    injectStyles();

    bands.forEach((band, i) => {
      const direction = i % 2 === 0 ? -1 : 1;
      band.dataset.direction = direction;

      const original = band.innerHTML;
      band.innerHTML = original + original + original;

      const singleWidth = band.scrollWidth / 3;
      band.dataset.singleWidth = singleWidth;
      band._baseOffset = direction === -1 ? 0 : -singleWidth;
    });

    let lastScrollY    = window.scrollY;
    const currentOffsets = Array.from(bands).map((band, i) =>
      i % 2 === 0 ? 0 : -parseFloat(band.dataset.singleWidth || 0)
    );

    const SPEED = 0.4;

    function tick() {
      // FASE 1 — leitura
      const scrollY = window.scrollY;
      const delta   = scrollY - lastScrollY;
      lastScrollY   = scrollY;

      // FASE 2 — cálculo + escrita em batch
      bands.forEach((band, i) => {
        const direction   = parseInt(band.dataset.direction);
        const singleWidth = parseFloat(band.dataset.singleWidth) || band.scrollWidth / 3;

        currentOffsets[i] += delta * SPEED * direction;

        if (currentOffsets[i] < -singleWidth) currentOffsets[i] += singleWidth;
        if (currentOffsets[i] > 0)            currentOffsets[i] -= singleWidth;

        band.style.transform = `translateX(${currentOffsets[i]}px)`;
      });

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
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
        padding: 0;
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
