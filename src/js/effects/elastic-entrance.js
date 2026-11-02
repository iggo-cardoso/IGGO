// Entrada suave para os elementos que usam data-elastic-effect-entrance.
(function () {
  const SELECTOR = '[data-elastic-effect-entrance]';

  const OFFSETS = {
    up:    (d) => `translateY(${d}px)`,
    down:  (d) => `translateY(${-d}px)`,
    left:  (d) => `translateX(${d}px)`,
    right: (d) => `translateX(${-d}px)`,
  };

  let observer = null;
  const played = new WeakSet(); // controla o modo automático (só toca uma vez)

  function readParams(el) {
    const dir = el.dataset.elasticEffectEntrance;
    const offsetFn = OFFSETS[dir];
    if (!offsetFn) return null;

    return {
      offsetFn,
      distance: parseFloat(el.dataset.elasticDistance) || 12,
      duration: parseFloat(el.dataset.elasticDuration) || 520,
      delay:    parseFloat(el.dataset.elasticDelay)    || 0,
      manual:   el.dataset.elasticTrigger === 'manual',
      fade:     el.dataset.elasticFade !== 'false', // opacity 0 -> 1 junto com o movimento (default: ligado)
    };
  }

  function buildKeyframes(p) {
    return [
      { transform: p.offsetFn(p.distance), opacity: p.fade ? 0 : 1, easing: 'cubic-bezier(.33,0,.67,1)' },
      { transform: 'translate(0, 0)', opacity: 1 },
    ];
  }
  function setInitial(el) {
    const p = readParams(el);
    if (!p) return;
    el.style.transform  = p.offsetFn(p.distance);
    el.style.willChange = p.fade ? 'transform, opacity' : 'transform';
    if (p.fade) el.style.opacity = '0';
  }

  // extraDelay: atraso adicional passado na hora (stagger/baseDelay do
  // modo manual); se omitido, usa o data-elastic-delay do elemento.
  function play(el, extraDelay) {
    const p = readParams(el);
    if (!p) return null;

    const delay = extraDelay != null ? extraDelay : p.delay;

    const anim = el.animate(buildKeyframes(p), {
      duration: p.duration,
      delay,
      fill: 'forwards',
    });

    anim.finished
      .then(() => { el.style.transform = ''; el.style.opacity = ''; el.style.willChange = ''; })
      .catch(() => {});

    return anim.finished;
  }

  function playAuto(el) {
    if (played.has(el)) return;
    played.add(el);
    play(el);
  }

  // ---- API manual -----------------------------------------------------

  function collect(target) {
    if (!target) return [];
    if (target.matches && target.matches(SELECTOR)) return [target];
    return Array.from(target.querySelectorAll(SELECTOR));
  }

  // Toca (ou re-toca) todos os elementos elásticos dentro de `target`
  // (um elemento único ou um container). Funciona pra manual e também
  // pra automático, caso você queira forçar um replay.
  //   stagger:   ms de atraso entre um item e o próximo (default 0)
  //   baseDelay: ms de atraso antes do primeiro item (default 0)
  function playAll(target, { stagger = 0, baseDelay = 0 } = {}) {
    const els = collect(target);
    els.forEach((el) => setInitial(el)); // garante que reinicia do estado "escondido"

    // força reflow antes de animar, senão o browser pode "colapsar"
    // a mudança de estilo com a animação que já vai começar
    void target.offsetHeight;

    return Promise.all(
      els.map((el, i) => play(el, baseDelay + i * stagger))
    );
  }

  // Volta os elementos pro estado inicial (escondido), sem animar.
  // Útil pra deixar pronto pra próxima vez que o menu/seção abrir.
  function reset(target) {
    collect(target).forEach((el) => {
      setInitial(el);
      played.delete(el); // se algum dia entrar em viewport nesse estado, pode reanimar
    });
  }

  window.ElasticEntrance = { playAll, reset, play: (el, delay) => play(el, delay) };

  // ---- modo automático (scroll/viewport) ------------------------------

  function refresh() {
    if (observer) observer.disconnect();

    const els = Array.from(document.querySelectorAll(SELECTOR))
      .filter((el) => el.dataset.elasticTrigger !== 'manual');

    els.forEach((el) => { if (!played.has(el)) setInitial(el); });

    if (!els.length) return;

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          playAuto(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    els.forEach((el) => { if (!played.has(el)) observer.observe(el); });
  }

  // elementos manuais também precisam começar escondidos
  function setupManual() {
    const manualEls = Array.from(document.querySelectorAll(SELECTOR))
      .filter((el) => el.dataset.elasticTrigger === 'manual');
    manualEls.forEach((el) => setInitial(el));
  }

  document.addEventListener('pagechange', () => { refresh(); setupManual(); });
  refresh();
  setupManual();
})();