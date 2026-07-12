/* ---------- MOBILE CHECK ---------- */
const isMobile = () => window.matchMedia('(max-width: 768px)').matches
let mobile = isMobile()

const data = [
  {
    "img": "img/complete_a_cena,_202604240847.jpeg",
    "title": "Consultoria"
  },
  {
    "img": "img/thomas.jpg",
    "title": "Tecnologia"
  },
  {
    "img": "img/image.png",
    "title": "Inovação"
  },
  {
    "img": "img/ai-gerou-o-conceito-de-ser-humano3.jpg",
    "title": "Marketing"
  },
  {
    "img": "img/IGGO/publi/Portrait_wearing_round_202604231958a.png",
    "title": "IGGO."
  }
]

const slidesEl = document.getElementById('slides')

const imgs  = []
const texts = []

data.forEach((s, i) => {
  const img = new Image()
  img.src       = s.img
  img.className = 'slide'
  // data-slide-index é o que o CSS usa pra mirar cada imagem
  // (ex: .slide[data-slide-index="1"] { --img-zoom: 0.9; }).
  // O zoom/posição da imagem em si (--img-zoom, --img-x, --img-y)
  // fica 100% no CSS (index.css = desktop, mobile.css = mobile) —
  // esse JS só lê o valor que já foi definido lá, não define nada.
  img.dataset.slideIndex = i
  img.style.opacity = i === 0 ? '1' : '0'
  img.decoding  = 'async'
  slidesEl.appendChild(img)
  imgs.push(img)

  const t = document.createElement('div')
  t.className   = 'text'
  t.style.opacity = i === 0 ? '1' : '0'
  t.textContent = s.title
  slidesEl.appendChild(t)
  texts.push(t)
})

/* lê --img-zoom (definido no CSS) de cada imagem e guarda num array —
   não precisa ler a cada frame do scroll, só quando monta a página e
   quando muda de desktop pra mobile (ou vice-versa), já que é aí que
   o valor pode mudar (mobile.css sobrescreve index.css). */
const imgZooms = imgs.map(() => 1)
function readImgZooms() {
  imgs.forEach((img, i) => {
    const raw = getComputedStyle(img).getPropertyValue('--img-zoom')
    const n = parseFloat(raw)
    imgZooms[i] = Number.isFinite(n) ? n : 1
  })
}
readImgZooms()

Promise.all(imgs.map(img => img.decode?.().catch(() => {})))

const section = document.getElementById('section')
const sticky  = document.getElementById('sticky')
let start = 0
let end   = 0

function calc() {
  let top = 0, el = section
  while (el) { top += el.offsetTop; el = el.offsetParent }
  start = top
  end   = top + section.offsetHeight - window.innerHeight
}

calc()

/* ---------- CLIP-PATH EXPAND ----------
   Em vez de dar scale(scaleX, scaleY) no container inteiro (que distorce a
   proporção e obriga o navegador a repintar o .sticky + seus filhos toda
   hora), o clip-path corta um retângulo central que vai se abrindo até
   cobrir 100% da área — clip-path roda direto na GPU (compositor layer),
   então fica bem mais leve que animar scale/transform num container com
   overflow:hidden e pseudo-elemento de ruído por cima. */
const CLIP_INITIAL = 25 // % de inset no início (retângulo central, 50% de área)
const CLIP_FINAL   = 75

/* ---------- ZOOM DO COMPONENTE: MENOR NO MOBILE ----------
   Isso é o zoom do EFEITO de scroll (não da imagem em si — pra
   mexer na imagem, edita --img-zoom/--img-x/--img-y no CSS). No PC
   as fotos são paisagem e o container é bem próximo do aspect-ratio
   delas, então dá pra começar com um zoom-in de 1.14 sem perder
   muito. No celular a tela é estreita e alta: qualquer zoom a mais
   do componente come pessoas/objetos que estão nas bordas laterais.
   Por isso, no mobile o zoom inicial do componente é bem mais sutil. */
let SCALE_START = mobile ? 1.03 : 1.14

let _rt = 0
window.addEventListener('resize', () => {
  clearTimeout(_rt)
  _rt = setTimeout(() => {
    calc()
    mobile = isMobile()
    SCALE_START = mobile ? 1.03 : 1.14
    readImgZooms() // o breakpoint pode ter mudado o --img-zoom de alguma imagem
  }, 150)
}, { passive: true })

let raf = null

function tick() {
  raf = null

  const sy = window.scrollY
  const vh = window.innerHeight
  if (sy < start - vh || sy > end + vh) return

  const p = Math.max(0, Math.min(1, (sy - start) / (end - start)))

  const clipStart = CLIP_INITIAL + (0   - CLIP_INITIAL) * p
  const clipEnd   = CLIP_FINAL   + (100 - CLIP_FINAL)   * p
  sticky.style.clipPath = `polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`

  const sc = SCALE_START + (1 - SCALE_START) * p
  for (let i = 0; i < imgs.length; i++) {
    // escala final = zoom do efeito (sc) * zoom manual da imagem (--img-zoom, via CSS)
    imgs[i].style.transform = `scale(${sc * imgZooms[i]})`
  }

  /* ---------- CROSSFADE CONTÍNUO ----------
     Antes: classList.add/remove('active') trocava o slide inteiro num
     frame só (opacidade 0→1 instantânea) — dava a sensação de travado.
     Depois, uma função triangular pura (pico exatamente no centro do
     segmento) fazia o slide começar a desvanecer assim que passava do
     meio — por isso trocava "rápido demais" e nunca segurava a imagem em
     opacidade 1 real; nas pontas do scroll (p=0 e p=1) o primeiro/último
     slide ficavam presos em ~0.5.

     Agora é um trapézio: cada slide fica em opacidade 1 (platô) durante
     boa parte do seu segmento, e só desvanece perto da borda que divide
     com o vizinho. O primeiro slide não tem fade-in (já nasce em 1) e o
     último não tem fade-out (termina em 1) — resolve o "final transparente". */
  const n       = data.length
  const segLen  = 1 / n
  const overlap = segLen * 0.3 // fração do segmento gasta na transição (dividida entre as duas bordas)

  for (let i = 0; i < n; i++) {
    const segStart = i * segLen
    const segEnd   = (i + 1) * segLen
    let alpha = 1

    if (i > 0) {
      const fadeInStart = segStart - overlap / 2
      const fadeInEnd   = segStart + overlap / 2
      if (p < fadeInEnd) alpha = Math.min(alpha, (p - fadeInStart) / overlap)
    }
    if (i < n - 1) {
      const fadeOutStart = segEnd - overlap / 2
      const fadeOutEnd   = segEnd + overlap / 2
      if (p > fadeOutStart) alpha = Math.min(alpha, (fadeOutEnd - p) / overlap)
    }

    alpha = Math.max(0, Math.min(1, alpha))
    imgs[i].style.opacity  = alpha
    texts[i].style.opacity = alpha
  }
}

function onScroll() {
  if (!raf) raf = requestAnimationFrame(tick)
}

window.addEventListener('scroll', onScroll, { passive: true })
requestAnimationFrame(tick)
