import '../../css/html/loja.css';

// ═══════════════════════════════════════════════════════════════
// LOJA IGGO,  funções da página /pages/loja.html
//
// Fica em src/js/effects/ e é importado globalmente em main.js
// (igual scroll-band.js) porque o fragmento da loja é injetado no
// #page-root via innerHTML pelo page-router,  <script> dentro de um
// innerHTML NUNCA executa. Então, em vez de um <script> dentro do
// próprio loja.html, este módulo fica de prontidão o tempo todo e só
// "liga" quando os elementos .loja-* aparecem no DOM.
//
// Reinicializa em cada 'pagechange' (disparado pelo page-router) e
// limpa os listeners/timers da instância anterior antes de montar de
// novo,  mesmo cuidado do scroll-band.js, senão a página volta "morta"
// quando o usuário sai e retorna pra loja sem dar F5.
//
// O que este módulo liga:
//   1) Filtro de categoria,  sincronizado entre subnav, pills,
//      mini-cards da vitrine, botões dos slides e trilho de categorias.
//   2) Carrossel da vitrine (loja-showcase),  setas, dots e autoplay.
//   3) Trilho de categorias em círculo,  setas fazem scroll horizontal.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  let cleanupFns = [];

  function runCleanup() {
    cleanupFns.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  function init() {
    runCleanup();

    const root = document.querySelector('.loja-section-head, .loja-showcase, .loja-cat-rail');
    if (!root) return; // não estamos na página da loja

    initFilters();
    initShowcase();
    initCatRailArrows();
  }

  // ── 1) FILTRO DE CATEGORIA ──────────────────────────────────────
  function initFilters() {
    const controls = Array.from(document.querySelectorAll('[data-filter]'));
    const cards    = Array.from(document.querySelectorAll('.loja-grid .loja-card'));
    const emptyEl  = document.querySelector('.loja-empty');
    if (!controls.length) return;

    let current = 'todos';
    const hideTimers = new WeakMap();

    function syncActiveStates() {
      controls.forEach((el) => {
        el.classList.toggle('is-active', el.dataset.filter === current);
      });
    }

    function applyFilter(cat) {
      let visibleCount = 0;

      cards.forEach((card) => {
        const cats  = (card.dataset.cat || '').split(/\s+/).filter(Boolean);
        const match = cat === 'todos' || cats.includes(cat);

        const pendingTimer = hideTimers.get(card);
        if (pendingTimer) { clearTimeout(pendingTimer); hideTimers.delete(card); }

        if (match) {
          visibleCount++;
          if (card.hidden) {
            card.hidden = false;
            card.classList.add('loja-card--out');
            // força reflow antes de tirar a classe, pra transição rodar
            void card.offsetWidth;
          }
          card.classList.remove('loja-card--out');
        } else {
          card.classList.add('loja-card--out');
          const t = setTimeout(() => { card.hidden = true; }, 200);
          hideTimers.set(card, t);
        }
      });

      if (emptyEl) emptyEl.hidden = visibleCount > 0;
    }

    function setFilter(cat, opts) {
      const { scrollTo } = opts || {};
      current = cat;
      syncActiveStates();
      applyFilter(cat);

      if (scrollTo) {
        const target = document.querySelector(scrollTo) || document.querySelector('.loja-grid');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function onControlClick(e) {
      const el = e.currentTarget;
      const cat = el.dataset.filter;
      if (!cat) return;

      // pills dentro da própria grade não precisam rolar a tela, 
      // o usuário já está olhando pros produtos. O resto (subnav,
      // vitrine, trilho de categorias, empty-state) rola até a grade.
      const insideGridHeader = el.closest('.loja-filters');
      setFilter(cat, { scrollTo: insideGridHeader ? null : '.loja-grid' });
    }

    controls.forEach((el) => {
      el.addEventListener('click', onControlClick);
      cleanupFns.push(() => el.removeEventListener('click', onControlClick));
    });

    // estado inicial
    setFilter('todos', {});
  }

  // ── 2) CARROSSEL DA VITRINE ──────────────────────────────────────
  function initShowcase() {
    const main   = document.querySelector('.loja-showcase-main');
    const slides = Array.from(document.querySelectorAll('.loja-showcase-slide'));
    if (!main || !slides.length) return;

    const dots     = Array.from(document.querySelectorAll('.loja-showcase-dots span'));
    const prevBtn  = document.querySelector('.loja-showcase-arrow.prev');
    const nextBtn  = document.querySelector('.loja-showcase-arrow.next');
    const AUTOPLAY_MS = 6000;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let index = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
    if (index < 0) index = 0;
    let timer = null;

    function render() {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
      restartAutoplay();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    function restartAutoplay() {
      if (reduceMotion || slides.length < 2) return;
      if (timer) clearInterval(timer);
      timer = setInterval(() => { index = (index + 1) % slides.length; render(); }, AUTOPLAY_MS);
    }

    function stopAutoplay() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    main.addEventListener('mouseenter', stopAutoplay);
    main.addEventListener('mouseleave', restartAutoplay);

    render();
    restartAutoplay();

    cleanupFns.push(() => {
      stopAutoplay();
      if (prevBtn) prevBtn.removeEventListener('click', prev);
      if (nextBtn) nextBtn.removeEventListener('click', next);
      main.removeEventListener('mouseenter', stopAutoplay);
      main.removeEventListener('mouseleave', restartAutoplay);
    });
  }

  // ── 3) SETAS DO TRILHO DE CATEGORIAS ─────────────────────────────
  function initCatRailArrows() {
    const list    = document.querySelector('.loja-cat-list');
    const prevBtn = document.querySelector('.loja-cat-arrow.prev');
    const nextBtn = document.querySelector('.loja-cat-arrow.next');
    if (!list) return;

    const STEP = 260;
    function scrollBy(delta) { list.scrollBy({ left: delta, behavior: 'smooth' }); }
    function onPrev() { scrollBy(-STEP); }
    function onNext() { scrollBy(STEP); }

    if (prevBtn) prevBtn.addEventListener('click', onPrev);
    if (nextBtn) nextBtn.addEventListener('click', onNext);

    cleanupFns.push(() => {
      if (prevBtn) prevBtn.removeEventListener('click', onPrev);
      if (nextBtn) nextBtn.removeEventListener('click', onNext);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('pagechange', init);
})();
