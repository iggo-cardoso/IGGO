// ═══════════════════════════════════════════════════════════════
// SOBRE,  animações da página /pages/sobre.html
//
// Mesmo padrão de effects/loja.js e effects/afiliar-se.js: fica de
// prontidão e só "liga" quando os elementos .about-* aparecem no
// DOM (o fragmento é injetado via innerHTML pelo page-router,
// <script> ali dentro nunca executaria). Reinicializa em cada
// 'pagechange' e limpa observers/animações da instância anterior
// antes de montar de novo.
//
// O que este módulo liga:
//   1) Barras de score (about-score) preenchendo de 0% até o valor
//      real, e os números (score-num, bar-value, votes-overall)
//      contando até se formar, quando a seção entra na viewport.
//   2) Cascata de entrada (stagger) nos cartões/linhas que já usam
//      data-elastic-effect-entrance="up" data-elastic-trigger="manual"
//      (about-diff-card, about-step, service-group, score-bar,
//      votes-row), via window.ElasticEntrance já existente no site.
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

    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic

    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const val = to * ease(p);
      el.textContent = val.toFixed(decimals);
      if (p < 1) {
        rafIds.push(requestAnimationFrame(tick));
      } else {
        el.textContent = to.toFixed(decimals);
      }
    }
    rafIds.push(requestAnimationFrame(tick));
  }

  // ── barra preenchendo (0 -> largura real) ───────────────────────
  function animateBar(el) {
    const target = parseFloat(el.dataset.barWidth);
    if (Number.isNaN(target)) return;
    // força reflow antes de animar pra garantir a transição a partir de 0
    void el.offsetWidth;
    el.style.width = target + '%';
  }

  // ── dispara tudo dentro de uma seção .about-score quando ela
  //    entra na viewport, uma única vez ───────────────────────────
  function watchScoreSections() {
    const sections = Array.from(document.querySelectorAll('.about-score'));
    if (!sections.length) return;

    const played = new WeakSet();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || played.has(entry.target)) return;
        played.add(entry.target);
        observer.unobserve(entry.target);

        const section = entry.target;

        // cascata dos cartões de barra (usa a lib elástica já existente no site)
        const bars = section.querySelectorAll('.score-bar');
        if (window.ElasticEntrance && bars.length) {
          window.ElasticEntrance.playAll(section, { stagger: 90 });
        }

        // número grande do placar
        const bigNum = section.querySelector('.score-num[data-count-to]');
        if (bigNum) animateCount(bigNum);

        // barras + valores de cada critério, com pequeno atraso em cascata
        bars.forEach((bar, i) => {
          const fill = bar.querySelector('.bar-fill');
          const num = bar.querySelector('.count-num');
          setTimeout(() => {
            if (fill) animateBar(fill);
            if (num) animateCount(num);
          }, i * 90);
        });
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

    sections.forEach((s) => observer.observe(s));
    observers.push(observer);
  }

  // ── cascata da tabela de votos (cases) ──────────────────────────
  function watchVotesTable() {
    const table = document.querySelector('.about-votes .votes-table');
    if (!table) return;

    let played = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || played) return;
        played = true;
        observer.unobserve(entry.target);

        if (window.ElasticEntrance) {
          window.ElasticEntrance.playAll(table, { stagger: 90 });
        }

        table.querySelectorAll('.votes-overall[data-count-to]').forEach((el, i) => {
          setTimeout(() => animateCount(el), i * 90);
        });
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    observer.observe(table);
    observers.push(observer);
  }

  // ── cascata genérica pros cartões que já existiam na página
  //    (diferencial, processo, serviços), reaproveitando a mesma
  //    lib elástica, só que agrupada por seção pra entrar junto ───
  function watchGenericGroups() {
    const groups = [
      '.about-diff-grid',
      '.about-process-list',
      '.about-service-groups',
    ];

    groups.forEach((selector) => {
      const el = document.querySelector(selector);
      if (!el) return;

      let played = false;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || played) return;
          played = true;
          observer.unobserve(entry.target);
          if (window.ElasticEntrance) {
            window.ElasticEntrance.playAll(el, { stagger: 90 });
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

      observer.observe(el);
      observers.push(observer);
    });
  }

  function init() {
    runCleanup();
    if (!document.querySelector('.about-hero')) return; // não estamos na página Sobre

    watchScoreSections();
    watchVotesTable();
    watchGenericGroups();
  }

  document.addEventListener('pagechange', init);
  init();
})();
