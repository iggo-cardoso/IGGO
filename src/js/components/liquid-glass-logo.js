export function LiquidGlassLogo({ logo, ending = 'logo', theme = 'light', speed = 2.85, style = {} } = {}) {
  const root = document.createElement('div');
  root.className = `liquid-glass-logo liquid-glass-logo--${theme}`;
  root.dataset.ending = ending;
  root.style.height = typeof style.height === 'number' ? `${style.height}px` : (style.height || '480px');
  root.style.setProperty('--liquid-duration', `${Math.round(2400 / Math.max(.5, speed))}ms`);

  const lens = document.createElement('div');
  lens.className = 'liquid-glass-logo__lens';
  const shine = document.createElement('div');
  shine.className = 'liquid-glass-logo__shine';
  const image = document.createElement('img');
  image.className = 'liquid-glass-logo__mark';
  image.src = logo;
  image.alt = '';
  image.decoding = 'async';

  root.append(lens, shine, image);
  return root;
}
