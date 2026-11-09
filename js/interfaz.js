'use strict';

/* =============================================================
   Calculadora de Varillas — js/interfaz.js
   -------------------------------------------------------------
   Interfaz: formulario, validación, resultados, copiar y notificaciones.
   (Compartir con otras apps está en js/compartir.js.)
   ============================================================= */

const ui = {};
const estado = { resultado: null, mostrada: null };

function tomarElementos() {
  const ids = [
    'calcForm', 'ancho', 'largo', 'pct', 'pctRange', 'min4', 'par', 'recub', 'estribo',
    'dimError', 'pctError', 'recubError', 'diamCaption', 'calcBtn', 'clearBtn',
    'menuBtn', 'advToggle', 'advBody', 'advCard', 'layout', 'results', 'resSub', 'emptyState', 'resultWrap',
    'sumCount', 'sumTitle', 'sumAsReq', 'sumAsProv', 'sumPct', 'sumBadge',
    'rDim', 'rArea', 'rPct', 'rAsReq', 'rN', 'rDiam', 'rAsProv', 'rPctReal', 'copyBtn', 'shareBtn',
    'sectionSvg', 'secMode', 'secLegend', 'secMeta', 'altBody', 'notes',
    'histList', 'histEmpty', 'clearHist', 'toast', 'toastMsg', 'toastAction',
    'protoNotice', 'protoNoticeText', 'appVersion',
  ];
  for (const id of ids) ui[id] = document.getElementById(id);
  ui.diamRadios = [...document.querySelectorAll('input[name="diam"]')];
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Lectura y escritura del formulario --- */

function numero(el) {
  const v = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
}

function diamSeleccionado() {
  const r = ui.diamRadios.find((x) => x.checked);
  return r ? r.value : 'auto';
}

function leerFormulario() {
  const entrada = {
    ancho: numero(ui.ancho),
    largo: numero(ui.largo),
    pct: numero(ui.pct),
    diam: diamSeleccionado(),
    min4: ui.min4.checked,
    par: ui.par.checked,
    recub: numero(ui.recub),
    estribo: ui.estribo.value,
  };

  const errores = {};
  for (const [clave, nombre] of [['ancho', 'ancho'], ['largo', 'largo']]) {
    const v = entrada[clave];
    if (!Number.isFinite(v)) errores[clave] = `Escribe el ${nombre} de la columna.`;
    else if (v < LIMITES.dimMin || v > LIMITES.dimMax) {
      errores[clave] = `El ${nombre} debe estar entre ${LIMITES.dimMin} y ${LIMITES.dimMax} cm.`;
    }
  }
  if (!Number.isFinite(entrada.pct) || entrada.pct < LIMITES.pctMin || entrada.pct > LIMITES.pctMax) {
    errores.pct = `El porcentaje de acero debe estar entre ${fmtN(LIMITES.pctMin)} % y ${LIMITES.pctMax} %.`;
  }
  if (!Number.isFinite(entrada.recub) || entrada.recub < LIMITES.recubMin || entrada.recub > LIMITES.recubMax) {
    errores.recub = `El recubrimiento debe estar entre ${LIMITES.recubMin} y ${LIMITES.recubMax} cm.`;
  }
  return { entrada, errores };
}

function mostrarErrores(errores) {
  const marcar = (input, malo) => input.closest('.num-pill, .pct-pill').classList.toggle('is-invalid', !!malo);
  marcar(ui.ancho, errores.ancho);
  marcar(ui.largo, errores.largo);
  marcar(ui.pct, errores.pct);
  marcar(ui.recub, errores.recub);
  ui.ancho.setAttribute('aria-invalid', !!errores.ancho);
  ui.largo.setAttribute('aria-invalid', !!errores.largo);
  ui.pct.setAttribute('aria-invalid', !!errores.pct);
  ui.recub.setAttribute('aria-invalid', !!errores.recub);
  ui.dimError.textContent = [errores.ancho, errores.largo].filter(Boolean).join(' ');
  ui.pctError.textContent = errores.pct || '';
  ui.recubError.textContent = errores.recub || '';
  if (errores.recub) abrirAvanzadas(true);
}

/** Estado crudo del formulario (para guardarlo tal cual en LocalStorage). */
function estadoFormulario() {
  const v = (el) => (el.value.trim() === '' ? '' : numero(el));
  return {
    ancho: v(ui.ancho), largo: v(ui.largo), pct: v(ui.pct), diam: diamSeleccionado(),
    min4: ui.min4.checked, par: ui.par.checked, recub: v(ui.recub), estribo: ui.estribo.value,
  };
}

function aplicarFormulario(datos) {
  const d = { ...DEFAULTS, ...datos };
  const poner = (el, val) => { el.value = val === '' || val == null || Number.isNaN(val) ? '' : String(val); };
  poner(ui.ancho, d.ancho);
  poner(ui.largo, d.largo);
  poner(ui.pct, d.pct);
  poner(ui.recub, d.recub);
  ui.min4.checked = !!d.min4;
  ui.par.checked = !!d.par;
  ui.estribo.value = ESTRIBOS[d.estribo] ? d.estribo : DEFAULTS.estribo;
  const radio = ui.diamRadios.find((r) => r.value === d.diam) || ui.diamRadios.find((r) => r.value === 'auto');
  radio.checked = true;
  sincronizarRango('pct');
  actualizarCaptionDiametro();
}

let guardarTimer = 0;
function guardarConfigDiferido() {
  clearTimeout(guardarTimer);
  guardarTimer = setTimeout(() => almacen.guardar(STORAGE_KEYS.config, estadoFormulario()), 250);
}

/* --- Controles --- */

function sincronizarRango(origen) {
  const min = parseFloat(ui.pctRange.min);
  const max = parseFloat(ui.pctRange.max);
  if (origen === 'range') {
    ui.pct.value = parseFloat(ui.pctRange.value).toFixed(1).replace(/\.0$/, '');
  } else {
    const v = numero(ui.pct);
    if (Number.isFinite(v)) ui.pctRange.value = String(Math.min(max, Math.max(min, v)));
  }
  const pos = ((parseFloat(ui.pctRange.value) - min) / (max - min)) * 100;
  ui.pctRange.style.setProperty('--fill', `${pos}%`);
}

function actualizarCaptionDiametro() {
  const id = diamSeleccionado();
  const v = buscarVarilla(id);
  ui.diamCaption.textContent = v
    ? `Ø ${v.nombre} · ${v.numero} · ${fmt(v.area)} cm²`
    : 'Recomendar automáticamente';
}

function pasoDimension(target, paso) {
  const input = ui[target];
  const actual = numero(input);
  const inicial = Number.isFinite(actual) ? actual : DEFAULTS[target];
  let nuevo = Number.isFinite(actual) ? inicial + paso : inicial;
  nuevo = Math.min(LIMITES.dimMax, Math.max(LIMITES.dimMin, Math.round(nuevo * 2) / 2));
  input.value = String(nuevo);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function abrirAvanzadas(abrir) {
  const abierto = typeof abrir === 'boolean' ? abrir : ui.advBody.hidden;
  ui.advBody.hidden = !abierto;
  ui.advCard.classList.toggle('is-open', abierto);
  ui.advToggle.setAttribute('aria-expanded', String(abierto));
  ui.menuBtn.setAttribute('aria-expanded', String(abierto));
}

/* --- Cálculo desde el formulario --- */

function onSubmit(ev) {
  ev.preventDefault();
  const { entrada, errores } = leerFormulario();
  mostrarErrores(errores);
  const primero = ['ancho', 'largo', 'pct', 'recub'].find((k) => errores[k]);
  if (primero) {
    ui[primero].focus();
    return;
  }

  almacen.guardar(STORAGE_KEYS.config, estadoFormulario());
  ui.calcBtn.classList.add('is-loading');
  ui.calcBtn.disabled = true;

  // Breve animación de carga (se omite si el usuario prefiere menos movimiento)
  setTimeout(() => {
    const res = calcular(entrada);
    mostrarResultado(res, { animar: true });
    agregarAlHistorial(res);
    ui.calcBtn.classList.remove('is-loading');
    ui.calcBtn.disabled = false;
    if (window.matchMedia('(max-width: 879px)').matches) {
      ui.results.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }, reduceMotion() ? 0 : 320);
}

function limpiar() {
  ui.ancho.value = '';
  ui.largo.value = '';
  ui.pct.value = String(DEFAULTS.pct);
  ui.diamRadios.find((r) => r.value === 'auto').checked = true;
  sincronizarRango('pct');
  actualizarCaptionDiametro();
  mostrarErrores({});
  estado.resultado = null;
  estado.mostrada = null;
  ui.resultWrap.hidden = true;
  ui.emptyState.hidden = false;
  ui.resSub.innerHTML = 'Ingresa las dimensiones y presiona <strong>Calcular</strong>.';
  almacen.guardar(STORAGE_KEYS.config, estadoFormulario());
  ui.ancho.focus();
}

/* --- Render de resultados --- */

function mostrarResultado(res, { animar = false } = {}) {
  estado.resultado = res;
  ui.emptyState.hidden = true;
  ui.resultWrap.hidden = false;
  if (animar && !reduceMotion()) {
    ui.resultWrap.classList.remove('is-fresh');
    void ui.resultWrap.offsetWidth; // reinicia la animación
    ui.resultWrap.classList.add('is-fresh');
  }

  const { entrada } = res;
  const modo = entrada.diam === 'auto'
    ? 'recomendación automática'
    : `diámetro elegido ${buscarVarilla(entrada.diam).nombre}`;
  ui.resSub.innerHTML =
    `Columna de <strong>${fmtN(entrada.ancho)} × ${fmtN(entrada.largo)} cm</strong> con ` +
    `<strong>${fmtN(entrada.pct)} %</strong> de acero · ${esc(modo)}.`;

  mostrarOpcion(res, res.elegida);
}

function modoDeOpcion(res, op) {
  if (op.tipo === 'mixta') return 'Combinación mixta';
  if (op === res.elegida) return res.entrada.diam === 'auto' ? 'Recomendación automática' : 'Diámetro elegido';
  return 'Alternativa';
}

/** Muestra una opción concreta (la elegida o una fila tocada en la tabla). */
function mostrarOpcion(res, op) {
  estado.mostrada = op;
  const { base, entrada } = res;
  const mixta = op.tipo === 'mixta';

  // Resumen
  ui.sumCount.textContent = String(op.n);
  ui.sumTitle.textContent = mixta
    ? `${op.n} varillas: ${nombreOpcion(op)}`
    : `${op.n} varillas Ø ${op.varilla.nombre}`;
  ui.sumAsReq.textContent = fmt(base.asReq);
  ui.sumAsProv.textContent = fmt(op.asProv);
  ui.sumPct.textContent = `${fmt(op.pctReal)} %`;
  const ok = cumple(op);
  ui.sumBadge.className = `badge ${ok ? 'badge--ok' : 'badge--warn'}`;
  ui.sumBadge.textContent = ok ? 'Cumple' : 'Revisar';

  // Tarjeta de resultados
  ui.rDim.textContent = `${fmtN(entrada.ancho)} × ${fmtN(entrada.largo)} cm`;
  ui.rArea.textContent = `${fmtN(base.area)} cm²`;
  ui.rPct.textContent = `${fmtN(entrada.pct)} %`;
  ui.rAsReq.textContent = `${fmt(base.asReq)} cm²`;

  let detalleN;
  if (mixta) {
    detalleN = `4 en esquinas + ${op.k} intermedias`;
  } else if (op.n !== op.nCalculado) {
    detalleN = `${fmt(op.nExacto)} → ${op.nCalculado} → ${op.n} (ajuste)`;
  } else {
    detalleN = `${fmt(op.nExacto)} → ${op.n} (hacia arriba)`;
  }
  ui.rN.innerHTML = `${op.n} varillas<small>${esc(detalleN)}</small>`;

  ui.rDiam.innerHTML = mixta
    ? `${esc(op.varilla.nombre)} + ${esc(op.intermedia.nombre)}<small>esquinas + intermedias</small>`
    : `${esc(op.varilla.nombre)} (${op.varilla.numero})<small>Ø ${fmt(op.varilla.d)} cm · ${fmt(op.varilla.area)} cm² c/u</small>`;
  ui.rAsProv.innerHTML = `${fmt(op.asProv)} cm²<small>+${fmt(op.excedente, 1)} % sobre lo requerido</small>`;
  ui.rPctReal.textContent = `${fmt(op.pctReal)} %`;

  // Esquema
  ui.secMode.textContent = modoDeOpcion(res, op);
  ui.sectionSvg.innerHTML = svgSeccion(op, base);
  const estribo = ui.estribo.options[ui.estribo.selectedIndex]?.text.split(' ')[0] || '3/8"';
  ui.secLegend.innerHTML = mixta
    ? `<span><i></i>Esquinas: 4 Ø ${esc(op.varilla.nombre)}</span>` +
      `<span><i class="is-int"></i>Intermedias: ${op.k} Ø ${esc(op.intermedia.nombre)}</span>` +
      `<span><i class="is-tie"></i>Estribo Ø ${esc(estribo)}</span>`
    : `<span><i></i>${op.n} varillas Ø ${esc(op.varilla.nombre)}</span>` +
      `<span><i class="is-tie"></i>Estribo Ø ${esc(estribo)}</span>`;

  const g = op.geo;
  const agrandadas = g.puntos.some((b) => b.d / 2 < Math.max(base.ancho, base.largo) * 0.017);
  let meta;
  if (g.sinEspacio) {
    meta = 'La sección es demasiado pequeña para el recubrimiento y estribo indicados.';
  } else if (g.caras) {
    meta =
      `Por cara: ${g.caras.superior} arriba · ${g.caras.inferior} abajo · ${g.caras.laterales} en cada lado. ` +
      `Separación libre mín.: ${fmt(g.sepLibre)} cm (se pide ≥ ${fmt(g.sepMin)} cm).`;
  } else {
    meta = `Con menos de 4 varillas no se cubren las 4 esquinas.`;
  }
  if (agrandadas) meta += ' Varillas agrandadas para que se vean.';
  ui.secMeta.textContent = `${meta} Esquema ilustrativo.`;

  renderTabla(res, op);
  renderNotas(res, op);
}

function renderTabla(res, activa) {
  const filas = [...res.simples];
  if (res.mixta) filas.push(res.mixta);

  ui.altBody.innerHTML = filas
    .map((o) => {
      const badges = [];
      if (o === res.recomendada) badges.push('<span class="badge badge--rec">Recomendada</span>');
      if (o.tipo === 'mixta') badges.push('<span class="badge badge--mix">Mixta</span>');
      if (res.entrada.diam !== 'auto' && o === res.elegida) badges.push('<span class="badge">Elegida</span>');
      // "Cabe" se omite en la recomendada (ya está implícito) para no saturar la fila
      if (!(o === res.recomendada && o.estado.clave === 'ok')) {
        badges.push(`<span class="badge badge--${o.estado.clave}">${esc(o.estado.texto)}</span>`);
      }

      const mixta = o.tipo === 'mixta';
      const tamPunto = (v) => Math.round(6 + v.d * 4);
      const etiqueta = mixta
        ? `<b>${esc(o.varilla.nombre)} + ${esc(o.intermedia.nombre)}</b><small>4 + ${o.k} intermedias</small>`
        : `<b>${esc(o.varilla.nombre)}</b><small>Varilla ${o.varilla.numero}</small>`;
      const seleccion = o === activa;

      return (
        `<tr class="alt-row${seleccion ? ' is-selected' : ''}${cumple(o) ? '' : ' is-muted'}" data-clave="${esc(o.clave)}" ` +
        `tabindex="0"${seleccion ? ' aria-current="true"' : ''}>` +
        `<td><span class="diam-cell"><span class="dot-slot"><i class="bar-dot" style="--s:${tamPunto(o.varilla)}px"></i></span>` +
        `<span>${etiqueta}</span></span></td>` +
        `<td class="num"><b class="cell-big">${o.n}</b></td>` +
        `<td class="num">${fmt(o.asProv)} cm²<small>+${fmt(o.excedente, 1)} %</small></td>` +
        `<td class="num">${fmt(o.pctReal)} %</td>` +
        `<td class="cell-badges"><span class="badges">${badges.join('')}</span></td>` +
        '</tr>'
      );
    })
    .join('');
}

function opcionPorClave(res, clave) {
  if (res.mixta && res.mixta.clave === clave) return res.mixta;
  return res.simples.find((o) => o.clave === clave) || null;
}

function notasPara(res, op) {
  const notas = [];
  const { entrada, recomendada, mixta } = res;
  const pct = entrada.pct;

  if (op.tipo === 'simple' && op.ajustes.length) {
    notas.push({
      tipo: 'info',
      texto: `Por cálculo se requieren ${op.nCalculado} varillas (${fmt(op.nExacto)} redondeado hacia arriba); ` +
        `se ajustó a ${op.n} por ${op.ajustes.join(' y ')}.`,
    });
  }
  if (op.n < 4) {
    notas.push({
      tipo: 'warn',
      texto: 'Con menos de 4 varillas no hay una varilla en cada esquina. Una columna rectangular requiere al menos 4.',
    });
  }
  if (op.geo.sinEspacio) {
    notas.push({ tipo: 'bad', texto: 'La sección es demasiado pequeña para el recubrimiento y el estribo indicados.' });
  } else if (!op.cabe && op.n >= 4) {
    notas.push({
      tipo: 'bad',
      texto: `Las varillas no caben con la separación libre mínima de ${fmt(op.geo.sepMin)} cm. ` +
        'Prueba un diámetro mayor, la combinación mixta o una sección más grande.',
    });
  }
  if (op.tipo === 'simple' && op.n >= 4 && op.n % 2 !== 0) {
    notas.push({
      tipo: 'info',
      texto: `Con ${op.n} varillas la distribución no es simétrica. Activa «Número par» si prefieres un armado simétrico.`,
    });
  }
  if (op !== recomendada && cumple(recomendada)) {
    notas.push({
      tipo: 'rec',
      texto: `Opción recomendada: ${nombreOpcion(recomendada)} = ${fmt(recomendada.asProv)} cm² ` +
        `(+${fmt(recomendada.excedente, 1)} %).`,
      clave: recomendada.clave,
    });
  }
  if (mixta && op !== mixta) {
    notas.push({
      tipo: 'rec',
      texto: `Combinación mixta con menos excedente: ${nombreOpcion(mixta)} = ${fmt(mixta.asProv)} cm² ` +
        `(+${fmt(mixta.excedente, 1)} %).`,
      clave: mixta.clave,
    });
  }
  if (!res.simples.some(cumple) && !mixta) {
    notas.push({
      tipo: 'bad',
      texto: 'Ninguna opción cabe con la separación mínima. Considera aumentar la sección o reducir el porcentaje de acero.',
    });
  }
  if (pct < CUANTIA.min) {
    notas.push({
      tipo: 'warn',
      texto: `${fmtN(pct)} % es menor que la cuantía mínima de ${CUANTIA.min} % que pide el ACI 318 para columnas. ` +
        'Verifica el mínimo de tu reglamento local.',
    });
  } else if (pct > CUANTIA.max) {
    notas.push({ tipo: 'bad', texto: `${fmtN(pct)} % excede la cuantía máxima de ${CUANTIA.max} % del ACI 318.` });
  } else if (pct > CUANTIA.congestion) {
    notas.push({
      tipo: 'warn',
      texto: `Cuantías mayores a ${CUANTIA.congestion} % suelen dificultar el colado y los traslapes. Revisa el armado con cuidado.`,
    });
  }
  if (Math.min(entrada.ancho, entrada.largo) < 20) {
    notas.push({
      tipo: 'warn',
      texto: 'Una dimensión menor a 20 cm es poco usual en columnas; verifica las dimensiones mínimas de tu reglamento.',
    });
  }
  if (cumple(op) && notas.every((n) => n.tipo === 'rec')) {
    notas.unshift({ tipo: 'ok', texto: `El armado alcanza el área requerida y las varillas caben con la separación mínima.` });
  }
  return notas;
}

function renderNotas(res, op) {
  const clase = { info: '', rec: '', ok: 'note--ok', warn: 'note--warn', bad: 'note--bad' };
  ui.notes.innerHTML = notasPara(res, op)
    .map(
      (n) =>
        `<div class="note ${clase[n.tipo]}"><span class="note__dot"></span><p class="note__body">${esc(n.texto)}</p>` +
        (n.clave ? `<button type="button" class="note__btn" data-clave="${esc(n.clave)}">Ver</button>` : '') +
        '</div>',
    )
    .join('');
}

/* --- Copiar resultado --- */

function textoResultado(res, op) {
  const { entrada, base } = res;
  return [
    'Calculadora de Varillas — resultado preliminar',
    `Columna: ${fmtN(entrada.ancho)} × ${fmtN(entrada.largo)} cm`,
    `Área: ${fmtN(base.area)} cm²`,
    `Acero requerido: ${fmtN(entrada.pct)} %`,
    `As requerido: ${fmt(base.asReq)} cm²`,
    `Varilla: ${op.tipo === 'mixta' ? nombreOpcion(op) : `${op.varilla.nombre} (${op.varilla.numero})`}`,
    `Cantidad: ${op.n} varillas`,
    `As proporcionada: ${fmt(op.asProv)} cm²`,
    `Acero real: ${fmt(op.pctReal)} %`,
    '',
    `Aviso: ${AVISO}`,
  ].join('\n');
}

/** Copia texto al portapapeles (con respaldo para navegadores sin Clipboard API). */
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* sin portapapeles */ }
    ta.remove();
  }
}

async function copiarResultado() {
  if (!estado.resultado || !estado.mostrada) return;
  await copiarTexto(textoResultado(estado.resultado, estado.mostrada));
  toast('Resultado copiado al portapapeles');
}

/* --- Notificación flotante --- */

let toastTimer = 0;
function toast(mensaje, { accion, alAccionar, duracion = 3200 } = {}) {
  clearTimeout(toastTimer);
  ui.toastMsg.textContent = mensaje;
  if (accion) {
    ui.toastAction.textContent = accion;
    ui.toastAction.hidden = false;
    ui.toastAction.onclick = () => {
      ui.toast.hidden = true;
      alAccionar?.();
    };
  } else {
    ui.toastAction.hidden = true;
    ui.toastAction.onclick = null;
  }
  ui.toast.hidden = false;
  if (duracion > 0) toastTimer = setTimeout(() => { ui.toast.hidden = true; }, duracion);
}
