// HYPERION landing — Sarvam-style structure, original HYPERION content.
// Tab switcher + reveal-on-scroll. No external deps.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Tab switcher (platform panels) ----------
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    const target = tab.dataset.panel;
    panels.forEach((p) => {
      const on = p.id === target;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
  });
});

// ---------- Nav scroll state ----------
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Reveal on scroll (no library) ----------
if (!reduce) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.api-card, .principles__grid article, .layer, .enterprise__grid article, .deploy__item, .code-card, .mock')
    .forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(18px)';
      el.style.transition = 'opacity .5s cubic-bezier(.22,.61,.36,1), transform .5s cubic-bezier(.22,.61,.36,1)';
      io.observe(el);
    });

  // style hook for revealed state
  const style = document.createElement('style');
  style.textContent = '.is-in { opacity: 1 !important; transform: none !important; }';
  document.head.appendChild(style);
}

// ---------- Smooth anchor scroll (respecting reduce) ----------
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
});
