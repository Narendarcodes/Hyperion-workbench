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
  document.querySelectorAll('.proof, .ps__grid, .bench .wrap, .sov__grid, .features .wrap, .showcase .wrap, .modes__head, .cta .wrap, .lfooter__grid').forEach((scope) => {
    const targets = scope.querySelectorAll('[data-reveal], .proof__item, .fcard, .kicker, h2, .features__sub, .callout, .cli-card, .cta__foot, .bench__table, .bench__note, .ps__bar, .ps__model, .sov__sub, .sov__note, .monitor, .lfooter__brand, .lfooter__desc');
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


// ---------------- Sovereignty monitor (live instrument) ----------------
(() => {
  const monitor = document.querySelector('.monitor');
  if (!monitor) return;
  const reduceM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // session id + uptime clock
  const sessionEl = monitor.querySelector('[data-session]');
  const uptimeEl = monitor.querySelector('[data-uptime]');
  const stampEl = monitor.querySelector('[data-stamp]');
  if (sessionEl) sessionEl.textContent = '7291';
  const t0 = Date.now();
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    if (uptimeEl) {
      const s = Math.floor((Date.now() - t0) / 1000);
      uptimeEl.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    }
  };
  tick();
  setInterval(tick, 1000);

  // timestamped footer stamp
  const stamp = () => {
    if (!stampEl) return;
    const d = new Date();
    stampEl.textContent = `last check ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  stamp();
  setInterval(stamp, 1000);

  // gateway decision feed — allow/deny events the PS trace would emit
  const feed = monitor.querySelector('[data-feed]');
  if (feed && !reduceM) {
    const EVENTS = [
      ['fs.read', 'inspection-report-scan.pdf', 'allow'],
      ['ocr.parse', 'page 07 · handwritten table', 'allow'],
      ['kb.query', 'SOP-4.2 r7 · metadata filter', 'allow'],
      ['sandbox.exec', 'calc · 512MB · no-net', 'allow'],
      ['net.fetch', 'external endpoint', 'deny'],
      ['docx.write', 'approval-note.docx', 'allow'],
      ['tool.call', 'unregistered provider', 'deny'],
    ];
    let i = 0;
    const push = () => {
      const [tool, detail, verdict] = EVENTS[i % EVENTS.length];
      i++;
      const li = document.createElement('li');
      li.className = verdict === 'deny' ? 'm-deny' : 'm-allow';
      const t = new Date();
      const ts = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
      li.innerHTML = `<span class="m-ts">${ts}</span><span class="m-tool">${tool}</span><span class="m-detail">${detail}</span><b>${verdict.toUpperCase()}</b>`;
      feed.prepend(li);
      while (feed.children.length > 4) feed.lastChild.remove();
    };
    push();
    setInterval(push, 2600);
  } else if (feed) {
    // static three-row feed for reduced motion
    feed.innerHTML = [
      ['net.fetch', 'external endpoint', 'deny'],
      ['sandbox.exec', 'calc · 512MB · no-net', 'allow'],
      ['kb.query', 'SOP-4.2 r7', 'allow'],
    ].map(([tool, detail, verdict]) =>
      `<li class="${verdict === 'deny' ? 'm-deny' : 'm-allow'}"><span class="m-ts">--:--:--</span><span class="m-tool">${tool}</span><span class="m-detail">${detail}</span><b>${verdict.toUpperCase()}</b></li>`
    ).join('');
  }
})();

// recalc after fonts/layout settle
setTimeout(() => ScrollTrigger.refresh(), 600);
