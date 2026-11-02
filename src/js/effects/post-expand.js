// FAQ interaction for the post-expand editorial system.
(function () {
  'use strict';

  let cleanupFns = [];

  function runCleanup() {
    cleanupFns.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  function init() {
    runCleanup();

    const suite = document.querySelector('.post-expand');
    if (!suite) return;

    setupFaq(suite);
  }

  function setupFaq(suite) {
    const items = suite.querySelectorAll('.faq-item');

    items.forEach((item) => {
      const trigger = item.querySelector('[data-faq-toggle]');
      if (!trigger) return;

      function onClick() {
        const isOpen = item.dataset.open === 'true';

        // acordeão de um só,  fecha os outros itens ao abrir este
        items.forEach((other) => {
          if (other !== item) {
            other.dataset.open = 'false';
          }
        });

        item.dataset.open = isOpen ? 'false' : 'true';
      }

      trigger.addEventListener('click', onClick);
      cleanupFns.push(() => trigger.removeEventListener('click', onClick));
    });
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('pagechange', init);
})();
