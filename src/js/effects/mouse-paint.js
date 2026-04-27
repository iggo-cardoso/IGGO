const layer = document.getElementById('trail-layer');

// Efeito só existe em dispositivos com mouse real
const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (!layer || isTouch) {
  // em mobile: remove o layer do DOM para não ocupar z-index
  if (layer) layer.remove();
} else {

let points = [];
let animationFrame = null;
let velocity = { x: 0, y: 0 };
let lastX = 0, lastY = 0;
let lastTime = 0;
let targetX = 0, targetY = 0;

// Configurações
const MAX_POINTS = 90;
const BASE_SIZE = 44;
const SPRING_STRENGTH = 0.25;
const DAMPING = 0.88;

// Pool de divs reutilizáveis — evita criar/destruir 90 elementos por frame
const pool = [];
function getBlob() {
  if (pool.length) return pool.pop();
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.borderRadius = '50%';
  el.style.background = 'white';
  el.style.pointerEvents = 'none';
  el.style.opacity = '0.92';
  return el;
}
function recycleBlob(el) {
  el.style.display = 'none';
  pool.push(el);
}

function interpolatePoints(x1, y1, x2, y2, maxStep = 2.5) {
  const points = [];
  const distance = Math.hypot(x2 - x1, y2 - y1);
  if (distance === 0) return [{ x: x1, y: y1 }];
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return points;
}

document.addEventListener('mousemove', (e) => {
  const now = performance.now();
  const dt = Math.min(32, now - lastTime);
  if (lastTime > 0 && dt > 0) {
    const newVelX = (e.clientX - lastX) / dt;
    const newVelY = (e.clientY - lastY) / dt;
    velocity.x = velocity.x * 0.6 + newVelX * 0.4;
    velocity.y = velocity.y * 0.6 + newVelY * 0.4;
  }
  targetX = e.clientX;
  targetY = e.clientY;
  const currentX = e.clientX;
  const currentY = e.clientY;
  if (points.length === 0) {
    for (let i = 0; i < 8; i++) points.push({ x: currentX, y: currentY });
  } else {
    const lastPoint = points[points.length - 1];
    const distance = Math.hypot(currentX - lastPoint.x, currentY - lastPoint.y);
    if (distance > 1.5) {
      const newPoints = interpolatePoints(lastPoint.x, lastPoint.y, currentX, currentY, 2.5);
      points.push(...newPoints);
      while (points.length > MAX_POINTS) points.shift();
    }
  }
  lastX = currentX;
  lastY = currentY;
  lastTime = now;
  if (!animationFrame) animationFrame = requestAnimationFrame(updateTrail);
});

document.addEventListener('mouseleave', () => {
  points = [];
  velocity = { x: 0, y: 0 };
  if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = null; }
  // Recicla todos os blobs ativos
  Array.from(layer.children).forEach(recycleBlob);
});

function updateTrail() {
  if (points.length === 0) {
    if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = null; }
    Array.from(layer.children).forEach(recycleBlob);
    return;
  }
  velocity.x *= DAMPING;
  velocity.y *= DAMPING;
  const tail = points[0];
  const springX = velocity.x * SPRING_STRENGTH;
  const springY = velocity.y * SPRING_STRENGTH;
  if (Math.abs(velocity.x) > 0.05 || Math.abs(velocity.y) > 0.05) {
    points[0] = { x: tail.x + springX, y: tail.y + springY };
  }
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1], curr = points[i], next = points[i + 1];
    points[i] = {
      x: curr.x * 0.6 + (prev.x + curr.x * 2 + next.x) / 4 * 0.4,
      y: curr.y * 0.6 + (prev.y + curr.y * 2 + next.y) / 4 * 0.4,
    };
  }
  if (points.length > 0) {
    const lastPoint = points[points.length - 1];
    const dx = targetX - lastPoint.x, dy = targetY - lastPoint.y;
    if (Math.hypot(dx, dy) > 0.5) {
      points[points.length - 1] = { x: lastPoint.x + dx * 0.45, y: lastPoint.y + dy * 0.45 };
    }
  }
  const tip = points[points.length - 1], tailPos = points[0];
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed < 0.8 && points.length > 2) {
    const removeCount = Math.max(1, Math.floor(points.length * 0.15));
    for (let i = 0; i < removeCount && points.length > 1; i++) points.shift();
  } else if (speed < 1.5 && points.length > 1 && Math.hypot(tip.x - tailPos.x, tip.y - tailPos.y) < 30) {
    points.shift();
  }
  if (points.length === 0) {
    if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = null; }
    Array.from(layer.children).forEach(recycleBlob);
    return;
  }
  drawTrail();
  animationFrame = requestAnimationFrame(updateTrail);
}

// Blobs ativos no DOM rastreados explicitamente — sem innerHTML = ''
let activeBlobs = [];

function drawTrail() {
  // Recicla excesso
  while (activeBlobs.length > points.length) recycleBlob(activeBlobs.pop());

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = i / points.length;
    const size = BASE_SIZE * (0.2 + t * 0.8);
    if (size < 2) continue;

    let blob;
    if (i < activeBlobs.length) {
      blob = activeBlobs[i];
    } else {
      blob = getBlob();
      layer.appendChild(blob);
      activeBlobs.push(blob);
    }
    blob.style.display = '';
    blob.style.left   = (p.x - size / 2) + 'px';
    blob.style.top    = (p.y - size / 2) + 'px';
    blob.style.width  = size + 'px';
    blob.style.height = size + 'px';
  }
}

} // end !isTouch