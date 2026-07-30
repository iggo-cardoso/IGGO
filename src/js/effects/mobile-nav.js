// mobile-nav.js
// Botão de 2 riscos (mobile) que abre/fecha o menu mobile.
//
// Overlay PRÓPRIO (#mobile-menu, .mobile-menu__strip*), independente do
// #page-wipe usado pelo page-transition.js pra navegação real,  evita
// os dois disputarem o mesmo overlay/estado ao mesmo tempo.
//
// Ao abrir: as tiras cobrem a tela e, no lugar do "saying" da transição
// de página, aparecem as opções do menu (mobile-menu__list). As opções
// já têm data-page,  o clique é pego pelo listener global do
// page-router.js, que dispara a navegação (com a transição de página
// normal) e fecha este overlay via o evento 'pagechange'.

(function () {
  const navtop = document.querySelector('.navtop');
  const burger = navtop && navtop.querySelector('.nav-burger');
  const menu = document.getElementById('mobile-menu');
  const stripsWrap = menu && menu.querySelector('.mobile-menu__strips');
  const list = menu && menu.querySelector('.mobile-menu__list');
  if (!navtop || !burger || !menu || !stripsWrap || !list) return;

  const STRIP_WIDTH = 180;
  const MIN_STRIPS  = 3;
  const COVER_MS    = 480;
  const UNCOVER_MS  = 420;
  const STEP_MS     = 45;
  const JITTER_MS   = 60;
  const EASING      = 'cubic-bezier(.65,0,.35,1)';

  let strips = [];
  let isOpen = false;
  let isAnimating = false;

  function buildStrips() {
    const vw = window.innerWidth;
    const count = Math.max(MIN_STRIPS, Math.round(vw / STRIP_WIDTH));

    stripsWrap.innerHTML = '';
    strips = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'mobile-menu__strip';
      el.style.transform = 'translateY(-100%)';
      stripsWrap.appendChild(el);
      strips.push(el);
    }
    return count;
  }

  function waveDelays(count) {
    const delays = [];
    for (let i = 0; i < count; i++) {
      const fromRight = count - 1 - i;
      delays.push(fromRight * STEP_MS + Math.random() * JITTER_MS);
    }
    return delays;
  }

  function animateAll(delays, from, to, duration) {
    const anims = strips.map((el, i) => el.animate(
      [{ transform: `translateY(${from})` }, { transform: `translateY(${to})` }],
      { duration, delay: delays[i], easing: EASING, fill: 'forwards' }
    ));
    return Promise.all(anims.map((a) => a.finished));
  }

  async function openMenu() {
    if (isAnimating || isOpen) return;
    isAnimating = true;

    const count = buildStrips();
    menu.style.pointerEvents = 'auto';
    menu.setAttribute('aria-hidden', 'false');
    navtop.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');

    await animateAll(waveDelays(count), '-100%', '0%', COVER_MS);
    menu.classList.add('is-open');

    // dispara a entrada elástica dos itens do menu (data-elastic-trigger="manual"),
    // um pouco escalonada pra dar o efeito de "cascata"
    if (window.ElasticEntrance) {
      window.ElasticEntrance.playAll(list, { stagger: 70, baseDelay: 60 });
    }

    isOpen = true;
    isAnimating = false;
  }

  async function closeMenu({ animate = true } = {}) {
    if (isAnimating || !isOpen) return;
    isAnimating = true;

    menu.classList.remove('is-open');
    navtop.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');

    // volta os itens do menu pro estado "escondido" (sem animar),
    // prontos pra tocar a entrada elástica de novo na próxima abertura
    if (window.ElasticEntrance) {
      window.ElasticEntrance.reset(list);
    }

    if (animate && strips.length) {
      await animateAll(waveDelays(strips.length), '0%', '100%', UNCOVER_MS);
    }

    strips.forEach((el) => { el.style.transform = 'translateY(-100%)'; });
    menu.style.pointerEvents = 'none';
    menu.setAttribute('aria-hidden', 'true');

    isOpen = false;
    isAnimating = false;
  }

  burger.addEventListener('click', () => {
    if (isOpen) closeMenu();
    else openMenu();
  });

  // navegação real (page-router.js) já cuida da própria transição de
  // tiras,  aqui só fecha o overlay do menu sem re-animar por cima
  document.addEventListener('pagechange', () => closeMenu({ animate: false }));
})();