// ═══════════════════════════════════════════════════════════════
// PROJETOS,  animações da página /pages/projetos.html
//
// Mesmo padrão de effects/sobre.js: fica de prontidão e só "liga"
// quando os elementos .proj-* aparecem no DOM (o fragmento é
// injetado via innerHTML pelo page-router). Reinicializa em cada
// 'pagechange' e limpa observers/animações da instância anterior
// antes de montar de novo.
//
// O que este módulo liga:
//   1) Entrada em cascata (fade + leve subida, sem elástico/bounce)
//      no título e nos cartões de .proj-stats, via classe .is-in
//      (transição CSS simples, ver projetos.css).
//   2) Números (.count-num) contando de 0 até o valor real quando a
//      seção .proj-stats entra na viewport.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  let observers = [];
  let rafIds = [];

  function runCleanup() {
    observers.forEach((o) => { try { o.disconnect(); } catch (e) {} });
    observers = [];
    rafIds.forEach((id) => cancelAnimationFrame(id));
    rafIds = [];
  }

  // ── contagem numérica (0 -> valor real) ─────────────────────────
  function animateCount(el) {
    const to = parseFloat(el.dataset.countTo);
    if (Number.isNaN(to)) return;
    const decimals = parseInt(el.dataset.countDecimals, 10) || 0;
    const duration = parseFloat(el.dataset.countDuration) || 1300;
    const prefix = el.dataset.countPrefix || '';
    const suffix = el.dataset.countSuffix || '';

    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic

    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const val = to * ease(p);
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (p < 1) {
        rafIds.push(requestAnimationFrame(tick));
      } else {
        el.textContent = prefix + to.toFixed(decimals) + suffix;
      }
    }
    rafIds.push(requestAnimationFrame(tick));
  }

  // ── dispara a cascata + contagem quando .proj-stats entra na
  //    viewport, uma única vez ─────────────────────────────────────
  function watchStats() {
    const section = document.querySelector('.proj-stats');
    if (!section) return;

    let played = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || played) return;
        played = true;
        observer.unobserve(entry.target);

        const headline = section.querySelector('.proj-stats-headline');
        if (headline) headline.classList.add('is-in');

        section.querySelectorAll('.proj-stat').forEach((stat, i) => {
          setTimeout(() => stat.classList.add('is-in'), 100 + i * 90);
        });

        section.querySelectorAll('.count-num[data-count-to]').forEach((el, i) => {
          setTimeout(() => animateCount(el), 100 + i * 90);
        });
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

    observer.observe(section);
    observers.push(observer);
  }

  function init() {
    runCleanup();
    if (!document.querySelector('.proj-hero')) return; // não estamos na página Projetos

    watchStats();
  }

  document.addEventListener('pagechange', init);
  init();
})();
