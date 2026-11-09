'use strict';

/* =============================================================
   Calculadora de Varillas — js/historial.js
   -------------------------------------------------------------
   Historial de cálculos guardado en LocalStorage.
   ============================================================= */

const fechaFmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function leerHistorial() {
  const lista = almacen.leer(STORAGE_KEYS.historial, []);
  return Array.isArray(lista) ? lista : [];
}

function agregarAlHistorial(res) {
  const op = res.elegida;
  const e = res.entrada;
  const item = {
    id: Date.now(),
    fecha: new Date().toISOString(),
    ancho: e.ancho,
    largo: e.largo,
    pct: e.pct,
    modo: e.diam === 'auto' ? 'auto' : 'manual',
    diam: e.diam,
    diametro: op.tipo === 'mixta' ? nombreOpcion(op) : op.varilla.nombre,
    n: op.n,
    asReq: res.base.asReq,
    asProv: op.asProv,
    pctReal: op.pctReal,
    cumple: cumple(op),
    min4: e.min4,
    par: e.par,
    recub: e.recub,
    estribo: e.estribo,
  };

  let lista = leerHistorial();
  const ultimo = lista[0];
  const clave = (x) => [x.ancho, x.largo, x.pct, x.diam, x.min4, x.par, x.recub, x.estribo].join('|');
  if (ultimo && clave(ultimo) === clave(item)) lista[0] = item; // mismo cálculo: solo actualiza la hora
  else lista.unshift(item);
  lista = lista.slice(0, HISTORIAL_MAX);
  almacen.guardar(STORAGE_KEYS.historial, lista);
  renderHistorial();
}

function renderHistorial() {
  const lista = leerHistorial();
  ui.histEmpty.hidden = lista.length > 0;
  ui.clearHist.hidden = lista.length === 0;
  ui.histList.innerHTML = lista
    .map((h) => {
      const fecha = new Date(h.fecha);
      const cuando = Number.isNaN(fecha.getTime()) ? '' : fechaFmt.format(fecha);
      const modo = h.modo === 'auto' ? 'Auto' : 'Manual';
      return (
        `<li class="hist-item">` +
        `<button type="button" class="hist-item__load" data-id="${h.id}" aria-label="Cargar cálculo de ${fmtN(h.ancho)} por ${fmtN(h.largo)} centímetros">` +
        `<span class="hist-item__top"><span class="hist-item__mode${h.modo === 'auto' ? '' : ' is-manual'}">${modo}</span>${esc(cuando)}</span>` +
        `<span class="hist-item__title">${fmtN(h.ancho)} × ${fmtN(h.largo)} cm · ${fmtN(h.pct)} %</span>` +
        `<span class="hist-item__res"><i class="hist-item__state${h.cumple ? '' : ' is-warn'}"></i>` +
        `<b>${h.n} Ø ${esc(h.diametro)}</b> · As ${fmt(h.asProv)} cm² · ${fmt(h.pctReal)} %</span>` +
        `</button>` +
        `<button type="button" class="hist-item__del" data-del="${h.id}" title="Eliminar este cálculo" aria-label="Eliminar este cálculo">` +
        `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` +
        `</button></li>`
      );
    })
    .join('');
}

function cargarDelHistorial(id) {
  const h = leerHistorial().find((x) => String(x.id) === String(id));
  if (!h) return;
  aplicarFormulario({
    ancho: h.ancho, largo: h.largo, pct: h.pct, diam: h.diam,
    min4: h.min4 ?? DEFAULTS.min4, par: h.par ?? DEFAULTS.par,
    recub: h.recub ?? DEFAULTS.recub, estribo: h.estribo ?? DEFAULTS.estribo,
  });
  const { entrada, errores } = leerFormulario();
  mostrarErrores(errores);
  if (Object.keys(errores).length) return;
  almacen.guardar(STORAGE_KEYS.config, estadoFormulario());
  mostrarResultado(calcular(entrada), { animar: true });
  ui.layout.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  toast('Cálculo cargado');
}

function eliminarDelHistorial(id) {
  const lista = leerHistorial().filter((x) => String(x.id) !== String(id));
  almacen.guardar(STORAGE_KEYS.historial, lista);
  renderHistorial();
}

let confirmarTimer = 0;
function eliminarHistorial() {
  // Doble toque para confirmar (evita borrar por accidente)
  if (!ui.clearHist.classList.contains('is-confirm')) {
    ui.clearHist.classList.add('is-confirm');
    ui.clearHist.textContent = '¿Eliminar todo? Toca de nuevo';
    clearTimeout(confirmarTimer);
    confirmarTimer = setTimeout(restaurarBotonHistorial, 3500);
    return;
  }
  restaurarBotonHistorial();
  almacen.borrar(STORAGE_KEYS.historial);
  renderHistorial();
  toast('Historial eliminado');
}

function restaurarBotonHistorial() {
  clearTimeout(confirmarTimer);
  ui.clearHist.classList.remove('is-confirm');
  ui.clearHist.textContent = 'Eliminar historial';
}
