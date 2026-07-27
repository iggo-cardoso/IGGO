// ═══════════════════════════════════════════════════════════════
// CUSTOM SCROLLBAR — substitui a nativa, integrada ao lerp do index.js
//
// Requer que index.js tenha rodado antes e exposto window.__scrollLerp
// (getTarget, setTarget, maxScroll). Funciona igual em desktop (lerp)
// e mobile (shim que chama scrollTo direto).
// ═══════════════════════════════════════════════════════════════
(function () {
  const bar   = document.getElementById('custom-scrollbar');
  const thumb = document.getElementById('custom-scrollbar__thumb');
  if (!bar || !thumb) return;

  function waitForLerp(cb) {
    if (window.__scrollLerp) return cb();
    requestAnimationFrame(() => waitForLerp(cb));
  }

  waitForLerp(init);

  function init() {
    const lerp = window.__scrollLerp;

    let dragging = false;
    let barRect  = null;
    let trackH   = 0;
    let thumbH   = 0;

    function recalc() {
      barRect = bar.getBoundingClientRect();
      trackH  = barRect.height;

      const winH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      // altura do thumb proporcional ao viewport visível vs total do doc
      thumbH = Math.max(30, (winH / docH) * trackH);
      thumb.style.height = thumbH + 'px';

      // some se não há o que rolar
      bar.classList.toggle('is-hidden', lerp.maxScroll() <= 0);
    }

    function render() {
      const max = lerp.maxScroll();
      const pct = max > 0 ? lerp.getTarget() / max : 0;
      const travel = trackH - thumbH;
      thumb.style.transform = `translateY(${pct * travel}px)`;
      requestAnimationFrame(render);
    }

    function setTargetFromClientY(clientY) {
      const travel = trackH - thumbH;
      const rel = clientY - barRect.top - thumbH / 2;
      const pct = Math.max(0, Math.min(1, rel / travel));
      lerp.setTarget(pct * lerp.maxScroll());
    }

    // clique direto na trilha pula pra posição
    bar.addEventListener('pointerdown', (e) => {
      dragging = true;
      bar.classList.add('dragging');
      barRect = bar.getBoundingClientRect();
      bar.setPointerCapture(e.pointerId);
      setTargetFromClientY(e.clientY);
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setTargetFromClientY(e.clientY);
    });

    window.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove('dragging');
      try { bar.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    window.addEventListener('resize', recalc);

    // recalcula se o conteúdo mudar de altura (imagens carregando, etc.)
    new ResizeObserver(recalc).observe(document.documentElement);

    recalc();
    requestAnimationFrame(render);
  }
})();
