let disposeConceptGalleries;
function initConceptGalleries() {
  disposeConceptGalleries?.();
  const events = new AbortController();
  document.querySelectorAll('[data-cycle-gallery]').forEach(gallery => {
    const track = gallery.querySelector('.cycle-gallery__track');
    const slides = [...track.children];
    const prev = gallery.querySelector('[data-cycle-prev]');
    const next = gallery.querySelector('[data-cycle-next]');
    const count = gallery.querySelector('[data-cycle-count]');
    slides.forEach(slide => {
      const image = slide.querySelector('img');
      if (image) slide.style.setProperty('--gallery-image', `url("${image.getAttribute('src')}")`);
    });
    let active = 0;
    const update = () => {
      const step = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
      active = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / Math.max(1, step))));
      count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      prev.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      track.style.height = `${slides[active].offsetHeight}px`;
    };
    const go = index => slides[Math.max(0, Math.min(slides.length - 1, index))]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    prev.addEventListener('click', () => go(active - 1), { signal: events.signal });
    next.addEventListener('click', () => go(active + 1), { signal: events.signal });
    track.addEventListener('scroll', update, { signal: events.signal, passive: true });
    slides.forEach(slide => slide.querySelector('img')?.addEventListener('load', update, { signal: events.signal }));
    window.addEventListener('resize', update, { signal: events.signal });
    track.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(active + (event.key === 'ArrowRight' ? 1 : -1)); } }, { signal: events.signal });
    update();
  });
  disposeConceptGalleries = () => events.abort();
}
document.addEventListener('pagechange', initConceptGalleries);
initConceptGalleries();
