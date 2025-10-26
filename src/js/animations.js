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
            markerMouse.innerHTML = '';
            break;
        case "link":
            markerMouse.innerHTML = '<i class="bx  bx-arrow-up-right-stroke"></i>';
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
    console.log(scrollY)
  let limite = 494;
  let colorHEader = 3025;

  if (mobileQuery.matches) {
    limite = 273;
    colorHEader = 3919;
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

  console.log(scrollY);
}

window.addEventListener("scroll", checkSticky);
window.addEventListener("resize", checkSticky);


const pageLoading = document.querySelector('.loading-page');

setTimeout(() => {
    pageLoading.classList.add('hidden');
    document.querySelector('body').style.paddingTop = "70px";
    document.querySelector('body').style.overflowY = "scroll";
}, 5200);