let cleanups = [];

function initProjectCarousels() {
  cleanups.forEach(cleanup => cleanup());
  cleanups = [];

  document.querySelectorAll('.proj-highlight-grid, .proj-winners-grid').forEach(rail => {
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let dragged = false;

    const down = event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      startX = event.clientX;
      startScroll = rail.scrollLeft;
      dragged = false;
      dragging = true;
      rail.classList.add('is-dragging');
      rail.setPointerCapture(event.pointerId);
    };
    const move = event => {
      if (!dragging) return;
      if (Math.abs(event.clientX - startX) > 5) dragged = true;
      rail.scrollLeft = startScroll - (event.clientX - startX);
    };
    const up = () => {
      dragging = false;
      rail.classList.remove('is-dragging');
    };
    const click = event => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };
    const key = event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      rail.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * rail.clientWidth * .72, behavior: 'smooth' });
    };
    const frame = rail.closest('.proj-showcase-frame');
    const prev = frame?.querySelector('[data-carousel-prev]');
    const next = frame?.querySelector('[data-carousel-next]');
    const updateNav = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      if (prev) prev.disabled = rail.scrollLeft <= 3;
      if (next) next.disabled = rail.scrollLeft >= max - 3;
    };
    const scrollCard = direction => {
      const item = rail.firstElementChild;
      if (!item) return;
      const gap = parseFloat(getComputedStyle(rail).gap) || 0;
      rail.scrollBy({ left: direction * (item.getBoundingClientRect().width + gap), behavior: 'smooth' });
    };
    const onPrev = () => scrollCard(-1);
    const onNext = () => scrollCard(1);
    prev?.addEventListener('click', onPrev);
    next?.addEventListener('click', onNext);
    rail.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    requestAnimationFrame(updateNav);
    rail.addEventListener('pointerdown', down);
    rail.addEventListener('pointermove', move);
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointercancel', up);
    rail.addEventListener('click', click, true);
    rail.addEventListener('keydown', key);
    cleanups.push(() => {
      prev?.removeEventListener('click', onPrev);
      next?.removeEventListener('click', onNext);
      rail.removeEventListener('scroll', updateNav);
      window.removeEventListener('resize', updateNav);
      rail.removeEventListener('pointerdown', down);
      rail.removeEventListener('pointermove', move);
      rail.removeEventListener('pointerup', up);
      rail.removeEventListener('pointercancel', up);
      rail.removeEventListener('click', click, true);
      rail.removeEventListener('keydown', key);
    });
  });
}

document.addEventListener('pagechange', initProjectCarousels);
initProjectCarousels();
