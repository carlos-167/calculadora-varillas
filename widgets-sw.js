/* =============================================================
   Calculadora de Varillas — Widgets del panel de widgets de Windows 11
   -------------------------------------------------------------
   Basado en la guía de Microsoft «Mostrar un widget de PWA en el panel de
   widgets de Windows»:
   https://learn.microsoft.com/es-es/microsoft-edge/progressive-web-apps/how-to/widgets

   · Este archivo lo carga sw.js con importScripts().
   · El manifiesto declara el widget (campo "widgets"): plantilla de
     Tarjeta Adaptable (ms_ac_template) + datos JSON (data).
   · Eventos: widgetinstall / widgetuninstall / widgetresume / widgetclick,
     y la API self.widgets (getByTag, updateByTag).
   · Los widgets son una función de Windows 11 (Edge/WebView2); en iOS, Android
     o navegadores sin self.widgets este código no hace nada.
   ============================================================= */

/** Qué abrir al pulsar cada botón de la tarjeta (verb de la plantilla → ruta). */
const WIDGET_RUTAS = {
  "abrir": "./"
};

/** Texto de la hora de actualización que muestra la tarjeta. */
const horaActual = () =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

/** Descarga un archivo del widget; si no hay red usa la copia guardada. */
async function leerArchivoWidget(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (r.ok) return await r.text();
  } catch { /* sin conexión: se usa la caché */ }
  const guardado = await caches.match(url, { ignoreSearch: true });
  if (guardado) return await guardado.text();
  throw new Error(`No se pudo leer ${url}`);
}

/** Dibuja (o redibuja) el widget con su plantilla y sus datos. */
async function actualizarWidget(widget) {
  if (!self.widgets || !widget?.definition) return;
  const { msAcTemplate, data: urlDatos, tag } = widget.definition;
  const template = await leerArchivoWidget(msAcTemplate);
  const datos = JSON.parse(await leerArchivoWidget(urlDatos));
  datos.actualizado = horaActual();
  await self.widgets.updateByTag(tag, { template, data: JSON.stringify(datos) });
}

async function actualizarTodosLosWidgets() {
  if (!self.widgets) return;
  const lista = await self.widgets.matchAll({ installed: true });
  await Promise.all(lista.map((w) => actualizarWidget(w).catch(() => {})));
}

/* Instalación: se registra una sincronización periódica y se dibuja el widget */
async function alInstalar(widget) {
  try {
    const tags = await self.registration.periodicSync?.getTags();
    if (tags && !tags.includes(widget.definition.tag) && widget.definition.update) {
      await self.registration.periodicSync.register(widget.definition.tag, {
        minInterval: widget.definition.update * 1000,
      });
    }
  } catch { /* la sincronización periódica no está disponible o no hay permiso */ }
  await actualizarWidget(widget);
}

/* Desinstalación: si era la última instancia se cancela la sincronización */
async function alDesinstalar(widget) {
  try {
    if (widget.instances.length <= 1 && 'update' in widget.definition) {
      await self.registration.periodicSync?.unregister(widget.definition.tag);
    }
  } catch { /* nada que cancelar */ }
}

self.addEventListener('widgetinstall', (event) => event.waitUntil(alInstalar(event.widget)));
self.addEventListener('widgetuninstall', (event) => event.waitUntil(alDesinstalar(event.widget)));
// El host puede suspender la representación de widgets; al reanudar se refrescan
self.addEventListener('widgetresume', (event) => event.waitUntil(actualizarWidget(event.widget)));

// Al activarse una versión nueva del service worker, los widgets ya instalados se refrescan
self.addEventListener('activate', (event) => event.waitUntil(actualizarTodosLosWidgets()));

self.addEventListener('periodicsync', (event) => {
  if (!self.widgets) return;
  event.waitUntil(
    (async () => {
      const widget = await self.widgets.getByTag(event.tag);
      if (widget && 'update' in widget.definition) await actualizarWidget(widget);
    })(),
  );
});

/* Botones de la tarjeta: event.action coincide con el "verb" de la plantilla */
self.addEventListener('widgetclick', (event) => {
  const ruta = WIDGET_RUTAS[event.action] ?? './';
  event.waitUntil(clients.openWindow(new URL(ruta, self.registration.scope).href));
});
