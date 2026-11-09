'use strict';

/* =============================================================
   Calculadora de Varillas — js/barra-titulo.js
   -------------------------------------------------------------
   Superposición de controles de ventana (Window Controls Overlay).
   Cuando la app está instalada en el escritorio (Edge / Chrome) y
   el manifiesto declara "display_override": ["window-controls-overlay"],
   el contenido ocupa también el área de la barra de título. Ahí se
   muestra una barra propia que sirve para arrastrar la ventana y
   tiene 5 controles:

     1. Calcular        → envía el formulario
     2. Limpiar         → borra las dimensiones y el resultado
     3. Copiar          → copia el resultado al portapapeles
     4. Historial       → baja a «Cálculos recientes»
     5. Imprimir        → imprime el resultado

   La posición y el tamaño se controlan desde CSS con las variables
   env(titlebar-area-*) (ver css/barra-titulo.css); aquí solo se
   conectan los botones y se reacciona a los cambios de tamaño.
   ============================================================= */

/** Ancho de la barra (px) por debajo del cual los controles muestran solo el ícono. */
const BARRA_ANCHO_COMPACTO = 560;

/** Retrasa `func` hasta que pasen `espera` ms sin nuevas llamadas. */
function debounce(func, espera) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), espera);
  };
}

const accionesBarra = {
  calcular() {
    ui.calcForm.requestSubmit();
  },
  limpiar() {
    limpiar();
  },
  copiar() {
    if (!estado.resultado) {
      toast('Primero calcula un resultado para poder copiarlo');
      return;
    }
    copiarResultado();
  },
  historial() {
    document.querySelector('.history').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  },
  imprimir() {
    if (!estado.resultado) {
      toast('Primero calcula un resultado para poder imprimirlo');
      return;
    }
    window.print();
  },
};

/** Ajusta la barra al área disponible (puede cambiar al redimensionar la ventana). */
function ajustarBarraTitulo(rect) {
  const barra = document.getElementById('titleBar');
  const wco = navigator.windowControlsOverlay;
  const visible = !!wco && wco.visible;

  document.documentElement.classList.toggle('wco-visible', visible);
  const ancho = rect?.width ?? (visible ? wco.getTitlebarAreaRect().width : window.innerWidth);
  barra.classList.toggle('titlebar--compacta', ancho < BARRA_ANCHO_COMPACTO);
}

function iniciarBarraTitulo() {
  const barra = document.getElementById('titleBar');

  barra.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-accion]');
    if (btn) accionesBarra[btn.dataset.accion]?.();
  });

  ajustarBarraTitulo();

  // Ambos eventos se disparan muchas veces al redimensionar: se limitan con debounce.
  // geometrychange avisa además cuando el usuario muestra u oculta la barra de título.
  if ('windowControlsOverlay' in navigator) {
    navigator.windowControlsOverlay.addEventListener(
      'geometrychange',
      debounce((e) => ajustarBarraTitulo(e.titlebarAreaRect), 200),
    );
  }
  window.addEventListener('resize', debounce(() => ajustarBarraTitulo(), 200));
}
