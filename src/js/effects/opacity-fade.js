// opacity-fade.js — integrado ao master rAF via evento customizado
// Efeito: elementos com data-effect="opacity-fade" recebem degradê de opacidade
// conforme a posição na viewport.
// Usa separação read/write para evitar forced reflow.

(function () {
  'use strict';

  function getVisualLines(el) {
    const text = el.textContent || '';
    const isTextNode = el.children.length === 0 && text.trim().length > 0;
    if (isTextNode) return getTextLines(el);
    const children = Array.from(el.children);
    if (children.length > 0) return children.map(child => child.getBoundingClientRect());
    return [el.getBoundingClientRect()];
  }

  function getTextLines(el) {
    const range    = document.createRange();
    const textNode = el.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return getTextLinesFromChildren(el);

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
      if (!lineMap.has(key)) lineMap.set(key, r);
      else {
        const existing = lineMap.get(key);
        lineMap.set(key, {
          top: existing.top,
          bottom: Math.max(existing.bottom, r.bottom),
          left: Math.min(existing.left, r.left),
          right: Math.max(existing.right, r.right),
          height: existing.height,
          width: Math.max(existing.right, r.right) - Math.min(existing.left, r.left),
        });
      }
    });
    return Array.from(lineMap.values()).filter(r => r.width > 0 && r.height > 0);
  }

  function calcLineOpacity(lineRect, viewportHeight, fadeZone) {
    const lineMid = lineRect.top + lineRect.height / 2;
    if (lineMid < viewportHeight - fadeZone) return 1;
    if (lineMid > viewportHeight) return 0;
    return Math.min(1, Math.max(0, (viewportHeight - lineMid) / fadeZone));
  }

  function readElement(el, vh) {
    // pula elementos fora da viewport
    const elRect = el.getBoundingClientRect();
    if (elRect.bottom < 0 || elRect.top > vh * 1.5) return null;

    const fadeZone = parseFloat(el.dataset.fadeZone) || vh * 0.35;
    const lines    = getVisualLines(el);
    if (lines.length === 0) return null;

    if (lines.length === 1) {
      const op = calcLineOpacity(lines[0], vh, fadeZone);
      return { el, singleLine: true, opacity: op };
    }

    const elTop    = elRect.top;
    const elHeight = elRect.height || 1;
    const sorted   = [...lines].sort((a, b) => a.top - b.top);
    const stops    = [];

    sorted.forEach(line => {
      const op       = calcLineOpacity(line, vh, fadeZone);
      const startPct = Math.max(0, ((line.top    - elTop) / elHeight) * 100);
      const endPct   = Math.min(100, ((line.bottom - elTop) / elHeight) * 100);
      stops.push(`rgba(0,0,0,${op.toFixed(3)}) ${startPct.toFixed(1)}%`);
      stops.push(`rgba(0,0,0,${op.toFixed(3)}) ${endPct.toFixed(1)}%`);
    });

    return {
      el,
      singleLine: false,
      gradient: `linear-gradient(to bottom, ${stops.join(', ')})`
    };
  }

  function writeElement(m) {
    if (!m) return;
    if (m.singleLine) {
      m.el.style.opacity         = m.opacity;
      m.el.style.webkitMaskImage = '';
      m.el.style.maskImage       = '';
    } else {
      m.el.style.opacity         = '';
      m.el.style.webkitMaskImage = m.gradient;
      m.el.style.maskImage       = m.gradient;
    }
  }

  function init() {
    const targets = Array.from(document.querySelectorAll('[data-effect="opacity-fade"]'));
    if (!targets.length) return;

    targets.forEach(el => {
      el.style.webkitMaskRepeat = 'no-repeat';
      el.style.maskRepeat       = 'no-repeat';
    });

    let rafActive = false;

    function tick() {
      rafActive = false;
      const vh = window.innerHeight;

      // FASE 1 — todas as leituras
      const measurements = targets.map(el => readElement(el, vh));

      // FASE 2 — todas as escritas
      measurements.forEach(writeElement);

      rafActive = true;
      requestAnimationFrame(tick);
    }

    rafActive = true;
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
