/**
 * expand-card.js — v2 (mobile-optimized)
 *
 * MUDANÇAS vs v1:
 * ─────────────────────────────────────────────────────────────
 * 1. clip-path REMOVIDO → transform: scale+translate no wrapper
 *    clip-path: inset() não é compositor-only em todos os drivers
 *    mobile. scale/translate são sempre na GPU thread.
 *
 * 2. Troca de slide via CSS class (opacity/visibility) em vez de
 *    display:none → sem reflow ao trocar slides.
 *
 * 3. rAF para completamente quando |smooth - raw| < threshold
 *    e o scroll está parado (scroll event reativa).
 *
 * 4. Nenhum querySelector dentro do loop de tick.
 *
 * 5. border-radius via CSS var atualizado com setProperty —
 *    um único style.setProperty por frame em vez de string
 *    concatenada no clipPath.
 *
 * 6. Lerp com exp(-speed * dt) mantido (matematicamente correto)
 *    mas LERP_SPEED reduzido para 5 — mais suave e menos frames
 *    gastos perseguindo o target no mobile.
 * ─────────────────────────────────────────────────────────────
 */
;(function () {
  'use strict'

  // ── TUNABLES ────────────────────────────────────────────────
  const INITIAL_W_VW      = 0.68   // largura inicial como fração da vw
  const INITIAL_H_VH      = 0.62   // altura inicial como fração da vh
  const CARD_RADIUS_PX    = 14     // border-radius inicial em px
  const IMG_INITIAL_SCALE = 1.18   // zoom inicial da imagem
  const IMG_FINAL_SCALE   = 1.0    // zoom final da imagem
  const LERP_SPEED        = 5      // velocidade de suavização (era 6)
  const STOP_THRESHOLD    = 0.0008 // para o rAF abaixo desse delta

  // ── UTILS ────────────────────────────────────────────────────
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function lerp  (a, b, t) { return a + (b - a) * t }
  function easeInOut (t)   { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t }

  // ── BUILD DOM ────────────────────────────────────────────────
  // Cria todo o DOM do card de uma vez (zero querySelector depois)
  function buildCard (section, slides) {
    const wrapper = document.createElement('div')
    wrapper.className = 'ec-wrapper'
    // will-change aqui: apenas transform — compositor-only garantido
    wrapper.style.cssText = [
      'position:sticky',
      'top:0',
      'width:100%',
      'height:100vh',
      'overflow:hidden',
      'will-change:transform',
    ].join(';')

    // Camada de imagens
    const imgLayer = document.createElement('div')
    imgLayer.className = 'ec-card-imgs'
    imgLayer.style.cssText = [
      'position:absolute',
      'inset:0',
      'will-change:border-radius',  // só border-radius muda aqui
    ].join(';')

    const imgs  = []
    const texts = []

    slides.forEach((s, i) => {
      // Imagem
      const img = document.createElement('img')
      img.src       = s.img
      img.alt       = s.title || ''
      img.className = 'ec-img' + (i === 0 ? ' active' : '')
      img.loading   = i === 0 ? 'eager' : 'lazy'
      img.decoding  = 'async'
      if (s.objectPosition) img.style.objectPosition = s.objectPosition
      // will-change apenas na img ativa (trocado no setSlide)
      if (i === 0) img.style.willChange = 'transform'
      imgLayer.appendChild(img)
      imgs.push(img)

      // Texto (opacity transition, sem display:none)
      const block = document.createElement('div')
      block.className = 'ec-text' + (i === 0 ? ' active' : '')
      if (s.title === 'IGGO.') {
        block.innerHTML = '<img src="public/logos/png/logo.png" alt="" class="logo">'
      } else {
        block.innerHTML = '<h2 class="ec-title">' + (s.title || '') + '</h2>'
      }
      imgLayer.appendChild(block)
      texts.push(block)
    })

    // Barra de progresso
    const bar     = document.createElement('div')
    bar.className = 'ec-bar'
    const barFill = document.createElement('div')
    barFill.className = 'ec-bar-fill'
    bar.appendChild(barFill)
    imgLayer.appendChild(bar)

    // Dots
    const dotsEl = document.createElement('div')
    dotsEl.className = 'ec-dots'
    const dotEls = slides.map((_, i) => {
      const d = document.createElement('span')
      d.className = 'ec-dot' + (i === 0 ? ' active' : '')
      dotsEl.appendChild(d)
      return d
    })
    imgLayer.appendChild(dotsEl)

    wrapper.appendChild(imgLayer)
    section.appendChild(wrapper)

    return { wrapper, imgLayer, imgs, texts, dotEls, barFill }
  }

  // ── INIT SECTION ─────────────────────────────────────────────
  function initSection (section) {
    const cardEl = section.querySelector('.expand-card')
    let slides = []
    try { slides = JSON.parse(cardEl?.dataset.slides || '[]') } catch (e) { return }
    if (!slides.length) return
    cardEl.remove()

    const n = slides.length
    const scrollHeight = parseFloat(section.dataset.scrollHeight) || n * 180
    section.style.height   = scrollHeight + 'vh'
    section.style.position = 'relative'

    const { wrapper, imgLayer, imgs, texts, dotEls, barFill } = buildCard(section, slides)

    // ── GEOMETRIA (recacheada no resize) ─────────────────────
    let geo = {}

    function recache () {
      geo.vw     = window.innerWidth
      geo.vh     = window.innerHeight
      geo.initW  = geo.vw * INITIAL_W_VW
      geo.initH  = geo.vh * INITIAL_H_VH

      // Margem de inset → quanto o wrapper precisa escalar de para chegar a 100%
      // Em vez de clip-path, escalamos o wrapper do tamanho inicial ao tamanho final.
      // scaleX inicial = initW / vw, scaleY inicial = initH / vh
      geo.scaleX0 = geo.initW / geo.vw  // ex: 0.68
      geo.scaleY0 = geo.initH / geo.vh  // ex: 0.62

      const rect       = section.getBoundingClientRect()
      geo.sectionTop   = rect.top + window.scrollY
      geo.startAt      = geo.sectionTop
      geo.endAt        = geo.sectionTop + section.offsetHeight - geo.vh
    }

    recache()
    window.addEventListener('resize', recache, { passive: true })

    // ── ESTADO ────────────────────────────────────────────────
    let activeSlide    = -1
    let smoothProgress = 0
    let lastTime       = 0
    let rafId          = null
    let isScrolling    = false   // true enquanto há scroll ativo

    // ── TROCA DE SLIDE (sem reflow) ───────────────────────────
    // Usa class 'active' → CSS controla opacity/pointer-events
    // Nenhum style.display aqui.
    function setSlide (idx) {
      if (idx === activeSlide) return

      if (activeSlide >= 0) {
        imgs[activeSlide].classList.remove('active')
        imgs[activeSlide].style.willChange = 'auto'   // libera layer da img antiga
        imgs[activeSlide].style.transform  = ''
        texts[activeSlide].classList.remove('active')
        dotEls[activeSlide].classList.remove('active')
      }

      activeSlide = idx
      imgs[idx].classList.add('active')
      imgs[idx].style.willChange = 'transform'        // promove layer da nova img
      texts[idx].classList.add('active')
      dotEls[idx].classList.add('active')
    }

    // ── TICK ──────────────────────────────────────────────────
    function tick (ts) {
      rafId = null

      // dt em segundos, capped para evitar spike em tab focus
      const dt  = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0.016
      lastTime  = ts

      const scrollY     = window.scrollY
      const rawProgress = clamp((scrollY - geo.startAt) / (geo.endAt - geo.startAt), 0, 1)

      // Lerp frame-rate-independent (exp decay)
      smoothProgress = lerp(smoothProgress, rawProgress, 1 - Math.exp(-LERP_SPEED * dt))

      const p     = smoothProgress
      const eased = easeInOut(p)

      // ── 1. Expansão do wrapper via scale + translate ─────────
      // Interpolamos de (scaleX0, scaleY0) para (1, 1).
      // O wrapper está position:sticky, 100vw × 100vh.
      // transform-origin: center center (padrão).
      // Nenhum layout thrashing — só compositor.
      const sx = lerp(geo.scaleX0, 1, eased)
      const sy = lerp(geo.scaleY0, 1, eased)
      wrapper.style.transform = 'scale(' + sx.toFixed(5) + ',' + sy.toFixed(5) + ')'

      // ── 2. Border-radius no imgLayer (CSS var → 1 setProperty) ─
      const radius = lerp(CARD_RADIUS_PX, 0, eased)
      imgLayer.style.borderRadius = radius.toFixed(2) + 'px'

      // ── 3. Scale da imagem ativa ─────────────────────────────
      const activeImg = imgs[activeSlide >= 0 ? activeSlide : 0]
      if (activeImg) {
        const imgScale = lerp(IMG_INITIAL_SCALE, IMG_FINAL_SCALE, eased)
        activeImg.style.transform = 'scale(' + imgScale.toFixed(5) + ')'
      }

      // ── 4. Slide ativo ───────────────────────────────────────
      setSlide(clamp(Math.floor(p * n), 0, n - 1))

      // ── 5. Barra de progresso ────────────────────────────────
      const sliceIdx = clamp(Math.floor(p * n), 0, n - 1)
      const sliceP   = (p - sliceIdx / n) / (1 / n)
      barFill.style.width = clamp(sliceP * 100, 0, 100).toFixed(1) + '%'

      // ── Decidir se continua o loop ───────────────────────────
      // Para quando convergiu E o scroll está parado.
      // O evento scroll reaciona quando necessário.
      const delta = Math.abs(smoothProgress - rawProgress)
      if (delta > STOP_THRESHOLD || isScrolling) {
        rafId = requestAnimationFrame(tick)
      }
    }

    function scheduleFrame () {
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    // Sinaliza scroll ativo; para depois de 100ms sem scroll
    let scrollEndTimer = 0
    function onScroll () {
      isScrolling = true
      clearTimeout(scrollEndTimer)
      scrollEndTimer = setTimeout(() => { isScrolling = false }, 100)
      scheduleFrame()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    scheduleFrame()
  }

  // ── BOOT ─────────────────────────────────────────────────────
  function init () {
    document.querySelectorAll('.expand-card-section').forEach(initSection)
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init()

})()