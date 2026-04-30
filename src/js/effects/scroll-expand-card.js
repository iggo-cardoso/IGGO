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
    "img": "img/Thomas_Cole_-_Architect's_Dream_-_Google_Art_Project.jpg",
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
  t.className   = 'text' + (i === 0 ? ' active' : '')
  t.textContent = s.title
  slidesEl.appendChild(t)
  texts.push(t)
})

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
let _rt = 0
window.addEventListener('resize', () => { clearTimeout(_rt); _rt = setTimeout(calc, 150) }, { passive: true })

let raf = null

function tick() {
  raf = null

  const sy = window.scrollY
  const vh = window.innerHeight
  if (sy < start - vh || sy > end + vh) return

  const p = Math.max(0, Math.min(1, (sy - start) / (end - start)))

  const scaleX = 0.7  + (1 - 0.7)  * p
  const scaleY = 0.6  + (1 - 0.6)  * p
  document.getElementById('sticky').style.transform = `scale(${scaleX}, ${scaleY})`

  const sc = 1.14 + (1 - 1.14) * p
  for (let i = 0; i < imgs.length; i++) {
    imgs[i].style.transform = `scale(${sc})`
  }

  const next = Math.min(data.length - 1, Math.floor(p * data.length))
  setSlide(next)
}

function onScroll() {
  if (!raf) raf = requestAnimationFrame(tick)
}

window.addEventListener('scroll', onScroll, { passive: true })
requestAnimationFrame(tick)