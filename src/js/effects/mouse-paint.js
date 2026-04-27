
const layer = document.getElementById('trail-layer');

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

function interpolatePoints(x1, y1, x2, y2, maxStep = 2.5) {
  const points = [];
  const distance = Math.hypot(x2 - x1, y2 - y1);
  
  if (distance === 0) return [{ x: x1, y: y1 }];
  
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    points.push({ x, y });
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
    for (let i = 0; i < 8; i++) {
      points.push({ x: currentX, y: currentY });
    }
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
  
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(updateTrail);
  }
});

document.addEventListener('mouseleave', () => {
  points = [];
  velocity = { x: 0, y: 0 };
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  layer.innerHTML = '';
});

function updateTrail() {
  if (points.length === 0) {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    layer.innerHTML = '';
    return;
  }
  
  velocity.x *= DAMPING;
  velocity.y *= DAMPING;
  
  const tail = points[0];
  const springX = velocity.x * SPRING_STRENGTH;
  const springY = velocity.y * SPRING_STRENGTH;
  
  if (Math.abs(velocity.x) > 0.05 || Math.abs(velocity.y) > 0.05) {
    const newTailX = tail.x + springX;
    const newTailY = tail.y + springY;
    points[0] = { x: newTailX, y: newTailY };
  }
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    const smoothX = (prev.x + curr.x * 2 + next.x) / 4;
    const smoothY = (prev.y + curr.y * 2 + next.y) / 4;
    
    points[i] = {
      x: curr.x * 0.6 + smoothX * 0.4,
      y: curr.y * 0.6 + smoothY * 0.4
    };
  }
  
  if (points.length > 0) {
    const lastPoint = points[points.length - 1];
    const dx = targetX - lastPoint.x;
    const dy = targetY - lastPoint.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.5) {
      const moveX = dx * 0.45;
      const moveY = dy * 0.45;
      points[points.length - 1] = {
        x: lastPoint.x + moveX,
        y: lastPoint.y + moveY
      };
    }
  }
  
  const tip = points[points.length - 1];
  const tailPos = points[0];
  const distanceToTip = Math.hypot(tip.x - tailPos.x, tip.y - tailPos.y);
  const speed = Math.hypot(velocity.x, velocity.y);
  
  if (speed < 0.8 && points.length > 2) {
    const removeCount = Math.max(1, Math.floor(points.length * 0.15));
    for (let i = 0; i < removeCount && points.length > 1; i++) {
      points.shift();
    }
  } else if (speed < 1.5 && points.length > 1 && distanceToTip < 30) {
    points.shift();
  }
  
  if (points.length === 0) {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    layer.innerHTML = '';
    return;
  }
  
  drawTrail();
  animationFrame = requestAnimationFrame(updateTrail);
}

function drawTrail() {
  layer.innerHTML = '';
  
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = i / points.length;
    let size = BASE_SIZE * (0.2 + t * 0.8);
    
    
    if (size < 2) continue;
    
    const blob = document.createElement('div');
    blob.style.cssText = `
      position: fixed;
      left: ${p.x - size / 2}px;
      top: ${p.y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      background: white;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0.92;
    `;
    
    layer.appendChild(blob);
  }
}