// HYPERION landing — Sarvam-style structure with real motion + WebGL.
// GSAP + Lenis smooth scroll, hero shader field, grain overlay.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------- Lenis smooth scroll (Sarvam feel) ----------------
const lenis = new Lenis({ smoothWheel: true, syncTouch: true });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

// ---------------- Nav state ----------------
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 10,
  onUpdate: () => nav?.classList.toggle('is-scrolled', window.scrollY > 10),
  onToggle: () => nav?.classList.toggle('is-scrolled', window.scrollY > 10),
});

// ---------------- Tab switcher ----------------
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    panels.forEach((p) => {
      const on = p.id === tab.dataset.panel;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
  });
});

// ---------------- GSAP section reveals (Sarvam's gentle rise) ----------------
if (!reduce) {
  gsap.utils.toArray('section .wrap > *').forEach((el, i) => {
    gsap.fromTo(el,
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
  });
  // hero entrance
  gsap.fromTo('.hero > *',
    { opacity: 0, y: 32 },
    { opacity: 1, y: 0, duration: 1, stagger: 0.09, ease: 'power3.out', delay: 0.15 });
} else {
  document.querySelectorAll('.hero > *').forEach(el => { el.style.opacity = 1; });
}

// ---------------- Hero WebGL shader field ----------------
const canvas = document.getElementById('hero-canvas');
if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 10;

  // Fullscreen quad with flowing-point field shader (original)
  const frag = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uAmt;

// hash + noise
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x/uRes.y, 1.0);

  // flowing field lines (Sarvam-esque soft motion, orange ink on white)
  float t = uTime * 0.06;
  float f1 = fbm(p*2.2 + vec2(t*1.4, -t*0.8));
  float f2 = fbm(p*3.1 - vec2(t*0.6, t*1.1) + f1*1.6);
  float flow = smoothstep(0.42, 0.58, f1*0.65 + f2*0.35);

  // pointer influence: field brightens near cursor
  vec2 m = uPointer * vec2(uRes.x/uRes.y, 1.0);
  float md = length(p - m);
  float glow = exp(-md*md*3.2) * uAmt;

  vec3 white = vec3(1.0);
  vec3 ink = vec3(0.12, 0.13, 0.15);
  vec3 orange = vec3(0.976, 0.451, 0.086); // #F97316

  // ink flow lines
  vec3 col = white;
  col = mix(col, mix(ink, orange, 0.22 + glow*0.5), flow * (0.10 + glow*0.22));

  // sparse orange accents at field ridges
  float ridge = smoothstep(0.82, 0.98, f2) * (0.6 + glow);
  col = mix(col, orange, ridge * 0.42);

  // soft vignette-free edges: fade at bottom so hero blends into page
  float fade = smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.68, uv.y);
  float alpha = (flow * 0.55 + ridge * 0.6) * fade * 0.95;
  gl_FragColor = vec4(col, alpha);
}`;

  const vert = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const program = new THREE.RawShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthTest: false, depthWrite: false, uniforms: {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(10, 10) },
    uAmt: { value: 0 },
  }});

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), program);
  quad.frustumCulled = false;
  scene.add(quad);

  const resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    program.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  // pointer easing
  const target = { x: 10, y: 10, amt: 0 };
  addEventListener('pointermove', (e) => {
    target.x = (e.clientX / innerWidth) * (innerWidth / innerHeight);
    target.y = 1 - (e.clientY / innerHeight);
    target.amt = 1;
  });
  addEventListener('pointerleave', () => { target.amt = 0; });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  const clock = new THREE.Clock();
  (function loop() {
    if (visible) {
      const u = program.uniforms;
      u.uTime.value = reduce ? 0 : clock.getElapsedTime();
      u.uPointer.value.x += (target.x - u.uPointer.value.x) * 0.06;
      u.uPointer.value.y += (target.y - u.uPointer.value.y) * 0.06;
      u.uAmt.value += (target.amt - u.uAmt.value) * 0.08;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  })();
}

// ---------------- Grain canvas overlay (Sarvam's texture) ----------------
(() => {
  const g = document.getElementById('grain');
  if (!g || reduce) return;
  const ctx = g.getContext('2d');
  const resize = () => { g.width = innerWidth; g.height = innerHeight; };
  addEventListener('resize', resize);
  resize();
  let last = 0;
  (function draw(ts) {
    if (ts - last > 90) {  // ~11fps grain, subtle
      const data = ctx.createImageData(g.width, g.height);
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = d[i+1] = d[i+2] = v;
        d[i+3] = 8;  // very subtle
      }
      ctx.putImageData(data, 0, 0);
      last = ts;
    }
    requestAnimationFrame(draw);
  })(0);
})();
