// scroll-effects.js — master rAF loop com separação read/write para evitar forced reflow
// Todos os efeitos (parallax, fade-scroll, fade-viewport) rodam em um único requestAnimationFrame.
// Fase 1: todas as leituras (getBoundingClientRect, scrollY, etc.)
// Fase 2: todas as escritas (style.transform, style.opacity, etc.)

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // ── Estado compartilhado ────────────────────────────────────────────────────
  let scrollY   = window.scrollY;
  let vh        = window.innerHeight;
  let rafActive = false;

  window.addEventListener('scroll', () => { scrollY = window.scrollY; scheduleFrame(); }, { passive: true });
  window.addEventListener('resize', () => { vh = window.innerHeight; scheduleFrame(); }, { passive: true });

  function scheduleFrame() {
    if (!rafActive) {
      rafActive = true;
      requestAnimationFrame(masterTick);
    }
  }

  // ── parallax ────────────────────────────────────────────────────────────────
  // data-effect="parallax"
  // data-speed="0.2"
  // data-direction="up" | "down" | "left" | "right"
  // data-origin="global" | "section"

  const parallaxEls = Array.from(document.querySelectorAll('[data-effect~="parallax"]'));

  function parallaxRead() {
    return parallaxEls.map(el => {
      const speed  = parseFloat(el.dataset.speed)  || 0.2;
      const dir    = el.dataset.direction          || 'up';
      const origin = el.dataset.origin             || 'section';

      let delta = 0;
      if (origin === 'global') {
        delta = scrollY * speed;
      } else {
        const parent = el.closest('[data-parallax-section]') || el.parentElement;
        const rect   = parent.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= vh) return null;
        delta = ((vh / 2) - (rect.top + rect.height / 2)) * speed;
      }

      const sign = (dir === 'down' || dir === 'right') ? -1 : 1;
      const axis = (dir === 'left' || dir === 'right') ? 'X' : 'Y';
      return { el, transform: `translate${axis}(${delta * sign}px)` };
    });
  }

  function parallaxWrite(data) {
    data.forEach(m => { if (m) m.el.style.transform = m.transform; });
  }

  // ── fade-scroll ─────────────────────────────────────────────────────────────
  // data-effect="fade-scroll"
  // data-fade-distance="600"
  // data-blur="3"

  const fadeScrollEls = Array.from(document.querySelectorAll('[data-effect~="fade-scroll"]'));

  function fadeScrollRead() {
    return fadeScrollEls.map(el => {
      const maxScroll = parseFloat(el.dataset.fadeDistance) || 600;
      const blur      = parseFloat(el.dataset.blur)         || 0;
      const opacity   = Math.max(0, Math.min(1, 1 - scrollY / maxScroll));
      return { el, opacity, filter: blur ? `blur(${(1 - opacity) * blur}px)` : '' };
    });
  }

  function fadeScrollWrite(data) {
    data.forEach(({ el, opacity, filter }) => {
      el.style.opacity = opacity;
      el.style.filter  = filter;
    });
  }

  // ── fade-viewport ────────────────────────────────────────────────────────────
  // data-effect="fade-viewport"
  // data-fade-zone="px ou %"
  // data-blur="px"

  const fadeViewportEls = Array.from(document.querySelectorAll('[data-effect~="fade-viewport"]'));

  fadeViewportEls.forEach(el => {
    el.style.webkitMaskRepeat = 'no-repeat';
    el.style.maskRepeat       = 'no-repeat';
  });

  function getVisualLines(el) {
    if (el.children.length === 0 && el.textContent.trim()) return getTextLines(el);
    const children = Array.from(el.children);
    if (children.length) return children.map(c => c.getBoundingClientRect());
    return [el.getBoundingClientRect()];
  }

  function getTextLines(el) {
    const textNode = el.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return getTextLinesFromChildren(el);
    const range = document.createRange();
    const lines = [];
    const text  = textNode.textContent;
    let lastTop = null, lineStart = 0;

    for (let i = 0; i <= text.length; i++) {
      range.setStart(textNode, lineStart);
      range.setEnd(textNode, Math.min(i, text.length));
      const rect = range.getBoundingClientRect();
      if (rect.top !== lastTop && lastTop !== null) {
        range.setStart(textNode, lineStart);
        range.setEnd(textNode, i - 1);
        lines.push(range.getBoundingClientRect());
        lineStart = i - 1;
      }
      lastTop = rect.top;
    }
    if (lineStart < text.length) {
      range.setStart(textNode, lineStart);
      range.setEnd(textNode, text.length);
      lines.push(range.getBoundingClientRect());
    }
    return lines.filter(r => r.width > 0 && r.height > 0);
  }

  function getTextLinesFromChildren(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects   = Array.from(range.getClientRects());
    const lineMap = new Map();
    rects.forEach(r => {
      const key = Math.round(r.top);
      if (!lineMap.has(key)) {
        lineMap.set(key, r);
      } else {
        const e = lineMap.get(key);
        lineMap.set(key, {
          top: e.top, bottom: Math.max(e.bottom, r.bottom),
          left: Math.min(e.left, r.left), right: Math.max(e.right, r.right),
          height: e.height,
          width: Math.max(e.right, r.right) - Math.min(e.left, r.left),
        });
      }
    });
    return Array.from(lineMap.values()).filter(r => r.width > 0 && r.height > 0);
  }

  function lineOpacity(lineRect, fadeZone) {
    const mid = lineRect.top + lineRect.height / 2;
    if (mid < vh - fadeZone) return 1;
    if (mid > vh) return 0;
    return Math.min(1, Math.max(0, (vh - mid) / fadeZone));
  }

  function fadeViewportRead() {
    return fadeViewportEls.map(el => {
      const fadeZone = parseFloat(el.dataset.fadeZone) || vh * 0.35;
      const blur     = parseFloat(el.dataset.blur)     || 0;

      // pula elementos fora da viewport
      const elRect = el.getBoundingClientRect();
      if (elRect.bottom < 0 || elRect.top > vh * 1.5) return null;

      const lines = getVisualLines(el);
      if (!lines.length) return null;

      if (lines.length === 1) {
        const op = lineOpacity(lines[0], fadeZone);
        return {
          el, singleLine: true, opacity: op,
          filter: blur ? `blur(${((1 - op) * blur).toFixed(2)}px)` : ''
        };
      }

      const elH    = elRect.height || 1;
      const sorted = [...lines].sort((a, b) => a.top - b.top);
      const stops  = [];
      sorted.forEach(line => {
        const op = lineOpacity(line, fadeZone);
        const s  = Math.max(0, ((line.top    - elRect.top) / elH) * 100);
        const e  = Math.min(100, ((line.bottom - elRect.top) / elH) * 100);
        stops.push(`rgba(0,0,0,${op.toFixed(3)}) ${s.toFixed(1)}%`);
        stops.push(`rgba(0,0,0,${op.toFixed(3)}) ${e.toFixed(1)}%`);
      });

      const gradient = `linear-gradient(to bottom, ${stops.join(', ')})`;
      let filter = '';
      if (blur) {
        const elOp = lineOpacity(elRect, fadeZone);
        filter = `blur(${((1 - elOp) * blur).toFixed(2)}px)`;
      }

      return { el, singleLine: false, maskImage: gradient, filter };
    });
  }

  function fadeViewportWrite(data) {
    data.forEach(m => {
      if (!m) return;
      if (m.singleLine) {
        m.el.style.opacity         = m.opacity;
        m.el.style.webkitMaskImage = '';
        m.el.style.maskImage       = '';
      } else {
        m.el.style.opacity         = '';
        m.el.style.webkitMaskImage = m.maskImage;
        m.el.style.maskImage       = m.maskImage;
      }
      m.el.style.filter = m.filter || '';
    });
  }

  // ── Master tick ─────────────────────────────────────────────────────────────

  function masterTick() {
    rafActive = false;

    // FASE 1 — todas as leituras (1 reflow no máximo)
    const parallaxData   = parallaxEls.length    ? parallaxRead()      : [];
    const fadeScrollData = fadeScrollEls.length  ? fadeScrollRead()    : [];
    const fadeViewData   = fadeViewportEls.length ? fadeViewportRead() : [];

    // FASE 2 — todas as escritas (sem leituras intercaladas)
    parallaxWrite(parallaxData);
    fadeScrollWrite(fadeScrollData);
    fadeViewportWrite(fadeViewData);
    // Loop só continua enquanto houver scroll/resize pendente (scheduleFrame re-agenda)
  }

  if (parallaxEls.length || fadeScrollEls.length || fadeViewportEls.length) {
    rafActive = true;
    requestAnimationFrame(masterTick);
  }

});