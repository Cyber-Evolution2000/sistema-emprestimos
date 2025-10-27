<?php
require_once 'config.php';
require_once 'Sicoob.php';

try {
    $sicoob = new Sicoob();
    
    echo "<h2>🔍 Status dos Webhooks SICOOB</h2>";
    
    // Consultar webhook específico
    echo "<h3>📋 Webhook da Chave PIX</h3>";
    $webhook = $sicoob->consultarWebhook(SICOOBPIX_CHAVE);
    echo "<pre>" . json_encode($webhook, JSON_PRETTY_PRINT) . "</pre>";
    
    // Consultar todos os webhooks
    echo "<h3>📋 Todos os Webhooks</h3>";
    $todosWebhooks = $sicoob->consultarWebhook();
    echo "<pre>" . json_encode($todosWebhooks, JSON_PRETTY_PRINT) . "</pre>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Erro: " . $e->getMessage() . "</p>";
}

// Mostrar log de webhooks
echo "<h3>📝 Log de Webhooks Recebidos</h3>";
$arquivoLog = __DIR__ . '/webhook.log';
if (file_exists($arquivoLog)) {
    echo "<pre style='background: #f5f5f5; padding: 15px; border-radius: 5px; max-height: 400px; overflow-y: auto;'>";
    echo htmlspecialchars(file_get_contents($arquivoLog));
    echo "</pre>";
} else {
    echo "<p>Nenhum webhook recebido ainda.</p>";
}

// Mostrar PIX recebidos
echo "<h3>💰 PIX Recebidos</h3>";
$arquivoPix = __DIR__ . '/pix-recebidos.json';
if (file_exists($arquivoPix)) {
    $pixRecebidos = json_decode(file_get_contents($arquivoPix), true);
    echo "<pre>" . json_encode($pixRecebidos, JSON_PRETTY_PRINT) . "</pre>";
} else {
    echo "<p>Nenhum PIX recebido ainda.</p>";
}

echo "<br><a href='index.php'>🏠 Voltar ao Sistema PIX</a>";
?>