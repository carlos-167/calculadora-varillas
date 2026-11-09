/* =============================================================
   Calculadora de Varillas — Service Worker (sw.js)
   -------------------------------------------------------------
   · Guarda en caché los archivos principales al instalarse.
   · Responde desde la caché (funciona sin conexión) y, en segundo
     plano, descarga la versión más reciente de cada archivo
     (estrategia "stale-while-revalidate").
   · Al publicar una versión nueva, cambia VERSION: el navegador
     detecta el cambio, instala este archivo, borra la caché vieja
     y la app muestra el aviso "Recargar".
   · Compartir (Web Share Target, POST): cuando otra app comparte
     texto, un enlace o un archivo con la app instalada, el sistema
     envía un POST a ./recibir-compartido. Aquí se intercepta, se
     guardan los datos en la caché "compartido-varillas" y se
     redirige con 303 a ./?compartido=1, donde js/compartir.js los
     lee. Funciona aunque no haya conexión.
   · Widgets (Windows 11): importScripts('./widgets-sw.js') añade los
     eventos widgetinstall, widgetclick, etc. del panel de widgets.
   ============================================================= */

// Widgets del panel de Windows 11 (widgetinstall, widgetclick…): ver widgets-sw.js
importScripts('./widgets-sw.js');

const VERSION = 'v1.3.0';
const CACHE = `varillas-${VERSION}`;

// Archivos que se guardan desde la primera visita
const PRECACHE = [
  './widgets-sw.js',
  './widgets/plantilla.json',
  './widgets/datos.json',
  './widgets/captura.png',
  './',
  './index.html',
  './manifest.json',
  // Estilos
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/barra-titulo.css',
  './css/formulario.css',
  './css/resultados.css',
  './css/historial.css',
  './css/responsive.css',
  // Scripts
  './js/config.js',
  './js/utilidades.js',
  './js/calculos.js',
  './js/geometria.js',
  './js/esquema-svg.js',
  './js/interfaz.js',
  './js/historial.js',
  './js/compartir.js',
  './js/pwa.js',
  './js/barra-titulo.js',
  './js/main.js',
  // Imágenes
  './assets/logo.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
];

/* Instalación: descargar y guardar los archivos principales */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // cache: 'reload' evita tomar copias viejas de la caché HTTP del navegador
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
      // Activar la nueva versión sin esperar a que se cierren las pestañas
      await self.skipWaiting();
    })(),
  );
});

/* Activación: borrar cachés de versiones anteriores y tomar el control */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(
        claves.filter((k) => k.startsWith('varillas-') && k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/* Compartir: datos recibidos de otra app (Web Share Target) */
const CACHE_COMPARTIDO = 'compartido-varillas'; // no empieza con "varillas-": no se borra al actualizar
const RUTA_COMPARTIR = new URL('./recibir-compartido', self.registration.scope).pathname;

/* Peticiones: caché primero y actualización en segundo plano */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Web Share Target: el sistema envía lo compartido con POST (multipart/form-data)
  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === RUTA_COMPARTIR) {
    event.respondWith(recibirCompartido(request));
    return;
  }

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return; // solo archivos propios

  const actualizacion = descargarYGuardar(request);
  event.waitUntil(actualizacion.catch(() => {}));
  event.respondWith(responder(request, actualizacion));
});

/**
 * Lee el formulario que envió el sistema (title, text, url y archivos),
 * lo guarda como JSON y redirige a la app con 303 (POST → GET).
 */
async function recibirCompartido(request) {
  try {
    const datos = await request.formData();
    const archivos = [];
    for (const archivo of datos.getAll('archivo')) {
      if (archivo && typeof archivo.text === 'function') {
        archivos.push({ nombre: archivo.name, tipo: archivo.type, texto: (await archivo.text()).slice(0, 50000) });
      }
    }
    const paquete = {
      title: String(datos.get('title') || ''),
      text: String(datos.get('text') || ''),
      url: String(datos.get('url') || ''),
      archivos,
      fecha: new Date().toISOString(),
    };
    const cache = await caches.open(CACHE_COMPARTIDO);
    await cache.put(
      new URL('./compartido.json', self.registration.scope).href,
      new Response(JSON.stringify(paquete), { headers: { 'Content-Type': 'application/json' } }),
    );
  } catch (err) {
    console.warn('[SW] No se pudo leer lo compartido:', err);
  }
  return Response.redirect(new URL('./?compartido=1', self.registration.scope).href, 303);
}

async function descargarYGuardar(request) {
  // 'no-cache' obliga a validar con el servidor para detectar archivos modificados
  const respuesta = await fetch(request, { cache: 'no-cache' });
  if (respuesta && respuesta.ok && respuesta.type === 'basic') {
    const cache = await caches.open(CACHE);
    // Las páginas se guardan sin la consulta (?ancho=…, ?compartido=1) para no llenar la caché de copias
    const clave = request.mode === 'navigate' ? request.url.split('?')[0] : request;
    await cache.put(clave, respuesta.clone());
  }
  return respuesta;
}

async function responder(request, actualizacion) {
  const cache = await caches.open(CACHE);
  const esNavegacion = request.mode === 'navigate';

  const enCache = await cache.match(request, { ignoreSearch: esNavegacion });
  if (enCache) return enCache;

  try {
    return await actualizacion;
  } catch {
    // Sin red y sin copia: para navegación, devolver la app guardada
    if (esNavegacion) {
      const app = (await cache.match('./index.html')) || (await cache.match('./'));
      if (app) return app;
    }
    return new Response('Sin conexión y sin copia guardada de este archivo.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
