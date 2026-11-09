'use strict';

/* =============================================================
   Calculadora de Varillas — js/utilidades.js
   -------------------------------------------------------------
   Utilidades: formato de números, escape de HTML y LocalStorage.
   ============================================================= */

const formatos = new Map();

/** Número con `dec` decimales fijos, formato es-MX (1,234.56). */
function fmt(n, dec = 2) {
  if (!Number.isFinite(n)) return '—';
  const clave = `f${dec}`;
  if (!formatos.has(clave)) {
    formatos.set(clave, new Intl.NumberFormat('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  }
  return formatos.get(clave).format(n);
}

/** Número con hasta `max` decimales (sin ceros sobrantes): 30, 32.5, 900. */
function fmtN(n, max = 2) {
  if (!Number.isFinite(n)) return '—';
  const clave = `n${max}`;
  if (!formatos.has(clave)) {
    formatos.set(clave, new Intl.NumberFormat('es-MX', { maximumFractionDigits: max }));
  }
  return formatos.get(clave).format(n);
}

/** Escapa texto para insertarlo en HTML. */
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buscarVarilla(id) {
  return VARILLAS.find((v) => v.id === id) || null;
}

/** LocalStorage con manejo de errores (modo privado, almacenamiento lleno, etc.). */
const almacen = {
  leer(clave, porDefecto) {
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch {
      return porDefecto;
    }
  },
  guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  },
  borrar(clave) {
    try { localStorage.removeItem(clave); } catch { /* sin acceso */ }
  },
};
