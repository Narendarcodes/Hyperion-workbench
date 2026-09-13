// Faithful port of OriginKit gallery-tunnel (variant-3), as used in yv. landing.
// Engine constants 1:1; palette mapped to the HYPERION paper world.
// Drives: pointerdown boost, infinite recycle, fog, gradient slabs.
export function mountGalleryTunnel(host) {
  const THREE_ = import('three');
  let killed = false, teardown = null;
  let visible = true;

  const CFG = {
    background: '#FFFFFF',
    lineColor: '#E4E4E4',
    lineOpacity: 100,
    grid: 6, speed: 100, boost: 33, fade: 100, tunnelSize: 1,
  };
  // HYPERION paper palette (yv. teal slots -> clay/ink/orange slots)
  const COLORS = [
    '#C2410C', // burnt orange accent
    '#9A3412', // clay press
    '#F3E3D8', // soft tint
    '#EFECE5', // warm paper
    '#F7F6F3', // canvas
    '#6E7078', // umber
  ];

  const TUNNEL_WIDTH = 2 * CFG.tunnelSize;
  const TUNNEL_HEIGHT = 1.8 * CFG.tunnelSize;
  const SEGMENT_DEPTH = 1;
  const NUM_SEGMENTS = 15;
  const LINE_RADIUS = 0.003;
  const SCROLL_TO_Z = 0.05;
  const CAMERA_CHASE = 0.1;
  const FOG_FAR = NUM_SEGMENTS * SEGMENT_DEPTH * 0.95;

  (async () => {
    const THREE = await THREE_;
    if (killed) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CFG.background);
    const fogNear = Math.min(FOG_FAR * (1 - CFG.fade / 100), FOG_FAR - 0.01);
    scene.fog = new THREE.Fog(new THREE.Color(CFG.background), fogNear, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
    host.appendChild(renderer.domElement);

    const lineMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(CFG.lineColor),
      transparent: true, opacity: CFG.lineOpacity / 100,
    });

    function makeGradientMat(index) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const stops = [
        ['#F3E3D8', '#C2410C'],
        ['#EAD9CB', '#9A3412'],
        ['#F7F6F3', '#EFECE5'],
        ['#EFECE5', '#6E7078'],
      ];
      const [a, b] = stops[index % stops.length];
      const g = ctx.createLinearGradient(0, 0, 128, 128);
      g.addColorStop(0, a); g.addColorStop(1, b);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    }

    const colorMats = COLORS.map((hex) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), side: THREE.DoubleSide }));
    const imageMats = COLORS.map((_, i) => makeGradientMat(i));

    let imageIndex = 0, colorIndex = 0, populateIndex = 0, scrollPos = 0, raf = 0, pressed = false, alive = true;
    const hw = TUNNEL_WIDTH / 2, hh = TUNNEL_HEIGHT / 2;

    const cols = Math.max(1, Math.round(CFG.grid));
    const rows = Math.max(1, Math.round(CFG.grid));
    const colW = TUNNEL_WIDTH / cols, rowH = TUNNEL_HEIGHT / rows;

    const geoFloor = new THREE.PlaneGeometry(colW, SEGMENT_DEPTH);
    const geoWall = new THREE.PlaneGeometry(SEGMENT_DEPTH, rowH);
    const geoTubeZ = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -SEGMENT_DEPTH)), 1, LINE_RADIUS, 8);
    const geoTubeX = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(TUNNEL_WIDTH, 0, 0)), 1, LINE_RADIUS, 8);
    const geoTubeY = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, TUNNEL_HEIGHT, 0)), 1, LINE_RADIUS, 8);

    const tube = (geo, x, y, z = 0) => {
      const m = new THREE.Mesh(geo, lineMaterial);
      m.position.set(x, y, z);
      return m;
    };

    const SLOTS = [];
    {
      const z = -SEGMENT_DEPTH / 2;
      for (let i = 0; i < cols; i++) {
        const x = -hw + i * colW + colW / 2;
        SLOTS.push({ geo: geoFloor, pos: new THREE.Vector3(x, -hh, z), rot: new THREE.Euler(-Math.PI / 2, 0, 0) });
        SLOTS.push({ geo: geoFloor, pos: new THREE.Vector3(x, hh, z), rot: new THREE.Euler(Math.PI / 2, 0, 0) });
      }
      for (let i = 0; i < rows; i++) {
        const y = -hh + i * rowH + rowH / 2;
        SLOTS.push({ geo: geoWall, pos: new THREE.Vector3(-hw, y, z), rot: new THREE.Euler(0, Math.PI / 2, 0) });
        SLOTS.push({ geo: geoWall, pos: new THREE.Vector3(hw, y, z), rot: new THREE.Euler(0, -Math.PI / 2, 0) });
      }
    }

    function populate(group) {
      const takesSlabs = populateIndex % 2 === 0;
      populateIndex++;
      for (const slab of group.userData.slabs) {
        if (!takesSlabs || Math.random() > 0.5) { slab.visible = false; continue; }
        slab.visible = true;
        if (Math.random() > 0.5) {
          slab.material = colorMats[(5 * colorIndex) % colorMats.length];
          colorIndex++;
        } else {
          slab.material = imageMats[(3 * imageIndex) % imageMats.length];
          imageIndex++;
        }
      }
    }

    function createSegment(z) {
      const group = new THREE.Group();
      group.position.z = z;
      for (let i = 0; i <= cols; i++) {
        const x = -hw + i * colW;
        group.add(tube(geoTubeZ, x, -hh));
        group.add(tube(geoTubeZ, x, hh));
      }
      for (let i = 1; i < rows; i++) {
        const y = -hh + i * rowH;
        group.add(tube(geoTubeZ, -hw, y));
        group.add(tube(geoTubeZ, hw, y));
      }
      group.add(tube(geoTubeX, -hw, -hh));
      group.add(tube(geoTubeX, -hw, hh));
      group.add(tube(geoTubeY, -hw, -hh));
      group.add(tube(geoTubeY, hw, -hh));

      const slabs = SLOTS.map((slot) => {
        const m = new THREE.Mesh(slot.geo, colorMats[0]);
        m.position.copy(slot.pos);
        m.rotation.copy(slot.rot);
        m.visible = false;
        group.add(m);
        return m;
      });
      group.userData.slabs = slabs;
      populate(group);
      return group;
    }

    const segments = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const g = createSegment(-i * SEGMENT_DEPTH);
      scene.add(g);
      segments.push(g);
    }

    const resize = () => {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: .02 });
    io.observe(host);
    const onVis = () => { if (document.hidden) visible = false; else visible = true; };
    document.addEventListener('visibilitychange', onVis);

    host.addEventListener('pointerdown', () => { pressed = true; });
    window.addEventListener('pointerup', () => { pressed = false; });

    const cfgSpeed = CFG.speed / 100;
    const cfgBoost = CFG.boost / 10;

    const animate = () => {
      if (!alive) return;
      raf = requestAnimationFrame(animate);
      if (!visible) return;
      scrollPos += pressed && !reduced ? cfgBoost : cfgSpeed;
      const want = -SCROLL_TO_Z * scrollPos;
      camera.position.z += CAMERA_CHASE * (want - camera.position.z);
      const span = NUM_SEGMENTS * SEGMENT_DEPTH;
      const z = camera.position.z;
      for (const seg of segments) {
        if (seg.position.z > z + SEGMENT_DEPTH) {
          let min = 0;
          for (const s of segments) min = Math.min(min, s.position.z);
          seg.position.z = min - SEGMENT_DEPTH;
          populate(seg);
        } else if (seg.position.z < z - span - SEGMENT_DEPTH) {
          let max = -999999;
          for (const s of segments) max = Math.max(max, s.position.z);
          seg.position.z = max + SEGMENT_DEPTH;
          populate(seg);
        }
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    teardown = () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
      renderer.domElement.remove();
    };
  })();

  return () => { killed = true; teardown?.(); };
}
