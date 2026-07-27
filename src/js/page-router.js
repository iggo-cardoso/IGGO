// ═══════════════════════════════════════════════════════════════
// PAGE ROUTER — fetch de páginas reais, sem reload
//
// Trigger:   <li data-page="projetos">...</li>  (dentro da .navtop)
// Fragmento: /pages/projetos.html (public/pages/projetos.html)
// Container: <main id="page-root">...</main>    ← único conteúdo vivo no DOM
//
// A "home" NUNCA é buscada por fetch — ela já vem pré-renderizada no
// index.html. Um snapshot do innerHTML original é guardado em memória
// na primeira carga, e reusado ao voltar pra home (sem rede, sem reload).
// Isso evita reativar o loader.js (que remove o #site-loader do DOM e
// só roda uma vez) — um fetch falho de /pages/home.html inexistente
// caía no fallback location.href='/', causando reload real e a tela
// de loading "travada" reaparecendo.
// ═══════════════════════════════════════════════════════════════
(function () {
  const DEFAULT_PAGE = 'home';
  const PAGES_DIR     = '/pages/';   // -> public/pages/*.html
  const CONTAINER_ID  = 'page-root';

  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.error('[page-router] #' + CONTAINER_ID + ' não encontrado no DOM.');
    return;
  }

  const cache = new Map();      // fragmentos já buscados (exceto home)
  let homeSnapshot = null;      // conteúdo original da home, capturado uma vez
  let currentPage = null;
  let inflightController = null;

  // mapa page -> page-type, construído a partir dos triggers no DOM
  // (nav fica fora do #page-root, então isso não muda entre navegações)
  function buildPageTypeMap() {
    const map = {};
    document.querySelectorAll('[data-page]').forEach((el) => {
      if (el.dataset.pageType) map[el.dataset.page] = el.dataset.pageType;
    });
    return map;
  }
  const pageTypes = buildPageTypeMap();

  function fragmentUrl(name) {
    return `${PAGES_DIR}${name}.html`;
  }

  async function fetchFragment(name) {
    if (cache.has(name)) return cache.get(name);

    if (inflightController) inflightController.abort();
    inflightController = new AbortController();

    const res = await fetch(fragmentUrl(name), { signal: inflightController.signal });
    if (!res.ok) throw new Error(`Página "${name}" não encontrada (${res.status})`);

    const html = await res.text();
    cache.set(name, html);
    return html;
  }

  function resetScroll() {
    if (window.__scrollLerp && window.__scrollLerp.reset) {
      window.__scrollLerp.reset();
    } else {
      window.scrollTo(0, 0);
    }
  }

  function setActiveLinks(name) {
    document.querySelectorAll('[data-page]').forEach((el) => {
      el.classList.toggle('active', el.dataset.page === name);
    });
  }

  function applyBodyScope(name) {
    document.body.className = document.body.className
      .replace(/\bpg-[\w-]+\b/g, '')
      .trim();
    document.body.classList.add(`pg-${name}`);
  }

  // aplica/remove a classe pt-{tipo} no body conforme data-page-type
  // do trigger dessa página (ex: pt-noBrandArea esconde o header/brand)
  function applyPageType(name) {
    document.body.className = document.body.className
      .replace(/\bpt-[\w-]+\b/g, '')
      .trim();
    const type = pageTypes[name];
    if (type) document.body.classList.add(`pt-${type}`);
  }

  function finishNavigation(name, { pushHistory, scroll }) {
    currentPage = name;
    applyBodyScope(name);
    applyPageType(name);
    setActiveLinks(name);

    if (pushHistory) {
      history.pushState({ page: name }, '', `/${name === DEFAULT_PAGE ? '' : name}`);
    }

    if (scroll) resetScroll();

    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    document.dispatchEvent(new CustomEvent('pagechange', { detail: { page: name } }));
  }

  // faz a troca real do conteúdo (sem se preocupar com a transição visual)
  async function swapContent(name, { pushHistory, scroll }) {
    // ── HOME: nunca vai pra rede ──────────────────────────────
    if (name === DEFAULT_PAGE) {
      if (homeSnapshot !== null) {
        // voltando pra home: restaura o snapshot local, sem fetch/reload
        container.innerHTML = homeSnapshot;
      }
      // se homeSnapshot ainda for null, a home já está com o conteúdo
      // certo no DOM (primeira carga) — não mexe em nada
      finishNavigation(name, { pushHistory, scroll });
      return;
    }

    // saindo da home pela 1ª vez: guarda o snapshot SÓ AGORA, depois que
    // os módulos de efeito (scroll-expand-card etc.) já rodaram e
    // popularam o conteúdo dinâmico — snapshot pego cedo demais capturava
    // a home ainda vazia/pré-efeitos
    if (currentPage === DEFAULT_PAGE && homeSnapshot === null) {
      homeSnapshot = container.innerHTML;
    }

    // ── outras páginas: fetch normal, com cache ───────────────
    try {
      const html = await fetchFragment(name);
      container.innerHTML = html;
      finishNavigation(name, { pushHistory, scroll });
    } catch (err) {
      console.error('[page-router]', err);
      location.href = `/${name}`;
    }
  }

  async function navigate(name, { pushHistory = true, scroll = true, transition = true } = {}) {
    if (name === currentPage && pushHistory) return; // já tá nela

    const doSwap = () => swapContent(name, { pushHistory, scroll });

    // as tiras (page-transition.js) cobrem a tela, chamam doSwap() por
    // baixo e depois saem revelando a página nova. Se o efeito não
    // carregou por algum motivo, cai pro comportamento direto de sempre.
    if (transition && typeof window.__pageWipe === 'function') {
      await window.__pageWipe(doSwap);
    } else {
      await doSwap();
    }
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-page]');
    if (!trigger) return;
    e.preventDefault();
    navigate(trigger.dataset.page);
  });

  window.addEventListener('popstate', (e) => {
    const name = (e.state && e.state.page) || pageFromLocation();
    navigate(name, { pushHistory: false });
  });

  function pageFromLocation() {
    const path = location.pathname.replace(/^\/|\/$/g, '');
    return path || DEFAULT_PAGE;
  }

  const initial = pageFromLocation();
  history.replaceState({ page: initial }, '', location.pathname);
  navigate(initial, { pushHistory: false, scroll: false, transition: false });
})();