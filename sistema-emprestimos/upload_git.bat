@echo off
chdir /d "C:\xampp\htdocs\sistema-emprestimos"
REM Substitua pelo caminho real da sua pasta

echo ========================================
echo    UPLOAD AUTOMATICO PARA GITHUB
echo ========================================

git add .
git commit -m "Atualizacao automatica"
git push origin main

echo.
echo UPLOAD CONCLUIDO!
pause