'use strict';

/* =============================================================
   Calculadora de Varillas — js/compartir.js
   -------------------------------------------------------------
   Compartir contenido con otras aplicaciones. Basado en la guía de
   Microsoft: https://learn.microsoft.com/es-es/microsoft-edge/progressive-web-apps/how-to/share

   ENVIAR (Web Share API)
   · navigator.share({ title, text, url, files }) abre el cuadro de
     compartir del sistema (Correo, Teams, WhatsApp, Mensajes…).
   · Se comparte el resultado en texto, un enlace que vuelve a abrir
     el mismo cálculo y, si navigator.canShare({ files }) lo permite,
     una imagen PNG del esquema de la sección.
   · Sin soporte: el texto y el enlace se copian al portapapeles.

   RECIBIR (Web Share Target, método POST)
   · manifest.json declara "share_target" con action
     "./recibir-compartido", method POST y enctype multipart/form-data,
     además de archivos .txt / .csv / .json.
   · sw.js intercepta ese POST, lee el formData, guarda los datos en
     la caché "compartido-varillas" y redirige (303) a ./?compartido=1.
   · Aquí se leen esos datos, se buscan las dimensiones y el % de acero
     (por ejemplo «columna 40 x 60 cm, 2 %») y se calcula.
   ============================================================= */

const CACHE_COMPARTIDO = 'compartido-varillas'; // no empieza con "varillas-": sw.js no la borra al actualizar
const TITULO_COMPARTIR = 'Calculadora de Varillas';
const FUENTE_IMAGEN = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/* ---------- Enviar ---------- */

/** Enlace que abre la app con los mismos datos: ./?ancho=30&largo=40&pct=1&diam=auto… */
function enlaceCalculo(entrada) {
  const url = new URL('./', location.href);
  const p = url.searchParams;
  p.set('ancho', String(entrada.ancho));
  p.set('largo', String(entrada.largo));
  p.set('pct', String(entrada.pct));
  p.set('diam', entrada.diam);
  p.set('min4', entrada.min4 ? '1' : '0');
  p.set('par', entrada.par ? '1' : '0');
  p.set('recub', String(entrada.recub));
  p.set('estribo', entrada.estribo);
  return url.href;
}

function resumenOpcion(op) {
  const armado = op.tipo === 'mixta' ? `${op.n} varillas: ${nombreOpcion(op)}` : `${op.n} varillas Ø ${op.varilla.nombre}`;
  return `${armado} · As ${fmt(op.asProv)} cm² · ${fmt(op.pctReal)} %`;
}

function cargarImagen(src) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = rechazar;
    img.src = src;
  });
}

/**
 * Convierte el esquema SVG que está en pantalla en una imagen PNG (File) lista para compartir.
 * Los estilos que vienen de CSS (cotas y textos) se copian como atributos para que la imagen
 * se vea igual fuera de la página.
 */
async function imagenEsquema(res, op) {
  const svg = ui.sectionSvg.querySelector('svg');
  if (!svg || typeof HTMLCanvasElement.prototype.toBlob !== 'function') return null;

  const copia = svg.cloneNode(true);
  copia.querySelectorAll('.sv-dim').forEach((el) => {
    el.setAttribute('stroke', 'rgba(255,255,255,.45)');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('fill', 'none');
    el.setAttribute('vector-effect', 'non-scaling-stroke');
  });
  copia.querySelectorAll('.sv-text, .sv-warn').forEach((el) => {
    el.setAttribute('fill', el.classList.contains('sv-warn') ? '#ff6f6f' : '#a9b0bc');
    el.setAttribute('font-family', FUENTE_IMAGEN);
    el.setAttribute('font-weight', '600');
  });

  const [, , vw, vh] = copia.getAttribute('viewBox').trim().split(/\s+/).map(Number);
  const W = 1080;
  const H = 1200;
  const cabeza = 190;
  const pie = 90;
  const margen = 70;
  const escala = Math.min((W - 2 * margen) / vw, (H - cabeza - pie - 30) / vh);
  const w = Math.round(vw * escala);
  const h = Math.round(vh * escala);
  copia.setAttribute('width', String(w));
  copia.setAttribute('height', String(h));

  const urlSvg = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(copia)], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const img = await cargarImagen(urlSvg);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const fondo = ctx.createLinearGradient(0, 0, 0, H);
    fondo.addColorStop(0, '#1b1f27');
    fondo.addColorStop(1, '#0b0c10');
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, W, H);

    const { entrada } = res;
    ctx.fillStyle = '#f2f4f8';
    ctx.font = `700 54px ${FUENTE_IMAGEN}`;
    ctx.fillText(`Columna ${fmtN(entrada.ancho)} × ${fmtN(entrada.largo)} cm`, margen, 104, W - 2 * margen);
    ctx.fillStyle = '#4be8ff';
    ctx.font = `600 32px ${FUENTE_IMAGEN}`;
    ctx.fillText(resumenOpcion(op), margen, 154, W - 2 * margen);

    ctx.drawImage(img, (W - w) / 2, cabeza + (H - cabeza - pie - h) / 2, w, h);

    ctx.fillStyle = '#737b89';
    ctx.font = `500 26px ${FUENTE_IMAGEN}`;
    ctx.fillText('Calculadora de Varillas · Resultado preliminar', margen, H - 46, W - 2 * margen);

    const blob = await new Promise((resolver) => canvas.toBlob(resolver, 'image/png'));
    if (!blob) return null;
    return new File([blob], `columna-${entrada.ancho}x${entrada.largo}.png`, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(urlSvg);
  }
}

/** Abre el cuadro de compartir. Devuelve 'ok', 'cancelado', 'sin-permiso' o 'error'. */
async function abrirCompartir(datos) {
  try {
    await navigator.share(datos);
    return 'ok';
  } catch (err) {
    if (err.name === 'AbortError') return 'cancelado'; // el usuario cerró el cuadro
    if (err.name === 'NotAllowedError') return 'sin-permiso'; // pasó demasiado tiempo desde el clic
    console.warn('[Compartir] Error al compartir:', err);
    return 'error';
  }
}

async function compartirResultado() {
  if (!estado.resultado || !estado.mostrada) {
    toast('Primero calcula un resultado para poder compartirlo');
    return;
  }
  const res = estado.resultado;
  const op = estado.mostrada;
  const datos = {
    title: `${TITULO_COMPARTIR} · ${fmtN(res.entrada.ancho)} × ${fmtN(res.entrada.largo)} cm`,
    text: textoResultado(res, op),
    url: enlaceCalculo(res.entrada),
  };

  // Navegador sin Web Share API: copiar texto y enlace
  if (typeof navigator.share !== 'function') {
    await copiarTexto(`${datos.text}\n\nAbrir este cálculo: ${datos.url}`);
    toast('Tu navegador no permite compartir: se copió el resultado con su enlace');
    return;
  }

  // Imagen del esquema, solo si el navegador permite compartir archivos
  try {
    const imagen = await imagenEsquema(res, op);
    if (imagen && navigator.canShare && navigator.canShare({ files: [imagen] })) datos.files = [imagen];
  } catch (err) {
    console.warn('[Compartir] No se pudo crear la imagen del esquema:', err);
  }

  const resultado = await abrirCompartir(datos);
  if (resultado === 'ok') toast('Resultado compartido');
  else if (resultado === 'sin-permiso') {
    // Algunos navegadores piden que share() se llame justo después del clic: se ofrece reintentar
    toast('Listo para compartir', {
      accion: 'Compartir',
      alAccionar: async () => {
        const otra = await abrirCompartir(datos);
        if (otra === 'ok') toast('Resultado compartido');
        else if (otra !== 'cancelado') toast('No se pudo compartir');
      },
      duracion: 8000,
    });
  } else if (resultado === 'error') toast('No se pudo compartir');
}

/* ---------- Recibir ---------- */

const numeroTexto = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Datos del formulario a partir de parámetros de URL (enlace generado por «Compartir»). */
function datosDesdeParams(p) {
  if (!p.has('ancho') || !p.has('largo')) return null;
  const datos = {
    ancho: numeroTexto(p.get('ancho')),
    largo: numeroTexto(p.get('largo')),
    pct: p.has('pct') ? numeroTexto(p.get('pct')) : undefined,
    diam: p.get('diam') || undefined,
    min4: p.has('min4') ? p.get('min4') !== '0' : undefined,
    par: p.has('par') ? p.get('par') === '1' : undefined,
    recub: p.has('recub') ? numeroTexto(p.get('recub')) : undefined,
    estribo: p.get('estribo') || undefined,
  };
  if (datos.ancho === undefined || datos.largo === undefined) return null;
  for (const k of Object.keys(datos)) if (datos[k] === undefined) delete datos[k];
  return datos;
}

/**
 * Busca los datos de una columna en un texto:
 * 1) un enlace de esta app, 2) un JSON con { ancho, largo, pct… },
 * 3) texto libre: «40 x 60», «40×60 cm», «40 por 60» y un «2 %».
 */
function datosDesdeTexto(texto) {
  if (!texto) return null;

  for (const posible of texto.match(/https?:\/\/\S+/g) || []) {
    try {
      const datos = datosDesdeParams(new URL(posible).searchParams);
      if (datos) return datos;
    } catch { /* no es una URL válida */ }
  }

  try {
    const obj = JSON.parse(texto);
    if (obj && typeof obj === 'object' && 'ancho' in obj && 'largo' in obj) {
      const p = new URLSearchParams();
      for (const k of ['ancho', 'largo', 'pct', 'diam', 'recub', 'estribo']) if (obj[k] != null) p.set(k, String(obj[k]));
      if (typeof obj.min4 === 'boolean') p.set('min4', obj.min4 ? '1' : '0');
      if (typeof obj.par === 'boolean') p.set('par', obj.par ? '1' : '0');
      const datos = datosDesdeParams(p);
      if (datos) return datos;
    }
  } catch { /* no es JSON */ }

  const dims = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*(?:x|×|\*|por)\s*(\d+(?:[.,]\d+)?)/i);
  if (!dims) return null;
  const datos = { ancho: numeroTexto(dims[1]), largo: numeroTexto(dims[2]) };
  const pct = texto.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) datos.pct = numeroTexto(pct[1]);
  return datos;
}

/** Revisa en orden: url, text, title y el contenido de cada archivo recibido. */
function datosDesdePaquete(paquete) {
  const fuentes = [paquete.url, paquete.text, paquete.title, ...(paquete.archivos || []).map((a) => a.texto)];
  for (const fuente of fuentes) {
    const datos = datosDesdeTexto(String(fuente || ''));
    if (datos) return datos;
  }
  // Por si las dimensiones vienen repartidas entre título y texto
  return datosDesdeTexto(fuentes.filter(Boolean).join('\n'));
}

/** Lee (y borra) lo que el service worker guardó al recibir el POST de Share Target. */
async function leerPaqueteCompartido() {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_COMPARTIDO);
    const respuesta = await cache.match(new URL('./compartido.json', location.href).href);
    await caches.delete(CACHE_COMPARTIDO);
    return respuesta ? await respuesta.json() : null;
  } catch {
    return null;
  }
}

function ocultarResultado() {
  estado.resultado = null;
  estado.mostrada = null;
  ui.resultWrap.hidden = true;
  ui.emptyState.hidden = false;
  ui.resSub.innerHTML = 'Revisa los datos recibidos y presiona <strong>Calcular</strong>.';
}

/** Pone los datos en el formulario y calcula. */
function aplicarRecibido(datos, origen) {
  aplicarFormulario({ ...estadoFormulario(), ...datos });
  const { entrada, errores } = leerFormulario();
  mostrarErrores(errores);
  almacen.guardar(STORAGE_KEYS.config, estadoFormulario());

  if (Object.keys(errores).length) {
    ocultarResultado();
    toast(`${origen}, pero hay valores fuera de rango`, { duracion: 5000 });
    return;
  }
  const res = calcular(entrada);
  mostrarResultado(res, { animar: true });
  agregarAlHistorial(res);
  toast(`${origen}: ${fmtN(entrada.ancho)} × ${fmtN(entrada.largo)} cm · ${fmtN(entrada.pct)} %`, { duracion: 5000 });
}

/**
 * Al abrir la app:
 * · ?compartido=1  → llegó contenido de otra app (Web Share Target, POST)
 * · ?ancho=…&largo=… → se abrió un enlace generado por «Compartir»
 */
async function recibirContenidoCompartido() {
  const url = new URL(location.href);
  const p = url.searchParams;
  const esShareTarget = p.has('compartido');
  const datosEnlace = esShareTarget ? null : datosDesdeParams(p);
  if (!esShareTarget && !datosEnlace) return;

  // Limpia la URL para que al recargar no se vuelva a aplicar
  history.replaceState(null, '', url.pathname + url.hash);

  if (datosEnlace) {
    aplicarRecibido(datosEnlace, 'Cálculo compartido');
    return;
  }

  const paquete = await leerPaqueteCompartido();
  const datos = paquete ? datosDesdePaquete(paquete) : null;
  if (datos) {
    aplicarRecibido(datos, 'Recibido de otra app');
  } else {
    toast('No se encontraron dimensiones en lo compartido. Ejemplo: «columna 40 x 60 cm, 2 %»', { duracion: 6000 });
  }
}
