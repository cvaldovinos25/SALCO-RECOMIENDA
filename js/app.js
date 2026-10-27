/* ============================================================
   Salco Recomienda: flujo de la app
   bienvenida > preguntas > escaneo > resultados
   Nada se guarda ni se envía: todo ocurre en el celular.
   ============================================================ */
(function () {
  const SR = window.SR, C = SR.CONFIG;
  const $ = (s, r) => (r || document).querySelector(s);
  const qs = new URLSearchParams(location.search);
  const DEBUG = qs.has('debug');

  const state = { q: 0, answers: { skin: null, spf: null, routine: [] }, scan: null };

  /* ---------- Pantallas ---------- */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
    window.scrollTo(0, 0);
  }

  /* ---------- Carga de modelos (en segundo plano) ---------- */
  let modelsP = null;
  function loadModels() {
    if (modelsP) return modelsP;
    modelsP = (async () => {
      try { await faceapi.tf.setBackend('webgl'); } catch (e) { await faceapi.tf.setBackend('cpu'); }
      await faceapi.tf.ready();
      const u = 'models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(u),
        faceapi.nets.faceLandmark68Net.loadFromUri(u),
        faceapi.nets.ageGenderNet.loadFromUri(u)
      ]);
      $('#modelState').textContent = 'Listo para escanear.';
      return true;
    })().catch((e) => { console.error(e); $('#modelState').textContent = 'No se pudo preparar el análisis. Puedes continuar solo con tus respuestas.'; throw e; });
    return modelsP;
  }

  /* ---------- Bienvenida ---------- */
  $('#consent').addEventListener('change', (e) => { $('#go').disabled = !e.target.checked; });
  $('#go').addEventListener('click', () => { state.q = 0; renderQ(); show('s-q'); });
  loadModels().catch(() => {});

  /* ---------- Preguntas ---------- */
  const SKIN = [
    { id: 'seca',  t: 'Seca',  d: 'Se siente tirante, opaca o con descamación' },
    { id: 'mixta', t: 'Mixta', d: 'Brillo en frente y nariz; mejillas normales o secas' },
    { id: 'grasa', t: 'Grasa', d: 'Brillo en todo el rostro y poros visibles' },
    { id: 'nose',  t: 'No lo sé', d: 'No hay problema, usaremos el resto de tus datos' }
  ];
  const ICONS = {
    seca: ['🌵', '#ffe9c4', '#ffc978'], mixta: ['🌗', '#d9f0ff', '#e5f6b8'], grasa: ['💧', '#cdeeff', '#8fd6ff'], nose: ['🤷', '#eadcff', '#cdb8ff'],
    si: ['☀️', '#fff3b0', '#ffd54a'], no: ['🌙', '#dfe6ff', '#b9c6ff'],
    retinoides: ['🧪', '#e5f6b8', '#bfe35c'], acidos: ['🍋', '#fff3b0', '#ffe066'], vitc: ['🍊', '#ffe0b8', '#ffb347'],
    peroxido: ['🫧', '#d9f0ff', '#9fd8ff'], niacinamida: ['💎', '#d3f4f1', '#8fe3d8'], receta: ['🩺', '#ffd9d1', '#ffb4a6'], ninguno: ['🧴', '#eef2f6', '#d5dde6']
  };
  function optBtn(id, t, d, sel, multi) {
    const ic = ICONS[id] || ['✨', '#e3f4ff', '#f0fadb'];
    return '<button type="button" class="opt' + (multi ? ' multi' : '') + (sel ? ' sel' : '') + '" data-id="' + id + '"><span class="ic" style="--c1:' + ic[1] + ';--c2:' + ic[2] + '">' + ic[0] + '</span><span><b>' + t + '</b>' + (d ? '<span class="d">' + d + '</span>' : '') + '</span><span class="dot"></span></button>';
  }
  function isSel(id) {
    const a = state.answers;
    return state.q === 0 ? a.skin === id : state.q === 1 ? (id === 'si' ? a.spf === true : a.spf === false) : a.routine.includes(id);
  }
  function renderQ() {
    const a = state.answers;
    document.querySelectorAll('#prog i').forEach((el, i) => el.classList.toggle('on', i <= state.q));
    $('#progT').textContent = 'Paso ' + (state.q + 1) + ' de 3';
    let html = '';
    if (state.q === 0) {
      html = '<h2>¿Cómo es <span>tu piel</span>?</h2><p class="sub">Elige la que más se parezca a la tuya.</p><div class="opts">' +
        SKIN.map((o) => optBtn(o.id, o.t, o.d, a.skin === o.id)).join('') + '</div>';
    } else if (state.q === 1) {
      html = '<h2>¿Usas <span>protector solar</span>?</h2><p class="sub">En el rostro, de día.</p><div class="opts">' +
        optBtn('si', 'Sí, lo uso', 'Todos los días o casi todos', a.spf === true) +
        optBtn('no', 'No, o rara vez', '', a.spf === false) + '</div>';
    } else {
      html = '<h2>¿Qué <span>otros productos</span> usas?</h2><p class="sub">Puedes elegir varios. Lo usamos para evitar mezclas que irriten.</p><div class="opts">' +
        C.ROUTINE.map((o) => optBtn(o.id, o.label, o.hint, a.routine.includes(o.id), true)).join('') + '</div>';
    }
    $('#qbody').innerHTML = html;
    $('#qback').style.visibility = 'visible';
    $('#qnext').textContent = state.q === 2 ? 'Ir al escaneo 📷' : 'Siguiente';
    syncNext();
    $('#qbody').querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => pick(b.dataset.id)));
  }
  function pick(id) {
    const a = state.answers;
    if (state.q === 0) a.skin = id;
    else if (state.q === 1) a.spf = id === 'si';
    else {
      if (id === 'ninguno') a.routine = a.routine.includes('ninguno') ? [] : ['ninguno'];
      else {
        a.routine = a.routine.filter((r) => r !== 'ninguno');
        a.routine = a.routine.includes(id) ? a.routine.filter((r) => r !== id) : a.routine.concat(id);
      }
    }
    document.querySelectorAll('#qbody .opt').forEach((b) => b.classList.toggle('sel', isSel(b.dataset.id)));
    syncNext();
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
  }
  function syncNext() {
    const a = state.answers;
    const ok = state.q === 0 ? !!a.skin : state.q === 1 ? a.spf !== null : a.routine.length > 0;
    $('#qnext').disabled = !ok;
  }
  $('#qback').addEventListener('click', () => { if (state.q === 0) show('s-welcome'); else { state.q--; renderQ(); } });
  $('#qnext').addEventListener('click', () => { if (state.q < 2) { state.q++; renderQ(); window.scrollTo(0, 0); } else show('s-intro'); });

  /* ---------- Escaneo ---------- */
  const vid = $('#vid'), oval = $('#oval'), scanEl = $('#scan');
  let stream = null, scanning = false, geo = null;

  let busyTimer = null;
  const BUSY = ['Midiendo proporciones…', 'Revisando el tono de tu piel…', 'Buscando tu match…', 'Casi listo ✨'];
  function busyStart() {
    let i = 0; $('#busyMsg').textContent = BUSY[0]; clearInterval(busyTimer);
    busyTimer = setInterval(() => { i = Math.min(i + 1, BUSY.length - 1); $('#busyMsg').textContent = BUSY[i]; }, 1100);
  }
  function busyStop() { clearInterval(busyTimer); }
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['#007dc3', '#00a9e8', '#96c11f', '#c8e23c', '#ffd500', '#f29100', '#ff5b3a', '#35d6c4'];
    for (let i = 0; i < 46; i++) {
      const e = document.createElement('i');
      e.style.cssText = 'left:' + Math.random() * 100 + '%;background:' + cols[i % cols.length] + ';--x:' + (Math.random() * 160 - 80) + 'px;--r:' + (Math.random() * 900 - 450) + 'deg;--d:' + (2.2 + Math.random() * 1.6) + 's;--dl:' + Math.random() * 0.5 + 's;width:' + (6 + Math.random() * 8) + 'px;height:' + (9 + Math.random() * 12) + 'px;' + (i % 4 === 0 ? 'border-radius:50%;' : '');
      box.appendChild(e);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
  }
  function fail(t, p) { busyStop(); $('#errT').textContent = t; $('#errP').textContent = p; show('s-err'); }
  $('#errRetry').addEventListener('click', () => show('s-intro'));
  $('#errSkip').addEventListener('click', () => finish(null));
  $('#skipScan').addEventListener('click', () => finish(null));
  $('#startCam').addEventListener('click', startScan);
  $('#scCancel').addEventListener('click', () => { stopScan(); show('s-intro'); });

  function stopScan() {
    scanning = false;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    vid.srcObject = null;
    scanEl.classList.remove('on');
  }
  function layout() {
    const cw = scanEl.clientWidth, ch = scanEl.clientHeight;
    const ow = Math.min(cw * 0.72, ch * 0.44), oh = ow * 1.3;
    const cx = cw / 2, cy = ch * 0.45;
    Object.assign(oval.style, { width: ow + 'px', height: oh + 'px', left: cx - ow / 2 + 'px', top: cy - oh / 2 + 'px' });
    const svg = $('#ringSvg'), pad = 9;
    Object.assign(svg.style, { width: ow + 2 * pad + 'px', height: oh + 2 * pad + 'px', left: cx - ow / 2 - pad + 'px', top: cy - oh / 2 - pad + 'px' });
    const rx = ow / 2 + 2, ry = oh / 2 + 2, mx = (ow + 2 * pad) / 2, my = (oh + 2 * pad) / 2;
    $('#ringE').setAttribute('d', 'M' + mx + ',' + (my - ry) + ' A' + rx + ',' + ry + ' 0 1 1 ' + mx + ',' + (my + ry) + ' A' + rx + ',' + ry + ' 0 1 1 ' + mx + ',' + (my - ry));
    geo = { cw, ch, ow, oh, cx, cy };
  }
  addEventListener('resize', () => { if (scanEl.classList.contains('on')) layout(); });

  async function startScan() {
    try { await loadModels(); } catch (e) { return fail('No pudimos preparar el análisis', 'Revisa tu conexión y vuelve a intentarlo, o continúa solo con tus respuestas.'); }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return fail('Tu navegador no permite usar la cámara', 'Abre este enlace en Safari o Chrome (no dentro de otra app), o continúa solo con tus respuestas.');
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      return fail('No pudimos usar la cámara', 'Permite el acceso a la cámara en tu navegador y vuelve a intentar. Si prefieres, continúa solo con tus respuestas.');
    }
    vid.srcObject = stream;
    scanEl.classList.add('on');
    try { await vid.play(); } catch (e) {}
    await new Promise((r) => { if (vid.videoWidth) r(); else vid.onloadedmetadata = () => r(); });
    layout();
    runScan();
  }

  const CHECKS = [['face', 'Rostro'], ['size', 'Distancia'], ['center', 'Centrado'], ['light', 'Luz'], ['frontal', 'De frente']];
  const probe = document.createElement('canvas'); probe.width = 48; probe.height = 48;
  const pctx = probe.getContext('2d', { willReadFrequently: true });

  function evalFrame(det) {
    const st = { face: false, size: false, center: false, light: false, frontal: false };
    if (!det) return { st, msg: 'Busca tu rostro y míralo de frente' };
    st.face = true;
    const g = geo, vw = vid.videoWidth, vh = vid.videoHeight, sc = Math.max(g.cw / vw, g.ch / vh);
    const b = det.detection.box, P = det.landmarks.positions;
    const mapX = (x) => g.cw / 2 - (x - vw / 2) * sc, mapY = (y) => (y - vh / 2) * sc + g.ch / 2;
    const fx = mapX(b.x + b.width / 2), fy = mapY(b.y + b.height / 2), fh = b.height * sc;
    const r = fh / g.oh;
    st.size = r >= 0.58 && r <= 1.02;
    st.center = Math.abs(fx - g.cx) < 0.14 * g.ow && Math.abs(fy - (g.cy + 0.06 * g.oh)) < 0.17 * g.oh;
    // luz sobre la caja del rostro
    pctx.drawImage(vid, Math.max(0, b.x), Math.max(0, b.y), Math.min(vw, b.width), Math.min(vh, b.height), 0, 0, 48, 48);
    const d = pctx.getImageData(0, 0, 48, 48).data; let L = 0, R = 0;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const i = (y * 48 + x) * 4, l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; (x < 24 ? (L += l) : (R += l)); }
    const mean = (L + R) / (48 * 48), diff = Math.abs(L - R) / (L + R + 1e-6);
    const T = C.SCAN;
    st.light = mean >= T.MIN_LIGHT && mean <= T.MAX_LIGHT && diff <= T.MAX_SIDE_DIFF;
    const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    const yaw = Math.abs(dist(P[30], P[2]) - dist(P[30], P[14])) / (dist(P[30], P[2]) + dist(P[30], P[14]));
    const eyeY = (P[39].y + P[42].y) / 2, pitch = (P[30].y - eyeY) / (P[8].y - eyeY);
    const roll = Math.abs(Math.atan2(P[45].y - P[36].y, P[45].x - P[36].x) * 180 / Math.PI);
    const mouth = dist(P[62], P[66]) / dist(P[0], P[16]);
    st.frontal = yaw < 0.16 && pitch > 0.34 && pitch < 0.62 && roll < 11 && mouth < 0.06;
    let msg = '¡Perfecto! No te muevas';
    if (!st.size) msg = r < 0.58 ? 'Acércate un poco' : 'Aléjate un poco';
    else if (!st.center) msg = 'Centra tu rostro en el óvalo';
    else if (!st.light) msg = mean < T.MIN_LIGHT ? 'Necesitas más luz' : mean > T.MAX_LIGHT ? 'Hay demasiada luz' : 'Que la luz te llegue pareja';
    else if (!st.frontal) msg = mouth >= 0.06 ? 'Relaja el rostro, boca cerrada' : 'Mira de frente a la cámara';
    return { st, msg, mean };
  }

  async function runScan() {
    scanning = true;
    const T = C.SCAN, t0 = performance.now();
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: T.DETECT_SIZE, scoreThreshold: 0.5 });
    const ages = []; let hold = 0, lastPts = null;
    $('#scChips').innerHTML = CHECKS.map((c) => '<span data-k="' + c[0] + '">' + c[1] + '</span>').join('');
    $('#scNow').classList.add('hidden');
    $('#scNow').onclick = () => capture(true);
    const ringE = $('#ringE');
    async function capture(force) {
      scanning = false;
      $('#scMsg').textContent = 'Capturando…';
      await finishScan(ages, lastPts);
    }
    while (scanning) {
      let det = null;
      try { det = await faceapi.detectSingleFace(vid, opts).withFaceLandmarks().withAgeAndGender(); } catch (e) { console.warn(e); }
      if (!scanning) return;
      const r = evalFrame(det);
      const allOk = CHECKS.every((c) => r.st[c[0]]);
      document.querySelectorAll('#scChips span').forEach((s) => s.classList.toggle('ok', !!r.st[s.dataset.k]));
      $('#scMsg').textContent = r.msg; $('#scMsg').classList.toggle('ok', allOk);
      oval.classList.toggle('ok', allOk);
      if (allOk) { hold++; ages.push(det.age); lastPts = det.landmarks.positions; } else hold = 0;
      ringE.style.strokeDasharray = Math.min(100, (hold / T.HOLD_FRAMES) * 100) + ' 100';
      if (hold >= T.HOLD_FRAMES) return capture(false);
      if (performance.now() - t0 > T.MANUAL_AFTER_MS) $('#scNow').classList.remove('hidden');
      if (!det) hold = 0;
      await new Promise((res) => setTimeout(res, 40));
    }
  }

  async function finishScan(ages, lastPts) {
    const snap = document.createElement('canvas'); snap.width = vid.videoWidth; snap.height = vid.videoHeight;
    snap.getContext('2d').drawImage(vid, 0, 0);
    const fl = document.createElement('div'); fl.className = 'flash'; scanEl.appendChild(fl); setTimeout(() => fl.remove(), 600);
    stopScan(); show('s-busy'); busyStart();
    await new Promise((r) => setTimeout(r, 60));
    let scan = null;
    try {
      let det = await faceapi.detectSingleFace(snap, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks().withAgeAndGender();
      const pts = det ? det.landmarks.positions : lastPts;
      if (det && det.age) ages.push(det.age);
      if (!pts) throw new Error('sin rostro');
      const skin = SR.analyzeSkin(snap, pts, C.TH);
      const shape = SR.faceShape(pts);
      ages.sort((a, b) => a - b);
      const age = ages.length ? ages[ages.length >> 1] : null;
      scan = { age, ageMin: age ? Math.max(14, Math.round(age - 5)) : null, ageMax: age ? Math.round(age + 5) : null, shape, blemish: skin.blemish, tone: skin.tone, makeup: skin.makeup, okPixels: skin.okPixels, lightL: skin.lightL };
    } catch (e) {
      console.error(e);
      snap.width = 0;
      return fail('No pudimos analizar tu rostro', 'Prueba de nuevo con buena luz y el rostro despejado, o continúa solo con tus respuestas.');
    }
    snap.width = 0;
    if (!scan.okPixels) return fail('Vimos muy poca piel del rostro', 'Despeja el pelo y los lentes, y vuelve a intentar con buena luz.');
    finish(scan);
  }

  /* ---------- Resultados ---------- */
  const ICON = {
    ovalado:  '<svg class="ico" viewBox="0 0 44 44"><ellipse cx="22" cy="22" rx="12" ry="18" fill="none" stroke="#007dc3" stroke-width="3"/></svg>',
    redondo:  '<svg class="ico" viewBox="0 0 44 44"><ellipse cx="22" cy="22" rx="16" ry="17" fill="none" stroke="#007dc3" stroke-width="3"/></svg>',
    cuadrado: '<svg class="ico" viewBox="0 0 44 44"><rect x="7" y="5" width="30" height="34" rx="9" fill="none" stroke="#007dc3" stroke-width="3"/></svg>',
    alargado: '<svg class="ico" viewBox="0 0 44 44"><ellipse cx="22" cy="22" rx="10" ry="20" fill="none" stroke="#007dc3" stroke-width="3"/></svg>',
    corazon:  '<svg class="ico" viewBox="0 0 44 44"><path d="M6 14c0-6 5-9 10-9 4 0 6 1 6 1s2-1 6-1c5 0 10 3 10 9 0 9-9 17-16 25C15 31 6 23 6 14z" fill="none" stroke="#007dc3" stroke-width="3" stroke-linejoin="round"/></svg>'
  };
  const BOTTLE = '<svg class="bt" width="64" height="96" viewBox="0 0 64 96" fill="none"><rect x="24" y="2" width="16" height="14" rx="4" fill="#fff" opacity=".9"/><rect x="28" y="14" width="8" height="12" fill="#fff" opacity=".7"/><rect x="10" y="26" width="44" height="66" rx="14" fill="#fff" opacity=".92"/><rect x="18" y="46" width="28" height="22" rx="6" fill="currentColor" opacity=".25"/></svg>';
  const lvlBar = (n, warm) => '<span class="lvl' + (warm ? ' warm' : '') + '">' + [1, 2, 3].map((i) => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</span>';
  const LVN = { baja: 1, media: 2, alta: 3 };
  const SKINN = { seca: 'Seca', mixta: 'Mixta', grasa: 'Grasa', nose: 'No indicado' };
  const LVT = { ok: 'Sin conflicto', leve: 'Con cuidado', alternar: 'Alternar', consultar: 'Consultar' };

  let mIdx = 0;
  const MC = ['linear-gradient(90deg,#007dc3,#00a9e8)', 'linear-gradient(90deg,#96c11f,#c8e23c)', 'linear-gradient(90deg,#ffd500,#f29100)', 'linear-gradient(90deg,#00a9e8,#35d6c4)', 'linear-gradient(90deg,#ff5b3a,#f29100)'];
  function metric(k, v, s, extra, emoji) {
    const i = mIdx++;
    return '<div class="m" style="--mc:' + MC[i % MC.length] + ';animation-delay:' + (0.08 * i + 0.1) + 's"><span class="k">' + (emoji ? '<b>' + emoji + '</b>' : '') + k + '</span>' + (extra || '') + '<span class="v">' + v + '</span>' + (s ? '<span class="s">' + s + '</span>' : '') + '</div>';
  }

  function finish(scan) {
    state.scan = scan;
    const rec = SR.recommend(state.answers, scan);
    const a = state.answers, p = rec.primary;
    mIdx = 0;
    let h = '<div class="res-h"><h2>Tu <span>resumen</span> ✨</h2><span class="tag">' + C.TEXT.DISCLAIMER_SHORT + '</span></div>';
    h += '<div class="grid">';
    if (scan) {
      h += metric('Forma de cara', scan.shape.label, scan.shape.text, ICON[scan.shape.key], '🫶');
      h += metric('Edad estimada', scan.age ? scan.ageMin + ' a ' + scan.ageMax + ' años' : 'No disponible', 'Aproximada: el error puede ser de varios años.', '', '🎂');
      const mk = scan.makeup;
      h += metric('Maquillaje', mk.state === 'detectado' ? 'Detectado' : mk.state === 'no' ? 'No detectado' : 'No concluyente',
        mk.state === 'detectado' ? (mk.where.length ? 'Se notó en ' + mk.where.join(' y ') + '.' : 'Se notó color en el rostro.') : mk.state === 'dudoso' ? 'Podría ser maquillaje suave o luz.' : 'No vimos color intenso en labios ni ojos.', '', '💄');
      const bl = scan.blemish;
      h += metric('Granos o rojeces', bl.level === 'baja' ? 'Pocas o ninguna' : bl.level === 'media' ? 'Algunas' : 'Varias', 'Marcas rojizas visibles. No es un diagnóstico de acné.', lvlBar(LVN[bl.level], true), '🌸');
      const tn = scan.tone;
      h += metric('Uniformidad del tono', tn.level === 'baja' ? 'Pareja' : tn.level === 'media' ? 'Algo irregular' : 'Irregular', 'Posibles zonas más oscuras o manchas.', lvlBar(LVN[tn.level], true), '🎨');
    }
    h += metric('Tu piel (según tú)', SKINN[a.skin], 'Protector solar: ' + (a.spf ? 'sí' : 'no') + '.', '', '💧');
    h += '</div>';

    h += '<div class="sectitle">🏆 Producto recomendado</div>';
    h += '<div class="card prod" style="--pc:' + p.color + '"><div class="tile"><span class="badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="#96c11f"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.3l7.1-.7z"/></svg>Tu match</span>' +
      '<span class="spark" style="left:8%;top:30%;animation-delay:.2s">✦</span><span class="spark" style="left:44%;top:16%;animation-delay:1.2s;font-size:13px">✦</span><span class="spark" style="right:10%;top:12%;animation-delay:2s">✦</span><span class="spark" style="right:44%;bottom:22%;animation-delay:.8s;font-size:12px">✦</span>' +
      '<div class="stage" id="stage" aria-label="Modelo 3D de ' + p.name + '">' + (p.img ? '<img src="' + p.img + '" alt="">' : BOTTLE) + '</div>' +
      '<div class="txt"><span class="brand2">' + p.brand + '</span><h3>' + p.name + '</h3><span class="focus">' + p.focus + '</span></div></div>' +
      '<div class="body"><p class="bl">' + p.blurb + '</p><b class="rt">💡 Por qué te lo recomendamos</b><ul class="list" style="margin-top:10px">' +
      rec.reasons.map((r) => '<li>' + r + '</li>').join('') + '</ul><div class="how"><b>Cómo usarlo:</b> ' + p.how + '</div></div></div>';

    if (rec.notes.length) {
      h += '<div class="sectitle">🔗 Con lo que ya usas</div>';
      h += rec.notes.map((n) => '<div class="note"><b>' + n.label + ' <span class="lv ' + n.level + '">' + LVT[n.level] + '</span></b><span>' + n.text + '</span></div>').join('');
    }
    h += '<div class="sectitle">⚠️ Ten en cuenta</div><div class="warn"><ul class="list">' + rec.warnings.concat(rec.tips).map((w) => '<li>' + w + '</li>').join('') + '</ul></div>';
    h += '<p class="legal"><b>Importante:</b> ' + C.TEXT.DISCLAIMER_LONG + '</p>';
    h += '<div style="margin-top:20px"><button class="btn" id="again">Volver a empezar 🔄</button></div>';
    h += '<p class="foot">Farmacias Salcobrand · Tu imagen no se guardó ni se envió.</p>';
    if (DEBUG) h += '<pre class="dbg">' + JSON.stringify({ answers: a, scan, ranking: rec.ranking }, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v), 1) + '</pre>';
    $('#s-res').innerHTML = h;
    $('#again').addEventListener('click', () => { if (model) { model.dispose(); model = null; } state.answers = { skin: null, spf: null, routine: [] }; state.scan = null; state.q = 0; $('#consent').checked = false; $('#go').disabled = true; show('s-welcome'); });
    busyStop(); show('s-res'); confetti();
    if (model) { model.dispose(); model = null; }
    if (SR.mountProduct3D && C.MODEL_3D !== false) model = SR.mountProduct3D($('#stage'), p.id);
  }
  let model = null;

  window.__SR = { state, finish, show };   // para pruebas
})();
