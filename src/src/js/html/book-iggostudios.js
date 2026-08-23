(function(){
  var bands = document.querySelectorAll('.scroll-band');
  if(!bands.length) return;
  bands.forEach(function(band, i){
    var direction = i % 2 === 0 ? -1 : 1;
    band.dataset.direction = direction;
    var original = band.innerHTML;
    band.innerHTML = original + original + original;
  });
  var singleWidths = Array.from(bands).map(function(b){ return b.scrollWidth / 3; });
  var currentOffsets = Array.from(bands).map(function(b,i){
    return i % 2 === 0 ? 0 : -singleWidths[i];
  });
  var lastScrollY = window.scrollY;
  var rafId = null;
  var SPEED = 0.4;

  function tick(){
    rafId = null;
    var scrollY = window.scrollY;
    var delta = scrollY - lastScrollY;
    lastScrollY = scrollY;
    bands.forEach(function(band, i){
      var direction = parseInt(band.dataset.direction);
      var singleWidth = singleWidths[i] || band.scrollWidth / 3;
      currentOffsets[i] += delta * SPEED * direction;
      if(currentOffsets[i] < -singleWidth) currentOffsets[i] += singleWidth;
      if(currentOffsets[i] > 0) currentOffsets[i] -= singleWidth;
      band.style.transform = 'translateX(' + currentOffsets[i] + 'px)';
    });
  }
  function scheduleTick(){
    if(!rafId) rafId = requestAnimationFrame(tick);
  }
  window.addEventListener('scroll', scheduleTick, {passive:true});
  window.addEventListener('resize', function(){
    singleWidths = Array.from(bands).map(function(b){ return b.scrollWidth / 3; });
  });
})();

(function(){
  var IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches
              || navigator.maxTouchPoints > 0;

  if (IS_TOUCH) return;

  var LERP_SPEED = 8;
  var WHEEL_MULT = 1.2;
  var KEYS_STEP  = 120;

  var target   = window.scrollY;
  var current  = window.scrollY;
  var rafId    = null;
  var lastTime = null;

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  function startLoop() {
    if (!rafId) {
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    var diff = target - current;

    if (Math.abs(diff) < 0.5) {
      current  = target;
      lastTime = null;
      window.scrollTo(0, current);
      rafId = null;
      return;
    }

    var factor = 1 - Math.exp(-LERP_SPEED * dt);
    current += diff * factor;
    window.scrollTo(0, current);
    rafId = requestAnimationFrame(loop);
  }

  function onWheel(e) {
    e.preventDefault();
    var delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY * WHEEL_MULT;
    target = Math.max(0, Math.min(target + delta, maxScroll()));
    startLoop();
  }

  function onKeydown(e) {
    var map = {
      ArrowDown:  KEYS_STEP,
      ArrowUp:   -KEYS_STEP,
      PageDown:   window.innerHeight * 0.9,
      PageUp:    -window.innerHeight * 0.9,
      End:        maxScroll(),
      Home:      -maxScroll(),
    };

    if (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA') return;

    if (map[e.key] !== undefined) {
      e.preventDefault();
      target = Math.max(0, Math.min(target + map[e.key], maxScroll()));
      startLoop();
    }
  }

  window.addEventListener('scroll', function(){
    if (!rafId) { target = window.scrollY; current = window.scrollY; }
  }, { passive: true });

  window.addEventListener('resize', function(){
    target = Math.min(target, maxScroll());
  });

  document.documentElement.style.scrollBehavior = 'auto';
  window.addEventListener('wheel',   onWheel,   { passive: false });
  window.addEventListener('keydown', onKeydown, { passive: false });
})();