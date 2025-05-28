@echo off
echo ========================================
echo  DFA & NFA Web Analyzer - Server Start
echo ========================================
echo.
echo Starting local development server...
echo Open your browser and go to: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

python -m http.server 8000
