@echo off
REM Run this by double-clicking to install deps (if needed) and start the server in a new window.
SETLOCAL
cd /d "%~dp0"
echo Installing dependencies (only runs if node_modules missing)...
if not exist node_modules (
  npm install
) else (
  echo node_modules exists, skipping install
)
echo Starting server (will keep this window open)...
call npm run dev
pause
ENDLOCAL
