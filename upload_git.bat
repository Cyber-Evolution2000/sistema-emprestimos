@echo off
echo ========================================
echo    UPLOAD AUTOMATICO PARA GITHUB
echo ========================================
echo.

REM Navegar para a pasta do projeto
cd /d "C:\xampp\htdocs\sistema-emprestimos"

REM Verificar se está na pasta correta
if not exist "index.html" (
    echo ERRO: Nao estou na pasta do projeto!
    echo Certifique-se de que o sistema-emprestimos esta em C:\xampp\htdocs\
    pause
    exit /b 1
)

echo 1. Verificando status do Git...
git status

echo.
echo 2. Adicionando TODOS os arquivos...
git add .

echo.
echo 3. Fazendo commit das alteracoes...
git commit -m "Atualizacao automatica: %date% %time%"

echo.
echo 4. Enviando para o GitHub...
git push origin main

echo.
echo 5. Verificando status final...
git status

echo.
echo ========================================
echo    UPLOAD CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Acesse: https://github.com/Cyber-Evolution2000/sistema-emprestimos
echo.
pause