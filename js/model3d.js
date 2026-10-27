/* ============================================================
   Salco Recomienda: modelos 3D flotantes de los productos
   Son representaciones estilizadas (frasco con gotario) hechas por
   código con three.js, con los colores y el nombre de cada producto.
   Para usar un modelo propio, ver README (sección "Modelos 3D").
   ============================================================ */
(function () {
  const SR = (window.SR = window.SR || {});
  const TAU = Math.PI * 2;

  /* ---------- Diseños de cada frasco ---------- */
  const DESIGNS = {
    nivea: {
      glass: 0xeaf2fc, glassOpacity: 0.55, liquid: 0xd6e6f8, liquidOpacity: 0.9,
      collar: 0xcfd8e3, bulb: 0xf4f7fb, labelBg: ['#ffffff', '#e4eefb'], labelText: '#16418a',
      lines: [['NIVEA', 'logo'], ['CELLULAR', 'sub'], ['EPIGENETICS', 'big'], ['Sérum rejuvenecedor', 'small'], ['30 ml', 'tiny']],
      band: '#1d4f9c', height: 1.22, radius: 0.5
    },
    cluny: {
      glass: 0xfff3e0, glassOpacity: 0.5, liquid: 0xf5c46b, liquidOpacity: 0.92,
      collar: 0xd9a441, bulb: 0xffffff, labelBg: ['#fffaf0', '#ffe9c4'], labelText: '#8a4b00',
      lines: [['Cluny', 'logo'], ['LUMINACLEAR', 'big'], ['Sérum anti manchas', 'small'], ['30 ml', 'tiny']],
      band: '#e89a1c', height: 1.3, radius: 0.46
    },
    centella: {
      glass: 0xcdebd7, glassOpacity: 0.6, liquid: 0xb8dc7c, liquidOpacity: 0.9,
      collar: 0xf2f2ee, bulb: 0xffffff, labelBg: ['#ffffff', '#eaf5ec'], labelText: '#2f6e47',
      lines: [['SKIN1004', 'logo'], ['MADAGASCAR', 'sub'], ['CENTELLA', 'big'], ['AMPOULE', 'sub'], ['55 ml', 'tiny']],
      band: '#3f8f5b', height: 1.28, radius: 0.47
    }
  };

  function labelTexture(d) {
    const W = 1024, H = 640, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, d.labelBg[0]); g.addColorStop(1, d.labelBg[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = d.band; x.fillRect(0, 0, W, 34); x.fillRect(0, H - 34, W, 34);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = d.labelText;
    const sizes = { logo: [96, '800'], big: [78, '800'], sub: [40, '700'], small: [44, '600'], tiny: [34, '600'] };
    const gaps = { logo: 130, big: 100, sub: 62, small: 70, tiny: 54 };
    const total = d.lines.reduce((s, l) => s + gaps[l[1]], 0);
    let y = (H - total) / 2 + 40;
    d.lines.forEach(([t, k]) => {
      const [s, w] = sizes[k];
      x.font = w + ' ' + s + 'px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
      if (k === 'sub') x.letterSpacing = '8px'; else x.letterSpacing = k === 'logo' ? '2px' : '0px';
      x.fillText(t, W / 2, y + gaps[k] / 2 - 20);
      y += gaps[k];
    });
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4; tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function arc(cx, cy, r, a0, a1, n) {
    const o = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; o.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
    return o;
  }

  function buildBottle(key) {
    const d = DESIGNS[key] || DESIGNS.centella, R = d.radius, H = d.height, g = new THREE.Group();
    const rc = 0.09, nr = 0.19;
    // vidrio: base redondeada, cuerpo, hombro y cuello
    const prof = [new THREE.Vector2(0, 0), ...arc(R - rc, rc, rc, -Math.PI / 2, 0, 8).slice(0)];
    prof.push(new THREE.Vector2(R, H - 0.22));
    prof.push(...arc(R - 0.2, H - 0.22, 0.2, 0, Math.PI / 2 * 0.85, 10).map((p) => new THREE.Vector2(p.x, p.y)));
    const shY = H - 0.22 + 0.2 * Math.sin(Math.PI / 2 * 0.85);
    prof.push(new THREE.Vector2(nr + 0.02, shY + 0.04), new THREE.Vector2(nr, shY + 0.1), new THREE.Vector2(nr, H + 0.18));
    const glassGeo = new THREE.LatheGeometry(prof, 72);
    const glass = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({ color: d.glass, transparent: true, opacity: d.glassOpacity, roughness: 0.08, metalness: 0.05, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }));
    glass.renderOrder = 3;
    // líquido
    const lp = [new THREE.Vector2(0, 0.05)]; lp.push(...arc(R - 0.07 - 0.07, 0.12, 0.07, -Math.PI / 2, 0, 6));
    lp.push(new THREE.Vector2(R - 0.075, H * 0.78), new THREE.Vector2(0, H * 0.78));
    const liquid = new THREE.Mesh(new THREE.LatheGeometry(lp, 64), new THREE.MeshStandardMaterial({ color: d.liquid, transparent: true, opacity: d.liquidOpacity, roughness: 0.2, envMapIntensity: 0.8 }));
    liquid.renderOrder = 1;
    // etiqueta
    const lh = H * 0.52, len = TAU * 0.985;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.006, R + 0.006, lh, 96, 1, true, -len / 2, len),
      new THREE.MeshStandardMaterial({ map: labelTexture(d), roughness: 0.55, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.5 }));
    label.position.y = H * 0.4; label.renderOrder = 2;
    // collar, pipeta y pera
    const collarY = H + 0.18;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(nr + 0.05, nr + 0.05, 0.2, 48), new THREE.MeshStandardMaterial({ color: d.collar, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.6 }));
    collar.position.y = collarY + 0.04;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(nr + 0.052, 0.014, 12, 48), new THREE.MeshStandardMaterial({ color: d.collar, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = collarY + 0.14;
    const bp = [[0, 0], [0.17, 0], [0.19, 0.04], [0.18, 0.14], [0.16, 0.3], [0.15, 0.46], [0.13, 0.6], [0.07, 0.69], [0, 0.71]].map((p) => new THREE.Vector2(p[0], p[1]));
    const bulb = new THREE.Mesh(new THREE.LatheGeometry(bp, 48), new THREE.MeshStandardMaterial({ color: d.bulb, roughness: 0.55, metalness: 0, envMapIntensity: 0.7 }));
    bulb.position.y = collarY + 0.14;
    const pipette = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, H * 0.92, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.05, envMapIntensity: 1.5, depthWrite: false }));
    pipette.position.y = collarY - H * 0.46 + 0.02; pipette.renderOrder = 2;
    g.add(liquid, pipette, glass, label, collar, ring, bulb);
    g.userData.height = collarY + 0.14 + 0.71;
    return g;
  }

  function makeEnv(rend) {
    const pg = new THREE.PMREMGenerator(rend), es = new THREE.Scene();
    es.background = new THREE.Color(0x2a4a68);
    const panel = (c, k, w, h, x, y, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
    };
    panel(0xffffff, 3.6, 7, 4, 0, 6, 2); panel(0xe9f5ff, 2.2, 3, 7, -6, 1, 2); panel(0xfff3dd, 2.2, 3, 7, 6, 1, -1);
    panel(0xffffff, 1.8, 9, 2.4, 0, -1, 7); panel(0xcfe9ff, 1, 7, 3, 0, -4, -5);
    const t = pg.fromScene(es, 0.03).texture; pg.dispose(); return t;
  }

  function shadowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,20,40,.55)'); g.addColorStop(1, 'rgba(0,20,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- Escena flotante ---------- */
  // mount(el, productId) devuelve { dispose() } o null si el celular no soporta WebGL
  SR.mountProduct3D = function (el, key) {
    if (!window.THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (e) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    el.innerHTML = ''; el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';

    const scene = new THREE.Scene();
    let env = null; try { env = makeEnv(renderer); scene.environment = env; } catch (e) {}
    scene.add(new THREE.HemisphereLight(0xffffff, 0x88aacc, 0.7));
    const key1 = new THREE.DirectionalLight(0xffffff, 1.1); key1.position.set(2, 4, 4); scene.add(key1);
    const rim = new THREE.DirectionalLight(0xbfe4ff, 0.8); rim.position.set(-3, 2, -3); scene.add(rim);

    const bottle = buildBottle(key), holder = new THREE.Group(), H = bottle.userData.height;
    bottle.position.y = -H / 2;
    holder.add(bottle); holder.rotation.z = -0.08; scene.add(holder);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H / 2 - 0.55; scene.add(shadow);

    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    function resize() {
      const w = Math.max(60, el.clientWidth), h = Math.max(60, el.clientHeight);
      renderer.setSize(w, h, false); cam.aspect = w / h;
      const need = (H + 0.55) / 2 / Math.tan((cam.fov * Math.PI) / 360);
      const needW = (1.0 / cam.aspect) / Math.tan((cam.fov * Math.PI) / 360);
      cam.position.set(0, 0.05, Math.max(need, needW) + 0.3); cam.lookAt(0, -0.05, 0); cam.updateProjectionMatrix();
    }
    resize();
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(el);

    // arrastrar para girar
    let dragging = false, lastX = 0, vel = 0, idle = 0, spin = 0, tilt = 0, tiltT = 0;
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; spin += dx * 0.012; vel = dx * 0.012; idle = 0; });
    const up = () => { dragging = false; cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, visible = true, last = performance.now(), t = 0, disposed = false;
    const io = window.IntersectionObserver ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; }) : null; if (io) io.observe(el);
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (!dragging) { idle += dt; spin += vel; vel *= 0.94; if (idle > 1.2 && !reduce) spin += dt * 0.7; }
      const bob = reduce ? 0 : Math.sin(t * 1.5) * 0.07;
      holder.position.y = bob; holder.rotation.y = spin - 0.5;
      holder.rotation.x = reduce ? 0 : Math.sin(t * 0.9) * 0.04;
      const s = 1 - bob * 0.5; shadow.scale.set(s, s, s); shadow.material.opacity = 0.75 - bob * 1.2;
      renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(frame);

    return {
      dispose() {
        disposed = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect();
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
        if (env) env.dispose();
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
        el.innerHTML = '';
      }
    };
  };
})();
