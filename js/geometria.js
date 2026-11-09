'use strict';

/* =============================================================
   Calculadora de Varillas — js/geometria.js
   -------------------------------------------------------------
   Geometría: distribución de las varillas en el perímetro de la sección.
   ============================================================= */

/**
 * Coloca las varillas en el perímetro de la sección:
 * primero las 4 esquinas y después pares en caras opuestas, siempre
 * en la cara con mayor separación disponible. Si sobra una (número impar)
 * se coloca en la cara superior. Coordenadas en cm, origen arriba-izquierda.
 */
function distribuir(n, barras, base) {
  const dE = barras.esquina.d;
  const dI = barras.intermedia.d;
  const dMax = Math.max(dE, dI);
  const W = base.ancho;
  const L = base.largo;

  const alEstribo = base.recub + base.dEstribo; // del borde a la cara interior del estribo
  const cE = alEstribo + dE / 2;                // del borde al centro de una varilla de esquina
  const cI = alEstribo + dI / 2;                // del borde al centro de una varilla intermedia
  const wi = W - 2 * cE;                        // distancia entre centros de esquinas (horizontal)
  const li = L - 2 * cE;                        // distancia entre centros de esquinas (vertical)
  const sepMin = Math.max(SEP_LIBRE_FACTOR * dMax, SEP_LIBRE_MIN_CM);

  const geo = { n, wi, li, sepMin, sepLibre: NaN, cabe: false, puntos: [], caras: null, sinEspacio: false };
  if (wi <= 0 || li <= 0) {
    geo.sinEspacio = true;
    return geo;
  }

  const esquinas = [
    { x: cE, y: cE },
    { x: W - cE, y: cE },
    { x: W - cE, y: L - cE },
    { x: cE, y: L - cE },
  ].map((p) => ({ ...p, d: dE, esquina: true }));

  if (n < 4) {
    geo.puntos = esquinas.slice(0, n);
    geo.sepLibre = n <= 1 ? Infinity : (n === 2 ? wi : Math.min(wi, li)) - dE;
    geo.cabe = geo.sepLibre >= sepMin - EPS;
    return geo;
  }

  let nx = 0; // intermedias en cada cara horizontal (superior e inferior)
  let ny = 0; // intermedias en cada cara vertical (izquierda y derecha)
  let resto = n - 4;
  while (resto >= 2) {
    if (wi / (nx + 1) >= li / (ny + 1)) nx++;
    else ny++;
    resto -= 2;
  }
  const nSup = nx + resto; // resto es 0 o 1

  const puntos = [...esquinas];
  for (let i = 1; i <= nSup; i++) puntos.push({ x: cE + (wi * i) / (nSup + 1), y: cI, d: dI });
  for (let i = 1; i <= nx; i++) puntos.push({ x: cE + (wi * i) / (nx + 1), y: L - cI, d: dI });
  for (let j = 1; j <= ny; j++) {
    const y = cE + (li * j) / (ny + 1);
    puntos.push({ x: cI, y, d: dI }, { x: W - cI, y, d: dI });
  }

  // Separación libre (entre caras de varillas) en cada cara de la sección
  const libreEnCara = (longitud, m) => {
    if (m === 0) return longitud - dE;
    const s = longitud / (m + 1);
    return Math.min(s - (dE + dI) / 2, m >= 2 ? s - dI : Infinity);
  };

  geo.sepLibre = Math.min(libreEnCara(wi, nSup), libreEnCara(wi, nx), libreEnCara(li, ny));
  geo.cabe = geo.sepLibre >= sepMin - EPS;
  geo.puntos = puntos;
  geo.caras = { superior: nSup + 2, inferior: nx + 2, laterales: ny + 2 };
  return geo;
}
