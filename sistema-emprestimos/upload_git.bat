@echo off
echo ========================================
echo    UPLOAD AUTOMATICO PARA GITHUB
echo ========================================

git add .
git commit -m "Atualizacao %date% %time%"
git push origin main

echo.
echo UPLOAD CONCLUIDO!
pause