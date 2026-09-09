// HYPERION landing — Originkit-inspired: Hex Comb hero + Scroll Wave Field section.
// GSAP + Lenis smooth scroll, tab switcher, grain overlay, section reveals.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { mountHexComb } from './hex-comb.js';

gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------- Lenis smooth scroll ----------------
const lenis = new Lenis({ smoothWheel: true });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

// anchor links through lenis
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: -70 });
  });
});

// ---------------- Nav state ----------------
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 10,
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

// ---------------- GSAP reveals ----------------
if (!reduce) {
  gsap.fromTo('.hero__copy > *',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1, stagger: .09, ease: 'power3.out', delay: .1 });
  

  gsap.utils.toArray('.section-head, .tabs, .panel__visual, .api-card, .code-card, .wstage > div, .sov__grid > div, .monitor, .deploy__item').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: .75, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
}

// ---------------- Hex Comb hero (Originkit port) ----------------
const hexCanvas = document.getElementById('hex-comb');
if (hexCanvas) mountHexComb(hexCanvas);

// ---------------- Scroll Wave Field (Originkit port, WebGL1 points) ----------------
(() => {
  const canvas = document.getElementById('wave-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return;

  const VERT = `
precision highp float;
attribute vec2 aGrid;
attribute vec2 aSeed;
uniform vec2 uRes;
uniform float uFocal, uTime, uAmp, uScatter, uFreq, uFlow, uDepth, uCamY, uCamZ, uPitch, uRoll, uDot, uCursorAmt, uCurR, uCurS, uHover;
uniform vec2 uDir, uJit, uCursor;
varying vec3 vCol;
varying float vA;
varying float vHot;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
vec3 pickColor(float sel) {
  float idx = floor(sel * 4.0);
  if (idx < 1.0) return uC0;
  if (idx < 2.0) return uC1;
  if (idx < 3.0) return uC2;
  return uC3;
}
float surf(vec2 q) {
  return sin(q.x) * 0.55 + sin(q.x * 0.55 + q.y * 1.15) * 0.30 + sin(q.y * 0.75) * 0.22;
}
void main() {
  vec2 w = aGrid + (aSeed - 0.5) * uJit;
  w.y = uCamZ + mod(w.y - uFlow - uCamZ, uDepth);
  float h3 = fract(sin(dot(aSeed, vec2(91.37, 47.13))) * 12345.678);
  float h = surf(w * uFreq - uDir * uTime) * uAmp + (h3 - 0.5) * uScatter;
  float cd = length(w - uCursor);
  float g = exp(-(cd * cd) / (uCurR * uCurR)) * uCursorAmt;
  h += g * uCurS;
  float g2 = g * g; g2 = g2 * g2; g2 = g2 * g2;
  vec3 p = vec3(w.x, h - uCamY, w.y - uCamZ);
  float c = cos(uPitch), s = sin(uPitch);
  float ry = p.y * c + p.z * s;
  float rz = -p.y * s + p.z * c;
  if (rz < 40.0) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; vCol = uC0; vA = 0.0; vHot = 0.0; return; }
  float cr = cos(uRoll), sr = sin(uRoll);
  float rx = p.x * cr - ry * sr;
  float ryr = p.x * sr + ry * cr;
  float sx = rx * uFocal / rz;
  float sy = ryr * uFocal / rz;
  gl_Position = vec4(sx / (uRes.x * 0.5), sy / (uRes.y * 0.5), 0.0, 1.0);
  float rad = max(uDot * uFocal / rz, 0.55);
  gl_PointSize = clamp(rad * 2.0 * (1.0 + g2 * uHover * 0.20), 1.0, 220.0);
  float bri = 0.28 + h3 * 0.72;
  vec2 bq = w * vec2(0.0040, 0.0032) - uDir * uTime * 0.30;
  float band = sin(bq.x) + sin(bq.y);
  float sel = fract((band + 2.0) * 0.25 + (aSeed.y - 0.5) * 0.55);
  vCol = pickColor(sel);
  float lum = dot(vCol, vec3(0.299, 0.587, 0.114));
  vHot = (0.25 + 0.75 * lum) * bri * bri * 0.7 + g2 * uHover * 0.55;
  float fog = (1.0 - smoothstep(2800.0, 6400.0, rz)) * smoothstep(70.0, 240.0, rz);
  vA = bri * fog * (1.0 + g2 * uHover * 0.55);
}`;

  const FRAG = `
precision highp float;
varying vec3 vCol;
varying float vA;
varying float vHot;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = (1.0 - smoothstep(0.90, 1.0, d)) * vA;
  vec3 col = vCol + vec3(1.0) * pow(1.0 - d, 10.0) * vHot * 0.9;
  gl_FragColor = vec4(col * a, a);
}`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('wave shader:', gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // palette: navy-tinted creams on deep
  const hex = (h) => [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
  const cols = [hex('#B9BEB4'), hex('#8E948B'), hex('#C2410C'), hex('#6E7078')];

  // lattice grid
  const DENSITY = 260, DEPTH = 5200, WIDTH = 5200;
  const pts = [];
  for (let z = 0; z < DEPTH; z += DENSITY) {
    for (let x = -WIDTH / 2; x < WIDTH / 2; x += DENSITY) {
      pts.push(x, z, Math.random(), Math.random());
    }
  }
  const n = pts.length / 4;
  const grid = new Float32Array(pts);

  const gridBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf);
  gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
  const aGrid = gl.getAttribLocation(prog, 'aGrid');
  const aSeed = gl.getAttribLocation(prog, 'aSeed');
  gl.enableVertexAttribArray(aGrid);
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 16, 8);

  const U = {};
  ['uRes','uFocal','uTime','uAmp','uScatter','uFreq','uFlow','uDepth','uCamY','uCamZ','uPitch','uRoll','uDot','uCursorAmt','uCurR','uCurS','uHover','uDir','uJit','uCursor','uC0','uC1','uC2','uC3']
    .forEach(nm => U[nm] = gl.getUniformLocation(prog, nm));

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  const state = {
    flow: 0, scrollAmt: 0, targetScroll: 0,
    cursor: { x: 0, z: 0, amt: 0, target: 0 },
    w: 1, h: 1, visible: true,
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const area = r.width * r.height;
    const dpr = Math.min(devicePixelRatio || 1, area > 500000 ? 1 : 1.5);
    const scale = area > 500000 ? 0.7 : 1;
    state.w = Math.max(1, Math.floor(r.width * dpr * scale));
    state.h = Math.max(1, Math.floor(r.height * dpr * scale));
    canvas.width = state.w; canvas.height = state.h;
    gl.viewport(0, 0, state.w, state.h);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // scroll drives flow
  ScrollTrigger.create({
    trigger: canvas,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => { state.targetScroll = self.progress; },
  });

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.cursor.x = ((e.clientX - r.left) / r.width - 0.5) * WIDTH * 0.9;
    state.cursor.z = 400 + (e.clientY - r.top) / r.height * 2000;
    state.cursor.target = 1;
  });
  canvas.addEventListener('pointerleave', () => { state.cursor.target = 0; });

  new IntersectionObserver(([en]) => { state.visible = en.isIntersecting; }, { threshold: .02 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { state.visible = !document.hidden; });

  let t0 = performance.now();
  let lastFrame = 0;
  (function frame(now = performance.now()) {
    if (state.visible && now - lastFrame >= 33) {
      lastFrame = now;
      const t = (now - t0) / 1000;
      // ease scroll into flow
      state.scrollAmt += (state.targetScroll - state.scrollAmt) * 0.07;
      state.flow = t * 260 + state.scrollAmt * 1300;   // base drift + scroll-driven
      state.cursor.amt += (state.cursor.target - state.cursor.amt) * 0.08;

      const focal = state.h * 1.05;
      gl.uniform2f(U.uRes, state.w, state.h);
      gl.uniform1f(U.uFocal, focal);
      gl.uniform1f(U.uTime, reduce ? 0 : t);
      gl.uniform1f(U.uAmp, 200);
      gl.uniform1f(U.uScatter, 108);
      gl.uniform1f(U.uFreq, 6.283 / 2070 * 100);  // scaled to our lattice
      gl.uniform2f(U.uDir, 0, 1);
      gl.uniform1f(U.uFlow, state.flow);
      gl.uniform1f(U.uDepth, DEPTH);
      gl.uniform1f(U.uCamY, 50);
      gl.uniform1f(U.uCamZ, 100);
      gl.uniform1f(U.uPitch, 12 * Math.PI / 180 + state.scrollAmt * 0.10);
      gl.uniform1f(U.uRoll, state.scrollAmt * 0.10 - 0.05);
      gl.uniform1f(U.uDot, 2);
      gl.uniform2f(U.uCursor, state.cursor.x, state.cursor.z);
      gl.uniform1f(U.uCursorAmt, state.cursor.amt);
      gl.uniform1f(U.uCurR, 220);
      gl.uniform1f(U.uCurS, 45);
      gl.uniform1f(U.uHover, 300);
      gl.uniform2f(U.uJit, 40, 90);
      gl.uniform3fv(U.uC0, cols[0]);
      gl.uniform3fv(U.uC1, cols[1]);
      gl.uniform3fv(U.uC2, cols[2]);
      gl.uniform3fv(U.uC3, cols[3]);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, n);
    }
    requestAnimationFrame(frame);
  })();
})();

