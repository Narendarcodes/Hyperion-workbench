// DeepSeek Harness landing — yv. structure port.
// GSAP+Lenis, tunnel hero, count-ups, reveals, pinned horizontal modes,
// showcase tilt scrub. No React.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { mountGalleryTunnel } from './gallery-tunnel.js';

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------- Lenis ----------------
const lenis = new Lenis({ smoothWheel: true });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: -90 });
  });
});

// ---------------- Tunnel hero ----------------
const tunnelHost = document.getElementById('tunnel');
if (tunnelHost) mountGalleryTunnel(tunnelHost);

// hero entrance
if (!reduce) {
  gsap.fromTo('.hero__copy > *',
    { y: 34, opacity: 0 },
    { y: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .09, delay: .15 });
  // swoosh self-draw
  const swoosh = document.querySelector('.hero__em path');
  if (swoosh) {
    const len = swoosh.getTotalLength();
    gsap.set(swoosh, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(swoosh, { strokeDashoffset: 0, duration: .9, delay: 1.1, ease: 'power2.inOut' });
  }
}

// ---------------- Count-ups (proof strip) ----------------
document.querySelectorAll('[data-count]').forEach((el) => {
  const to = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (reduce) { el.textContent = `${to}${suffix}`; return; }
  const obj = { v: 0 };
  gsap.to(obj, {
    v: to, duration: 1.6, ease: 'power2.out',
    onUpdate: () => { el.textContent = `${Math.round(obj.v)}${suffix}`; },
    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
  });
});

// ---------------- Reveals ----------------
if (!reduce) {
  document.querySelectorAll('.proof, .formula, .features .wrap, .showcase .wrap, .modes__head, .cta .wrap, .lfooter__grid').forEach((scope) => {
    const targets = scope.querySelectorAll('[data-reveal], .proof__item, .fcard, .kicker, h2, .features__sub, .callout, .cli-card, .cta__foot, .lfooter__brand, .lfooter__desc');
    if (!targets.length) return;
    gsap.fromTo(targets,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: .64, ease: 'power2.out', stagger: .08,
        scrollTrigger: { trigger: scope, start: 'top 80%', once: true } });
  });
} else {
  document.querySelectorAll('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
}

// ---------------- Showcase tilt scrub ----------------
const frame = document.querySelector('[data-frame]');
if (frame && !reduce) {
  gsap.fromTo(frame,
    { rotateX: 18, y: 60, scale: .94 },
    { rotateX: 0, y: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.showcase', start: 'top 85%', end: 'center center', scrub: 1 } });
}

// ---------------- Modes: pinned horizontal scroll ----------------
const modesEl = document.querySelector('.modes');
const track = document.querySelector('[data-track]');
const viewport = document.querySelector('[data-viewport]');
if (modesEl && track && viewport) {
  const mq = matchMedia('(min-width: 768px)');
  if (!reduce && mq.matches) {
    const distance = () => {
      const padLeft = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      return Math.max(0, track.scrollWidth - (viewport.clientWidth - padLeft));
    };
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: modesEl,
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  } else {
    viewport.style.overflowX = 'auto';
    viewport.style.scrollSnapType = 'x mandatory';
    track.style.scrollSnapType = 'x mandatory';
    track.querySelectorAll('.mcard').forEach((c) => { c.style.scrollSnapAlign = 'center'; });
  }
}

// recalc after fonts/layout settle
setTimeout(() => ScrollTrigger.refresh(), 600);
