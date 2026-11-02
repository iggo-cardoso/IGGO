const mediaSelector = '.proj-tile-img, .proj-course-img, .proj-collection-img';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let mediaObserver;
let activeMedia = new Set();
let frame = 0;

function updateMedia() {
  frame = 0;
  const viewportHeight = window.innerHeight;
  for (const media of activeMedia) {
    if (!media.isConnected) continue;
    const rect = media.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height)));
    const travel = rect.height * 0.08;
    media.style.setProperty('--portfolio-media-y', `${((progress - 0.5) * travel).toFixed(1)}px`);
  }
}

function scheduleMedia() {
  if (!frame && activeMedia.size && !reducedMotion.matches) frame = requestAnimationFrame(updateMedia);
}

function setupPortfolioMotion() {
  mediaObserver?.disconnect();
  activeMedia.clear();
  if (frame) cancelAnimationFrame(frame);
  frame = 0;

  const page = document.querySelector('#page-root');
  if (!page || reducedMotion.matches) return;

  mediaObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) activeMedia.add(entry.target);
      else activeMedia.delete(entry.target);
    }
    scheduleMedia();
  }, { rootMargin: '12% 0px', threshold: 0 });

  page.querySelectorAll(mediaSelector).forEach((media) => mediaObserver.observe(media));
}

document.addEventListener('pagechange', setupPortfolioMotion);
window.addEventListener('scroll', scheduleMedia, { passive: true });
window.addEventListener('resize', scheduleMedia, { passive: true });
reducedMotion.addEventListener('change', setupPortfolioMotion);
setupPortfolioMotion();
