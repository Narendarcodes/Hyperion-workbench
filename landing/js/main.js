import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';

// ----------------------------------------------------
// Setup
// ----------------------------------------------------
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  smoothWheel: true,
  syncTouch: true
});

// Canonical wiring (landing-pages skill): GSAP ticker drives Lenis,
// Lenis scroll events drive ScrollTrigger. No scrollerProxy on window.
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

// Accessibility preference checking
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ----------------------------------------------------
// Dock / Nav
// ----------------------------------------------------
const dock = document.getElementById('dock');
if (dock) {
  ScrollTrigger.create({
    trigger: 'body',
    start: 'top -50',
    onUpdate: (self) => {
      dock.classList.toggle('is-scrolled', self.direction === 1 || window.scrollY > 50);
    }
  });

  // Smooth scroll links
  dock.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) lenis.scrollTo(target, { offset: -64 });
    });
  });
}

// ----------------------------------------------------
// Scroll Animations (only if motion is allowed)
// ----------------------------------------------------
if (!reduceMotion) {
  // Operating Model: Pinned scroll and rail trace
  const modelGrid = document.querySelector('.model__grid');
  const stages = document.querySelectorAll('.stage');
  const railTrace = document.querySelector('.model__rail span');

  if (modelGrid && stages.length > 0) {
    stages.forEach((stage) => {
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 70%',
        end: 'bottom 30%',
        onEnter: () => stage.classList.add('is-active'),
        onLeave: () => stage.classList.add('is-active'),      // keep active once scrolled past
        onEnterBack: () => stage.classList.add('is-active'),
        onLeaveBack: () => stage.classList.remove('is-active'),
      });
    });
    ScrollTrigger.refresh();

    if (railTrace) {
      const first = stages[0];
      const last = stages[stages.length - 1];

      gsap.to(railTrace, {
        height: '100%',
        ease: 'none',
        scrollTrigger: {
          trigger: modelGrid,
          start: () => `top+=${first.getBoundingClientRect().top - modelGrid.getBoundingClientRect().top} center`,
          end: () => `top+=${last.getBoundingClientRect().top - modelGrid.getBoundingClientRect().top} center`,
          scrub: true,
        }
      });
    }
  }
} else {
  // Reveal all statically if reduced motion
  document.querySelectorAll('.stage').forEach(el => el.classList.add('is-active'));
}

// ----------------------------------------------------
// Three.js Background Hero Scene
// ----------------------------------------------------
class HeroScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.pointer = new THREE.Vector2(0.5, 0.5);
    this.targetPointer = new THREE.Vector2(0.5, 0.5);
    
    // Scene setup
    this.scene = new THREE.Scene();
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(0x000000, 0);

    // Geometry
    this.initGeometry();
    
    // Events
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    this.clock = new THREE.Clock();
    this.raf = null;
    this.isVisible = true;

    // Visibility observer to pause rendering when scrolled past
    this.observer = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting;
      if (this.isVisible && !this.raf) {
        this.render();
      }
    });
    this.observer.observe(this.canvas);
    
    // Start
    this.render();
  }
  
  initGeometry() {
    // A wireframe/geometric structure representing 'industrial intelligence'
    this.group = new THREE.Group();
    
    // Core logic block
    const coreGeo = new THREE.IcosahedronGeometry(2, 1);
    const coreMat = new THREE.MeshBasicMaterial({ 
      color: 0x0B1220, 
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.core);

    // Active nodes floating around
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 80;
    const pos = new Float32Array(particleCount * 3);
    
    for(let i=0; i<particleCount*3; i+=3) {
      const radius = 3 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      pos[i] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i+1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i+2] = radius * Math.cos(phi);
    }
    
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0xFDDA98, /* HYPERION cream */
      size: 0.04,
      transparent: true,
      opacity: 0.6
    });
    this.particles = new THREE.Points(particlesGeo, particlesMat);
    this.group.add(this.particles);
    
    // Position group to the right for desktop, center for mobile
    this.group.position.x = this.width > 900 ? 3 : 0;
    this.group.position.y = this.width > 900 ? 0 : 2;
    this.scene.add(this.group);
  }
  
  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    
    this.group.position.x = this.width > 900 ? 3 : 0;
    this.group.position.y = this.width > 900 ? 0 : 2;
  }
  
  onMouseMove(e) {
    this.targetPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
  
  render() {
    if (!this.isVisible) {
      this.raf = null;
      return;
    }
    
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();
    
    // Ease pointer
    this.pointer.lerp(this.targetPointer, 0.05);

    if (!reduceMotion) {
      // Rotate core
      this.core.rotation.y = time * 0.1;
      this.core.rotation.x = time * 0.05;
      
      // Rotate particles slightly
      this.particles.rotation.y = -time * 0.02;
      
      // React to pointer
      this.group.rotation.x = this.pointer.y * 0.1;
      this.group.rotation.y = this.pointer.x * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.render.bind(this));
  }
}

const canvas = document.getElementById('scene-canvas');
if (canvas) {
  new HeroScene(canvas);
}
