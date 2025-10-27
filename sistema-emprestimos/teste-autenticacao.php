<?php
require_once 'config.php';
require_once 'Sicoob.php';

echo "<h2>🔐 Testando Autenticação com SICOOB</h2>";

try {
    $sicoob = new Sicoob();
    
    // Testa a autenticação
    echo "<p>🔄 Conectando com SICOOB...</p>";
    
    // Usa o método público de teste
    $resultado = $sicoob->testarAutenticacao();
    
    if ($resultado['sucesso']) {
        echo "<p style='color: green; font-size: 20px;'>🎉 ✅ AUTENTICAÇÃO BEM-SUCEDIDA!</p>";
        echo "<p><strong>Token:</strong> " . $resultado['token'] . "</p>";
        echo "<p><strong>Status:</strong> " . $resultado['mensagem'] . "</p>";
        
        // Testa criar uma cobrança de R$ 1,00
        echo "<p>🔄 Testando criação de cobrança...</p>";
        
        $cobranca = [
            'calendario' => [
                'expiracao' => 300 // 5 minutos
            ],
            'valor' => [
                'original' => '1.00'
            ],
            'chave' => SICOOBPIX_CHAVE,
            'solicitacaoPagador' => 'Teste de integração'
        ];
        
        $resposta = $sicoob->criarCob($cobranca);
        
        if (isset($resposta['location'])) {
            echo "<p style='color: green;'>✅ Cobrança criada com sucesso!</p>";
            echo "<p><strong>TXID:</strong> " . $resposta['txid'] . "</p>";
            echo "<p><strong>Location:</strong> " . $resposta['location'] . "</p>";
            
            echo "<h3 style='color: green;'>🎊 SISTEMA FUNCIONANDO PERFEITAMENTE!</h3>";
            echo "<p><a href='index.php' style='background: green; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>🚀 Ir para o Sistema PIX</a></p>";
            
        } else {
            echo "<p style='color: orange;'>⚠️ Cobrança não criada, mas autenticação OK</p>";
            echo "<pre>" . json_encode($resposta, JSON_PRETTY_PRINT) . "</pre>";
        }
        
    } else {
        echo "<p style='color: red;'>❌ Falha na autenticação: " . $resultado['erro'] . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ ERRO: " . $e->getMessage() . "</p>";
    echo "<p><strong>Arquivo:</strong> " . $e->getFile() . "</p>";
    echo "<p><strong>Linha:</strong> " . $e->getLine() . "</p>";
}

// Verifica certificados
echo "<h3>📋 Verificação dos Certificados:</h3>";
$certPublico = file_exists(SICOOBPIX_CAMINHO_CERT_PUBLICO);
$certPrivado = file_exists(SICOOBPIX_CAMINHO_CERT_PRIVADO);

echo "<p>" . ($certPublico ? "✅" : "❌") . " Certificado público: " . SICOOBPIX_CAMINHO_CERT_PUBLICO . "</p>";
echo "<p>" . ($certPrivado ? "✅" : "❌") . " Chave privada: " . SICOOBPIX_CAMINHO_CERT_PRIVADO . "</p>";

if ($certPublico && $certPrivado) {
    echo "<p>✅ Ambos os certificados encontrados!</p>";
    
    // Verifica conteúdo
    $conteudoPrivado = file_get_contents(SICOOBPIX_CAMINHO_CERT_PRIVADO);
    if (strpos($conteudoPrivado, 'BEGIN RSA PRIVATE KEY') !== false) {
        echo "<p>✅ Formato da chave privada: RSA PRIVATE KEY (correto)</p>";
    }
}
?>