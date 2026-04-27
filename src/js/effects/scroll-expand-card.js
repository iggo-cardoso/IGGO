// scroll-expand-card.js — CLS 0 via clip-path + transform (composited, sem layout writes)
// Estratégia:
//   • imgLayer é SEMPRE position:fixed; left:0; top:0; width:100%; height:100%
//     → definido UMA VEZ no init, NUNCA alterado no tick
//   • A "forma" da card (posição + tamanho) é simulada por clip-path: inset(...)
//     → clip-path é 100% composited (GPU), zero layout recalculation, zero CLS
//   • textLayer usa transform: translate() para centralizar no recorte visível
//     → também composited, zero CLS
//   • placeholder é definido UMA VEZ no init, re-definido só no resize
//   • sectionTop / stickAt / endAt são cacheados e só recalculados em resize
(function () {
  'use strict';

  const INITIAL_W_VW      = 0.68;
  const INITIAL_H_VH      = 0.62;
  const IMG_INITIAL_SCALE = 1.18;
  const IMG_FINAL_SCALE   = 1.0;
  const CARD_RADIUS_PX    = 14;
  const LERP_SPEED        = 6;   // só usado no desktop

  // Mobile = touch + pointer:coarse (sem mouse real)
  const IS_MOBILE = window.matchMedia('(hover: none) and (pointer: coarse)').matches
                    || navigator.maxTouchPoints > 0;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t)  { return a + (b - a) * t; }
  function easeInOut(t)   { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  function buildCard(section, slides) {
    const imgLayer = document.createElement('div');
    imgLayer.className = 'ec-card-imgs';
    // Definido UMA VEZ — nunca alterado no tick
    imgLayer.style.cssText =
      'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden;' +
      'will-change:clip-path;border-radius:0;';

    slides.forEach((s, i) => {
      const img = document.createElement('img');
      img.src      = s.img;
      img.alt      = s.title || '';
      img.className = 'ec-img' + (i === 0 ? ' active' : '');
      img.loading  = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.style.willChange = 'transform, opacity';
      if (s.objectPosition) img.style.objectPosition = s.objectPosition;
      imgLayer.appendChild(img);
    });

    const flash = document.createElement('div');
    flash.className = 'ec-flash';
    imgLayer.appendChild(flash);

    const bar = document.createElement('div');
    bar.className = 'ec-bar';
    const barFill = document.createElement('div');
    barFill.className = 'ec-bar-fill';
    bar.appendChild(barFill);
    imgLayer.appendChild(bar);

    const dots = document.createElement('div');
    dots.className = 'ec-dots';
    slides.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'ec-dot' + (i === 0 ? ' active' : '');
      dots.appendChild(d);
    });
    imgLayer.appendChild(dots);

    const textLayer = document.createElement('div');
    textLayer.className = 'ec-card-text';
    textLayer.style.cssText =
      'position:absolute;inset:0;pointer-events:none;will-change:transform;mix-blend-mode:difference;';

    slides.forEach((s, i) => {
      const block = document.createElement('div');
      block.className = 'ec-text' + (i === 0 ? ' active' : '');
      if (s.title === 'IGGO.') {
        block.innerHTML = '<img src="public/logos/png/logo.png" alt="" class="logo">';
      } else {
        block.innerHTML =
          '<h2 class="ec-title" style="mix-blend-mode:difference;">' + (s.title || '') + '</h2>';
      }
      if (i !== 0) block.style.display = 'none';
      textLayer.appendChild(block);
    });

    imgLayer.appendChild(textLayer);
    section.appendChild(imgLayer);

    return { imgLayer, textLayer, dots, barFill, flash };
  }

  function initSection(section) {
    const cardEl = section.querySelector('.expand-card');
    let slides = [];
    try { slides = JSON.parse(cardEl?.dataset.slides || '[]'); } catch (e) { return; }
    if (!slides.length) return;
    cardEl?.remove();

    const n = slides.length;

    // Altura da section: definida UMA VEZ
    const scrollHeight = parseFloat(section.dataset.scrollHeight) || n * 180;
    section.style.height = scrollHeight + 'vh';

    // Placeholder: definido UMA VEZ, re-definido só no resize
    const placeholder = document.createElement('div');
    placeholder.className = 'ec-placeholder';
    section.insertBefore(placeholder, section.firstChild);

    function setPlaceholderSize() {
      placeholder.style.width  = (window.innerWidth  * INITIAL_W_VW) + 'px';
      placeholder.style.height = (window.innerHeight * INITIAL_H_VH) + 'px';
    }
    setPlaceholderSize();

    // Cache de geometria — atualizado só em resize (fora do tick)
    var geo = {};
    function recacheGeometry() {
      geo.vw    = window.innerWidth;
      geo.vh    = window.innerHeight;
      geo.initW = geo.vw * INITIAL_W_VW;
      geo.initH = geo.vh * INITIAL_H_VH;
      setPlaceholderSize();
      var rect       = section.getBoundingClientRect();
      geo.sectionTop = rect.top + window.scrollY;
      geo.stickAt    = geo.sectionTop + placeholder.offsetTop +
                       geo.initH / 2 - geo.vh / 2;
      geo.endAt      = geo.sectionTop + section.offsetHeight - geo.vh;
      // Posicao real do placeholder (left nao muda com scroll vertical)
      var pr            = placeholder.getBoundingClientRect();
      geo.placeholderLeft = pr.left;
      geo.placeholderTop  = (geo.vh - geo.initH) / 2;
    }
    recacheGeometry();
    window.addEventListener('resize', recacheGeometry, { passive: true });

    var { imgLayer, textLayer, dots, barFill, flash } = buildCard(section, slides);

    var activeSlide    = -1;
    var smoothProgress = 0;
    var lastTickTime   = null;

    function setSlide(idx) {
      if (idx === activeSlide) return;
      var prevIdx = activeSlide;
      activeSlide = idx;

      var imgs  = imgLayer.querySelectorAll('.ec-img');
      var texts = textLayer.querySelectorAll('.ec-text');

      flash.style.transition = 'opacity 0.18s ease';
      flash.style.opacity    = '1';

      setTimeout(function () {
        if (prevIdx >= 0) {
          imgs[prevIdx].classList.remove('active');
          texts[prevIdx].style.display = 'none';
          texts[prevIdx].classList.remove('active');
        }
        imgs[idx].classList.add('active');
        texts[idx].style.display = 'flex';
        texts[idx].classList.add('active');
        dots.querySelectorAll('.ec-dot').forEach(function (el, i) {
          el.classList.toggle('active', i === idx);
        });
        flash.style.opacity = '0';
      }, 180);
    }

    function update(timestamp) {
      // Delta de tempo (só usado no desktop)
      if (!lastTickTime) lastTickTime = timestamp;
      var dt = Math.min((timestamp - lastTickTime) / 1000, 0.05);
      lastTickTime = timestamp;

      var vw    = geo.vw;
      var vh    = geo.vh;
      var initW = geo.initW;
      var initH = geo.initH;

      var scrollY     = window.scrollY;
      var rawProgress = clamp(
        (scrollY - geo.stickAt) / (geo.endAt - geo.stickAt), 0, 1
      );

      // Mobile: progress direto, sem lerp — elimina o atraso no touch
      // Desktop: lerp exponencial independente de framerate
      if (IS_MOBILE) {
        smoothProgress = rawProgress;
      } else {
        var factor = 1 - Math.exp(-LERP_SPEED * dt);
        smoothProgress = lerp(smoothProgress, rawProgress, factor);
      }
      var progress    = smoothProgress;
      var eased       = easeInOut(progress);

      var w = lerp(initW, vw, eased);
      var h = lerp(initH, vh, eased);

      var targetLeft, targetTop;

      if (scrollY < geo.stickAt) {
        // Única leitura de layout, apenas quando ainda não colou
        var pr     = placeholder.getBoundingClientRect();
        targetLeft = pr.left;
        targetTop  = pr.top;
      } else if (rawProgress < 1) {
        // lerp do ponto real do placeholder (cacheado) até 0 — sem salto na transição
        targetLeft = lerp(geo.placeholderLeft, 0, eased);
        targetTop  = lerp(geo.placeholderTop,  0, eased);
      } else {
        var sectionBottom = geo.sectionTop + section.offsetHeight;
        targetLeft = 0;
        targetTop  = sectionBottom - scrollY - vh;
      }

      // ── clip-path: inset() — 100% composited, zero CLS ───────────────────
      var insetT = Math.max(0, targetTop);
      var insetL = Math.max(0, targetLeft);
      var insetR = Math.max(0, vw - targetLeft - w);
      var insetB = Math.max(0, vh - targetTop - h);
      var radius = lerp(CARD_RADIUS_PX, 0, eased);

      imgLayer.style.clipPath =
        'inset(' + insetT.toFixed(1) + 'px ' + insetR.toFixed(1) + 'px ' +
        insetB.toFixed(1) + 'px ' + insetL.toFixed(1) + 'px ' +
        'round ' + radius.toFixed(1) + 'px)';

      // ── textLayer: transform para centralizar no recorte — composited ─────
      var visCx = targetLeft + w / 2;
      var visCy = targetTop  + h / 2;
      textLayer.style.transform =
        'translate(' + (visCx - vw / 2).toFixed(1) + 'px,' +
        (visCy - vh / 2).toFixed(1) + 'px)';

      // ── Escala das imagens — composited ───────────────────────────────────
      var imgScale = lerp(IMG_INITIAL_SCALE, IMG_FINAL_SCALE, easeInOut(progress));
      var scaleStr = imgScale.toFixed(4);
      imgLayer.querySelectorAll('.ec-img').forEach(function (img) {
        img.style.transform = 'scale(' + scaleStr + ')';
      });

      // ── Slide & progress bar ──────────────────────────────────────────────
      var slideIdx      = clamp(Math.floor(progress * n), 0, n - 1);
      setSlide(slideIdx);
      var sliceProgress = (progress - slideIdx / n) / (1 / n);
      barFill.style.width = clamp(sliceProgress * 100, 0, 100).toFixed(1) + '%';
    }

    var rafId = null;

    function tick(timestamp) {
      rafId = null;
      update(timestamp);
      // No desktop com lerp ativo, re-agenda enquanto smoothProgress não convergiu
      if (!IS_MOBILE && Math.abs(smoothProgress - clamp((window.scrollY - geo.stickAt) / (geo.endAt - geo.stickAt), 0, 1)) > 0.001) {
        rafId = requestAnimationFrame(tick);
      }
    }

    function scheduleFrame() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    // Ambos desktop e mobile: roda no scroll
    window.addEventListener('scroll', scheduleFrame, { passive: true });
    scheduleFrame(); // posição inicial
  }

  function init() {
    document.querySelectorAll('.expand-card-section').forEach(initSection);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
