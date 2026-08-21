@echo off
cd /d "%~dp0"
REM Use Webpack instead of Turbopack: this project path contains Korean
REM characters and Turbopack panics on a char-boundary error (ident.rs).
REM Next 16 defaults to Turbopack in dev, so opt out explicitly.
call npm run dev -- --webpack
