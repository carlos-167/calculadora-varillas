'use strict';

/* =============================================================
   Calculadora de Varillas — js/calculos.js
   -------------------------------------------------------------
   Cálculos: área, As, número de varillas, alternativas y recomendación.
   ============================================================= */

/**
 * Cálculo principal.
 * @param {{ancho:number, largo:number, pct:number, diam:string, min4:boolean, par:boolean, recub:number, estribo:string}} entrada
 */
function calcular(entrada) {
  // Área de la columna = ancho × largo
  const area = entrada.ancho * entrada.largo;
  // Área de acero requerida: As = área × % / 100
  const asReq = (area * entrada.pct) / 100;

  const base = {
    ancho: entrada.ancho,
    largo: entrada.largo,
    area,
    asReq,
    recub: entrada.recub,
    dEstribo: ESTRIBOS[entrada.estribo] || ESTRIBOS['3/8'],
  };

  // Alternativas con un solo diámetro
  const simples = VARILLAS.map((v) => opcionSimple(v, base, entrada));
  const recomendada = recomendar(simples);

  // Combinación mixta (esquinas de un diámetro + intermedias de otro menor)
  const mixtas = opcionesMixtas(base);
  const mejorMixta = mixtas[0] || null;
  const mixta =
    mejorMixta && (!cumple(recomendada) || mejorMixta.asProv < recomendada.asProv - 0.005) ? mejorMixta : null;

  const elegida =
    entrada.diam === 'auto' ? recomendada : simples.find((o) => o.clave === entrada.diam) || recomendada;

  return { entrada, base, simples, recomendada, mixta, elegida };
}

/** Armado con un solo diámetro. */
function opcionSimple(varilla, base, opciones) {
  // Número de varillas = As requerida / área de una varilla, redondeado hacia arriba
  const nExacto = base.asReq / varilla.area;
  const nCalculado = Math.max(1, Math.ceil(nExacto - EPS));

  let n = nCalculado;
  const ajustes = [];
  if (opciones.min4 && n < 4) {
    n = 4;
    ajustes.push('mínimo 4 varillas (una por esquina)');
  }
  if (opciones.par && n % 2 !== 0) {
    n += 1;
    ajustes.push('número par (distribución simétrica)');
  }

  return completarOpcion(
    {
      tipo: 'simple',
      clave: varilla.id,
      varilla,
      nExacto,
      nCalculado,
      n,
      ajustes,
      // As proporcionada = número de varillas × área de una varilla
      asProv: n * varilla.area,
      barras: { esquina: varilla, intermedia: varilla },
    },
    base,
  );
}

/**
 * Combinaciones de 4 varillas de esquina + un número par de varillas intermedias
 * de uno o dos diámetros menores. Solo se consideran si 4 varillas de esquina no bastan.
 */
function opcionesMixtas(base) {
  const lista = [];
  VARILLAS.forEach((esq, i) => {
    const asEsquinas = 4 * esq.area;
    if (asEsquinas >= base.asReq - EPS) return;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const inter = VARILLAS[j];
      let k = Math.ceil((base.asReq - asEsquinas) / inter.area - EPS);
      if (k % 2 !== 0) k += 1; // pares para que quede simétrico
      lista.push(
        completarOpcion(
          {
            tipo: 'mixta',
            clave: `mix:${esq.id}+${inter.id}`,
            varilla: esq,
            intermedia: inter,
            k,
            n: 4 + k,
            nExacto: null,
            nCalculado: 4 + k,
            ajustes: [],
            asProv: asEsquinas + k * inter.area,
            barras: { esquina: esq, intermedia: inter },
          },
          base,
        ),
      );
    }
  });
  return lista.filter((o) => o.cabe).sort((a, b) => a.asProv - b.asProv || a.n - b.n);
}

/** Agrega porcentaje real, excedente, geometría y estado a una opción. */
function completarOpcion(op, base) {
  // % acero real = (As proporcionada / área de la columna) × 100
  op.pctReal = (op.asProv / base.area) * 100;
  op.excedente = (op.asProv / base.asReq - 1) * 100;
  op.cumpleArea = op.asProv + EPS >= base.asReq;
  op.geo = distribuir(op.n, op.barras, base);
  op.cabe = op.geo.cabe;
  op.estado = estadoDe(op);
  return op;
}

function estadoDe(op) {
  if (op.geo.sinEspacio) return { clave: 'bad', texto: 'Sin espacio' };
  if (op.n < 4) return { clave: 'warn', texto: 'Menos de 4' };
  if (!op.cabe) return { clave: 'bad', texto: 'No cabe' };
  return { clave: 'ok', texto: 'Cabe' };
}

/** Una opción "cumple" si alcanza el As, tiene al menos 4 varillas y caben. */
function cumple(op) {
  return !!op && op.cumpleArea && op.n >= 4 && op.cabe;
}

/**
 * Recomendación automática: entre las opciones con ≥ 4 varillas que caben,
 * la de menor As proporcionada (menor excedente); si empatan, la de menos varillas.
 */
function recomendar(simples) {
  const conMinimo = simples.filter((o) => o.n >= 4);
  const aptas = conMinimo.filter((o) => o.cabe);
  if (aptas.length) return [...aptas].sort((a, b) => a.asProv - b.asProv || a.n - b.n)[0];

  // Si ninguna cabe, se propone la que queda más cerca de caber (mayor holgura de separación)
  const grupo = conMinimo.length ? conMinimo : simples;
  const holgura = (o) => (Number.isFinite(o.geo.sepLibre) ? o.geo.sepLibre - o.geo.sepMin : -Infinity);
  return [...grupo].sort((a, b) => holgura(b) - holgura(a) || a.asProv - b.asProv)[0];
}

function nombreOpcion(op) {
  return op.tipo === 'mixta'
    ? `4 Ø ${op.varilla.nombre} + ${op.k} Ø ${op.intermedia.nombre}`
    : `${op.n} Ø ${op.varilla.nombre}`;
}
