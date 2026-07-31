import './loader.js';

import './index.js';
import './effects/page-transition.js';
import './effects/elastic-entrance.js';
import './page-router.js';
import './effects/mobile-nav.js';
import './effects/scrollbar.js';
import './effects/mouse-paint.js';
import './effects/webgl-distortion-image.js';
import './effects/scroll-band.js';
import './effects/scroll-expand-card.js';
import './effects/scroll-expand-solo.js';
import './effects/scroll-effects.js';
import './effects/circular-gallery.js'
import './effects/loja.js';
import './effects/afiliar-se.js';
import './page-styles.js';

(function () {
    const KEY = 'cookies_accepted';
    const banner = document.getElementById('cookie-banner');
    const btn = document.getElementById('cookie-accept');

    if (!localStorage.getItem(KEY)) {
      banner.style.display = 'block';
    }

    btn.addEventListener('click', function () {
      localStorage.setItem(KEY, 'true');
      banner.style.display = 'none';
    });
  })();

  const words = ['You', 'Your Business', 'Forever', 'With You'];
const suffixEl = document.querySelector('.saying-suffix');

let i = 0;

function cycleWord() {
  const word = words[i % words.length];
  suffixEl.classList.add('is-out');

  setTimeout(() => {
    suffixEl.textContent = ` ${word}`;
    suffixEl.classList.remove('is-out');
    suffixEl.classList.add('is-in');
  }, 250);

  setTimeout(() => {
    suffixEl.classList.remove('is-in');
  }, 550);

  i++;
}

cycleWord();
setInterval(cycleWord, 2800);