/**
 * scroll-expand-card.js — v3
 *
 * CORREÇÕES vs v2:
 * ─────────────────────────────────────────────────────────────
 * FIX 1 — display:none no CSS (.ec-text) → opacity+pointer-events
 *   O CSS do projeto tem `.ec-text{display:none}` e
 *   `.ec-text.active{display:flex}`. display muda = reflow.
 *   Corrigido com style inline (inline > stylesheet).
 *
 * FIX 2 — snap no scroll rápido
 *   Com lerp lento e scroll veloz, smooth fica muito atrás do
 *   raw → troca de slide atrasada parece jank. Se delta > 0.18,
 *   snapa smooth direto para raw, sem lerp.
 *
 * FIX 3 — contain:layout style no wrapper
 *   Isola o efeito do resto do documento. Mudanças internas
 *   (border-radius, troca de slide) não causam reflow global.
 *
 * FIX 4 — will-change em todas as imgs removido
 *   CSS externo promove TODAS as imgs como GPU layers.
 *   Resetado via inline style para 'auto'; ativado só na ativa.
 *
 * FIX 5 — barFill via scaleX em vez de width
 *   width não é compositor-only. scaleX com transform-origin:left é.
 *
 * FIX 6 — decisão de slide por rawProgress, não smoothProgress
 *   setSlide agora usa rawProgress. smooth só controla o visual.
 * ─────────────────────────────────────────────────────────────
 */
;(function () {
  'use strict'

  const INITIAL_W_VW      = 0.68
  const INITIAL_H_VH      = 0.62
  const CARD_RADIUS_PX    = 14
  const IMG_INITIAL_SCALE = 1.14
  const IMG_FINAL_SCALE   = 1.0
  const LERP_SPEED        = 7
  const STOP_THRESHOLD    = 0.001
  const SNAP_THRESHOLD    = 0.18  // FIX 2

  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function lerp  (a, b, t) { return a + (b - a) * t }
  function easeInOut (t)   { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }

  function buildCard (section, slides) {
    const wrapper = document.createElement('div')
    wrapper.className = 'ec-wrapper'
    // FIX 3: contain isola reflows internos
    wrapper.style.cssText =
      'position:sticky;top:0;width:100%;height:100vh;' +
      'overflow:hidden;will-change:transform;contain:layout style;'

    const imgLayer = document.createElement('div')
    imgLayer.className = 'ec-card-imgs'
    imgLayer.style.cssText =
      'position:absolute;inset:0;overflow:hidden;' +
      'border-radius:' + CARD_RADIUS_PX + 'px;'

    const imgs  = []
    const texts = []

    slides.forEach(function (s, i) {
      var img = document.createElement('img')
      img.src       = s.img
      img.alt       = s.title || ''
      img.className = 'ec-img' + (i === 0 ? ' active' : '')
      img.loading   = i === 0 ? 'eager' : 'lazy'
      img.decoding  = 'async'
      if (s.objectPosition) img.style.objectPosition = s.objectPosition
      // FIX 4: sobrescreve CSS externo (will-change em todas)
      img.style.willChange = i === 0 ? 'transform' : 'auto'
      // FIX 1: opacity inline sobrescreve opacity do CSS
      img.style.opacity    = i === 0 ? '1' : '0'
      img.style.transition = 'opacity 0.28s ease'
      imgLayer.appendChild(img)
      imgs.push(img)

      var block = document.createElement('div')
      block.className = 'ec-text' + (i === 0 ? ' active' : '')
      // FIX 1: inline style → não depende de display:none do CSS externo
      block.style.cssText =
        'position:absolute;inset:0;display:flex;flex-direction:column;' +
        'justify-content:center;align-items:center;text-align:center;' +
        'padding:clamp(1.2rem,4vw,3.5rem);' +
        'opacity:' + (i === 0 ? '1' : '0') + ';' +
        'pointer-events:' + (i === 0 ? 'auto' : 'none') + ';' +
        'transition:opacity 0.25s ease;'

      if (s.title === 'IGGO.') {
        block.innerHTML = '<img src="public/logos/png/logo.png" alt="" class="logo" ' +
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

    // Overlay gradiente — estático, sem will-change
    var overlay = document.createElement('div')
    overlay.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:1;' +
      'background:linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 60%);'
    imgLayer.appendChild(overlay)

    // Dots
    var dotsEl = document.createElement('div')
    dotsEl.className = 'ec-dots'
    dotsEl.style.cssText =
      'position:absolute;top:clamp(.8rem,2vw,1.4rem);' +
      'right:clamp(.8rem,2vw,1.4rem);display:flex;gap:6px;z-index:2;'
    var dotEls = slides.map(function (_, i) {
      var d = document.createElement('span')
      d.className = 'ec-dot' + (i === 0 ? ' active' : '')
      d.style.cssText =
        'width:6px;height:6px;border-radius:50%;' +
        'background:' + (i === 0 ? 'rgb(216,216,220)' : 'rgba(255,255,255,.3)') + ';' +
        'transform:' + (i === 0 ? 'scale(1.4)' : 'scale(1)') + ';' +
        'transition:background .25s,transform .25s;display:block;'
      dotsEl.appendChild(d)
      return d
    })
    imgLayer.appendChild(dotsEl)

    // FIX 5: barra via scaleX (compositor-only)
    var bar = document.createElement('div')
    bar.style.cssText =
      'position:absolute;bottom:0;left:0;right:0;height:2px;' +
      'background:rgba(255,255,255,.12);z-index:2;overflow:hidden;'
    var barFill = document.createElement('div')
    barFill.style.cssText =
      'height:100%;width:100%;background:#eee;' +
      'transform:scaleX(0);transform-origin:left center;' +
      'will-change:transform;'
    bar.appendChild(barFill)
    imgLayer.appendChild(bar)

    wrapper.appendChild(imgLayer)
    section.appendChild(wrapper)

    return { wrapper: wrapper, imgLayer: imgLayer, imgs: imgs,
             texts: texts, dotEls: dotEls, barFill: barFill }
  }

  function initSection (section) {
    var cardEl = section.querySelector('.expand-card')
    var slides = []
    try { slides = JSON.parse((cardEl && cardEl.dataset.slides) || '[]') } catch (e) { return }
    if (!slides.length) return
    cardEl.parentNode.removeChild(cardEl)

    var n = slides.length
    var scrollHeight = parseFloat(section.dataset.scrollHeight) || n * 180
    section.style.height   = scrollHeight + 'vh'
    section.style.position = 'relative'

    var built    = buildCard(section, slides)
    var wrapper  = built.wrapper
    var imgLayer = built.imgLayer
    var imgs     = built.imgs
    var texts    = built.texts
    var dotEls   = built.dotEls
    var barFill  = built.barFill

    var geo = {}

    function recache () {
      geo.vw      = window.innerWidth
      geo.vh      = window.innerHeight
      geo.scaleX0 = INITIAL_W_VW
      geo.scaleY0 = INITIAL_H_VH

      // offsetTop: mais barato que getBoundingClientRect (sem reflow forçado)
      var top = 0, el = section
      while (el) { top += el.offsetTop; el = el.offsetParent }
      geo.sectionTop = top
      geo.startAt    = top
      geo.endAt      = top + section.offsetHeight - geo.vh
    }

    recache()

    var resizeTimer = 0
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(recache, 150)
    }, { passive: true })

    var activeSlide    = -1
    var smoothProgress = 0
    var lastTime       = 0
    var rafId          = null
    var scrollDirty    = false

    function setSlide (idx) {
      if (idx === activeSlide) return

      if (activeSlide >= 0) {
        imgs[activeSlide].style.opacity        = '0'
        imgs[activeSlide].style.willChange     = 'auto'
        imgs[activeSlide].style.transform      = ''
        texts[activeSlide].style.opacity       = '0'
        texts[activeSlide].style.pointerEvents = 'none'
        dotEls[activeSlide].style.background   = 'rgba(255,255,255,.3)'
        dotEls[activeSlide].style.transform    = 'scale(1)'
      }

      activeSlide = idx
      imgs[idx].style.opacity        = '1'
      imgs[idx].style.willChange     = 'transform'
      texts[idx].style.opacity       = '1'
      texts[idx].style.pointerEvents = 'auto'
      dotEls[idx].style.background   = 'rgb(216,216,220)'
      dotEls[idx].style.transform    = 'scale(1.4)'
    }

    function tick (ts) {
      rafId = null

      var dt  = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0.016
      lastTime = ts

      var scrollY     = window.scrollY
      var rawProgress = clamp((scrollY - geo.startAt) / (geo.endAt - geo.startAt), 0, 1)

      // FIX 2: scroll rápido → snapa para não atrasar visualmente
      if (Math.abs(rawProgress - smoothProgress) > SNAP_THRESHOLD) {
        smoothProgress = rawProgress
      } else {
        smoothProgress = lerp(smoothProgress, rawProgress, 1 - Math.exp(-LERP_SPEED * dt))
      }

      var p     = smoothProgress
      var eased = easeInOut(p)

      // 1. Wrapper scale (GPU compositor)
      var sx = lerp(geo.scaleX0, 1, eased)
      var sy = lerp(geo.scaleY0, 1, eased)
      wrapper.style.transform = 'scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')'

      // 2. Border-radius (não compositor, mas isolado por contain)
      imgLayer.style.borderRadius = lerp(CARD_RADIUS_PX, 0, eased).toFixed(1) + 'px'

      // 3. Scale da imagem ativa (GPU compositor)
      if (activeSlide >= 0) {
        var sc = lerp(IMG_INITIAL_SCALE, IMG_FINAL_SCALE, eased)
        imgs[activeSlide].style.transform = 'scale(' + sc.toFixed(4) + ')'
      }

      // FIX 6: slide decidido pelo rawProgress
      setSlide(clamp(Math.floor(rawProgress * n), 0, n - 1))

      // FIX 5: barra via scaleX
      var sliceIdx = clamp(Math.floor(rawProgress * n), 0, n - 1)
      var sliceP   = (rawProgress - sliceIdx / n) * n
      barFill.style.transform = 'scaleX(' + clamp(sliceP, 0, 1).toFixed(3) + ')'

      var residual = Math.abs(smoothProgress - rawProgress)
      if (residual > STOP_THRESHOLD || scrollDirty) {
        scrollDirty = false
        rafId = requestAnimationFrame(tick)
      }
    }

    function scheduleFrame () {
      scrollDirty = true
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', scheduleFrame, { passive: true })
    scheduleFrame()
  }

  function init () {
    document.querySelectorAll('.expand-card-section').forEach(initSection)
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init()

})()
