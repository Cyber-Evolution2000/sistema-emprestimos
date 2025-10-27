<?php
// Configurações da API SICOOB
define("URL_AUTENTICACAO", "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token");
define("URL_PIX", "https://api.sicoob.com.br/pix/api/v2");
define("SICOOBPIX_CLIENT_ID", "1f3fc5a0-1b43-46c5-a0f6-a3ff93dd2f59");

// Certificados - AJUSTE OS CAMINHOS PARA O RENDER
define("SICOOBPIX_CAMINHO_CERT_PUBLICO", __DIR__ . "/cert/ChavePública.pem");
define("SICOOBPIX_CAMINHO_CERT_PRIVADO", __DIR__ . "/cert/chave_privada.pem");
define("SICOOBPIX_SENHA_CERT", "");

// Suas informações
define("SICOOBPIX_CHAVE", "24430463000151");
define("SICOOBPIX_TITULAR", "P C LIMA INACIO");
define("SICOOBPIX_CID_TITULAR", "BELO HORIZONTE");
define("SITE_NOME", "Sistema PIX SICOOB");

// Configurações do ambiente
define("BASE_URL", getBaseUrl());

function getBaseUrl() {
    // No Render, usa a URL do serviço
    if (isset($_SERVER['RENDER_EXTERNAL_URL'])) {
        return $_SERVER['RENDER_EXTERNAL_URL'];
    }
    
    // Para desenvolvimento local
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
    return $protocol . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}
?>