@echo off
echo Starting Tuscarora Reservation System...
echo.

:: Start the backend API server which also serves the frontend
echo Starting backend server on Port 3001...
start "Tuscarora Server (Port 3001)" cmd /c "node server.js"

:: Wait a moment for server to spin up
timeout /t 3 /nobreak > nul

:: Open the browser directly to the server port
start http://localhost:3001

echo System is running! Keep the command prompt window open.
echo You can now close this window.
pause
