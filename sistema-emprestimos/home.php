<?php
require_once 'config.php';
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NOME ?></title>
    <style>
        /* Mantenha o mesmo CSS do index.php original */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        /* ... resto do CSS igual ao index.php original ... */
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 Gerar QR Code PIX</h1>
        
        <form action="gerar-pix" method="POST">
            <div class="form-group">
                <label for="valor">Valor do PIX:</label>
                <input type="number" id="valor" name="valor" step="0.01" min="0.01" 
                       placeholder="Ex: 50.00" required>
            </div>
            
            <div class="form-group">
                <label for="descricao">Descrição/Mensagem:</label>
                <input type="text" id="descricao" name="descricao" 
                       placeholder="Ex: Pagamento de serviço" required>
            </div>
            
            <button type="submit">🎯 Gerar QR Code PIX</button>
        </form>
        
        <!-- Seção Webhooks -->
        <div style="margin-top: 30px; padding: 20px; background: #e8f4f8; border-radius: 10px;">
            <h3>🔔 Configuração de Webhooks</h3>
            <p>Configure notificações automáticas quando PIX forem recebidos:</p>
            
            <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                <a href="configurar-webhook" 
                   style="padding: 10px 15px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">
                   ⚙️ Configurar Webhook
                </a>
                
                <a href="verificar-webhooks" 
                   style="padding: 10px 15px; background: #17a2b8; color: white; text-decoration: none; border-radius: 5px;">
                   🔍 Verificar Status
                </a>
                
                <a href="consultar-pix" 
                   style="padding: 10px 15px; background: #6f42c1; color: white; text-decoration: none; border-radius: 5px;">
                   📋 Consultar PIX
                </a>
            </div>
        </div>
        
        <div class="info">
            <strong>💡 Informações:</strong><br>
            • Pagamento via PIX<br>
            • Recebimento na conta SICOOB<br>
            • Titular: <?= SICOOBPIX_TITULAR ?><br>
            • Chave PIX: <?= SICOOBPIX_CHAVE ?>
        </div>
    </div>
</body>
</html>