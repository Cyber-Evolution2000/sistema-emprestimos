<?php
require_once 'config.php';
require_once 'Sicoob.php';

// URL do ngrok - ATUALIZE COM SUA URL REAL
$urlNgrok = 'https://SEU-CODIGO.ngrok.io'; // ← ATUALIZE ESTA LINHA
$urlWebhook = $urlNgrok . '/webhook-receiver.php';

try {
    $sicoob = new Sicoob();
    
    echo "<h2>🔧 Configurando Webhook SICOOB</h2>";
    echo "<p><strong>URL do Ngrok:</strong> $urlNgrok</p>";
    echo "<p><strong>URL do Webhook:</strong> $urlWebhook</p>";
    echo "<p><strong>Chave PIX:</strong> " . SICOOBPIX_CHAVE . "</p>";
    
    // Deletar webhook anterior (se existir)
    try {
        $sicoob->deletarWebhook(SICOOBPIX_CHAVE);
        echo "<p>♻️ Webhook anterior removido</p>";
    } catch (Exception $e) {
        // Ignora erro se não existir webhook anterior
    }
    
    // Configurar novo webhook
    echo "<p>🔄 Configurando novo webhook...</p>";
    $resultado = $sicoob->configurarWebhook(SICOOBPIX_CHAVE, $urlWebhook);
    
    echo "<p style='color: green;'>✅ Webhook configurado com sucesso!</p>";
    
    if ($resultado !== null) {
        echo "<pre>" . json_encode($resultado, JSON_PRETTY_PRINT) . "</pre>";
    }
    
    // Consultar para confirmar
    echo "<h3>🔍 Confirmando configuração...</h3>";
    $consulta = $sicoob->consultarWebhook(SICOOBPIX_CHAVE);
    echo "<pre>" . json_encode($consulta, JSON_PRETTY_PRINT) . "</pre>";
    
    // Mostrar instruções de teste
    echo "<div style='background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0;'>";
    echo "<h3>🎯 Para testar os webhooks:</h3>";
    echo "<ol>";
    echo "<li>Gere um novo PIX em <a href='index.php'>index.php</a></li>";
    echo "<li>Pague o PIX usando seu app de banco</li>";
    echo "<li>O SICOOB enviará uma notificação para: <code>$urlWebhook</code></li>";
    echo "<li>Verifique os logs em <a href='verificar-webhooks.php'>verificar-webhooks.php</a></li>";
    echo "</ol>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Erro: " . $e->getMessage() . "</p>";
    
    // Mostrar detalhes do erro
    echo "<details style='background: #ffe8e8; padding: 15px; border-radius: 8px; margin: 15px 0;'>";
    echo "<summary><strong>🔧 Detalhes do Erro</strong></summary>";
    echo "<pre>" . $e->getMessage() . "</pre>";
    echo "</details>";
}

echo "<br><a href='index.php'>🏠 Voltar ao Sistema PIX</a>";
?>