const data = [
  {
    "img": "img/IGGO/publi/Portrait_wearing_round_202604231958a.png",
    "title": "IGGO."
  },
  {
    "img": "img/complete_a_cena,_202604240847.jpeg",
    "title": "Consultoria"
  },
  {
    "img": "img/Thomas_Cole_-_Architect’s_Dream_-_Google_Art_Project.jpg",
    "title": "Tecnologia"
  },
  {
    "img": "img/image.png",
    "title": "Inovação"
  },
  {
    "img": "img/Great_Wave_off_Kanagawa2.jpg",
    "title": "Marketing"
  }
]

const slidesEl = document.getElementById('slides')

const imgs  = []
const texts = []

data.forEach((s, i) => {
  const img = new Image()
  img.src       = s.img
  img.className = 'slide' + (i === 0 ? ' active' : '')
  img.decoding  = 'async'
  slidesEl.appendChild(img)
  imgs.push(img)

  const t = document.createElement('div')
  t.className  = 'text' + (i === 0 ? ' active' : '')
  t.textContent = s.title
  slidesEl.appendChild(t)
  texts.push(t)
})

// Pré-decode assíncrono: processa na thread de decode do browser,
// garante que todas as imagens estão prontas antes do scroll chegar.
Promise.all(imgs.map(img => img.decode?.().catch(() => {})))

let active = 0

function setSlide(i) {
  if (i === active) return
  imgs[active].classList.remove('active')
  texts[active].classList.remove('active')
  imgs[i].classList.add('active')
  texts[i].classList.add('active')
  active = i
}

// ── Posição estática da seção ───────────────────────────────────────────────
// Calculado com offsetTop (sem getBoundingClientRect dentro do rAF).
// Recalculado só em resize — nunca dentro do tick.

const section = document.getElementById('section')
let start = 0
let end   = 0

function calc() {
  let top = 0, el = section
  while (el) { top += el.offsetTop; el = el.offsetParent }
  start = top
  end   = top + section.offsetHeight - window.innerHeight
}

calc()
window.addEventListener('resize', () => { clearTimeout(_rt); _rt = setTimeout(calc, 150) }, { passive: true })
let _rt = 0

// ── rAF loop ────────────────────────────────────────────────────────────────
// Regra: um único rAF por evento de scroll (throttle natural).
// O tick faz TODAS as escritas de uma vez, sem leituras intermediárias
// (window.scrollY é o único read — não causa reflow).

let raf = null

function tick() {
  raf = null   // ← libera o slot para o próximo onScroll agendar

  const p = Math.max(0, Math.min(1,
    (window.scrollY - start) / (end - start)
  ))

  // Expand do wrapper
  const scaleX = 0.7  + (1 - 0.7)  * p
  const scaleY = 0.6  + (1 - 0.6)  * p
  document.getElementById('sticky').style.transform = `scale(${scaleX}, ${scaleY})`

  // CORREÇÃO CHAVE: scale aplicado em TODAS as imagens antes de setSlide.
  // Quando a nova imagem entrar (classList.add 'active'), ela JÁ tem o
  // scale correto — nunca aparece com valor residual do frame anterior.
  const sc = 1.14 + (1 - 1.14) * p
  for (let i = 0; i < imgs.length; i++) {
    imgs[i].style.transform = `scale(${sc})`
  }

  // Troca de slide DEPOIS dos transforms — a imagem entra já com scale certo
  const next = Math.min(data.length - 1, Math.floor(p * data.length))
  setSlide(next)
}

function onScroll() {
  // Só agenda se não tiver rAF pendente.
  // Isso garante no máximo 1 tick por frame (60fps cap automático).
  if (!raf) raf = requestAnimationFrame(tick)
}

window.addEventListener('scroll', onScroll, { passive: true })
requestAnimationFrame(tick)  // tick inicial para estado correto antes de qualquer scroll