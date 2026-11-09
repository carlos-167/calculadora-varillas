'use strict';

/* =============================================================
   Calculadora de Varillas — js/pwa.js
   -------------------------------------------------------------
   PWA: service worker, botón de instalar y estado de conexión.
   ============================================================= */

function iniciarPWA() {
  const esLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

  // Avisos cuando no se puede instalar / usar sin conexión
  if (location.protocol === 'file:') {
    ui.protoNoticeText.innerHTML =
      'Abriste el archivo directamente. La calculadora funciona, pero para <strong>instalarla</strong> y usarla ' +
      '<strong>sin conexión</strong> ábrela desde un servidor local, por ejemplo <code>http://localhost:8080</code> (ver README).';
    ui.protoNotice.hidden = false;
  } else if (!window.isSecureContext && !esLocal) {
    ui.protoNoticeText.innerHTML =
      'La instalación y el modo sin conexión solo están disponibles en <code>localhost</code> o con HTTPS.';
    ui.protoNotice.hidden = false;
  }

  // Service Worker
  if ('serviceWorker' in navigator && window.isSecureContext) {
    let teniaControlador = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!teniaControlador) {
        teniaControlador = true; // primera instalación: no hace falta avisar
        return;
      }
      toast('Se instaló una nueva versión de la app', {
        accion: 'Recargar',
        alAccionar: () => location.reload(),
        duracion: 0,
      });
    });

    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // Buscar actualizaciones cada hora mientras la app esté abierta
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch((err) => console.warn('[PWA] No se pudo registrar el service worker:', err));
  }

  // La instalación la ofrece el propio navegador (ícono en la barra de direcciones)
  window.addEventListener('offline', () => toast('Sin conexión: la calculadora sigue funcionando'));
}
