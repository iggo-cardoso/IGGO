let observer;
const svgNS = 'http://www.w3.org/2000/svg';
function node(name, attrs = {}, content = '') {
  const el = document.createElementNS(svgNS, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (content) el.textContent = content;
  return el;
}

function buildRealChart() {
  const svg = document.querySelector('.service-visual--chart svg');
  if (!svg) return;
  const metrics = [...document.querySelectorAll('.about-score-dev .score-bar')]
    .slice(0, 4)
    .map(row => ({
      name: row.querySelector('.bar-label')?.textContent.trim() || '',
      value: Number(row.querySelector('.count-num')?.dataset.countTo),
    }))
    .filter(item => item.name && Number.isFinite(item.value));
  if (!metrics.length) return;

  svg.replaceChildren();
  svg.append(node('text', { x: 24, y: 29, class: 'metric-title' }, 'QUALIDADE DA ENTREGA / 10'));
  for (const score of [6, 8, 10]) {
    const y = 226 - score * 17;
    svg.append(node('line', { x1: 24, y1: y, x2: 396, y2: y, class: 'metric-grid' }));
    svg.append(node('text', { x: 3, y: y + 4, class: 'metric-axis' }, String(score)));
  }
  const points = [];
  metrics.forEach((metric, i) => {
    const x = 66 + i * 92;
    const height = metric.value * 17;
    const y = 226 - height;
    const bar = node('rect', { x: x - 17, y, width: 34, height, rx: 4, class: `metric-bar metric-bar--${i + 1}` });
    bar.append(node('title', {}, `${metric.name}: ${metric.value.toFixed(1)} de 10`));
    svg.append(bar);
    svg.append(node('text', { x, y: y - 12, class: 'metric-value', 'text-anchor': 'middle' }, metric.value.toFixed(1)));
    svg.append(node('text', { x, y: 253, class: 'metric-label', 'text-anchor': 'middle' }, metric.name));
    points.push(`${x},${y}`);
  });
  svg.append(node('polyline', { points: points.join(' '), class: 'metric-line' }));
  points.forEach(point => {
    const [cx, cy] = point.split(',');
    svg.append(node('circle', { cx, cy, r: 4, class: 'metric-dot' }));
  });
}

function setupServiceVisuals() {
  observer?.disconnect();
  const cards = document.querySelectorAll('.about-services .service-group');
  if (!cards.length) return;
  buildRealChart();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cards.forEach(card => card.classList.add('is-visible'));
    return;
  }
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .28, rootMargin: '0px 0px -6% 0px' });
  cards.forEach(card => observer.observe(card));
}
document.addEventListener('pagechange', setupServiceVisuals);
setupServiceVisuals();
