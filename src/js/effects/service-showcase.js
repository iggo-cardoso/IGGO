const services = [
  { title: 'Sites que deixam marca.', description: 'Experiências digitais com acabamento de luxo, feitas sob medida e acessíveis.', tags: 'Sites institucionais · Páginas de venda · Experiências interativas' },
  { title: 'Uma marca que se reconhece.', description: 'Direção visual e identidade para todos os pontos de contato.', tags: 'Identidade visual · Reposicionamento · Design de interfaces' },
  { title: 'Para além da vitrine.', description: 'Produtos digitais que resolvem necessidades reais e simplificam a rotina.', tags: 'Plataformas sob medida · Automações · Produtos digitais' },
  { title: 'Bom hoje. Melhor amanhã.', description: 'Acompanhamos o projeto depois do lançamento para manter tudo em evolução.', tags: 'Lançamento · Manutenção · Evolução do site' }
];

function setupServiceShowcase() {
  const root = document.querySelector('[data-service-showcase]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const cards = [...root.querySelectorAll('[data-service-index]')];
  const detail = root.querySelector('.service-showcase__detail');
  const count = root.querySelector('[data-service-count]');
  const title = root.querySelector('[data-service-title]');
  const description = root.querySelector('[data-service-description]');
  const tags = root.querySelector('[data-service-tags]');
  let active = 0;
  let startX = 0;
  let timer;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(index) {
    const next = (index + cards.length) % cards.length;
    if (next === active) return;
    active = next;
    cards.forEach((card, i) => {
      card.classList.toggle('is-active', i === active);
      card.setAttribute('aria-pressed', String(i === active));
    });
    count.textContent = `${String(active + 1).padStart(2, '0')} / 04`;
    title.textContent = services[active].title;
    description.textContent = services[active].description;
    tags.textContent = services[active].tags;
    if (!reduced) {
      detail.classList.remove('is-changing');
      void detail.offsetWidth;
      detail.classList.add('is-changing');
    }
  }
  function start() { if (!reduced) timer = window.setInterval(() => show(active + 1), 6500); }
  function stop() { window.clearInterval(timer); }
  cards.forEach((card, i) => card.addEventListener('click', () => { show(i); stop(); start(); }));
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) start(); });
  root.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    show(active + (event.key === 'ArrowRight' ? 1 : -1));
    cards[active].focus();
  });
  root.addEventListener('pointerdown', event => { startX = event.clientX; });
  root.addEventListener('pointerup', event => {
    if (Math.abs(event.clientX - startX) > 45) show(active + (event.clientX < startX ? 1 : -1));
  });
  start();
}

document.addEventListener('pagechange', setupServiceShowcase);
setupServiceShowcase();
