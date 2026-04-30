(function () {
  'use strict'

  const INITIAL_W_VW      = 0.68
  const INITIAL_H_VH      = 0.62
  const IMG_INITIAL_SCALE = 1.14
  const IMG_FINAL_SCALE   = 1.0

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v }
  function lerp(a, b, t)  { return a + (b - a) * t }

  function buildCard(section, slides) {
    var wrapper = document.createElement('div')
    wrapper.style.cssText =
      'position:sticky;top:0;width:100%;height:100vh;' +
      'overflow:hidden;will-change:transform;contain:layout style;'

    var imgLayer = document.createElement('div')
    imgLayer.style.cssText = 'position:absolute;inset:0;overflow:hidden;'

    var imgs  = []
    var texts = []

    slides.forEach(function(s, i) {
      var img = document.createElement('img')
      img.src      = s.img
      img.alt      = s.title || ''
      img.loading  = 'eager'
      img.decoding = 'sync'
      // Todas as imgs: mesmos estilos fixos, will-change permanente,
      // scale já aplicado desde o início — nunca muda mid-animation.
      // Troca é só display. Zero recriação de layer.
      img.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;' +
        'object-fit:cover;transform-origin:center center;' +
        'will-change:transform;transition:none;' +
        'display:' + (i === 0 ? 'block' : 'none') + ';'
      if (s.objectPosition) img.style.objectPosition = s.objectPosition
      imgLayer.appendChild(img)
      imgs.push(img)

      var block = document.createElement('div')
      block.style.cssText =
        'position:absolute;inset:0;display:' + (i === 0 ? 'flex' : 'none') + ';' +
        'flex-direction:column;justify-content:center;align-items:center;' +
        'text-align:center;padding:clamp(1.2rem,4vw,3.5rem);pointer-events:none;'
      if (s.title === 'IGGO.') {
        block.innerHTML = '<img src="public/logos/png/logo.png" alt="" ' +
          'style="width:300px;filter:drop-shadow(0 10px 10px rgba(0,0,0,.57)) invert(1);">'
      } else {
        block.innerHTML =
          '<h2 class="ec-title" style="font-size:clamp(6.4rem,5vw,5rem);' +
          'font-family:var(--ec-title-font,Georgia,serif);font-weight:400;' +
          'line-height:1;color:rgb(216,216,220);mix-blend-mode:difference;">' +
          (s.title || '') + '</h2>'
      }
      imgLayer.appendChild(block)
      texts.push(block)
    })

    var overlay = document.createElement('div')
    overlay.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:1;' +
      'background:linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 60%);'
    imgLayer.appendChild(overlay)

    var dotsEl = document.createElement('div')
    dotsEl.style.cssText =
      'position:absolute;top:clamp(.8rem,2vw,1.4rem);' +
      'right:clamp(.8rem,2vw,1.4rem);display:flex;gap:6px;z-index:2;'
    var dotEls = slides.map(function(_, i) {
      var d = document.createElement('span')
      d.style.cssText =
        'width:6px;height:6px;border-radius:50%;display:block;' +
        'transition:background .2s,transform .2s;' +
        'background:' + (i === 0 ? 'rgb(216,216,220)' : 'rgba(255,255,255,.3)') + ';' +
        'transform:' + (i === 0 ? 'scale(1.4)' : 'scale(1)') + ';'
      dotsEl.appendChild(d)
      return d
    })
    imgLayer.appendChild(dotsEl)

    wrapper.appendChild(imgLayer)
    section.appendChild(wrapper)

    return { wrapper:wrapper, imgLayer:imgLayer, imgs:imgs, texts:texts, dotEls:dotEls }
  }

  function initSection(section) {
    var cardEl = section.querySelector('.expand-card')
    var slides = []
    try { slides = JSON.parse((cardEl && cardEl.dataset.slides) || '[]') } catch(e) { return }
    if (!slides.length) return
    cardEl.parentNode.removeChild(cardEl)

    var n            = slides.length
    var scrollHeight = parseFloat(section.dataset.scrollHeight) || n * 180
    section.style.height   = scrollHeight + 'vh'
    section.style.position = 'relative'

    var built    = buildCard(section, slides)
    var wrapper  = built.wrapper
    var imgLayer = built.imgLayer
    var imgs     = built.imgs
    var texts    = built.texts
    var dotEls   = built.dotEls

    var geo = { startAt: 0, endAt: 1 }

    function recache() {
      var top = 0, el = section
      while (el) { top += el.offsetTop; el = el.offsetParent }
      geo.startAt = top
      geo.endAt   = top + section.offsetHeight - window.innerHeight
    }

    recache()
    var resizeTimer = 0
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(recache, 150)
    }, { passive: true })

    var activeSlide = -1
    var rafId       = null

    // Troca: só display. O transform já está calculado e aplicado
    // a todas as imgs no mesmo tick — a que entra já tem o scale correto.
    function setSlide(idx) {
      if (idx === activeSlide) return
      if (activeSlide >= 0) {
        imgs[activeSlide].style.display      = 'none'
        texts[activeSlide].style.display     = 'none'
        dotEls[activeSlide].style.background = 'rgba(255,255,255,.3)'
        dotEls[activeSlide].style.transform  = 'scale(1)'
      }
      activeSlide                      = idx
      imgs[idx].style.display          = 'block'
      texts[idx].style.display         = 'flex'
      dotEls[idx].style.background     = 'rgb(216,216,220)'
      dotEls[idx].style.transform      = 'scale(1.4)'
    }

    function tick() {
      rafId = null

      var p = clamp(
        (window.scrollY - geo.startAt) / (geo.endAt - geo.startAt),
        0, 1
      )

      // Wrapper scale — linear, 1:1 com scroll
      wrapper.style.transform =
        'scale(' + lerp(INITIAL_W_VW, 1, p).toFixed(4) + ',' +
                   lerp(INITIAL_H_VH, 1, p).toFixed(4) + ')'

      // Scale aplicado em TODAS as imgs de uma vez, antes de setSlide.
      // Quando setSlide mudar display, a img que entra já tem o valor certo.
      var sc = lerp(IMG_INITIAL_SCALE, IMG_FINAL_SCALE, p).toFixed(4)
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].style.transform = 'scale(' + sc + ')'
      }

      // Slide — depois dos transforms, para a img entrar já com scale certo
      setSlide(clamp(Math.floor(p * n), 0, n - 1))
    }

    function onScroll() {
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    rafId = requestAnimationFrame(tick)
  }

  function init() {
    document.querySelectorAll('.expand-card-section').forEach(initSection)
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init()

})()