'use strict';

/* =============================================================
   Calculadora de Varillas — js/esquema-svg.js
   -------------------------------------------------------------
   Dibujo SVG de la sección (concreto, estribo, varillas y cotas).
   ============================================================= */

let svgSeq = 0;

function svgSeccion(op, base) {
  const W = base.ancho;
  const L = base.largo;
  const M = Math.max(W, L);
  const id = `sv${++svgSeq}`;
  const pad = M * 0.22;
  const fs = M * 0.058;       // tamaño de texto
  const rMin = M * 0.017;     // radio mínimo visible de una varilla
  const off = pad * 0.42;     // distancia de las cotas
  const tick = M * 0.018;
  const n2 = (v) => +v.toFixed(3);

  const lblA = `Ancho ${fmtN(W)} cm`;
  const lblL = `Largo ${fmtN(L)} cm`;
  const twA = lblA.length * fs * 0.56;
  const twL = lblL.length * fs * 0.56;
  const x0 = Math.min(-pad * 0.3, W / 2 - twA / 2 - fs * 0.3);
  const x1 = Math.max(W + pad, W / 2 + twA / 2 + fs * 0.3);
  const y0 = Math.min(-pad * 0.3, L / 2 - twL / 2 - fs * 0.3);
  const y1 = Math.max(L + pad, L / 2 + twL / 2 + fs * 0.3);

  // Estribo (dibujado sobre su eje)
  const eOff = base.recub + base.dEstribo / 2;
  const eW = W - 2 * eOff;
  const eL = L - 2 * eOff;
  const eStroke = Math.max(base.dEstribo, M * 0.009);
  // Radio del doblez: la varilla de esquina queda alojada en la curva del estribo
  const eRx = Math.min(op.barras.esquina.d / 2 + base.dEstribo / 2, Math.min(eW, eL) / 3);

  const p = [];
  p.push(
    `<svg viewBox="${n2(x0)} ${n2(y0)} ${n2(x1 - x0)} ${n2(y1 - y0)}" xmlns="http://www.w3.org/2000/svg" role="img" ` +
      `aria-label="${esc(`Sección de ${fmtN(W)} por ${fmtN(L)} cm con ${nombreOpcion(op)}`)}">`,
  );
  p.push(`<defs>
    <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f4f8"/><stop offset="1" stop-color="#d2d7df"/></linearGradient>
    <radialGradient id="${id}b" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#b2c8ff"/><stop offset=".55" stop-color="#3b6cf6"/><stop offset="1" stop-color="#1f43c4"/></radialGradient>
    <radialGradient id="${id}i" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#c4f8ff"/><stop offset=".55" stop-color="#25c6e6"/><stop offset="1" stop-color="#0f86a2"/></radialGradient>
    <filter id="${id}s" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="${n2(M * 0.035)}" stdDeviation="${n2(M * 0.035)}" flood-color="#000" flood-opacity=".6"/></filter>
    <filter id="${id}g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${n2(M * 0.007)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`);

  // Concreto
  p.push(`<rect x="0" y="0" width="${W}" height="${L}" rx="${n2(M * 0.02)}" fill="url(#${id}c)" filter="url(#${id}s)"/>`);

  // Estribo
  if (eW > 0 && eL > 0) {
    p.push(
      `<rect x="${n2(eOff)}" y="${n2(eOff)}" width="${n2(eW)}" height="${n2(eL)}" rx="${n2(Math.max(eRx, 0))}" ` +
        `fill="none" stroke="#4be8ff" stroke-width="${n2(eStroke)}" filter="url(#${id}g)"/>`,
    );
  }

  // Varillas
  for (const b of op.geo.puntos) {
    const r = Math.max(b.d / 2, rMin);
    const relleno = op.tipo === 'mixta' && !b.esquina ? 'i' : 'b';
    p.push(
      `<circle cx="${n2(b.x)}" cy="${n2(b.y)}" r="${n2(r)}" fill="url(#${id}${relleno})" ` +
        `stroke="rgba(255,255,255,.85)" stroke-width="1" vector-effect="non-scaling-stroke"/>`,
    );
  }

  if (op.geo.sinEspacio) {
    p.push(`<text class="sv-warn" x="${n2(W / 2)}" y="${n2(L / 2)}" font-size="${n2(fs)}" text-anchor="middle" dominant-baseline="middle">Sin espacio</text>`);
  }

  // Cotas
  const yD = L + off;
  const xD = W + off;
  const xT = xD + fs * 1.25;
  p.push(`<path class="sv-dim" d="M0 ${n2(yD)}H${W}M0 ${n2(yD - tick)}V${n2(yD + tick)}M${W} ${n2(yD - tick)}V${n2(yD + tick)}"/>`);
  p.push(`<text class="sv-text" x="${n2(W / 2)}" y="${n2(yD + fs * 1.35)}" font-size="${n2(fs)}" text-anchor="middle">${esc(lblA)}</text>`);
  p.push(`<path class="sv-dim" d="M${n2(xD)} 0V${L}M${n2(xD - tick)} 0H${n2(xD + tick)}M${n2(xD - tick)} ${L}H${n2(xD + tick)}"/>`);
  p.push(`<text class="sv-text" x="${n2(xT)}" y="${n2(L / 2)}" font-size="${n2(fs)}" text-anchor="middle" transform="rotate(-90 ${n2(xT)} ${n2(L / 2)})">${esc(lblL)}</text>`);

  p.push('</svg>');
  return p.join('');
}
