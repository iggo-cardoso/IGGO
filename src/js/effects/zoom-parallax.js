const clamp01 = value => Math.max(0, Math.min(1, value));

let frame = 0;

function renderZoomParallax() {
  frame = 0;
  const viewportHeight = window.innerHeight;
  const mobile = window.matchMedia('(max-width: 768px)').matches;

  document.querySelectorAll('[data-zoom-parallax]').forEach(section => {
    const rect = section.getBoundingClientRect();
    const inRenderRange = rect.bottom >= -viewportHeight && rect.top <= viewportHeight * 2;
    section.classList.toggle('is-active', inRenderRange);
    if (!inRenderRange) return;

    const distance = Math.max(1, rect.height - viewportHeight);
    const progress = clamp01(-rect.top / distance);

    section.querySelectorAll('[data-zoom-scale]').forEach(layer => {
      const configuredScale = Number(layer.dataset.zoomScale) || 1;
      const targetScale = mobile ? 1 + (configuredScale - 1) * .68 : configuredScale;
      const scale = 1 + (targetScale - 1) * progress;
      layer.style.setProperty('--zoom-scale', scale.toFixed(4));
    });
  });
}

function requestRender() {
  if (!frame) frame = requestAnimationFrame(renderZoomParallax);
}

if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-zoom-parallax] [data-zoom-scale]')
    .forEach(layer => layer.style.setProperty('--zoom-scale', '1'));
} else {
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  document.addEventListener('pagechange', requestRender);
  requestRender();
}
