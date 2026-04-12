@echo off
setlocal EnableExtensions EnableDelayedExpansion

title TrackMate Dev Launcher
color 0A

echo.
echo  =========================================
echo    TrackMate - Starting Development Servers
echo  =========================================
echo.

set "ROOT=%~dp0"

echo  [1/3] Starting Backend Server (port 5000)...
start "TrackMate Backend" cmd /k "cd /d ""%ROOT%backend"" & npm run dev"

echo  [2/3] Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo  [3/3] Starting Frontend Server (port 5173)...
start "TrackMate Frontend" cmd /k "cd /d ""%ROOT%frontend"" & npm run dev"

echo  Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak >nul

echo  [4/4] Opening browser at http://localhost:5173
start "" "http://localhost:5173"

echo.
echo  ==========================================
echo   All servers running!
echo   Frontend  --> http://localhost:5173
echo   Backend   --> http://localhost:5000
echo  ==========================================
echo.
echo  Demo Login Credentials:
echo    Admin:   admin    / admin123
echo    Driver:  driver1  / driver123
echo    Student: student1 / student123
echo.
echo  Close the server windows above to stop the servers.
echo.
pause
goto :eof
