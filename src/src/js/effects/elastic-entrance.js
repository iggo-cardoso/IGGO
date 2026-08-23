// elastic-entrance.js
// Entrada "elástica": o elemento vem de uma direção, ultrapassa um
// pouco a posição final (overshoot), volta, ultrapassa de novo (menor)
// e assim vai perdendo força até parar — tipo elástico/mola solto.
//
// Uso automático (dispara ao entrar no viewport, uma vez só):
//   <div data-elastic-effect-entrance="up">...</div>
//
// Uso manual (não dispara sozinho por scroll, só quando você chamar
// a API — ideal pra elementos que já ficam "na viewport" mesmo
// escondidos, como itens dentro de um menu mobile fixed):
//   <li data-elastic-effect-entrance="up" data-elastic-trigger="manual">...</li>
//   window.ElasticEntrance.playAll(containerOuElemento, { stagger, baseDelay });
//   window.ElasticEntrance.reset(containerOuElemento); // volta pro estado escondido
//
// Direções (de onde o elemento vem):
//   up    -> vem de baixo, entra subindo
//   down  -> vem de cima, entra descendo
//   left  -> vem da direita, entra indo pra esquerda
//   right -> vem da esquerda, entra indo pra direita
//
// Opcionais (px / ms):
//   data-elastic-distance="80"   default 80    -> quão longe começa
//   data-elastic-duration="900"  default 900   -> duração total (com as oscilações)
//   data-elastic-delay="0"       default 0     -> atraso antes de iniciar (modo auto)
//   data-elastic-bounces="3"     default 3     -> quantas idas-e-vindas até parar
//   data-elastic-fade="false"    default true  -> também some/aparece (opacity 0 -> 1) junto do movimento

(function () {
  const SELECTOR = '[data-elastic-effect-entrance]';

  const OFFSETS = {
    up:    (d) => `translateY(${d}px)`,
    down:  (d) => `translateY(${-d}px)`,
    left:  (d) => `translateX(${d}px)`,
    right: (d) => `translateX(${-d}px)`,
  };

  const AMP_DECAY  = 0.42; // o quanto cada oscilação encolhe em relação à anterior
  const TIME_DECAY = 0.55; // o quanto cada oscilação fica mais rápida que a anterior

  let observer = null;
  const played = new WeakSet(); // controla o modo automático (só toca uma vez)

  function readParams(el) {
    const dir = el.dataset.elasticEffectEntrance;
    const offsetFn = OFFSETS[dir];
    if (!offsetFn) return null;

    return {
      offsetFn,
      distance: parseFloat(el.dataset.elasticDistance) || 80,
      duration: parseFloat(el.dataset.elasticDuration) || 900,
      delay:    parseFloat(el.dataset.elasticDelay)    || 0,
      bounces:  Math.max(0, parseInt(el.dataset.elasticBounces, 10) || 3),
      manual:   el.dataset.elasticTrigger === 'manual',
      fade:     el.dataset.elasticFade !== 'false', // opacity 0 -> 1 junto com o movimento (default: ligado)
    };
  }

  // Gera as frações de amplitude (relativas à distância) da oscilação:
  // 1 -> -amp -> +amp -> -amp ... -> 0, cada vez menor.
  function buildAmplitudeFractions(bounces) {
    const fractions = [1];
    let sign = -1;
    let amp = 1;
    for (let i = 0; i < bounces; i++) {
      amp *= AMP_DECAY;
      fractions.push(sign * amp);
      sign *= -1;
    }
    fractions.push(0);
    return fractions;
  }

  // Gera os "offsets" de tempo (0..1) pra cada fração acima: o primeiro
  // movimento (o maior) ocupa mais tempo, as oscilações seguintes vão
  // ficando mais rápidas — como uma mola perdendo energia.
  function buildTimeOffsets(count) {
    const gaps = [];
    let g = 1;
    for (let i = 0; i < count - 1; i++) { gaps.push(g); g *= TIME_DECAY; }
    const total = gaps.reduce((a, b) => a + b, 0) || 1;

    const offsets = [0];
    let acc = 0;
    for (let i = 0; i < gaps.length; i++) {
      acc += gaps[i] / total;
      offsets.push(acc);
    }
    offsets[offsets.length - 1] = 1;
    return offsets;
  }

  function buildKeyframes(p) {
    const fractions = buildAmplitudeFractions(p.bounces);
    const offsets = buildTimeOffsets(fractions.length);

    return fractions.map((frac, i) => {
      const frame = {
        transform: frac === 0 ? 'translate(0, 0)' : p.offsetFn(p.distance * frac),
        offset: offsets[i],
        easing: 'cubic-bezier(.33,0,.67,1)',
      };
      // opacidade só sobe no primeiro trecho (a "chegada" principal);
      // durante as oscilações seguintes o elemento já está 100% visível
      if (p.fade) frame.opacity = i === 0 ? 0 : 1;
      return frame;
    });
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