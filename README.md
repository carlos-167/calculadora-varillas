# Calculadora de Varillas para Columnas (PWA)

Aplicación web progresiva para calcular de forma **preliminar** el número y diámetro de varillas del refuerzo longitudinal de una columna rectangular de concreto reforzado. No necesita backend: todo se calcula en el navegador, se puede instalar como aplicación en Windows (o macOS) y funciona sin conexión después de la primera carga.

> ⚠️ **Aviso:** Esta herramienta proporciona cálculos preliminares. El armado definitivo de una columna debe ser determinado y revisado por un profesional responsable, considerando las cargas, materiales, condiciones de apoyo, confinamiento, normas y demás requisitos estructurales aplicables.

---

## Estructura del proyecto

```
/calculadora-varillas
│
├── index.html                Interfaz (barra de título, formulario, resultados, historial)
├── manifest.json             Manifiesto de la app (nombre, íconos, colores, display_override, share_target)
├── sw.js                     Service Worker (caché sin conexión y recepción de contenido compartido)
│
├── /css                      Estilos "Neo-Tactile" (se cargan en este orden)
│   ├── variables.css         Colores, radios, sombras y tipografía
│   ├── base.css              Reset, tipografía base y fondo decorativo
│   ├── layout.css            Encabezado, distribución general, pie y notificación
│   ├── barra-titulo.css      Barra de título para Window Controls Overlay
│   ├── formulario.css        Panel de vidrio, controles y botones
│   ├── resultados.css        Resultados, tabla de alternativas, notas y aviso
│   ├── historial.css         Lista de cálculos recientes
│   └── responsive.css        Tamaños de pantalla, movimiento reducido e impresión
│
├── /js                       Lógica (scripts en orden; comparten funciones)
│   ├── config.js             Catálogo de varillas, límites y valores por defecto
│   ├── utilidades.js         Formato de números, escape de HTML, LocalStorage
│   ├── calculos.js           Área, As, número de varillas y recomendación
│   ├── geometria.js          Distribución de varillas en la sección
│   ├── esquema-svg.js        Dibujo SVG de la sección
│   ├── interfaz.js           Formulario, validación, resultados y notificaciones
│   ├── historial.js          Historial en LocalStorage
│   ├── compartir.js          Compartir con otras apps (Web Share API y Web Share Target)
│   ├── pwa.js                Service worker, instalación y estado de conexión
│   ├── barra-titulo.js       Controles de la barra de título (Window Controls Overlay)
│   └── main.js               Arranque: conecta todos los eventos
│
├── /assets
│   ├── logo.svg              Logo del encabezado y favicon
│   └── /icons
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-maskable-512.png   (versión para íconos recortados en Android/Windows)
│
├── iniciar-servidor.bat      Doble clic para iniciar el servidor en Windows
└── iniciar-servidor.command  Doble clic para iniciar el servidor en macOS
```

---

## Cómo ejecutarla con un servidor local

La PWA **debe abrirse desde `http://localhost`** (no con doble clic sobre `index.html`), porque el Service Worker y la instalación solo funcionan en `localhost` o HTTPS.

### Opción 1 — Python (recomendada)

1. Abre una terminal **dentro de la carpeta** `calculadora-varillas`.
2. Ejecuta:

   **Windows**
   ```bash
   python -m http.server 8080
   ```
   (si no funciona, prueba `py -m http.server 8080`)

   **macOS / Linux**
   ```bash
   python3 -m http.server 8080
   ```

3. Abre en el navegador:
   ```text
   http://localhost:8080
   ```

Para detener el servidor presiona `Ctrl + C` en la terminal.

### Opción 2 — Doble clic

- **Windows:** doble clic en `iniciar-servidor.bat` (necesita Python instalado).
- **macOS:** doble clic en `iniciar-servidor.command`. La primera vez, si macOS lo bloquea, haz clic derecho → *Abrir*.

Ambos abren el navegador en `http://localhost:8080` automáticamente.

### Opción 3 — Node.js

```bash
npx serve -l 8080
```

---

## Cómo instalarla como aplicación

### Google Chrome
1. Abre `http://localhost:8080`.
2. Haz clic en el ícono de instalar (monitor con flecha ⊕) a la derecha de la barra de direcciones.
3. Confirma con **Instalar**.

### Microsoft Edge
1. Abre `http://localhost:8080`.
2. Usa el ícono de aplicación en la barra de direcciones, **o** el menú **⋯ → Aplicaciones → Instalar este sitio como aplicación**.
3. Confirma con **Instalar**.

La aplicación se abrirá en su propia ventana y quedará en el **menú Inicio** de Windows (o en el Launchpad de macOS). Para desinstalarla: ábrela → menú **⋯** de la ventana → *Desinstalar*.

> El ícono de instalar solo aparece cuando el navegador lo permite (Chrome/Edge, en `localhost` o HTTPS, y si la app aún no está instalada).
>
> **Edge en Windows** muestra después de instalar el cuadro *Aplicación instalada* con las opciones **Anclar a la barra de tareas**, **Anclar a Inicio**, **Crear acceso directo en el escritorio** e **Iniciar automáticamente al iniciar sesión**. Ese cuadro es del navegador: Chrome y Edge en macOS no lo muestran. En Mac, para dejarla en el Dock: con la app abierta, clic derecho en su ícono del Dock → **Opciones → Mantener en el Dock**.

### Probar el modo sin conexión
1. Abre la app una vez con el servidor encendido.
2. Detén el servidor (`Ctrl + C`) o desconecta la red.
3. Vuelve a abrir la app (instalada o en `http://localhost:8080`): sigue funcionando.

---

## Barra de título (Window Controls Overlay)

Cuando la app está **instalada en el escritorio** (Edge o Chrome), ocupa también el área de la barra de título, como VS Code o Teams. Basado en la guía de Microsoft: [Mostrar contenido en el área de la barra de título](https://learn.microsoft.com/es-es/microsoft-edge/progressive-web-apps/how-to/window-controls-overlay).

- **Cómo se activa:** `manifest.json` declara `"display_override": ["window-controls-overlay", "standalone"]`. Si el navegador no lo soporta, la app se abre en una ventana normal (`standalone`).
- **Posición:** `css/barra-titulo.css` usa `env(titlebar-area-x / -y / -width / -height)` para no tapar los botones del sistema (a la derecha en Windows, a la izquierda en macOS).
- **Controlador de arrastre:** toda la barra tiene `app-region: drag`, así que se puede tomar para mover la ventana. Los botones usan `app-region: no-drag` para seguir recibiendo clics.
- **5 controles:**

  | Control | Acción |
  |---|---|
  | **Calcular** | Envía el formulario |
  | **Limpiar** | Borra las dimensiones y el resultado |
  | **Copiar** | Copia el resultado al portapapeles |
  | **Historial** | Baja a *Cálculos recientes* |
  | **Imprimir** | Imprime el resultado |

- **Cambios de tamaño:** `js/barra-titulo.js` escucha `geometrychange` de `navigator.windowControlsOverlay` (con *debounce* de 200 ms). Si la barra mide menos de 560 px, los controles muestran solo el ícono.
- En el navegador normal (pestaña) la barra no se muestra; ahí se usa el encabezado de siempre.
- Desde la ventana instalada, el usuario puede alternar entre esta barra y la barra de título clásica con el botón **⌃** que aparece junto a los controles de la ventana.

**Probar sin instalar:** en DevTools de Edge → herramienta **Aplicación → Manifiesto → Window Controls Overlay → Simular**.

---

## Compartir contenido con otras aplicaciones

Basado en la guía de Microsoft [Compartir contenido con otras aplicaciones](https://learn.microsoft.com/es-es/microsoft-edge/progressive-web-apps/how-to/share). La app puede **enviar** el resultado a otras apps y **recibir** datos de una columna desde otras apps. El código está en `js/compartir.js` y en `sw.js`.

### Enviar (Web Share API)

El botón **Compartir** (ícono de flecha hacia arriba, junto a *Copiar* en *Resultado del cálculo*) llama a `navigator.share()` con:

| Campo | Contenido |
|---|---|
| `title` | `Calculadora de Varillas · 40 × 60 cm` |
| `text` | El mismo resumen que *Copiar* (dimensiones, As, varillas, % real y aviso) |
| `url` | Enlace que vuelve a abrir el mismo cálculo: `?ancho=40&largo=60&pct=2&diam=auto&min4=1&par=0&recub=4&estribo=3/8` |
| `files` | **Imagen PNG del esquema de la sección** (`columna-40x60.png`), solo si `navigator.canShare({ files })` lo permite |

- La imagen se genera al momento: el SVG del esquema se dibuja en un `<canvas>` con un encabezado (dimensiones y armado) y se convierte en `File`.
- Si el navegador no tiene `navigator.share`, el texto y el enlace se **copian al portapapeles**. Si el usuario cierra el cuadro (`AbortError`) no se muestra error.
- Solo funciona en `localhost` o HTTPS y como respuesta a un clic.

### Recibir (Web Share Target, método POST con archivos)

`manifest.json` registra la app como destino para compartir:

```json
"share_target": {
  "action": "./recibir-compartido",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url",
    "files": [
      { "name": "archivo", "accept": ["text/plain", ".txt", "text/csv", ".csv", "application/json", ".json"] }
    ]
  }
}
```

Flujo al compartir algo con **Varillas**:

1. El sistema envía un `POST` a `./recibir-compartido` con `title`, `text`, `url` y el archivo (si hay).
2. `sw.js` intercepta la petición, lee `request.formData()` (y el texto de cada archivo con `await archivo.text()`), lo guarda en la caché `compartido-varillas` y responde `Response.redirect('./?compartido=1', 303)`.
3. `js/compartir.js` lee esos datos, busca las dimensiones y el porcentaje, llena el formulario, calcula y lo guarda en el historial.

Qué entiende:

| Lo compartido | Resultado |
|---|---|
| `Columna de 40 x 60 cm con 2 %` (o `40×60`, `40 por 60`) | Ancho 40, largo 60, 2 % |
| Un enlace generado por *Compartir* | Todos los datos (diámetro, ajustes, recubrimiento, estribo) |
| Un archivo `.txt` / `.csv` con ese texto | Igual que el texto |
| Un archivo `.json` como `{"ancho":40,"largo":60,"pct":2}` | Esos datos |

Como todo pasa en el service worker, también funciona **sin conexión**.

> **Importante:** solo una PWA **instalada** aparece como destino al compartir, y solo en sistemas que lo admiten (Windows con Edge o Chrome, Android, ChromeOS). **macOS no admite Web Share Target**; ahí sí funciona enviar.

**Probar la recepción sin instalar** (con la app abierta en `http://localhost:8080` al menos una vez, para que el service worker esté activo), en la consola de DevTools:

```js
const datos = new FormData();
datos.append('text', 'Columna de 35 x 50 cm con 1.5 % de acero');
await fetch('./recibir-compartido', { method: 'POST', body: datos });
location.href = './?compartido=1';
```

**Probar un enlace compartido:** abre `http://localhost:8080/?ancho=40&largo=60&pct=2&diam=auto`.

---

## Cómo publicar una nueva versión

1. Modifica los archivos que necesites.
2. En `sw.js` cambia la constante `VERSION` (por ejemplo, de `'v1.2.0'` a `'v1.2.1'`) y, si agregaste archivos, súmalos a la lista `PRECACHE`. Actualiza también `APP_VERSION` en `js/config.js`.
3. Al abrir la app, el navegador detecta el cambio, descarga los archivos nuevos, borra la caché anterior y muestra el aviso **"Se instaló una nueva versión — Recargar"**.

Además, cada archivo se revalida en segundo plano en cada visita, así que los cambios pequeños también llegan en la siguiente apertura.

---

## Fórmulas utilizadas

| Concepto | Fórmula |
|---|---|
| Área de la columna | `A = ancho × largo` (cm²) |
| Área de acero requerida | `As = A × % / 100` (cm²) |
| Área de una varilla | `Av = π × d² / 4`, con `d` en cm (`d = pulgadas × 2.54`) |
| Número de varillas | `n = As / Av`, **redondeado siempre hacia arriba** |
| Área de acero proporcionada | `As prop = n × Av` |
| Porcentaje real de acero | `% real = As prop / A × 100` |

Diámetros incluidos:

| Varilla | Diámetro | Área |
|---|---|---|
| 3/8" (#3) | 0.953 cm | 0.71 cm² |
| 1/2" (#4) | 1.270 cm | 1.27 cm² |
| 5/8" (#5) | 1.588 cm | 1.98 cm² |
| 3/4" (#6) | 1.905 cm | 2.85 cm² |
| 1" (#8) | 2.540 cm | 5.07 cm² |
| 1 1/4" (#10) | 3.175 cm | 7.92 cm² |

### Ajustes opcionales
- **Mínimo 4 varillas** (activado por defecto): una columna rectangular necesita al menos una varilla en cada esquina.
- **Número par** (desactivado por defecto): sube a número par para una distribución simétrica.

Cuando se aplica un ajuste, el resultado muestra el cálculo directo y el ajuste (por ejemplo `4.55 → 5 → 6`).

### Recomendación automática ("Auto")
Para cada diámetro se calcula el número de varillas y se revisa si caben en el perímetro con una **separación libre mínima** del mayor entre `1.5 × d` y `4 cm`, usando el recubrimiento libre y el diámetro de estribo de *Opciones avanzadas*.
Entre las opciones con **al menos 4 varillas que caben**, se recomienda la de **menor área de acero proporcionada** (menor excedente); si empatan, la de menos varillas.

También se busca una **combinación mixta** (4 varillas de esquina + intermedias de uno o dos diámetros menores, en número par). Se muestra solo si tiene menos excedente que la mejor opción de un solo diámetro.

### Observaciones que muestra la app
- Cuantía menor a 1 % o mayor a 8 % (límites del ACI 318) y aviso de congestión arriba de 4 %.
- Varillas que no caben con la separación mínima.
- Menos de 4 varillas o distribución no simétrica.

---

## Historial

Cada cálculo se guarda en **LocalStorage** (solo en ese navegador y dispositivo) con fecha y hora, dimensiones, porcentaje, diámetro, número de varillas y resultado. Se puede volver a cargar un cálculo tocándolo, eliminar uno con la ✕ o borrar todo con **Eliminar historial**. La última configuración del formulario también se recuerda.

---

## Personalización rápida

- **Diámetros:** arreglo `VARILLAS` en `js/config.js` (y su botón en `index.html`).
- **Límites y criterios:** constantes `LIMITES`, `CUANTIA`, `SEP_LIBRE_FACTOR`, `SEP_LIBRE_MIN_CM` y `DEFAULTS` en `js/config.js`.
- **Colores:** variables CSS en `:root` de `css/variables.css`.
- **Controles de la barra de título:** botones en `index.html` (`#titleBar`) y sus acciones en `accionesBarra` de `js/barra-titulo.js`.
- **Nombre e íconos de la app instalada:** `manifest.json`.
