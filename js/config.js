/* ============================================================
   Salco Recomienda: configuración
   Aquí se edita todo lo "de negocio": productos, textos de
   compatibilidad y umbrales del análisis. No hace falta tocar
   el resto del código.
   ============================================================ */
window.SR = window.SR || {};

SR.CONFIG = {
  MODEL_3D: true,   // false = muestra una ilustración fija en vez del modelo 3D flotante

  /* ---------- Escaneo ---------- */
  SCAN: {
    HOLD_FRAMES: 12,          // cuadros buenos seguidos para capturar (~2 s)
    MANUAL_AFTER_MS: 20000,   // tras este tiempo aparece "Capturar ahora"
    DETECT_SIZE: 256,         // tamaño de entrada del detector (menor = más rápido)
    MIN_LIGHT: 70,            // luminosidad mínima aceptable (0 a 255)
    MAX_LIGHT: 215,           // luminosidad máxima aceptable
    MAX_SIDE_DIFF: 0.30       // diferencia máxima de luz entre mitad izquierda y derecha
  },

  /* ---------- Umbrales de las estimaciones ----------
     Son valores iniciales razonables, NO calibrados con un set de caras
     real. Se pueden afinar con ?debug=1 (muestra las métricas crudas). */
  TH: {
    blemish: { daMin: 5.0, dlMax: 2.5, areaMin: 3, areaMax: 140, lowCount: 2, highCount: 8, coverMid: 0.05 },
    tone:    { rmsMid: 2.4, rmsHigh: 3.8, pigMid: 0.05, pigHigh: 0.11 },
    makeup:  { lipDa0: 12, lipDaRange: 12, eyeDE0: 12, eyeDERange: 12, yes: 0.5, no: 0.2 }
  },

  /* ---------- Cuestionario: otros productos que usa la persona ---------- */
  ROUTINE: [
    { id: 'retinoides',   label: 'Retinol o retinoides',        hint: 'Retinol, retinal, adapaleno, tretinoína' },
    { id: 'acidos',       label: 'Ácidos exfoliantes',          hint: 'Glicólico, salicílico, láctico, mandélico' },
    { id: 'vitc',         label: 'Vitamina C',                  hint: 'Sérum o crema con vitamina C' },
    { id: 'peroxido',     label: 'Peróxido de benzoílo',        hint: 'Productos anti-acné de farmacia' },
    { id: 'niacinamida',  label: 'Niacinamida',                 hint: 'Sérum o crema con niacinamida' },
    { id: 'receta',       label: 'Tratamiento indicado por un médico', hint: 'Por ejemplo, de uso con receta' },
    { id: 'ninguno',      label: 'Ninguno de estos',            hint: 'Solo limpiador y crema hidratante' }
  ],

  /* ---------- Productos del listado ----------
     compat[x].level: ok | leve | alternar | consultar
     `fichaCompleta:false` = no tenemos la lista de ingredientes (INCI) oficial;
     el resultado avisa que se revise el envase. Completar con el envase real. */
  PRODUCTS: [
    {
      id: 'nivea',
      brand: 'NIVEA',
      name: 'Cellular Epigenetics Sérum Rejuvenecedor',
      focus: 'Cuidado anti-edad',
      color: '#1d4f9c',
      img: '',   // opcional: 'img/nivea.png'
      blurb: 'Sérum rejuvenecedor pensado para el cuidado anti-edad del rostro.',
      how: 'Aplícalo sobre el rostro limpio, antes de la crema hidratante. Sigue siempre las instrucciones del envase.',
      fichaCompleta: false,
      compat: {
        retinoides:  { level: 'leve',     text: 'Ambos son productos de cuidado anti-edad. Si usas retinoide de noche, prueba este sérum de día o alterna noches, e introduce uno a la vez.' },
        acidos:      { level: 'leve',     text: 'No lo apliques justo después de un exfoliante. Espera a que la piel no arda ni se vea roja y empieza de a uno.' },
        vitc:        { level: 'ok',       text: 'En general pueden combinarse (por ejemplo, vitamina C en la mañana y este sérum en la noche). Empieza de a uno.' },
        peroxido:    { level: 'leve',     text: 'El peróxido de benzoílo puede resecar. Usa cada producto en un momento distinto del día y observa cómo responde tu piel.' },
        niacinamida: { level: 'ok',       text: 'Sin conflicto conocido en la información disponible. Empieza de a uno para ver cómo responde tu piel.' },
        receta:      { level: 'consultar', text: 'Si estás en un tratamiento médico, consulta antes de sumar un producto nuevo.' }
      }
    },
    {
      id: 'cluny',
      brand: 'Cluny',
      name: 'Luminaclear Sérum Anti Manchas',
      focus: 'Manchas y luminosidad',
      color: '#c2791c',
      img: '',
      blurb: 'Sérum que reduce imperfecciones y aporta luminosidad al rostro.',
      how: 'Aplícalo sobre el rostro limpio. Los productos para manchas se usan junto con protector solar de día. Sigue las instrucciones del envase.',
      fichaCompleta: false,
      compat: {
        retinoides:  { level: 'alternar', text: 'Usa Luminaclear en la mañana y tu retinoide en la noche, o alterna noches. No los apliques juntos al empezar.' },
        acidos:      { level: 'alternar', text: 'Dos productos activos a la vez pueden irritar. Alterna días o usa uno en la mañana y otro en la noche.' },
        vitc:        { level: 'alternar', text: 'Ambos buscan unificar el tono: alterna días para evitar irritación.' },
        peroxido:    { level: 'alternar', text: 'El peróxido de benzoílo reseca. Usa uno en la mañana y otro en la noche, y suspende si hay ardor o descamación.' },
        niacinamida: { level: 'leve',     text: 'Suelen combinarse, pero empieza de a poco y observa si aparece enrojecimiento.' },
        receta:      { level: 'consultar', text: 'Si estás en un tratamiento médico, consulta antes de sumar un producto para manchas.' }
      }
    },
    {
      id: 'centella',
      brand: 'SKIN1004',
      name: 'Madagascar Centella Ampoule',
      focus: 'Calmar e hidratar',
      color: '#3f8f5b',
      img: '',
      blurb: 'Ampolla con extracto de centella asiática, de fórmula simple, para calmar e hidratar la piel.',
      how: 'Aplícala sobre el rostro limpio, antes de la crema. Sigue las instrucciones del envase.',
      fichaCompleta: true,
      compat: {
        retinoides:  { level: 'ok',       text: 'Su fórmula es simple y sin activos fuertes, por lo que suele usarse junto con un retinoide para hidratar y calmar. Aplícala antes de la crema.' },
        acidos:      { level: 'ok',       text: 'Puedes usarla en tu rutina con exfoliantes: aplícala después, sobre la piel limpia, para hidratar.' },
        vitc:        { level: 'ok',       text: 'Sin conflicto conocido con la vitamina C.' },
        peroxido:    { level: 'ok',       text: 'Sin conflicto conocido; suele ayudar a hidratar una piel que el peróxido reseca.' },
        niacinamida: { level: 'ok',       text: 'Sin conflicto conocido con la niacinamida.' },
        receta:      { level: 'consultar', text: 'Aunque su fórmula es suave, si estás en un tratamiento médico consulta antes de sumarla.' }
      }
    }
  ],

  /* ---------- Textos legales ---------- */
  TEXT: {
    DISCLAIMER_SHORT: 'Estimación automática con fines orientativos. No es un diagnóstico médico ni dermatológico.',
    DISCLAIMER_LONG:
      'Este análisis es una estimación automática, hecha por un programa en tu celular, y puede equivocarse ' +
      '(la iluminación, la cámara, el maquillaje, el cabello o los lentes influyen). No es un diagnóstico ' +
      'médico ni dermatológico y no reemplaza la evaluación de un profesional de la salud. Si tienes una ' +
      'condición de la piel, alergias, estás embarazada o en lactancia, o sigues un tratamiento, consulta ' +
      'antes a tu médico o dermatólogo.'
  }
};
