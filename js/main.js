'use strict';

/* =============================================================
   Calculadora de Varillas — js/main.js
   -------------------------------------------------------------
   Arranque: conecta los eventos y restaura el último estado.
   Se carga al final, cuando todos los demás archivos ya están definidos.
   ============================================================= */

function iniciar() {
  tomarElementos();
  ui.appVersion.textContent = APP_VERSION;

  // Restaurar la última configuración
  const guardada = almacen.leer(STORAGE_KEYS.config, null);
  aplicarFormulario(guardada && typeof guardada === 'object' ? guardada : DEFAULTS);

  // Eventos del formulario
  ui.calcForm.addEventListener('submit', onSubmit);
  ui.clearBtn.addEventListener('click', limpiar);
  ui.calcForm.addEventListener('input', guardarConfigDiferido);
  ui.calcForm.addEventListener('change', guardarConfigDiferido);

  ui.pctRange.addEventListener('input', () => sincronizarRango('range'));
  ui.pct.addEventListener('input', () => sincronizarRango('pct'));

  ui.diamRadios.forEach((r) => r.addEventListener('change', actualizarCaptionDiametro));

  document.querySelectorAll('.step').forEach((b) =>
    b.addEventListener('click', () => pasoDimension(b.dataset.target, parseFloat(b.dataset.step))),
  );

  ui.advToggle.addEventListener('click', () => abrirAvanzadas());
  ui.menuBtn.addEventListener('click', () => {
    abrirAvanzadas();
    if (!ui.advBody.hidden) ui.advCard.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
  });

  // Quitar el error de un campo en cuanto se corrige
  [ui.ancho, ui.largo, ui.pct, ui.recub].forEach((el) =>
    el.addEventListener('input', () => {
      const pill = el.closest('.num-pill, .pct-pill');
      if (pill.classList.contains('is-invalid')) mostrarErrores(leerFormulario().errores);
    }),
  );

  // Tabla de alternativas: clic o Enter en una fila
  const elegirFila = (tr) => {
    if (!tr || !estado.resultado) return;
    const op = opcionPorClave(estado.resultado, tr.dataset.clave);
    if (op) mostrarOpcion(estado.resultado, op);
    const nueva = ui.altBody.querySelector(`tr[data-clave="${CSS.escape(tr.dataset.clave)}"]`);
    nueva?.focus({ preventScroll: true });
  };
  ui.altBody.addEventListener('click', (e) => elegirFila(e.target.closest('tr')));
  ui.altBody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      elegirFila(e.target.closest('tr'));
    }
  });

  // Botón "Ver" en las notas
  ui.notes.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clave]');
    if (!btn || !estado.resultado) return;
    const op = opcionPorClave(estado.resultado, btn.dataset.clave);
    if (op) mostrarOpcion(estado.resultado, op);
  });

  ui.copyBtn.addEventListener('click', copiarResultado);
  ui.shareBtn.addEventListener('click', compartirResultado);

  // Historial
  ui.histList.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) return eliminarDelHistorial(del.dataset.del);
    const load = e.target.closest('[data-id]');
    if (load) cargarDelHistorial(load.dataset.id);
  });
  ui.clearHist.addEventListener('click', eliminarHistorial);
  renderHistorial();

  // Mostrar de nuevo el último resultado (sin agregarlo otra vez al historial)
  const { entrada, errores } = leerFormulario();
  if (!Object.keys(errores).length) mostrarResultado(calcular(entrada));

  iniciarPWA();
  iniciarBarraTitulo();

  // Contenido recibido de otra app (Web Share Target) o enlace compartido
  recibirContenidoCompartido();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
}
