// ═══════════════════════════════════════════════════════════════
// O script do Turnstile (carregado 1x no <head> de index.html) só
// auto-renderiza os elementos .cf-turnstile que já existem no DOM
// no momento em que ele termina de carregar. Como os fragmentos de
// página (contato.html, afiliar-se.html, loja.html) são injetados
// depois via innerHTML pelo page-router, a div .cf-turnstile some
// pro auto-scan do Turnstile e nunca é renderizada,  precisa
// chamar turnstile.render() manualmente toda vez que o fragmento
// entra no DOM.
//
// Usado por effects/contato.js, effects/afiliar-se.js e
// effects/loja.js.
// ═══════════════════════════════════════════════════════════════

export function renderTurnstile(container, { onExpire } = {}) {
  if (!container || container.dataset.tsRendered === '1') return;

  function tryRender() {
    if (!window.turnstile) {
      setTimeout(tryRender, 150); // script ainda carregando (async), tenta de novo
      return;
    }
    if (container.dataset.tsRendered === '1') return; // evita render duplicado
    container.dataset.tsRendered = '1';
    window.turnstile.render(container, {
      sitekey: container.dataset.sitekey,
      'expired-callback': () => { if (onExpire) onExpire(); },
    });
  }

  tryRender();
}
