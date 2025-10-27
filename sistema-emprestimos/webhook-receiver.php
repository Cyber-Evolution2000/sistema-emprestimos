<?php
require_once 'config.php';

// Arquivos para log
$arquivoLog = __DIR__ . '/webhook.log';
$arquivoPix = __DIR__ . '/pix-recebidos.json';

// Log detalhado
function logWebhook($mensagem, $dados = null) {
    global $arquivoLog;
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $mensagem";
    
    if ($dados) {
        $logEntry .= "\n" . json_encode($dados, JSON_PRETTY_PRINT);
    }
    $logEntry .= "\n" . str_repeat("-", 50) . "\n";
    
    file_put_contents($arquivoLog, $logEntry, FILE_APPEND | LOCK_EX);
}

// Log inicial da requisição
logWebhook('📨 NOVA REQUISIÇÃO WEBHOOK RECEBIDA', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'remote_addr' => $_SERVER['REMOTE_ADDR']
]);

// Verificar método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    logWebhook('❌ MÉTODO NÃO PERMITIDO: ' . $_SERVER['REQUEST_METHOD']);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
    exit;
}

// Verificar content type
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') === false) {
    http_response_code(400);
    logWebhook('❌ CONTENT-TYPE INVÁLIDO: ' . $contentType);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Content-Type deve ser application/json']);
    exit;
}

// Ler e validar JSON
$input = file_get_contents('php://input');
$dados = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    logWebhook('❌ JSON INVÁLIDO: ' . json_last_error_msg(), ['input' => $input]);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'JSON inválido']);
    exit;
}

logWebhook('📦 DADOS DO WEBHOOK RECEBIDOS', $dados);

// Processar notificação de PIX
if (isset($dados['pix']) && is_array($dados['pix'])) {
    $pixProcessados = [];
    
    foreach ($dados['pix'] as $index => $pix) {
        $e2eid = $pix['endToEndId'] ?? 'N/A';
        $txid = $pix['txid'] ?? 'N/A';
        $valor = $pix['valor'] ?? '0.00';
        $horario = $pix['horario'] ?? 'N/A';
        
        $pixInfo = [
            'e2eid' => $e2eid,
            'txid' => $txid,
            'valor' => $valor,
            'horario' => $horario,
            'data_processamento' => date('Y-m-d H:i:s'),
            'status' => 'RECEBIDO_VIA_WEBHOOK'
        ];
        
        $pixProcessados[] = $pixInfo;
        
        // Log individual de cada PIX
        logWebhook("💰 PIX #$index RECEBIDO - E2E: $e2eid, TXID: $txid, Valor: R$ $valor", $pixInfo);
        
        // Salvar em arquivo JSON
        $listaPix = [];
        if (file_exists($arquivoPix)) {
            $listaPix = json_decode(file_get_contents($arquivoPix), true) ?: [];
        }
        
        $listaPix[] = $pixInfo;
        file_put_contents($arquivoPix, json_encode($listaPix, JSON_PRETTY_PRINT));
        
        logWebhook("💾 PIX #$index SALVO NO ARQUIVO");
    }
    
    // Responder com sucesso
    http_response_code(200);
    header('Content-Type: application/json');
    $resposta = [
        'status' => 'success',
        'message' => 'Webhook processado com sucesso',
        'pix_processados' => count($pixProcessados),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($resposta);
    logWebhook('✅ WEBHOOK PROCESSADO COM SUCESSO', $resposta);
    
} else {
    // Estrutura inválida
    http_response_code(400);
    header('Content-Type: application/json');
    $resposta = [
        'status' => 'error',
        'message' => 'Estrutura de webhook inválida - campo "pix" não encontrado',
        'campos_recebidos' => array_keys($dados)
    ];
    
    echo json_encode($resposta);
    logWebhook('❌ ESTRUTURA DE WEBHOOK INVÁLIDA', $resposta);
}
?>