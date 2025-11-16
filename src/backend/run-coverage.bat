@echo off
REM Run from backend directory
cd /d c:\Users\jayan\Downloads\PESU_RR_CSE_E_P31_Dynamic_FAQ_Builder_FAQ-tory-main\src\backend

echo ========== INSTALLING DEPENDENCIES ==========
call npm install

echo.
echo ========== ENSURING ESLint IS INSTALLED ==========
call npm list eslint >nul 2>&1 || call npm install --save-dev eslint@8.54.0

echo.
echo ========== RUNNING LINTING (FIXING ERRORS) ==========
call npm run lint:fix

echo.
echo ========== RUNNING TESTS WITH COVERAGE ==========
call npm run test:coverage

echo.
echo ========== TEST AND LINT COMPLETE ==========
echo Check the coverage report above to verify >75%% coverage achieved
echo.
pause
