@echo off
setlocal

cd /d "%~dp0"

set "FIREBASE_CMD="
where firebase >nul 2>nul
if %errorlevel%==0 set "FIREBASE_CMD=firebase"

if not defined FIREBASE_CMD (
  where npx >nul 2>nul
  if %errorlevel%==0 set "FIREBASE_CMD=npx firebase-tools"
)

if not defined FIREBASE_CMD (
  echo [ERROR] Firebase CLI and npx were not found.
  echo Install Node.js first, then run:
  echo npm install -g firebase-tools
  pause
  exit /b 1
)

:menu
cls
echo ========================================
echo Firebase Deploy Helper
echo Project folder: %CD%
echo Command: %FIREBASE_CMD%
echo ========================================
echo [1] First-time setup ^(login + use --add^)
echo [2] Deploy all ^(hosting + firestore rules + storage rules^)
echo [3] Deploy hosting only
echo [4] Deploy rules only ^(Firestore + Storage^)
echo [5] Exit
echo.
set /p CHOICE=Enter 1-5: 

if "%CHOICE%"=="1" goto setup
if "%CHOICE%"=="2" goto deploy_all
if "%CHOICE%"=="3" goto deploy_hosting
if "%CHOICE%"=="4" goto deploy_rules
if "%CHOICE%"=="5" goto end

echo.
echo Invalid option.
pause
goto menu

:setup
call %FIREBASE_CMD% login
if errorlevel 1 goto failed
call %FIREBASE_CMD% use --add
if errorlevel 1 goto failed
echo.
echo Setup complete.
pause
goto menu

:deploy_all
call %FIREBASE_CMD% deploy
goto after_command

:deploy_hosting
call %FIREBASE_CMD% deploy --only hosting
goto after_command

:deploy_rules
call %FIREBASE_CMD% deploy --only firestore:rules,storage
goto after_command

:after_command
if errorlevel 1 goto failed
echo.
echo Done.
pause
goto menu

:failed
echo.
echo Command failed. Check the message above.
pause
goto menu

:end
endlocal