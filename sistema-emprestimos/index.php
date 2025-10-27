<?php
require_once 'vendor/autoload.php';

// Roteamento básico
$request = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($request, PHP_URL_PATH);

// Rotas
switch ($path) {
    case '/':
        require 'home.php';
        break;
    case '/gerar-pix':
        require 'gerar-qrcode.php';
        break;
    case '/configurar-webhook':
        require 'configurar-webhook.php';
        break;
    case '/webhook-receiver':
        require 'webhook-receiver.php';
        break;
    case '/verificar-webhooks':
        require 'verificar-webhooks.php';
        break;
    case '/consultar-pix':
        require 'consultar-pix.php';
        break;
    default:
        if (file_exists($path . '.php')) {
            require $path . '.php';
        } else {
            http_response_code(404);
            echo 'Página não encontrada';
        }
}
?>