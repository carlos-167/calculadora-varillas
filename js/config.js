'use strict';

/* =============================================================
   Calculadora de Varillas — js/config.js
   -------------------------------------------------------------
   Catálogo de varillas, límites y valores por defecto.
   Se carga primero: el resto de los archivos usa estas constantes.
   ============================================================= */

const APP_VERSION = '1.2.0';

const CM_POR_PULGADA = 2.54;

/**
 * Diámetros disponibles. El diámetro nominal se da en pulgadas y se
 * convierte a centímetros; el área se calcula con A = π·d²/4.
 * Para agregar un diámetro nuevo basta con añadir una línea aquí
 * (y su botón en index.html).
 */
const VARILLAS = [
  { id: '3/8',   nombre: '3/8"',   numero: '#3',  pulgadas: 3 / 8 },
  { id: '1/2',   nombre: '1/2"',   numero: '#4',  pulgadas: 1 / 2 },
  { id: '5/8',   nombre: '5/8"',   numero: '#5',  pulgadas: 5 / 8 },
  { id: '3/4',   nombre: '3/4"',   numero: '#6',  pulgadas: 3 / 4 },
  { id: '1',     nombre: '1"',     numero: '#8',  pulgadas: 1 },
  { id: '1-1/4', nombre: '1 1/4"', numero: '#10', pulgadas: 5 / 4 },
].map((v) => {
  const d = v.pulgadas * CM_POR_PULGADA;                     // diámetro en cm
  return Object.freeze({ ...v, d, area: (Math.PI * d * d) / 4 }); // área en cm²
});

/** Diámetro del estribo en cm (solo para el esquema y la revisión de espacio). */
const ESTRIBOS = { '1/4': 0.635, '5/16': 0.794, '3/8': 0.9525, '1/2': 1.27 };

/** Límites de captura. */
const LIMITES = { dimMin: 10, dimMax: 500, pctMin: 0.1, pctMax: 10, recubMin: 1, recubMax: 10 };

/** Cuantías de referencia (ACI 318: 1 % ≤ ρ ≤ 8 %). */
const CUANTIA = { min: 1, congestion: 4, max: 8 };

/** Separación libre mínima entre varillas: el mayor de 1.5·d y 4 cm (criterio orientativo). */
const SEP_LIBRE_FACTOR = 1.5;
const SEP_LIBRE_MIN_CM = 4;

const DEFAULTS = Object.freeze({
  ancho: 30, largo: 30, pct: 1, diam: 'auto',
  min4: true, par: false, recub: 4, estribo: '3/8',
});

const STORAGE_KEYS = { config: 'varillas:config:v1', historial: 'varillas:historial:v1' };
const HISTORIAL_MAX = 25;

const AVISO =
  'Esta herramienta proporciona cálculos preliminares. El armado definitivo de una columna debe ser ' +
  'determinado y revisado por un profesional responsable, considerando las cargas, materiales, ' +
  'condiciones de apoyo, confinamiento, normas y demás requisitos estructurales aplicables.';

const EPS = 1e-9;
