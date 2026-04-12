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

:: ── Read VITE_PORT from frontend/.env (default to 5173) ──────────────────────
call :readEnvValue "%ROOT%frontend\.env" "VITE_PORT" "5173" VITE_PORT

echo  Detected frontend port: %VITE_PORT%
echo.

echo  [1/2] Starting Frontend Server (port %VITE_PORT%)...
start "TrackMate Frontend" cmd /k "cd /d ""%ROOT%frontend"" & npm run dev"

echo  [2/2] Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo  [3/3] Opening browser at http://localhost:%VITE_PORT%
start "" "http://localhost:%VITE_PORT%"

echo.
echo  ✓ Frontend server is running!
echo    Frontend → http://localhost:%VITE_PORT%
echo.
echo  Close the server windows above to stop the server.
echo.
pause
goto :eof

:readEnvValue
setlocal EnableDelayedExpansion
set "filePath=%~1"
set "key=%~2"
set "result=%~3"

if exist "%filePath%" (
  for /f "usebackq tokens=* delims=" %%L in ("%filePath%") do (
    set "line=%%L"
    if defined line if not "!line:~0,1!"=="#" (
      for /f "tokens=1,* delims==" %%A in ("!line!") do (
        if /i "%%~A"=="!key!" set "result=%%~B"
      )
    )
  )
)

set "result=!result: =!"
set "result=!result:"=!"

endlocal & set "%~4=%result%"
goto :eof
