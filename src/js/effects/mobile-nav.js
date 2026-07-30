// mobile-nav.js
// Botão de 2 riscos (mobile) que abre/fecha as opções do nav usando a
// MESMA transição de tiras do page-transition.js (window.__pageWipe):
// as tiras descem cobrindo a tela, o menu é mostrado/escondido por
// baixo, e as tiras sobem revelando o resultado.
//
// Uso: clique no .nav-burger dentro de .navtop. O estado aberto é a
// classe .menu-open em .navtop (ver src/css/mobile.css).

(function () {
  const navtop = document.querySelector('.navtop');
  const burger = navtop && navtop.querySelector('.nav-burger');
  if (!navtop || !burger) return;

  function setOpen(open) {
    navtop.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }

  function toggleMenu() {
    const opening = !navtop.classList.contains('menu-open');
    const applyState = () => setOpen(opening);

    if (typeof window.__pageWipe === 'function') {
      window.__pageWipe(async () => applyState());
    } else {
      applyState();
    }
  }

  burger.addEventListener('click', toggleMenu);

  // fecha o menu sempre que uma navegação de página de fato acontece
  // (page-router.js dispara 'pagechange' ao trocar de página)
  document.addEventListener('pagechange', () => setOpen(false));
})();
