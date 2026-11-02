const brands = [
  { name: 'Yatsar', left: '/img/Brands/Yatsar/bellavivele-paper.png', right: '/img/Brands/stem/captura_site_stem.png', leftCaption: 'Yatsar — identidade visual', rightCaption: 'STEM Club — experiência digital' },
  { name: 'STEM Club', left: '/img/Brands/stem/captura_site_stem.png', right: '/img/Brands/alex/captura_site_alex.png', leftCaption: 'STEM Club — projeto digital', rightCaption: 'Alex Junior — experiência digital' },
  { name: 'Alex Junior', left: '/img/Brands/alex/captura_site_alex.png', right: '/img/Brands/Bellavivele/bellavivele-card-1.jpg', leftCaption: 'Alex Junior — projeto digital', rightCaption: 'Bella Vivelle — identidade visual' },
  { name: 'Bella Vivelle', left: '/img/Brands/Bellavivele/bellavivele-card-1.jpg', right: '/img/Brands/Yatsar/bellavivele-paper.png', leftCaption: 'Bella Vivelle — identidade visual', rightCaption: 'Yatsar — identidade visual' },
];

let cleanup = () => {};
function setupBrandReel() {
  cleanup();
  const section = document.querySelector('[data-brand-reel]');
  if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const list = section.querySelector('[data-brand-names]');
  const rows = [...section.querySelectorAll('[data-brand-name]')];
  const images = [section.querySelector('[data-brand-left]'), section.querySelector('[data-brand-right]')];
  const captions = [section.querySelector('[data-brand-left-caption]'), section.querySelector('[data-brand-right-caption]')];
  if (rows.length !== brands.length) return;
  section.classList.add('is-enhanced');
  list.classList.add('is-moving');
  let frame = 0;
  let active = -1;
  const update = () => {
    frame = 0;
    const rect = section.getBoundingClientRect();
    const distance = section.offsetHeight - innerHeight;
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, distance)));
    const index = progress * (rows.length - 1);
    const center = list.clientHeight / 2;
    const pad = Math.max(0, center - rows[0].offsetHeight / 2);
    list.style.paddingBlock = `${pad}px`;
    const first = rows[0].offsetTop + rows[0].offsetHeight / 2 - list.offsetTop;
    const last = rows.at(-1).offsetTop + rows.at(-1).offsetHeight / 2 - list.offsetTop;
    list.scrollTop = first + (last - first) * progress - center;
    const next = Math.min(brands.length - 1, Math.max(0, Math.round(index)));
    if (next === active) return;
    active = next;
    rows.forEach((row, i) => row.classList.toggle('is-active', i === active));
    const brand = brands[active];
    images[0].src = brand.left;
    images[1].src = brand.right;
    images[0].alt = brand.leftCaption;
    images[1].alt = brand.rightCaption;
    captions[0].textContent = brand.leftCaption;
    captions[1].textContent = brand.rightCaption;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      images.forEach((image) => image.animate(
        [{ scale: '1.07' }, { scale: '1' }],
        { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)' },
      ));
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  update();
  cleanup = () => { removeEventListener('scroll', schedule); removeEventListener('resize', schedule); if (frame) cancelAnimationFrame(frame); };
}
document.addEventListener('pagechange', setupBrandReel);
setupBrandReel();
