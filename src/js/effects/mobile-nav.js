// mobile-nav.js
// Botão de 2 riscos (mobile, dentro da .navtop) que só ABRE o menu.
// Fechar é feito pelo .mobile-menu__close,  botão próprio, dentro do
// #mobile-menu, sem depender da .navtop e sem hack de z-index pra
// empurrar o burger por cima das tiras.
//
// Overlay PRÓPRIO (#mobile-menu, .mobile-menu__strip*), independente do
// #page-wipe usado pelo page-transition.js pra navegação real,  evita
// os dois disputarem o mesmo overlay/estado ao mesmo tempo.
//
// Ao abrir: as tiras cobrem a tela e aparecem as opções do menu
// (mobile-menu__list), com entrada em cascata (sem elástico, só um leve
// overshoot de 2px). As opções já têm data-page,  o clique é pego pelo
// listener global do page-router.js, que dispara a navegação (com a
// transição de página normal) e fecha este overlay via o evento
// 'pagechange'.

(function () {
  const navtop = document.querySelector('.navtop');
  const burger = navtop && navtop.querySelector('.nav-burger');
  const menu = document.getElementById('mobile-menu');
  const stripsWrap = menu && menu.querySelector('.mobile-menu__strips');
  const closeBtn = menu && menu.querySelector('.mobile-menu__close');
  const list = menu && menu.querySelector('.mobile-menu__list');
  if (!navtop || !burger || !menu || !stripsWrap || !closeBtn || !list) return;

  const STRIP_WIDTH = 180;
  const MIN_STRIPS  = 3;
  const COVER_MS    = 480;
  const UNCOVER_MS  = 420;
  const STEP_MS     = 45;
  const JITTER_MS   = 60;
  const EASING      = 'cubic-bezier(.65,0,.35,1)';

  // entrada dos itens da lista: sobe até o lugar e dá um leve overshoot
  // de ITEM_OVERSHOOT px pra cima antes de assentar,  nada de elástico
  // com múltiplas oscilações.
  const ITEM_RISE_PX   = 16;
  const ITEM_OVERSHOOT = 2;
  const ITEM_MS        = 360;
  const ITEM_STAGGER   = 70;
  const ITEM_BASE_DELAY = 60;
  const ITEM_EASING    = 'cubic-bezier(.22,.61,.36,1)';

  // saída dos itens (ao fechar o menu): sobe ITEM_OVERSHOOT px, desce
  // e some,  espelho reduzido da entrada, toca ANTES da onda das tiras
  const ITEM_EXIT_MS      = 240;
  const ITEM_EXIT_STAGGER = 40;

  let strips = [];
  let isOpen = false;
  let isAnimating = false;

  function buildStrips() {
    const vw = window.innerWidth;
    const count = Math.max(MIN_STRIPS, Math.round(vw / STRIP_WIDTH));

    // cancela qualquer animação pendente das tiras antigas antes de
    // descartar os elementos,  fill:'forwards' sem cancel() deixa o
    // efeito "grudado", e um innerHTML='' na sequência não limpa isso
    strips.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

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
    const anims = strips.map((el, i) => {
      // grava o valor atual (from) no style inline ANTES de cancelar a
      // animação anterior,  senão cancelar deixa o elemento cair pro
      // style inline velho por uma fração de segundo (some/pisca) até
      // a nova animação entrar no delay dela
      el.style.transform = `translateY(${from})`;
      el.getAnimations().forEach((a) => a.cancel());
      el.style.willChange = 'transform';
      const anim = el.animate(
        [{ transform: `translateY(${from})` }, { transform: `translateY(${to})` }],
        { duration, delay: delays[i], easing: EASING, fill: 'forwards' }
      );
      anim.finished.then(() => { el.style.willChange = ''; }).catch(() => {});
      return anim;
    });
    return Promise.all(anims.map((a) => a.finished));
  }

  // entrada em cascata dos itens do menu: vem de baixo (translateY),
  // sobe e ultrapassa a posição final por ITEM_OVERSHOOT px, depois
  // desce e assenta,  sem oscilação extra.
  function playListEntrance() {
    const items = Array.from(list.children);
    items.forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.style.opacity = '0';
      el.style.transform = `translateY(${ITEM_RISE_PX}px)`;
    });

    void list.offsetHeight; // força reflow antes de animar

    items.forEach((el, i) => {
      const anim = el.animate(
        [
          { transform: `translateY(${ITEM_RISE_PX}px)`, opacity: 0, offset: 0 },
          { transform: `translateY(-${ITEM_OVERSHOOT}px)`, opacity: 1, offset: 0.7 },
          { transform: 'translateY(0)', opacity: 1, offset: 1 },
        ],
        { duration: ITEM_MS, delay: ITEM_BASE_DELAY + i * ITEM_STAGGER, easing: ITEM_EASING, fill: 'forwards' }
      );
      anim.finished.then(() => {
        el.style.transform = '';
        el.style.opacity = '';
      }).catch(() => {});
    });
  }

  function resetListEntrance() {
    Array.from(list.children).forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.style.opacity = '0';
      el.style.transform = `translateY(${ITEM_RISE_PX}px)`;
    });
  }

  // saída em cascata dos itens: sobe ITEM_OVERSHOOT px, depois desce
  // (passando da posição original) enquanto some,  toca inteira ANTES
  // da onda de fechamento das tiras começar
  function playListExit() {
    const items = Array.from(list.children);
    const anims = items.map((el, i) => {
      el.getAnimations().forEach((a) => a.cancel());
      return el.animate(
        [
          { transform: 'translateY(0)', opacity: 1, offset: 0 },
          { transform: `translateY(-${ITEM_OVERSHOOT}px)`, opacity: 1, offset: 0.3 },
          { transform: `translateY(${ITEM_RISE_PX}px)`, opacity: 0, offset: 1 },
        ],
        { duration: ITEM_EXIT_MS, delay: i * ITEM_EXIT_STAGGER, easing: ITEM_EASING, fill: 'forwards' }
      );
    });
    return Promise.all(anims.map((a) => a.finished));
  }

  async function openMenu() {
    if (isAnimating || isOpen) return;
    isAnimating = true;

    const count = buildStrips();
    menu.style.visibility = 'visible';
    menu.style.pointerEvents = 'auto';
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');

    await animateAll(waveDelays(count), '-100%', '0%', COVER_MS);
    menu.classList.add('is-open');
    playListEntrance();

    isOpen = true;
    isAnimating = false;
  }

  async function closeMenu({ animate = true } = {}) {
    if (isAnimating || !isOpen) return;
    isAnimating = true;

    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    menu.style.pointerEvents = 'none'; // bloqueia clique assim que começa a fechar

    if (animate) {
      await playListExit();            // 1) itens saem primeiro
      if (strips.length) {
        await animateAll(waveDelays(strips.length), '0%', '100%', UNCOVER_MS); // 2) só depois as tiras
      }
    } else {
      resetListEntrance(); // fecha junto com a transição de página, sem animar aqui
    }

    strips.forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.style.transform = 'translateY(-100%)';
    });
    // visibility (não só pointer-events) garante que o overlay some de
    // vez da composição,  evita resíduo de camada em navegadores mobile
    menu.style.visibility = 'hidden';
    menu.setAttribute('aria-hidden', 'true');

    isOpen = false;
    isAnimating = false;
  }

  burger.addEventListener('click', () => {
    if (!isOpen) openMenu();
  });

  closeBtn.addEventListener('click', () => closeMenu());

  // clique numa option do menu: fecha ESTE overlay na hora (sem esperar
  // o 'pagechange'),  page-router.js pega o mesmo clique (bubbling) e
  // dispara a navegação real com a transição de tiras por cima. Fecha
  // mesmo se for a página em que já se está (navigate() não dispara
  // pagechange nesse caso, mas o menu tem que sumir do mesmo jeito).
  list.addEventListener('click', (e) => {
    if (!e.target.closest('[data-page]')) return;
    closeMenu({ animate: false });
  });

  // navegação real (page-router.js) já cuida da própria transição de
  // tiras,  aqui só fecha o overlay do menu sem re-animar por cima
  // (fallback, ex: navegação disparada por popstate/voltar do navegador)
  document.addEventListener('pagechange', () => closeMenu({ animate: false }));
})();