const markerMouse = document.querySelector('.marker-mouse');
const links = document.querySelectorAll('.link-hover');
const linkAddress = document.querySelectorAll('[link]');
const header = document.querySelector('header');

function markerMouseCursor() {
    document.addEventListener('mousemove', (e) => {
        markerMouse.style.left = `${e.pageX + 2}px`;
        markerMouse.style.top = `${e.pageY + 18}px`;
        markerMouse.style.opacity = "1";
    });
}

function mouseParallax() {
  const elements = document.querySelectorAll('[data-mouse-shift]');

  window.addEventListener('mousemove', e => {
    const x = e.clientX;
    const y = e.clientY;
    const w = window.innerWidth;
    const h = window.innerHeight;

    elements.forEach(el => {
      el.style.transition = " .5s ease-out";
      const cfg = el.dataset.mouseShift.split("-");
      const speed = Number(cfg[0]) || 20;
      const mode = cfg[1] || "normal"; 
      const axis = cfg[2] || "anyAxis";

      const relX = (x / w - 0.5) * 2;
      const relY = (y / h - 0.5) * 2;

      let moveX = relX * speed;
      let moveY = relY * speed;

      if (mode === "normal") {
        moveX = -moveX * .08;
        moveY = -moveY * .08;
      }

      if (axis === "axisX") {
        moveY = 0; 
      }

      el.dataset.mouseTx = moveX;
      el.dataset.mouseTy = moveY;

      applyCombinedTransform(el);
    });
  });
}
markerMouseCursor();

var whatIsUnderMouse = null;

links.forEach(link => {
    link.addEventListener('mouseenter', () => {
        whatIsUnderMouse = "link";
        checkHover();
    });
    link.addEventListener('mouseleave', () => {
        whatIsUnderMouse = null;
        checkHover();
    });
});

function checkHover() {
    switch (whatIsUnderMouse) {
        case null:
            document.querySelector('.marker-mouse .icon').innerHTML = '';
            break;
        case "link":
            document.querySelector('.marker-mouse .icon').innerHTML = '<i class="bx  bx-arrow-up-right-stroke"></i>';
            break;
    }
}

linkAddress.forEach(link => {
    link.addEventListener('click', () => {
        window.open(`${link.getAttribute('link')}`, '_blank');
        
    });
});


const desktopQuery = window.matchMedia("(min-width: 769px)");
const mobileQuery = window.matchMedia("(max-width: 768px)");

function checkSticky() {
    // console.log(scrollY)
  let limite = 494;
  let colorHEader = 4526;

  if (mobileQuery.matches) {
    limite = 273;
    colorHEader = 5015;
  }

  if (scrollY > limite) {
    header.classList.add("sticky");
  } else {
    header.classList.remove("sticky");
  }

  if (scrollY > colorHEader) {
    header.classList.add("sticky-black");
  } else {
    header.classList.remove("sticky-black");
  }

}

window.addEventListener("scroll", checkSticky);
window.addEventListener("resize", checkSticky);


const pageLoading = document.querySelector('.loading-page');

document.querySelector('.loading-page  .button').addEventListener('click', () => {
    setTimeout(() => {
      pageLoading.classList.add('hidden');
      document.querySelector('body').style.paddingTop = "70px";
      document.querySelector('body').style.overflowY = "scroll";
    }, 1000);
}, 5200);





//////////////////////////////////





function parallaxSections() {
  const sections = document.querySelectorAll('[data-parallax-speed]');

  sections.forEach(el => {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    const isVisible = rect.top < windowHeight && rect.bottom > 0;

    if (isVisible && window.innerWidth >= 1136) {
      const config = el.dataset.parallaxSpeed;
      const [speedStr, direction] = config.split('-');
      const speed = Number(speedStr) || 4;

      const scrollRel = windowHeight - rect.top;

      let scrollTx = 0;
      let scrollTy = 0;

      if (direction === 'up') {
        scrollTy = -(scrollRel / speed);
      } else if (direction === 'down') {
        scrollTy = scrollRel / speed;
      }

      el.dataset.scrollTx = scrollTx;
      el.dataset.scrollTy = scrollTy;

      applyCombinedTransform(el);
    }
  });
}

function applyCombinedTransform(el) {
  const scrollTx = parseFloat(el.dataset.scrollTx) || 0;
  const scrollTy = parseFloat(el.dataset.scrollTy) || 0;

  const mouseTx = parseFloat(el.dataset.mouseTx) || 0;
  const mouseTy = parseFloat(el.dataset.mouseTy) || 0;

  const finalX = Math.round(scrollTx + mouseTx);
  const finalY = Math.round(scrollTy + mouseTy);


  el.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
  el.style.willChange = "transform";
}



function parallaxBloco() {
    const paralaxBloco = document.querySelectorAll('.paralax-bloco');
    paralaxBloco.forEach(element => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const isVisible = rect.top < windowHeight && rect.bottom > 0;

      if (isVisible && window.innerWidth >= 1136) {
        const scrollRelativo = windowHeight - rect.top;
        const speed = 7;

        element.style.transform = `translateY(-${scrollRelativo / speed}px)`;
      }
    });
}


window.addEventListener('scroll', parallaxBloco);

window.addEventListener('load', () => {
  mouseParallax();
  parallaxSections();
  window.addEventListener('scroll', parallaxSections);
});







