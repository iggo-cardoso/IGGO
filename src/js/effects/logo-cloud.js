// ═══════════════════════════════════════════════════════════════
// LOGO CLOUD,  faixa infinita de logos de clientes com blur nas bordas
//
// Porta vanilla do padrão "InfiniteSlider + ProgressiveBlur":
// track duplicado uma vez e transladado via rAF (sem CSS animation,
// pra poder desacelerar suavemente no hover com lerp),  bordas com
// N camadas de backdrop-filter mascaradas em gradiente (progressive
// blur real, não um blur único e chapado).
//
// Segue o mesmo contrato de lifecycle do scroll-band.js: cleanup
// antes de reconstruir (evita rAF/listener órfão quando o
// page-router troca de página) e dataset flag pra não duplicar o
// track de novo quando o snapshot da home é restaurado.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const ANGLES = { top: 0, right: 90, bottom: 180, left: 270 };

  let cleanupFns = [];

  function runCleanup() {
    cleanupFns.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  function init() {
    runCleanup();

    const containers = document.querySelectorAll('[data-logo-cloud]');
    if (!containers.length) return;

    injectStyles();

    containers.forEach(setupContainer);
  }

  function setupContainer(root) {
    const track = root.querySelector('[data-logo-track]');
    if (!track) return;

    const gap = parseInt(root.dataset.gap || '42', 10);
    const speed = parseFloat(root.dataset.speed || '60');
    const speedOnHover = root.dataset.speedOnHover !== undefined
      ? parseFloat(root.dataset.speedOnHover)
      : 20;
    const reverse = root.dataset.reverse !== 'false';

    track.style.gap = `${gap}px`;

    // dataset.cloudBuilt sobrevive ao snapshot do #page-root,  evita
    // duplicar o track de novo (e de novo) toda vez que volta pra home
    if (!root.dataset.cloudBuilt) {
      const original = Array.from(track.children);
      original.forEach((item) => track.appendChild(item.cloneNode(true)));
      root.dataset.cloudBuilt = '1';
    }

    setupSlider(root, track, { gap, speed, speedOnHover, reverse });
    setupBlurEdges(root);
  }

  function setupSlider(root, track, { gap, speed, speedOnHover, reverse }) {
    const direction = reverse ? 1 : -1;
    let offset = 0;
    let currentSpeed = speed;
    let targetSpeed = speed;
    let contentSize = 0;
    let lastTime = performance.now();
    let rafId = null;
    let visible = true;

    function measure() {
      // scrollWidth só é confiável depois que as imagens carregaram e
      // ganharam dimensão real,  medir cedo demais (antes do load) dá
      // contentSize ~0 e o offset fica sendo resetado quase todo frame,
      // parecendo "travado" em vez de rolar contínuo.
      const next = track.scrollWidth / 2 + gap;
      if (next > 0) contentSize = next;
    }

    function tick(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      currentSpeed += (targetSpeed - currentSpeed) * Math.min(dt * 6, 1);

      if (contentSize > 0) {
        offset += direction * currentSpeed * dt;
        if (offset < -contentSize) offset += contentSize;
        if (offset > 0) offset -= contentSize;
        track.style.transform = `translate3d(${offset}px, 0, 0)`;
      }

      if (visible) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    function onEnter() { targetSpeed = speedOnHover; }
    function onLeave() { targetSpeed = speed; }

    const obs = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    }, { threshold: 0 });

    obs.observe(root);

    // ResizeObserver reage a qualquer mudança real de largura do track
    // (imagem carregando, fonte trocando, viewport mudando),  substitui
    // o resize-only que não pegava o load assíncrono das imagens.
    const resizeObs = new ResizeObserver(measure);
    resizeObs.observe(track);

    // dispara um remeasure assim que cada imagem terminar de carregar,
    // cobre o caso de cache/decode que o ResizeObserver pode perder
    const images = track.querySelectorAll('img');
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', measure, { once: true });
      img.addEventListener('error', measure, { once: true });
    });

    measure();
    root.addEventListener('mouseenter', onEnter);
    root.addEventListener('mouseleave', onLeave);

    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);

    cleanupFns.push(() => {
      visible = false;
      obs.disconnect();
      resizeObs.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('mouseleave', onLeave);
    });
  }

  function setupBlurEdges(root) {
    ['left', 'right'].forEach((direction) => {
      const edge = root.querySelector(`[data-logo-blur="${direction}"]`);
      if (!edge || edge.dataset.blurBuilt) return;

      buildBlurLayers(edge, { direction, layers: 8, intensity: 1 });
      edge.dataset.blurBuilt = '1';
    });
  }

  function buildBlurLayers(container, { direction, layers, intensity }) {
    const angle = ANGLES[direction];
    const segment = 1 / (layers + 1);

    for (let i = 0; i < layers; i += 1) {
      const stops = [i, i + 1, i + 2, i + 3].map((step, idx) => {
        const pos = step * segment * 100;
        const alpha = idx === 1 || idx === 2 ? 1 : 0;
        return `rgba(255,255,255,${alpha}) ${pos}%`;
      });

      const gradient = `linear-gradient(${angle}deg, ${stops.join(', ')})`;

      const layer = document.createElement('div');
      layer.className = 'logo-cloud__blur-layer';
      layer.style.maskImage = gradient;
      layer.style.webkitMaskImage = gradient;
      layer.style.backdropFilter = `blur(${i * intensity}px)`;
      layer.style.webkitBackdropFilter = `blur(${i * intensity}px)`;
      container.appendChild(layer);
    }
  }

  function injectStyles() {
    if (document.getElementById('logo-cloud-styles')) return;
    const style = document.createElement('style');
    style.id = 'logo-cloud-styles';
    style.textContent = `
      .logo-cloud {
        position: relative;
        margin: 0 auto;
        max-width: 720px;
        padding: 32px 0;
        background: linear-gradient(to right, rgba(0,0,0,0.03), transparent, rgba(0,0,0,0.03));

        & .logo-cloud__slider {
          overflow: hidden;
        }

        & .logo-cloud__track {
          display: flex;
          align-items: center;
          width: max-content;
        }

        & .logo-cloud__logo {
          height: 18px;
          width: auto;
          pointer-events: none;
          user-select: none;
          opacity: 0.75;
          filter: grayscale(1);

          @media (min-width: 768px) {
            height: 22px;
          }
        }

        & .logo-cloud__blur {
          position: absolute;
          top: 0;
          height: 100%;
          width: 160px;
          pointer-events: none;

          & .logo-cloud__blur-layer {
            position: absolute;
            inset: 0;
          }
        }

        & .logo-cloud__blur[data-logo-blur="left"] {
          left: 0;
        }

        & .logo-cloud__blur[data-logo-blur="right"] {
          right: 0;
        }
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
