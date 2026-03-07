@echo off
echo Starting Tuscarora Reservation System...
echo.

:: Start the backend API server in a separate window
start "Backend Server (Port 3001)" cmd /c "node server.js"

:: Start the frontend server and open the browser
echo Starting frontend server...
start "Frontend Server (Port 3000)" cmd /c "npx serve -p 3000"

:: Wait a moment for servers to spin up
timeout /t 3 /nobreak > nul

:: Open the browser
start http://localhost:3000

echo System is running! Keep the two new command prompt windows open.
echo You can now close this window.
pause
