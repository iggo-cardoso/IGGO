// page-transition.js
// Transição "tiras" entre páginas (page wipe).
//
// Tiras verticais de ~180px, cor var(--brand), descem de cima cobrindo a tela
// numa onda que nasce na tira mais à direita (ela sempre entra primeiro
// e fica por cima das outras, no z-index). As demais seguem "disputando"
// espaço com atrasos e z-index sorteados aleatoriamente,  não é uma
// varredura limpa e sequencial, é uma bagunça organizada.
//
// Depois que a tela está 100% coberta, o conteúdo da página é trocado
// por baixo (via swapFn), e as tiras saem revelando a página nova.
//
// Uso (chamado pelo page-router.js):
//   await window.__pageWipe(async () => { troca o innerHTML aqui });

(function () {
  const STRIP_WIDTH = 180;               // px, largura alvo de cada tira
  const MIN_STRIPS  = 3;                 // mínimo, mesmo em telas estreitas
  const COVER_MS    = 480;               // duração de cada tira ao cobrir
  const UNCOVER_MS  = 420;               // duração de cada tira ao sair
  const STEP_MS     = 45;                // espaçamento base da onda (por tira, da direita pra esquerda)
  const JITTER_MS   = 60;                // ruído aleatório -> "disputa" entre as tiras
  const HOLD_MS     = 750;               // segura a tela coberta antes de trocar o conteúdo
  const HOLD_AFTER_MS = 250;             // garante um mínimo também depois da troca (caso o swap seja instantâneo)
  const EASING      = 'cubic-bezier(.65,0,.35,1)';

  let overlay = null;
  let stripsWrap = null;
  let saying = null;
  let strips = [];

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'page-wipe';
    overlay.setAttribute('aria-hidden', 'true');

    stripsWrap = document.createElement('div');
    stripsWrap.className = 'page-wipe__strips';
    overlay.appendChild(stripsWrap);

    saying = document.createElement('div');
    saying.className = 'saying page-wipe__saying';
    saying.innerHTML = 'It\'s Good, Grows On.';
    overlay.appendChild(saying);

    document.body.appendChild(overlay);
  }

  function buildStrips() {
    const vw = window.innerWidth;
    const count = Math.max(MIN_STRIPS, Math.round(vw / STRIP_WIDTH));

    stripsWrap.innerHTML = '';
    strips = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'page-wipe__strip';
      el.style.transform = 'translateY(-100%)';
      stripsWrap.appendChild(el);
      strips.push(el);
    }
    return count;
  }

  // onda nascendo na direita: índice mais à direita = atraso menor.
  // + jitter aleatório = disputa, quebra a sequência "perfeita".
  function waveDelays(count) {
    const delays = [];
    for (let i = 0; i < count; i++) {
      const fromRight = count - 1 - i;
      delays.push(fromRight * STEP_MS + Math.random() * JITTER_MS);
    }
    return delays;
  }

  // z-index aleatório para todas, exceto a última (mais à direita), que
  // fica sempre na frente,  ela é a "primeira" tanto no tempo quanto na
  // pilha. As outras disputam a ordem entre si.
  function randomZ(count, forceLastOnTop) {
    const z = new Array(count);
    const pool = [];
    for (let i = 0; i < count; i++) pool.push(i);

    if (forceLastOnTop) {
      pool.splice(pool.indexOf(count - 1), 1);
      z[count - 1] = count - 1; // topo garantido
    }

    // shuffle Fisher-Yates do restante
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.forEach((idx, order) => { z[idx] = order; });

    return z;
  }

  function applyZIndex(zArr) {
    strips.forEach((el, i) => { el.style.zIndex = String(100 + zArr[i]); });
  }

  function animateAll(delays, from, to, duration) {
    const anims = strips.map((el, i) => {
      // grava o valor atual (from) no style inline ANTES de cancelar a
      // animação anterior,  senão cancelar deixa o elemento cair pro
      // style inline velho por uma fração de segundo até a nova
      // animação entrar no delay dela (é o que causava o "sem tira"
      // ao sair, tanto no PC quanto no mobile)
      el.style.transform = `translateY(${from})`;
      el.getAnimations().forEach((a) => a.cancel());
      const anim = el.animate(
        [{ transform: `translateY(${from})` }, { transform: `translateY(${to})` }],
        { duration, delay: delays[i], easing: EASING, fill: 'forwards' }
      );
      return anim;
    });
    return Promise.all(anims.map(a => a.finished));
  }

  async function playWipe(swapFn) {
    ensureOverlay();
    const count = buildStrips();
    overlay.style.visibility = 'visible';
    overlay.style.pointerEvents = 'auto';

    // fase 1,  cobrir: onda vindo da direita, tira da direita sempre no topo
    applyZIndex(randomZ(count, true));
    await animateAll(waveDelays(count), '-100%', '0%', COVER_MS);

    // tela 100% coberta,  mostra o "saying" no centro, segura um instante
    // e troca o conteúdo por baixo
    saying.classList.add('is-visible');
    const swapStart = performance.now();
    await new Promise((r) => setTimeout(r, HOLD_MS));

    try {
      await swapFn();
    } finally {
      // garante tempo mínimo de tela 100% coberta, mesmo se o swapFn for instantâneo
      const elapsed = performance.now() - swapStart;
      const remaining = HOLD_MS + HOLD_AFTER_MS - elapsed;
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

      // fase 2,  sair: novo sorteio de z-index e atrasos, revela a página nova
      applyZIndex(randomZ(count, false));
      saying.classList.remove('is-visible');
      await animateAll(waveDelays(count), '0%', '100%', UNCOVER_MS);

      strips.forEach((el) => {
        el.getAnimations().forEach((a) => a.cancel());
        el.style.transform = 'translateY(-100%)';
      });
      overlay.style.pointerEvents = 'none';
      overlay.style.visibility = 'hidden';
    }
  }

  window.__pageWipe = playWipe;
})();