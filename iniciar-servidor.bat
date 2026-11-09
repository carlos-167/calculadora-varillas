@echo off
REM ============================================================
REM  Calculadora de Varillas - servidor local para Windows
REM  Doble clic para iniciar. Ctrl + C para detener.
REM ============================================================
cd /d "%~dp0"
set PORT=8080

where py >nul 2>nul && (set PY=py) || (set PY=python)

echo.
echo   Calculadora de Varillas
echo   Abre en el navegador:  http://localhost:%PORT%
echo   Para detener el servidor: Ctrl + C
echo.

REM Abre el navegador 2 segundos despues de iniciar el servidor
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"

%PY% -m http.server %PORT%

echo.
echo   No se pudo iniciar el servidor. Verifica que Python este instalado:
echo   https://www.python.org/downloads/
pause
