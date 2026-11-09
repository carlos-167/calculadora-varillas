#!/bin/bash
# ============================================================
#  Calculadora de Varillas - servidor local para macOS
#  Doble clic para iniciar. Ctrl + C para detener.
# ============================================================
cd "$(dirname "$0")" || exit 1
PORT=8080

echo ""
echo "  Calculadora de Varillas"
echo "  Abre en el navegador:  http://localhost:$PORT"
echo "  Para detener el servidor: Ctrl + C"
echo ""

# Abre el navegador cuando el servidor ya está escuchando
( sleep 1.5; open "http://localhost:$PORT" ) &

python3 -m http.server "$PORT"
