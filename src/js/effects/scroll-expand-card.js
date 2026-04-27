// scroll-expand-card.js
// Estratégia: sticky + clip-path:polygon() — igual ao Lirio Studio
// O imgLayer é sempre position:sticky, top:0, width:100vw, height:100vh
// O efeito de "card pequeno expandindo" é feito pelo clip-path polygon()
// que vai de um recorte central (initW x initH) até 0%/100% (tela cheia)
// ZERO mudança de position → ZERO CLS

(function () {
  'use strict';

  const INITIAL_W_VW      = 0.68;  // largura inicial como fração da viewport
  const INITIAL_H_VH      = 0.62;  // altura inicial como fração da viewport
  const CARD_RADIUS_PX    = 14;    // border-radius inicial em px
  const IMG_INITIAL_SCALE = 1.18;
  const IMG_FINAL_SCALE   = 1.0;
  const LERP_SPEED        = 6;

  const IS_MOBILE = window.matchMedia('(hover: none) and (pointer: coarse)').matches
                    || navigator.maxTouchPoints > 0;

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

    return { imgLayer, textLayer, dots, barFill, flash };
  }

  function initSection(section) {
    const cardEl = section.querySelector('.expand-card');
    let slides = [];
    try { slides = JSON.parse(cardEl?.dataset.slides || '[]'); } catch(e) { return; }
    if (!slides.length) return;
    cardEl?.remove();

    const n = slides.length;
    const scrollHeight = parseFloat(section.dataset.scrollHeight) || n * 180;

    // A section precisa de altura suficiente para o scroll acontecer
    // O sticky vai ocupar 100vh dentro dela
    section.style.height = scrollHeight + 'vh';
    section.style.position = 'relative';

    const { imgLayer, textLayer, dots, barFill, flash } = buildCard(section, slides);

    // SEMPRE sticky — nunca muda, zero CLS
    imgLayer.style.cssText = [
      'position:sticky',
      'top:0',
      'width:100%',
      'height:100vh',
      'will-change:clip-path',
      'overflow:hidden',
    ].join(';') + ';';

    // Geometria cacheada — só recalcula em resize
    var geo = {};
    function recache() {
      geo.vw = window.innerWidth;
      geo.vh = window.innerHeight;
      geo.initW = geo.vw * INITIAL_W_VW;
      geo.initH = geo.vh * INITIAL_H_VH;
      // insets iniciais em % para o clip-path
      // inset horizontal: (vw - initW) / 2 / vw * 100
      geo.insetXpct = ((geo.vw - geo.initW) / 2 / geo.vw * 100);
      geo.insetYpct = ((geo.vh - geo.initH) / 2 / geo.vh * 100);
      // Onde começa e termina a animação em relação ao scroll da section
      var rect = section.getBoundingClientRect();
      geo.sectionTop = rect.top + window.scrollY;
      // Começa a animar assim que o sticky gruda (topo da section chega ao topo da viewport)
      geo.startAt = geo.sectionTop;
      // Termina quando a section quase acabou (deixa 1vh de margem)
      geo.endAt = geo.sectionTop + section.offsetHeight - geo.vh;
    }
    recache();
    window.addEventListener('resize', recache, { passive: true });

    var activeSlide    = -1;
    var smoothProgress = 0;
    var lastTime       = null;

    function setSlide(idx) {
      if (idx === activeSlide) return;
      var prevIdx = activeSlide;
      activeSlide = idx;
      var imgs  = imgLayer.querySelectorAll('.ec-img');
      var texts = textLayer.querySelectorAll('.ec-text');
      flash.style.transition = 'opacity 0.18s ease';
      flash.style.opacity = '1';
      setTimeout(function() {
        if (prevIdx >= 0) {
          imgs[prevIdx].classList.remove('active');
          texts[prevIdx].style.display = 'none';
          texts[prevIdx].classList.remove('active');
        }
        imgs[idx].classList.add('active');
        texts[idx].style.display = 'flex';
        texts[idx].classList.add('active');
        dots.querySelectorAll('.ec-dot').forEach(function(el, i) {
          el.classList.toggle('active', i === idx);
        });
        flash.style.opacity = '0';
      }, 180);
    }

    function update(ts) {
      if (!lastTime) lastTime = ts;
      var dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      var scrollY = window.scrollY;
      var rawProgress = clamp((scrollY - geo.startAt) / (geo.endAt - geo.startAt), 0, 1);

      if (IS_MOBILE) {
        smoothProgress = rawProgress;
      } else {
        smoothProgress = lerp(smoothProgress, rawProgress, 1 - Math.exp(-LERP_SPEED * dt));
      }

      var p     = smoothProgress;
      var eased = easeInOut(p);

      // clip-path: polygon — insets em %
      // insetX vai de geo.insetXpct até 0%
      // insetY vai de geo.insetYpct até 0%
      var ix = lerp(geo.insetXpct, 0, eased);
      var iy = lerp(geo.insetYpct, 0, eased);

      // border-radius simulado com inset() — mas usamos polygon() como o Lirio
      // polygon: top-left, top-right, bottom-right, bottom-left
      var tl = ix.toFixed(3) + '% ' + iy.toFixed(3) + '%';
      var tr = (100 - ix).toFixed(3) + '% ' + iy.toFixed(3) + '%';
      var br = (100 - ix).toFixed(3) + '% ' + (100 - iy).toFixed(3) + '%';
      var bl = ix.toFixed(3) + '% ' + (100 - iy).toFixed(3) + '%';

      imgLayer.style.clipPath = 'polygon(' + tl + ',' + tr + ',' + br + ',' + bl + ')';

      // border-radius: interpola de CARD_RADIUS_PX até 0
      var radius = lerp(CARD_RADIUS_PX, 0, eased);
      imgLayer.style.borderRadius = radius.toFixed(1) + 'px';

      // escala das imagens
      var imgScale = lerp(IMG_INITIAL_SCALE, IMG_FINAL_SCALE, eased).toFixed(4);
      imgLayer.querySelectorAll('.ec-img').forEach(function(img) {
        img.style.transform = 'scale(' + imgScale + ')';
      });

      // slide ativo
      var slideIdx = clamp(Math.floor(p * n), 0, n - 1);
      setSlide(slideIdx);
      var sliceP = (p - slideIdx / n) / (1 / n);
      barFill.style.width = clamp(sliceP * 100, 0, 100).toFixed(1) + '%';
    }

    var rafId = null;

    function tick(ts) {
      rafId = null;
      update(ts);
      if (!IS_MOBILE) {
        var raw = clamp((window.scrollY - geo.startAt) / (geo.endAt - geo.startAt), 0, 1);
        if (Math.abs(smoothProgress - raw) > 0.0005) {
          rafId = requestAnimationFrame(tick);
          return;
        }
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
