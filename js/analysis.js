/* ============================================================
   Salco Recomienda: análisis del rostro (todo en el celular)
   - faceShape(): forma de cara a partir de los 68 puntos
   - analyzeSkin(): marcas rojizas, variación de tono y maquillaje,
     a partir de los píxeles de la foto (nunca se guarda ni se envía)
   Son estimaciones heurísticas, no diagnósticos.
   ============================================================ */
(function () {
  const SR = (window.SR = window.SR || {});
  const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const avg = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- Forma de cara ---------------- */
  const SHAPES = {
    ovalado:  { label: 'Ovalada',   text: 'Proporciones equilibradas, algo más larga que ancha.' },
    redondo:  { label: 'Redonda',   text: 'Largo y ancho similares, con mandíbula suave.' },
    cuadrado: { label: 'Cuadrada',  text: 'Frente y mandíbula de ancho parecido, con ángulos marcados.' },
    alargado: { label: 'Alargada',  text: 'Notablemente más larga que ancha.' },
    corazon:  { label: 'Corazón',   text: 'Frente más ancha y mentón más angosto.' }
  };

  SR.faceShape = function (p) {
    const eL = avg(p.slice(36, 42)), eR = avg(p.slice(42, 48));
    const ang = Math.atan2(eR.y - eL.y, eR.x - eL.x);
    const c = mid(eL, eR), cos = Math.cos(-ang), sin = Math.sin(-ang);
    const q = p.map((pt) => ({ x: c.x + (pt.x - c.x) * cos - (pt.y - c.y) * sin, y: c.y + (pt.x - c.x) * sin + (pt.y - c.y) * cos }));
    const cheekW = D(q[1], q[15]);
    const jawW = D(q[3], q[13]);
    const foreW = D(q[17], q[26]);
    const chinW = D(q[6], q[10]);
    const browMid = mid(q[19], q[24]);
    const total = (q[8].y - browMid.y) * 1.45;   // se estima la frente (no se ve el nacimiento del pelo)
    const ratio = total / cheekW;
    const jawR = jawW / cheekW;
    const foreJ = foreW / jawW;
    const chinR = chinW / jawW;
    let key;
    if (ratio >= 1.58) key = 'alargado';
    else if (jawR < 0.80 && foreJ > 1.12) key = 'corazon';
    else if (ratio < 1.34) key = jawR >= 0.88 ? 'cuadrado' : 'redondo';
    else key = jawR >= 0.90 ? 'cuadrado' : 'ovalado';
    return Object.assign({ key, ratio, jawR, foreJ, chinR, rollDeg: (ang * 180) / Math.PI }, SHAPES[key]);
  };

  /* ---------------- Utilidades de color ---------------- */
  const LUT = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const v = i / 255; LUT[i] = v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; }
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  function lab(r, g, b, out, i) {
    const R = LUT[r], G = LUT[g], B = LUT[b];
    const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
    const z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
    const fx = f(x), fy = f(y), fz = f(z);
    out.L[i] = 116 * fy - 16; out.a[i] = 500 * (fx - fy); out.b[i] = 200 * (fy - fz);
  }

  // Media local ponderada por máscara (filtro de caja con imagen integral)
  function boxMean(val, mask, W, H, r) {
    const S = W + 1, I = new Float64Array(S * (H + 1)), M = new Float64Array(S * (H + 1));
    for (let y = 0; y < H; y++) {
      let rv = 0, rm = 0;
      for (let x = 0; x < W; x++) {
        const k = y * W + x, m = mask[k];
        rv += m ? val[k] : 0; rm += m;
        I[(y + 1) * S + x + 1] = I[y * S + x + 1] + rv;
        M[(y + 1) * S + x + 1] = M[y * S + x + 1] + rm;
      }
    }
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
        const m = M[y1 * S + x1] - M[y0 * S + x1] - M[y1 * S + x0] + M[y0 * S + x0];
        const v = I[y1 * S + x1] - I[y0 * S + x1] - I[y1 * S + x0] + I[y0 * S + x0];
        out[y * W + x] = m > 0 ? v / m : 0;
      }
    }
    return out;
  }
  function erode(mask, W, H, n) {
    let cur = mask;
    for (let it = 0; it < n; it++) {
      const nx = new Uint8Array(W * H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const k = y * W + x;
        nx[k] = cur[k] && cur[k - 1] && cur[k + 1] && cur[k - W] && cur[k + W] ? 1 : 0;
      }
      cur = nx;
    }
    return cur;
  }
  function median(arr) {
    if (!arr.length) return 0;
    const a = Float32Array.from(arr).sort();
    return a[a.length >> 1];
  }
  function components(flag, W, H) {
    const seen = new Uint8Array(W * H), sizes = [], q = new Int32Array(W * H);
    for (let s = 0; s < W * H; s++) {
      if (!flag[s] || seen[s]) continue;
      let head = 0, tail = 0; q[tail++] = s; seen[s] = 1;
      while (head < tail) {
        const k = q[head++], x = k % W, y = (k / W) | 0;
        if (x > 0 && flag[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; q[tail++] = k - 1; }
        if (x < W - 1 && flag[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; q[tail++] = k + 1; }
        if (y > 0 && flag[k - W] && !seen[k - W]) { seen[k - W] = 1; q[tail++] = k - W; }
        if (y < H - 1 && flag[k + W] && !seen[k + W]) { seen[k + W] = 1; q[tail++] = k + W; }
      }
      sizes.push(tail);
    }
    return sizes;
  }

  /* ---------------- Análisis de piel ---------------- */
  SR.analyzeSkin = function (src, pts, TH) {
    const p = pts;
    const faceW = D(p[0], p[16]);
    const scale = 256 / faceW;
    const xs = p.map((o) => o.x), ys = p.map((o) => o.y);
    const x0 = Math.max(0, Math.min(...xs) - 0.15 * faceW), x1 = Math.min(src.width, Math.max(...xs) + 0.15 * faceW);
    const y0 = Math.max(0, Math.min(...ys) - 0.5 * faceW), y1 = Math.min(src.height, Math.max(...ys) + 0.1 * faceW);
    const W = Math.max(8, Math.round((x1 - x0) * scale)), H = Math.max(8, Math.round((y1 - y0) * scale));
    const work = document.createElement('canvas'); work.width = W; work.height = H;
    const wctx = work.getContext('2d', { willReadFrequently: true });
    wctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, W, H);
    const px = wctx.getImageData(0, 0, W, H).data;
    const q = p.map((o) => ({ x: (o.x - x0) * scale, y: (o.y - y0) * scale }));
    const Dd = D(mid(q[19], q[24]), q[8]);   // distancia entre cejas y mentón
    const up = (pt, k) => ({ x: pt.x, y: pt.y - k * Dd });
    const dn = (pt, k) => ({ x: pt.x, y: pt.y + k * Dd });

    // Polígonos de las zonas
    const forehead = [...[17, 18, 19, 20, 21, 22, 23, 24, 25, 26].map((i) => up(q[i], 0.08)), ...[26, 25, 24, 23, 22, 21, 20, 19, 18, 17].map((i) => up(q[i], 0.32))];
    const cheekL = [dn(q[36], 0.09), dn(q[39], 0.11), q[31], q[48], q[5], q[3], q[1]];
    const cheekR = [dn(q[45], 0.09), dn(q[42], 0.11), q[35], q[54], q[11], q[13], q[15]];
    const jawW = D(q[3], q[13]);
    const chin = [{ x: q[57].x - 0.16 * jawW, y: q[57].y + 0.07 * Dd }, { x: q[57].x + 0.16 * jawW, y: q[57].y + 0.07 * Dd }, { x: q[8].x + 0.13 * jawW, y: q[8].y - 0.03 * Dd }, { x: q[8].x - 0.13 * jawW, y: q[8].y - 0.03 * Dd }];
    const lips = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59].map((i) => q[i]);
    const lidL = [q[36], q[37], q[38], q[39], dn(q[21], 0.03), dn(q[20], 0.03), dn(q[19], 0.03), dn(q[18], 0.03), dn(q[17], 0.03)];
    const lidR = [q[42], q[43], q[44], q[45], dn(q[26], 0.03), dn(q[25], 0.03), dn(q[24], 0.03), dn(q[23], 0.03), dn(q[22], 0.03)];

    const mk = document.createElement('canvas'); mk.width = W; mk.height = H;
    const mctx = mk.getContext('2d', { willReadFrequently: true });
    function polyMask(polys) {
      mctx.clearRect(0, 0, W, H); mctx.fillStyle = '#fff';
      polys.forEach((poly) => { mctx.beginPath(); poly.forEach((o, i) => (i ? mctx.lineTo(o.x, o.y) : mctx.moveTo(o.x, o.y))); mctx.closePath(); mctx.fill(); });
      const d = mctx.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
      return m;
    }
    const mSkin = polyMask([forehead, cheekL, cheekR, chin]);
    const mCheek = polyMask([cheekL, cheekR]);
    const mLips = polyMask([lips]);
    const mLids = polyMask([lidL, lidR]);

    // Lab de toda la imagen de trabajo
    const lb = { L: new Float32Array(W * H), a: new Float32Array(W * H), b: new Float32Array(W * H) };
    for (let i = 0; i < W * H; i++) lab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2], lb, i);

    // Excluye pelo y sombras muy oscuras
    const skinL = []; for (let i = 0; i < W * H; i++) if (mSkin[i]) skinL.push(lb.L[i]);
    const medL = median(skinL);
    const valid = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) valid[i] = mSkin[i] && lb.L[i] > medL - 28 ? 1 : 0;
    let nValid = 0; for (let i = 0; i < W * H; i++) nValid += valid[i];
    const ev = erode(valid, W, H, 2);   // zona donde se mide (sin bordes)

    // Suavizado leve (ruido de cámara)
    const Ls = boxMean(lb.L, valid, W, H, 1), as = boxMean(lb.a, valid, W, H, 1), bs = boxMean(lb.b, valid, W, H, 1);
    const L7 = boxMean(Ls, valid, W, H, 7), a7 = boxMean(as, valid, W, H, 7);
    const L16 = boxMean(Ls, valid, W, H, 16), b16 = boxMean(bs, valid, W, H, 16), a16 = boxMean(as, valid, W, H, 16);

    // 1) Marcas rojizas pequeñas
    const T = TH.blemish;
    const flag = new Uint8Array(W * H); let nEval = 0, nFlag = 0;
    for (let i = 0; i < W * H; i++) {
      if (!ev[i]) continue; nEval++;
      if (as[i] - a7[i] > T.daMin && Ls[i] - L7[i] < T.dlMax) { flag[i] = 1; nFlag++; }
    }
    const sizes = components(flag, W, H);
    const blobs = sizes.filter((s) => s >= T.areaMin && s <= T.areaMax).length;
    const cover = nEval ? nFlag / nEval : 0;
    let blemishLevel = blobs <= T.lowCount ? 'baja' : blobs >= T.highCount ? 'alta' : 'media';
    if (cover > T.coverMid && blemishLevel === 'baja') blemishLevel = 'media';

    // 2) Variación de tono (posibles manchas)
    let ss = 0, nPig = 0, nT = 0;
    for (let i = 0; i < W * H; i++) {
      if (!ev[i]) continue; nT++;
      const dl = Ls[i] - L16[i]; ss += dl * dl;
      if (dl < -4.5 && as[i] - a16[i] < 4 && bs[i] - b16[i] > 1.5) nPig++;
    }
    const rms = nT ? Math.sqrt(ss / nT) : 0, pigFrac = nT ? nPig / nT : 0;
    const TT = TH.tone;
    let toneLevel = rms > TT.rmsHigh || pigFrac > TT.pigHigh ? 'alta' : rms > TT.rmsMid || pigFrac > TT.pigMid ? 'media' : 'baja';

    // 3) Maquillaje (labios y párpados frente a la piel de las mejillas)
    const cheekLab = { L: [], a: [], b: [] };
    for (let i = 0; i < W * H; i++) if (mCheek[i] && valid[i]) { cheekLab.L.push(lb.L[i]); cheekLab.a.push(lb.a[i]); cheekLab.b.push(lb.b[i]); }
    const cL = median(cheekLab.L), cA = median(cheekLab.a), cB = median(cheekLab.b);
    const lipE = erode(mLips, W, H, 1), lipVals = { L: [], a: [], b: [] };
    for (let i = 0; i < W * H; i++) if (lipE[i] && lb.L[i] > 18) { lipVals.L.push(lb.L[i]); lipVals.a.push(lb.a[i]); lipVals.b.push(lb.b[i]); }
    const lidVals = { L: [], a: [], b: [] };
    for (let i = 0; i < W * H; i++) if (mLids[i] && lb.L[i] > medL - 35) { lidVals.L.push(lb.L[i]); lidVals.a.push(lb.a[i]); lidVals.b.push(lb.b[i]); }
    const MK = TH.makeup;
    const lipDa = lipVals.a.length > 30 ? median(lipVals.a) - cA : 0;
    const lidDE = lidVals.L.length > 30 ? Math.hypot(median(lidVals.L) - cL, median(lidVals.a) - cA, median(lidVals.b) - cB) : 0;
    const lipScore = clamp((lipDa - MK.lipDa0) / MK.lipDaRange, 0, 1);
    const eyeScore = clamp((lidDE - MK.eyeDE0) / MK.eyeDERange, 0, 1);
    const makeupScore = Math.max(lipScore, eyeScore) * 0.85 + Math.min(lipScore, eyeScore) * 0.15;
    const makeupState = makeupScore >= MK.yes ? 'detectado' : makeupScore <= MK.no ? 'no' : 'dudoso';
    const where = [];
    if (lipScore >= 0.5) where.push('labios');
    if (eyeScore >= 0.5) where.push('ojos');

    work.width = 0; mk.width = 0;   // libera la imagen de trabajo
    return {
      okPixels: nValid > 3000,
      lightL: medL,
      blemish: { level: blemishLevel, count: blobs, cover },
      tone: { level: toneLevel, rms, pigFrac },
      makeup: { state: makeupState, score: makeupScore, lipScore, eyeScore, lipDa, lidDE, where }
    };
  };
})();
