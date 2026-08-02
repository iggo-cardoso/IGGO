// ═══════════════════════════════════════════════════════════════
// LAR SECTIONS,  interações da suite dark (FAQ accordion + toggle
// de pricing). Segue o mesmo contrato de lifecycle dos outros
// módulos de efeito: cleanup antes de reconstruir, reinit em
// 'pagechange' pra sobreviver à volta pro snapshot da home.
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

    const suite = document.querySelector('.lar-suite');
    if (!suite) return;

    setupFaq(suite);
    setupPricingToggle(suite);
  }

  function setupFaq(suite) {
    const items = suite.querySelectorAll('.lar-faq-item');

    items.forEach((item) => {
      const trigger = item.querySelector('[data-faq-toggle]');
      const icon = item.querySelector('.lar-faq-icon');
      if (!trigger) return;

      function onClick() {
        const isOpen = item.dataset.open === 'true';

        // acordeão de um só,  fecha os outros itens ao abrir este
        items.forEach((other) => {
          if (other !== item) {
            other.dataset.open = 'false';
            const otherIcon = other.querySelector('.lar-faq-icon');
            if (otherIcon) otherIcon.textContent = '[+]';
          }
        });

        item.dataset.open = isOpen ? 'false' : 'true';
        if (icon) icon.textContent = isOpen ? '[+]' : '[−]';
      }

      trigger.addEventListener('click', onClick);
      cleanupFns.push(() => trigger.removeEventListener('click', onClick));
    });
  }

  function setupPricingToggle(suite) {
    const toggle = suite.querySelector('[data-pricing-toggle]');
    if (!toggle) return;

    const buttons = toggle.querySelectorAll('button');

    function onClick(e) {
      buttons.forEach((btn) => { btn.dataset.active = 'false'; });
      e.currentTarget.dataset.active = 'true';

      // hook pronto pra quando os planos tiverem preço mensal x anual/único
      // de verdade,  troca os valores em .lar-plan-price conforme o period
      const period = e.currentTarget.dataset.period;
      suite.querySelectorAll('.lar-plan-price[data-period-value]').forEach((el) => {
        const value = el.dataset[`period${period.charAt(0).toUpperCase()}${period.slice(1)}`];
        if (value) el.textContent = value;
      });
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', onClick);
      cleanupFns.push(() => btn.removeEventListener('click', onClick));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('pagechange', init);
})();
