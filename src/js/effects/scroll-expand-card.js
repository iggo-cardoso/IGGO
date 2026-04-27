
(function () {
  'use strict';

  const INITIAL_W_VW      = 0.68;
  const INITIAL_H_VH      = 0.62;
  const CARD_RADIUS_PX    = 14;
  const IMG_INITIAL_SCALE = 1.18;
  const IMG_FINAL_SCALE   = 1.0;
  const LERP_SPEED        = 6;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t)  { return a + (b - a) * t; }
  function easeInOut(t)   { return t < 0.5 ? 2*t*t : -1 + (4-2*t)*t; }

  function buildCard(section, slides) {
    const imgLayer = document.createElement('div');
    imgLayer.className = 'ec-card-imgs';

    slides.forEach((s, i) => {
      const img = document.createElement('img');
      img.src      = s.img;
      img.alt      = s.title || '';
      img.className = 'ec-img' + (i === 0 ? ' active' : '');
      img.loading  = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (s.objectPosition) img.style.objectPosition = s.objectPosition;
      imgLayer.appendChild(img);
    });

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

    slides.forEach((s, i) => {
      const block = document.createElement('div');
      block.className = 'ec-text' + (i === 0 ? ' active' : '');
      if (s.title === 'IGGO.') {
        block.innerHTML = '<img src="public/logos/png/logo.png" alt="" class="logo">';
      } else {
        block.innerHTML = '<h2 class="ec-title" style="mix-blend-mode:difference;">' + (s.title || '') + '</h2>';
      }
      if (i !== 0) block.style.display = 'none';
      textLayer.appendChild(block);
    });

    imgLayer.appendChild(textLayer);
    section.appendChild(imgLayer);

    return { imgLayer, textLayer, dots, barFill };
  }

  function initSection(section) {
    const cardEl = section.querySelector('.expand-card');
    let slides = [];
    try { slides = JSON.parse(cardEl?.dataset.slides || '[]'); } catch(e) { return; }
    if (!slides.length) return;
    cardEl?.remove();

    const n = slides.length;
    const scrollHeight = parseFloat(section.dataset.scrollHeight) || n * 180;
    section.style.height = scrollHeight + 'vh';
    section.style.position = 'relative';

    const { imgLayer, textLayer, dots, barFill } = buildCard(section, slides);

    // Cache de referências — evita querySelectorAll no tick
    const imgs  = Array.from(imgLayer.querySelectorAll('.ec-img'));
    const texts = Array.from(textLayer.querySelectorAll('.ec-text'));
    const dotEls = Array.from(dots.querySelectorAll('.ec-dot'));

    // Sticky — nunca muda, zero CLS
    imgLayer.style.cssText = 'position:sticky;top:0;width:100%;height:100vh;will-change:clip-path;overflow:hidden;';

    // Geometria cacheada
    var geo = {};
    function recache() {
      geo.vw = window.innerWidth;
      geo.vh = window.innerHeight;
      geo.initW = geo.vw * INITIAL_W_VW;
      geo.initH = geo.vh * INITIAL_H_VH;
      var rect = section.getBoundingClientRect();
      geo.sectionTop = rect.top + window.scrollY;
      geo.startAt = geo.sectionTop;
      geo.endAt   = geo.sectionTop + section.offsetHeight - geo.vh;
    }
    recache();
    window.addEventListener('resize', recache, { passive: true });

    var activeSlide    = -1;
    var smoothProgress = 0;
    var lastTime       = null;
    var activeImg      = imgs[0] || null; // referência direta à img ativa

    function setSlide(idx) {
      if (idx === activeSlide) return;

      // Remove active do anterior
      if (activeSlide >= 0) {
        imgs[activeSlide].classList.remove('active');
        texts[activeSlide].style.display = 'none';
        texts[activeSlide].classList.remove('active');
        dotEls[activeSlide].classList.remove('active');
        // Remove transform da img que saiu
        imgs[activeSlide].style.transform = '';
      }

      activeSlide = idx;
      activeImg   = imgs[idx];

      // Ativa o novo
      imgs[idx].classList.add('active');
      texts[idx].style.display = 'flex';
      texts[idx].classList.add('active');
      dotEls[idx].classList.add('active');
    }

    function update(ts) {
      if (!lastTime) lastTime = ts;
      var dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      var scrollY     = window.scrollY;
      var rawProgress = clamp((scrollY - geo.startAt) / (geo.endAt - geo.startAt), 0, 1);

      smoothProgress = lerp(smoothProgress, rawProgress, 1 - Math.exp(-LERP_SPEED * dt));

      var p     = smoothProgress;
      var eased = easeInOut(p);

      // clip-path: inset() — hardware-accelerated, sem piscar no mobile
      var ix     = lerp((geo.vw - geo.initW) / 2, 0, eased);
      var iy     = lerp((geo.vh - geo.initH) / 2, 0, eased);
      var radius = lerp(CARD_RADIUS_PX, 0, eased);

      imgLayer.style.clipPath =
        'inset(' + iy.toFixed(1) + 'px ' + ix.toFixed(1) + 'px round ' + radius.toFixed(1) + 'px)';

      // Escala só na imagem ativa — não percorre todas
      if (activeImg) {
        var imgScale = lerp(IMG_INITIAL_SCALE, IMG_FINAL_SCALE, eased);
        activeImg.style.transform = 'scale(' + imgScale.toFixed(4) + ')';
      }

      // Slide ativo
      var slideIdx = clamp(Math.floor(p * n), 0, n - 1);
      setSlide(slideIdx);

      // Barra de progresso
      var sliceP = (p - slideIdx / n) / (1 / n);
      barFill.style.width = clamp(sliceP * 100, 0, 100).toFixed(1) + '%';
    }

    var rafId = null;

    function tick(ts) {
      rafId = null;
      update(ts);
      var raw = clamp((window.scrollY - geo.startAt) / (geo.endAt - geo.startAt), 0, 1);
      if (Math.abs(smoothProgress - raw) > 0.0005) {
        rafId = requestAnimationFrame(tick);
      }
    }

    function scheduleFrame() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', scheduleFrame, { passive: true });
    scheduleFrame();
  }

  function init() {
    document.querySelectorAll('.expand-card-section').forEach(initSection);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();