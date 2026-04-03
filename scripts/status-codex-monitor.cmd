@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%codex-manager.js" status %*
