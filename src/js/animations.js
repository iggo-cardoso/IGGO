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


// // ANIMAÇÃO DE ESTRELAS DE FUNDO
// const infoFixed = document.querySelector('.info-fixed');
// const header = document.querySelector('header');

// window.addEventListener('scroll', ()=> {
//   if (scrollY > 40) {
//     infoFixed.style.transform = 'translateY(-100%)';
//     header.style.top = '0';
//   } else if (scrollY == 0) {
//     infoFixed.style.transform = 'translateY(0)';
//     header.style.top = '13px';
//   }
// });
// // VISIBILITY OF ELEMENTS

// const canvas = document.getElementById("starfield");
// const ctx = canvas.getContext("2d");

// let stars = [];
// let w, h, centerX, centerY;

// function resize() {
//   w = canvas.width = window.innerWidth;
//   h = canvas.height = window.innerHeight;
//   centerX = w / 2;
//   centerY = h / 2;
// }
// resize();
// window.addEventListener("resize", resize);

// const numStars = 500;
// for (let i = 0; i < numStars; i++) {
//   stars.push({
//     x: Math.random() * w - centerX,
//     y: Math.random() * h - centerY,
//     z: Math.random() * w,
//     o: Math.random()
//   });
// }

// let mouse = { x: 0, y: 0 };
// document.addEventListener("mousemove", e => {
//   mouse.x = e.clientX - centerX;
//   mouse.y = e.clientY - centerY;
// });
// document.addEventListener("touchmove", e => {
//   mouse.x = e.touches[0].clientX - centerX;
//   mouse.y = e.touches[0].clientY - centerY;
// }, { passive: true });

// let speed = 2;
// const minSpeed = 0.3;
// const maxSpeed = 2;
// let targetSpeed = minSpeed;

// let lastScrollY = window.scrollY;
// let accumulatedScrollDown = 0;
// let accumulatedScrollUp = 0;

// window.addEventListener("scroll", () => {
//   const currentY = window.scrollY;
//   const deltaY = currentY - lastScrollY;

//   if (deltaY > 0) {
//     accumulatedScrollDown += deltaY;
//     accumulatedScrollUp = 0;

//     if (accumulatedScrollDown >= 100) {
//       targetSpeed = maxSpeed;
//       accumulatedScrollDown = 0;
//     }
//   } else if (deltaY < 0) {
//     accumulatedScrollUp += Math.abs(deltaY);
//     accumulatedScrollDown = 0;

//     if (accumulatedScrollUp >= 100) {
//       targetSpeed = -maxSpeed;
//       accumulatedScrollUp = 0;
//     }
//   }

//   lastScrollY = currentY;
// });

// function updateSpeed() {
//   const easing = 0.05;

//   speed += (targetSpeed - speed) * easing;

//   if (Math.abs(speed - targetSpeed) < 0.1 && targetSpeed !== minSpeed) {
//     targetSpeed = minSpeed;
//   }
// }

// function animate() {
//   updateSpeed();

//   ctx.fillStyle = "rgba(229, 229, 234, 0.15)";
//   ctx.fillRect(0, 0, w, h);

//   for (let i = 0; i < stars.length; i++) {
//     let star = stars[i];

//     let dx = star.x - mouse.x;
//     let dy = star.y - mouse.y;
//     let dist = Math.sqrt(dx * dx + dy * dy);

//     if (dist < 100) {
//       star.x += dx / dist * 2;
//       star.y += dy / dist * 2;
//     }

//     star.z -= speed;

//     if (star.z <= 0 || star.z > w) {
//       star.z = speed > 0 ? w : 0.1;
//       star.x = Math.random() * w - centerX;
//       star.y = Math.random() * h - centerY;
//     }

//     let k = 128.0 / star.z;
//     let px = star.x * k + centerX;
//     let py = star.y * k + centerY;

//     if (px >= 0 && px <= w && py >= 0 && py <= h) {
//       let size = (1 - star.z / w) * 2;
//       ctx.beginPath();
//       ctx.fillStyle = `rgba(54, 54, 54, ${star.o})`;
//       ctx.arc(px, py, size, 0, 2 * Math.PI);
//       ctx.fill();
//     }
//   }

//   requestAnimationFrame(animate);
// }
// animate();
// // ANIMAÇÃO DE ESTRELAS DE FUNDO


window.addEventListener('scroll', (e) => {
    if (scrollY > 560) {
        header.classList.add('sticky');
    } else {
        header.classList.remove('sticky');
    }
});