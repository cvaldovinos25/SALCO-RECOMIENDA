/* ============================================================
   Salco Recomienda: motor de recomendación
   Reglas simples y transparentes (se pueden leer y ajustar).
   Entrada:  answers {skin, spf, routine[]}  y  scan (opcional)
   Salida:   producto principal, motivos, avisos y notas de compatibilidad
   ============================================================ */
(function () {
  const SR = (window.SR = window.SR || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LV = { ok: 0, leve: 1, alternar: 2, consultar: 3 };
  const STRONG = ['retinoides', 'acidos', 'peroxido', 'vitc'];

  SR.recommend = function (answers, scan) {
    const C = SR.CONFIG, P = C.PRODUCTS;
    const routine = (answers.routine || []).filter((r) => r !== 'ninguno');
    const strongN = routine.filter((r) => STRONG.includes(r)).length;
    const s = { nivea: 1, cluny: 1, centella: 1.5 };
    const why = { nivea: [], cluny: [], centella: [] };
    const add = (id, pts, reason) => { s[id] += pts; if (reason && pts > 0.4) why[id].push({ pts, reason }); };

    // --- Respuestas del cuestionario ---
    if (answers.skin === 'seca') {
      add('nivea', 0.8, 'Indicaste piel seca: una rutina que cuide la hidratación y el confort de la piel te viene bien.');
      add('centella', 0.5, 'Indicaste piel seca: es una ampolla hidratante.');
    } else if (answers.skin === 'grasa') {
      add('centella', 0.4, 'Con piel grasa conviene una textura liviana que no cargue la piel.');
      s.nivea -= 0.3;
    } else if (answers.skin === 'mixta') {
      add('centella', 0.2);
    }
    if (answers.spf) add('cluny', 0.4, 'Ya usas protector solar, que es clave cuando se tratan manchas.');
    else s.cluny -= 1.0;

    // Activos potentes en la rutina: mejor sumar algo que calme que otro activo
    if (strongN > 0) {
      const names = routine.filter((r) => STRONG.includes(r)).map((r) => C.ROUTINE.find((o) => o.id === r).label.toLowerCase());
      add('centella', 0.5 * strongN, 'Ya usas ' + names.join(' y ') + ': lo más prudente es sumar algo que hidrate y calme, en lugar de otro activo.');
      s.cluny -= 0.8 * strongN; s.nivea -= 0.4 * strongN;
    }
    if (routine.includes('receta')) { s.centella += 2; s.cluny -= 2; s.nivea -= 2; }

    // --- Resultados del escaneo ---
    let usedScan = false;
    if (scan) {
      usedScan = true;
      if (scan.age) {
        const pts = clamp((scan.age - 28) / 8, 0, 3);
        add('nivea', pts, 'Según tu edad estimada (alrededor de ' + Math.round(scan.age) + ' años), el cuidado anti-edad es un buen foco.');
      }
      const tone = scan.tone && scan.tone.level;
      if (tone === 'media') add('cluny', 1.0, 'Vimos cierta variación de tono en tu rostro (posibles zonas más oscuras).');
      if (tone === 'alta') add('cluny', 2.2, 'Vimos bastante variación de tono en tu rostro (posibles manchas o zonas más oscuras).');
      const bl = scan.blemish && scan.blemish.level;
      if (bl === 'media') { add('centella', 1.2, 'Vimos algunas marcas rojizas o imperfecciones: una fórmula simple y calmante suele ser la opción más suave.'); add('cluny', 0.3); }
      if (bl === 'alta')  { add('centella', 2.4, 'Vimos varias marcas rojizas o imperfecciones: conviene una fórmula simple y calmante.'); s.cluny -= 0.3; s.nivea -= 0.3; }
      if (scan.makeup && scan.makeup.state === 'detectado') { /* informativo, no cambia el puntaje */ }
    }

    const ranking = P.map((p) => ({ id: p.id, score: Math.round(s[p.id] * 100) / 100 })).sort((a, b) => b.score - a.score);
    let top = ranking[0];
    if (ranking[1] && Math.abs(top.score - ranking[1].score) < 0.15 && ranking[1].id === 'centella') top = ranking[1]; // empate: la opción más suave
    const primary = P.find((p) => p.id === top.id);


    // --- Motivos (los 3 mejores) ---
    let reasons = why[primary.id].sort((a, b) => b.pts - a.pts).slice(0, 3).map((r) => r.reason);
    if (!reasons.length) reasons = [primary.id === 'centella'
      ? 'Con lo que nos contaste es la opción más suave y fácil de combinar del listado.'
      : 'Es la opción del listado que mejor calza con tus respuestas.'];

    // --- Compatibilidad con lo que ya usa ---
    const notes = routine.map((r) => {
      const c = primary.compat[r];
      return c ? { id: r, label: C.ROUTINE.find((o) => o.id === r).label, level: c.level, text: c.text } : null;
    }).filter(Boolean).sort((a, b) => LV[b.level] - LV[a.level]);

    // --- Avisos ---
    const warnings = [];
    if (routine.includes('receta')) warnings.push('Como sigues un tratamiento indicado por un médico, consulta con él antes de agregar cualquier producto nuevo.');
    if (strongN >= 2) warnings.push('Usas varios activos potentes a la vez. Si notas ardor, descamación o enrojecimiento, suspende y consulta a un profesional.');
    if (scan && scan.blemish && scan.blemish.level === 'alta') warnings.push('Vimos varias marcas en tu piel. Si tienes acné persistente, doloroso o con cicatrices, consulta a un dermatólogo: esta herramienta no lo evalúa.');
    if (!answers.spf) warnings.push('Usa protector solar todos los días, sobre todo si usas productos para manchas, retinoides o ácidos.');
    if (!primary.fichaCompleta) warnings.push('Revisa la lista de ingredientes del envase de ' + primary.brand + ' antes de usarlo, sobre todo si tienes alergias.');
    const tips = [
      'Haz una prueba de tolerancia: aplica una pequeña cantidad detrás de la oreja o en la mandíbula y espera 24 horas.',
      'Introduce un producto nuevo a la vez, con unos días de diferencia.'
    ];

    return { primary, reasons, notes, warnings, tips, ranking, usedScan, strongN };
  };
})();
