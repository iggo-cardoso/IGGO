let disposeDeck;

function initDeck() {
  disposeDeck?.();

  const deck = document.querySelector('[data-crm-deck]');
  if (!deck) return;

  const cards = [...deck.querySelectorAll('.crm-deck__card')];
  const buttons = [...deck.querySelectorAll('[data-crm-to]')];
  if (cards.length !== 3 || buttons.length !== 3) return;

  const events = new AbortController();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let timer;

  const show = index => {
    active = index;
    cards.forEach((card, cardIndex) => {
      card.dataset.position = ['front', 'next', 'back'][(cardIndex - active + cards.length) % cards.length];
      card.setAttribute('aria-hidden', String(cardIndex !== active));
    });
    buttons.forEach((button, buttonIndex) => {
      button.setAttribute('aria-pressed', String(buttonIndex === active));
    });
  };

  const pause = () => {
    clearInterval(timer);
    timer = undefined;
  };

  const play = () => {
    if (timer || reducedMotion.matches || document.hidden || deck.matches(':hover') || deck.contains(document.activeElement)) return;
    timer = window.setInterval(() => show((active + 1) % cards.length), 4200);
  };

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => show(index), { signal: events.signal });
  });
  deck.addEventListener('mouseenter', pause, { signal: events.signal });
  deck.addEventListener('mouseleave', play, { signal: events.signal });
  deck.addEventListener('focusin', pause, { signal: events.signal });
  deck.addEventListener('focusout', () => queueMicrotask(play), { signal: events.signal });
  document.addEventListener('visibilitychange', () => {
    pause();
    play();
  }, { signal: events.signal });
  reducedMotion.addEventListener('change', () => {
    pause();
    play();
  }, { signal: events.signal });

  show(0);
  play();
  disposeDeck = () => {
    pause();
    events.abort();
  };
}

document.addEventListener('pagechange', initDeck);
initDeck();
