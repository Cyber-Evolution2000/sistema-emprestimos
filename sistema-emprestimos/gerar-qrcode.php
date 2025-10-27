<?php
require_once 'config.php';
require_once 'Sicoob.php';
require_once 'vendor/autoload.php';

use chillerlan\QRCode\QRCode;

if ($_POST) {
    $valor = floatval($_POST['valor']);
    $descricao = $_POST['descricao'];

    try {
        $sicoob = new Sicoob();
        
        // PASSO 1: Criar TXID no formato CORRETO
        $timestamp = time();
        $micro = substr(microtime(), 2, 8);
        $random = rand(10000000, 99999999);
        $txid = 'PIX' . $timestamp . $micro . $random;
        $txid = substr($txid, 0, 35);
        
        // PASSO 2: Criar cobrança SEM Location primeiro (mais simples)
        $cobranca = [
            'calendario' => [
                'expiracao' => 3600 // 1 hora
            ],
            'valor' => [
                'original' => number_format($valor, 2, '.', '')
            ],
            'chave' => SICOOBPIX_CHAVE,
            'solicitacaoPagador' => $descricao
        ];
        
        $respostaCob = $sicoob->criarCob($txid, $cobranca);
        
        // PASSO 3: Verificar se temos brcode (PIX Copia e Cola)
        if (isset($respostaCob['brcode'])) {
            $pixCopiaECola = $respostaCob['brcode'];
            // Gerar QR Code a partir do brcode
            $qrCodeImage = (new QRCode)->render($pixCopiaECola);
        } else {
            throw new Exception('Brcode não retornado pela API');
        }

    } catch (Exception $e) {
        $erro = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIX Real - <?= SITE_NOME ?></title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            text-align: center;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .qrcode {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .info {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .erro {
            background: #ffe8e8;
            color: #d63031;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .voltar {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
        .codigo-pix {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border: 2px dashed #ccc;
        }
        .instrucoes {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            text-align: left;
        }
        .sucesso {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .teste-link {
            background: #d1ecf1;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if (isset($erro)): ?>
            <div class="erro">
                <h2>❌ Erro no Sistema PIX</h2>
                <p><?= $erro ?></p>
                <a href="index.php" class="voltar">← Voltar</a>
            </div>
        <?php elseif (isset($qrCodeImage)): ?>
            
            <div class="sucesso">
                <h1>💰 PIX REAL GERADO COM SUCESSO!</h1>
                <p><strong>Sistema SICOOB - Cobrança ATIVA</strong></p>
            </div>
            
            <div class="info">
                <h3>📋 Detalhes do Pagamento</h3>
                <p><strong>Valor:</strong> R$ <?= number_format($valor, 2, ',', '.') ?></p>
                <p><strong>Descrição:</strong> <?= $descricao ?></p>
                <p><strong>Beneficiário:</strong> <?= SICOOBPIX_TITULAR ?></p>
                <p><strong>Chave PIX:</strong> <?= SICOOBPIX_CHAVE ?></p>
                <p><strong>Status:</strong> ✅ ATIVA</p>
            </div>

            <div class="qrcode">
                <h3>📱 QR CODE PIX</h3>
                <img src="<?= $qrCodeImage ?>" alt="QR Code PIX" style="max-width: 250px;">
                <p><strong>Escaneie com seu app de banco</strong></p>
            </div>

            <div class="codigo-pix">
                <h3>📋 PIX COPIA E COLA</h3>
                <p><strong>Copie o código abaixo e cole no seu internet banking:</strong></p>
                <textarea 
                    style="width: 100%; height: 100px; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace; font-size: 12px;" 
                    readonly 
                    onclick="this.select(); document.execCommand('copy'); alert('Código PIX copiado!');"
                ><?= $pixCopiaECola ?></textarea>
                <p><small>👆 Clique no código para copiar</small></p>
            </div>

            <div class="teste-link">
                <h4>🔗 Link da Cobrança no SICOOB</h4>
                <p><small><?= $respostaCob['location'] ?? 'N/A' ?></small></p>
            </div>

            <div class="instrucoes">
                <h4>💡 Como testar o pagamento:</h4>
                <ol>
                    <li><strong>Método 1:</strong> Escaneie o QR Code acima com seu app de banco</li>
                    <li><strong>Método 2:</strong> Use o PIX Copia e Cola no seu internet banking</li>
                    <li><strong>Valor de teste:</strong> R$ 1,00 (será creditado na conta SICOOB)</li>
                    <li><strong>Confirme</strong> que o beneficiário é <strong><?= SICOOBPIX_TITULAR ?></strong></li>
                </ol>
                
                <p style="color: #856404; margin-top: 10px;">
                    <strong>⚠️ IMPORTANTE:</strong> Este é um PIX REAL. O valor será debitado da sua conta e creditado na conta SICOOB.
                </p>
            </div>

            <!-- Debug informações -->
            <details style="background: #e9ecef; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: left;">
                <summary>🔧 Informações Técnicas</summary>
                <p><strong>TXID:</strong> <?= $txid ?></p>
                <p><strong>QR Code Type:</strong> Dinâmico (SICOOB)</p>
                <p><strong>Brcode Length:</strong> <?= strlen($pixCopiaECola) ?> caracteres</p>
            </details>

            <div style="margin: 20px 0;">
                <a href="index.php" class="voltar">🔄 Gerar Novo PIX</a>
            </div>

        <?php endif; ?>
    </div>
</body>
</html>