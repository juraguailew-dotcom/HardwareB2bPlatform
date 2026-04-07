@echo off
echo [1/5] Removing frontend node_modules...
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"

echo [2/5] Removing frontend build output...
if exist "frontend\build" rmdir /s /q "frontend\build"

echo [3/5] Removing frontend package-lock.json...
if exist "frontend\package-lock.json" del /f /q "frontend\package-lock.json"

echo [4/5] Removing backend node_modules...
if exist "backend\node_modules" rmdir /s /q "backend\node_modules"

echo [5/5] Removing backend package-lock.json and temp scripts...
if exist "backend\package-lock.json" del /f /q "backend\package-lock.json"
if exist "backend\temp_run_migrations_check.js" del /f /q "backend\temp_run_migrations_check.js"
if exist "backend\temp_shop_user_cleanup_check.js" del /f /q "backend\temp_shop_user_cleanup_check.js"
if exist "backend\temp_shop_user_cleanup_delete.js" del /f /q "backend\temp_shop_user_cleanup_delete.js"

echo.
echo Done. Run the following to reinstall dependencies:
echo   cd frontend ^&^& npm install
echo   cd backend  ^&^& npm install
