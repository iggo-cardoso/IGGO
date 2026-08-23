/* ---------- SCROLL EXPAND (1 IMAGEM) ----------
   Versão enxuta do scroll-expand-card.js pra quando você só quer UMA
   imagem dando o efeito de clip-path abrindo + zoom-out no scroll,
   sem crossfade entre slides.

   Uso no HTML (pode ter quantos `.expand-solo` quiser na mesma página,
   cada um com sua própria imagem/texto):

   <div class="expand-solo">
     <div class="expand-solo-sticky">
       <img class="expand-solo-img" src="img/foto.jpg" alt="">
       <div class="expand-solo-text">IGGO.</div>
     </div>
   </div>

   --img-zoom / --img-x / --img-y continuam sendo definidos no CSS
   (.expand-solo-img), esse JS só lê. */

/* ---------- MOBILE CHECK ---------- */
const isMobile = () => window.matchMedia('(max-width: 768px)').matches
let mobile = isMobile()

/* ---------- ESTADO (reatribuível a cada init) ----------
   Igual ao original: cada instância guarda seus próprios nós/medidas,
   reconstruído em init() pra sobreviver ao page-router trocando o
   innerHTML de #page-root e recriando os elementos do zero. */
let instances = []
let raf = null
let listenersAttached = false

const CLIP_INITIAL = 25 // % de inset no início (retângulo central, 50% de área)
const CLIP_FINAL   = 75

let SCALE_START = mobile ? 1.03 : 1.14

function readImgZoom(inst) {
  const raw = getComputedStyle(inst.img).getPropertyValue('--img-zoom')
  const n = parseFloat(raw)
  inst.imgZoom = Number.isFinite(n) ? n : 1
}

function calc(inst) {
  let top = 0, el = inst.section
  while (el) { top += el.offsetTop; el = el.offsetParent }
  inst.start = top
  inst.end   = top + inst.section.offsetHeight - window.innerHeight
}

let _rt = 0
function onResize() {
  clearTimeout(_rt)
  _rt = setTimeout(() => {
    if (!instances.length) return
    mobile = isMobile()
    SCALE_START = mobile ? 1.03 : 1.14
    instances.forEach(inst => {
      calc(inst)
      readImgZoom(inst) // o breakpoint pode ter mudado o --img-zoom
    })
  }, 150)
}

function tick() {
  raf = null
  if (!instances.length) return

  const sy = window.scrollY
  const vh = window.innerHeight

  instances.forEach(inst => {
    const { section, sticky, img, start, end, imgZoom } = inst
    if (!section || !sticky) return
    if (sy < start - vh || sy > end + vh) return

    const p = Math.max(0, Math.min(1, (sy - start) / (end - start)))

    const clipStart = CLIP_INITIAL + (0   - CLIP_INITIAL) * p
    const clipEnd   = CLIP_FINAL   + (100 - CLIP_FINAL)   * p
    sticky.style.clipPath = `polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`

    const sc = SCALE_START + (1 - SCALE_START) * p
    img.style.transform = `scale(${sc * imgZoom})`
  })
}

function onScroll() {
  if (!raf) raf = requestAnimationFrame(tick)
}

/* ---------- INIT (reexecutável) ----------
   Reaponta pra todo .expand-solo atual do DOM. Chamada na carga
   inicial e sempre que o page-router volta pra home. */
function init() {
  const nodes = document.querySelectorAll('.expand-solo')
  if (!nodes.length) { instances = []; return }

  instances = Array.from(nodes).map(section => {
    const sticky = section.querySelector('.expand-solo-sticky')
    const img    = section.querySelector('.expand-solo-img')
    if (!sticky || !img) return null

    img.decoding = 'async'
    img.style.opacity = '1'

    const inst = { section, sticky, img, imgZoom: 1, start: 0, end: 0 }
    readImgZoom(inst)
    calc(inst)
    img.decode?.().catch(() => {})
    return inst
  }).filter(Boolean)

  if (!listenersAttached) {
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    listenersAttached = true
  }

  raf = requestAnimationFrame(tick)
}

init()

document.addEventListener('pagechange', (e) => {
  if (e.detail && e.detail.page === 'home') init()
})
