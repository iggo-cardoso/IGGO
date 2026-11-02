import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let activeTrigger;
let resizeObserver;

function mountAboutJourney() {
  activeTrigger?.kill();
  resizeObserver?.disconnect();
  activeTrigger = null;
  resizeObserver = null;

  const section = document.querySelector('[data-about-journey]');
  if (!section) return;
  const track = section.querySelector('.about-journey__track');
  const line = section.querySelector('.about-journey__line span');
  const events = [...section.querySelectorAll('.about-journey__event')];
  if (!track || !line) return;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const clamp = value => Math.max(0, Math.min(1, value));
  const render = progress => {
    const travel = Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.set(track, { x: -travel * progress });
    gsap.set(line, { scaleX: progress });
    events.forEach(event => {
      const position = event.getBoundingClientRect().left;
      const reveal = clamp((window.innerWidth * .78 - position) / 130);
      gsap.set(event.querySelector('.about-journey__stem'), { scaleY: reveal });
      gsap.set(event.querySelector('.about-journey__dot'), { scale: reveal });
      gsap.set(event.querySelector('.about-journey__copy'), {
        y: (1 - reveal) * 42,
        clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)`
      });
    });
  };

  activeTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: self => render(self.progress),
    onRefresh: self => render(self.progress)
  });
  resizeObserver = new ResizeObserver(() => activeTrigger?.refresh());
  resizeObserver.observe(track);
  render(activeTrigger.progress);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAboutJourney);
else mountAboutJourney();
document.addEventListener('pagechange', mountAboutJourney);
