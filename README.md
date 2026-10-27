# Salco Recomienda

Experiencia web para el QR de la góndola de **skincare** de Farmacias Salcobrand. La persona responde 3 preguntas, escanea su rostro con la cámara frontal del celular y recibe un **resumen** y **1 producto recomendado** del listado:

- **NIVEA** Cellular Epigenetics Sérum Rejuvenecedor
- **Cluny** Luminaclear Sérum Anti Manchas
- **SKIN1004** Madagascar Centella Ampoule

> **No es un diagnóstico.** Es una estimación automática con fines orientativos. Esto se avisa en la bienvenida, en el resumen y al final de la pantalla de resultados.

Sitio publicado (GitHub Pages): `https://cvaldovinos25.github.io/SALCO-RECOMIENDA/`

## Estructura

```
SALCO-RECOMIENDA/
├── index.html            Interfaz (estilo Salcobrand, mobile first) y pantallas
├── js/
│   ├── config.js         Productos, compatibilidades, umbrales y textos legales (lo que se edita)
│   ├── recommend.js      Motor de recomendación (reglas simples y legibles)
│   ├── model3d.js        Modelos 3D flotantes de cada producto
│   ├── analysis.js       Forma de cara, marcas rojizas, tono y maquillaje
│   └── app.js            Flujo: bienvenida, preguntas, cámara, resultados
├── lib/face-api.js       Detección de rostro (@vladmandic/face-api, licencia MIT)
├── lib/three.min.js      Motor 3D (three.js r128, licencia MIT) para el producto flotante
├── models/               Modelos del detector, 68 puntos faciales y edad (se sirven desde el mismo sitio)
├── img/sb-logo.png       Logo de Farmacias Salcobrand
├── qr/                   QR listo para imprimir
└── .nojekyll
```

No hay servidor, base de datos ni Google Sheets. Todo corre en el celular.

## Flujo de la persona

1. **Bienvenida**: explica el proceso, avisa que no es un diagnóstico y pide confirmar que es mayor de 18 años y acepta el uso de la cámara.
2. **Preguntas** (3 pasos):
   - Tipo de piel: seca, mixta, grasa o no lo sé.
   - Uso de protector solar: sí o no.
   - Otros productos que usa: retinol o retinoides, ácidos exfoliantes, vitamina C, peróxido de benzoílo, niacinamida, tratamiento indicado por un médico, o ninguno.
3. **Escaneo**: cámara frontal con un óvalo guía. La app revisa en vivo que haya rostro, distancia, centrado, luz pareja, mirada de frente y rostro relajado, y captura sola cuando todo está bien por unos 2 segundos. Si no lo logra, a los 20 s aparece "Capturar ahora".
4. **Resultados**: forma de cara, edad estimada (rango), maquillaje (detectado, no detectado o no concluyente), granos o rojeces, uniformidad del tono, producto recomendado con los motivos, notas de compatibilidad con lo que ya usa y avisos.

Si la persona rechaza la cámara o su navegador no la permite, puede **continuar solo con sus respuestas** y recibe igual una recomendación.

## Estética

Interfaz mobile first inspirada en salcobrand.cl, con la paleta del logo (azul, celeste, verde, amarillo y naranja): fondo con degradados animados, tarjetas de vidrio, botones con brillo, íconos de colores en cada pregunta, barra de progreso con degradado, escaneo con efecto de barrido y anillo luminoso, mensajes rotativos al analizar y confeti al mostrar el resultado. Las animaciones se desactivan con la opción "reducir movimiento" del celular. Los colores y degradados están al inicio de `index.html` (variables `:root`).

## Qué mide el análisis y qué tan confiable es

Todo son **estimaciones** hechas con visión por computador clásica sobre una foto tomada en el momento. Ninguna imagen sale del celular.

| Resultado | Cómo se calcula | Confiabilidad |
|---|---|---|
| Forma de cara | Proporciones de 68 puntos faciales (largo, ancho de pómulos, mandíbula y frente) | Media. La frente se estima, porque no se ve el nacimiento del pelo |
| Edad estimada | Modelo de edad de face-api, mediana de varios cuadros, mostrada como rango de ±5 años | Baja a media. El error puede ser de varios años |
| Maquillaje | Color de labios y de párpados comparado con la piel de las mejillas | Media para labios o sombras marcadas. Maquillaje suave queda como "no concluyente" |
| Granos o rojeces | Cantidad de manchas rojizas pequeñas respecto de su entorno, en frente, mejillas y mentón | Baja a media. **No distingue acné de otras rojeces, picaduras, rosácea, etc.** |
| Uniformidad del tono | Variación de luminosidad y color en zonas amplias de la piel | Baja a media. Las sombras y la luz de la góndola la afectan |

Cosas que **no** se estiman a propósito: género, etnia, emociones, enfermedades, cicatrices ni arrugas.

### Importante sobre la calibración

Los umbrales (en `js/config.js`, bloque `TH`) son valores iniciales razonables. Se probó que el flujo completo funciona y que los resultados son coherentes en una muestra de unas 20 caras de fotos de prueba, pero **no están calibrados con un grupo real de clientas ni con evaluación dermatológica**. Antes del lanzamiento se recomienda:

1. Probar con 20 a 30 personas distintas, en la góndola real y con su luz.
2. Abrir la página con `?debug=1`: al final del resumen se muestran los valores crudos (`rms`, `count`, `lipDa`, `lidDE`, etc.).
3. Ajustar los umbrales de `TH` hasta que los niveles "baja, media, alta" calcen con lo que se ve.

## Modelo 3D del producto

El producto recomendado aparece **flotando en 3D** junto a su información: gira solo, sube y baja suavemente, proyecta una sombra y se puede **girar con el dedo**. Se genera por código con three.js, sin archivos de imagen.

- Son **representaciones estilizadas** (frasco con gotario, con el nombre del producto en la etiqueta y los colores de la marca), no una copia exacta del envase real.
- Se pausan cuando salen de pantalla y respetan "reducir movimiento" del celular. Si el celular no soporta WebGL, se muestra una ilustración fija.
- Para desactivarlos, pon `MODEL_3D: false` en `js/config.js`.
- Para acercarlos al envase real, se pueden ajustar colores, forma y textos en `DESIGNS` y `buildBottle()` de `js/model3d.js`, o enviar fotos de referencia de cada envase para refinarlos (como se hizo con la caja Kotex).

## Cómo se decide el producto

`js/recommend.js` suma puntos a cada producto con reglas simples (puedes leerlas y cambiarlas):

- **Edad estimada** de 28 años o más suma al sérum **NIVEA** (hasta +3).
- **Variación de tono** media o alta suma a **Cluny**. Sin protector solar resta a Cluny (los productos para manchas se usan con protector).
- **Marcas rojizas** medias o altas suman a **SKIN1004 Centella**.
- **Piel seca** suma a NIVEA y Centella; **piel grasa** suma levemente a Centella.
- **Activos fuertes en la rutina** (retinoides, ácidos, peróxido de benzoílo, vitamina C) restan a Cluny y NIVEA y suman a Centella, porque lo prudente es calmar antes que sumar otro activo.
- **Tratamiento indicado por un médico**: Centella queda arriba y se pide consultar antes de usar cualquier producto nuevo.
- Con empate, gana Centella (la fórmula más simple).

Siempre se muestra: motivos de la recomendación, una nota por cada producto que la persona ya usa (sin conflicto, con cuidado, alternar o consultar), recordatorio de protector solar si no lo usa, prueba de tolerancia de 24 h y aviso de consultar a un dermatólogo si se ven varias marcas.

## Editar productos y textos

Todo está en `js/config.js`:

- `PRODUCTS`: nombre, marca, color, descripción, modo de uso y `compat` (qué pasa al combinarlo con cada tipo de producto: `ok`, `leve`, `alternar` o `consultar`).
- `img`: agrega la foto del producto (por ejemplo `img/nivea.png`) y se muestra en la tarjeta del resultado. Sin foto se usa una ilustración genérica.
- `ROUTINE`: lista de productos que se pregunta si usa.
- `TEXT`: textos de aviso legal.
- Para cambiar la lógica de puntaje, edita `js/recommend.js`.

### Pendiente de completar (importante)

La ficha de Salcobrand de **Cluny Luminaclear** no publica la lista de ingredientes y la de **NIVEA** no se pudo consultar; las reglas de compatibilidad de esos dos productos son **generales y prudentes** (marcados con `fichaCompleta: false`, y la app avisa que se revise el envase). Con la lista de ingredientes (INCI) real de cada envase, el equipo técnico o un dermatólogo debería revisar la tabla `compat` y ajustarla. La de SKIN1004 Centella se basó en su lista pública de 7 ingredientes (sin fragancia declarada ni activos fuertes). Revisa además que el nombre exacto de la variante de SKIN1004 sea el que se vende en góndola.

## Publicar en GitHub Pages

1. Crea un repositorio llamado `SALCO-RECOMIENDA` en tu cuenta y sube **todo el contenido de esta carpeta** (con las subcarpetas `js`, `lib`, `models`, `img`, `qr`), con `index.html` en la raíz.
2. *Settings > Pages > Deploy from a branch > main / root*.
3. En 1 o 2 minutos queda disponible en `https://cvaldovinos25.github.io/SALCO-RECOMIENDA/`. Para ver cambios nuevos, abre el enlace en una ventana privada.
4. Imprime el QR de `qr/qr-salco-recomienda.png` (apunta a esa dirección). Si usas otro nombre de repositorio, hay que generar el QR de nuevo.

La cámara solo funciona con **HTTPS**, que GitHub Pages ya incluye. En Instagram u otras apps con navegador integrado la cámara puede no estar permitida: si ocurre, la app sugiere abrir el enlace en Safari o Chrome.

## Privacidad y datos personales

- La foto se toma en memoria, se analiza en el celular y se descarta. **No se guarda ni se envía** ninguna imagen ni resultado, y no hay analítica ni cookies.
- La app pide confirmar que la persona es **mayor de 18 años** y acepta el uso de la cámara antes de empezar.
- Un escaneo facial puede considerarse **dato biométrico** según la legislación chilena de protección de datos. Aunque aquí no se almacena nada, conviene que el área legal de Salcobrand revise los textos de la bienvenida y del aviso final antes de lanzar.
- Los modelos, el motor 3D y la librería facial se sirven desde el mismo sitio, sin pedir recursos a terceros.

## Pruebas realizadas

- Flujo completo (bienvenida, 3 preguntas, cámara simulada con un rostro, captura manual, análisis y resultados) en un navegador móvil simulado, sin errores en consola.
- Detección y análisis sobre unas 20 caras de fotos de prueba: sin fallas, con resultados coherentes (por ejemplo, labios con color intenso detectados como maquillaje).
- Motor de recomendación en 10 escenarios, incluido el caso con tratamiento médico y el caso sin escaneo.

**No** se probó en celulares reales ni con una muestra de clientas: es el siguiente paso recomendado.

## Límites

- La calidad depende de la luz, la cámara, el pelo sobre la frente, los lentes y el maquillaje.
- Las pieles muy oscuras o muy claras y las cámaras de gama baja pueden dar resultados menos precisos; conviene probarlo con diversidad de personas antes del lanzamiento.
- Es una orientación comercial, no una evaluación de salud.

## Créditos

Detección y landmarks faciales con [`@vladmandic/face-api`](https://github.com/vladmandic/face-api) (MIT, ver `lib/FACE-API-LICENSE.txt`). Gráficos 3D con [three.js](https://threejs.org) (MIT, ver `lib/THREE-LICENSE.txt`).
