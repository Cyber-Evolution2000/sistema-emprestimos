#!/bin/bash
echo "🚀 Instalando dependências PHP..."
curl -sS https://getcomposer.org/installer | php
php composer.phar install --no-dev --optimize-autoloader

echo "📁 Criando diretórios necessários..."
mkdir -p cert
mkdir -p logs

echo "✅ Build concluído!"