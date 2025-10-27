public function __construct() {
    $this->urlAutenticacao = URL_AUTENTICACAO;
    $this->urlPix = URL_PIX;
    $this->clientId = SICOOBPIX_CLIENT_ID;
    
    // Verificar se certificados existem
    $this->certPublico = realpath(SICOOBPIX_CAMINHO_CERT_PUBLICO);
    $this->certPrivado = realpath(SICOOBPIX_CAMINHO_CERT_PRIVADO);
    $this->senhaCert = SICOOBPIX_SENHA_CERT;
    
    if (!$this->certPublico || !file_exists($this->certPublico)) {
        throw new Exception('Certificado público não encontrado: ' . SICOOBPIX_CAMINHO_CERT_PUBLICO);
    }
    
    if (!$this->certPrivado || !file_exists($this->certPrivado)) {
        throw new Exception('Chave privada não encontrada: ' . SICOOBPIX_CAMINHO_CERT_PRIVADO);
    }
    
    $this->token = null;
    $this->horaToken = null;
}

    /**
     * Criar Location do Payload (QR Code Dinâmico)
     */
    public function criarLocation() {
        $dados = ['tipoCob' => 'cob'];
        return $this->send('POST', '/loc', $dados);
    }

    /**
     * Criar cobrança imediata vinculada a um Location
     */
    public function criarCob($txid, $dados) {
        return $this->send('PUT', '/cob/' . $txid, $dados);
    }

    /**
     * Obter imagem do QR Code do Location
     */
    public function obterQrCodeLocation($idLocation) {
        // Este endpoint retorna a imagem PNG diretamente
        $url = $this->urlPix . '/loc/' . $idLocation . '/imagem';
        $token = $this->getToken();

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_SSLCERT => $this->certPublico,
            CURLOPT_SSLKEY => $this->certPrivado,
            CURLOPT_SSLKEYPASSWD => $this->senhaCert,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Accept: image/png'
            ]
        ]);

        $resposta = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
        curl_close($curl);

        if ($httpCode === 200 && strpos($contentType, 'image/png') !== false) {
            return 'data:image/png;base64,' . base64_encode($resposta);
        }

        throw new Exception('Erro ao obter QR Code: HTTP ' . $httpCode);
    }

    /**
     * Consultar cobrança
     */
    public function consultarCob($txid) {
        return $this->send('GET', '/cob/' . $txid);
    }

    /**
     * Método público para testar autenticação
     */
    public function testarAutenticacao() {
        try {
            $token = $this->getToken();
            return [
                'sucesso' => true,
                'token' => substr($token, 0, 50) . '...',
                'mensagem' => 'Autenticação bem-sucedida'
            ];
        } catch (Exception $e) {
            return [
                'sucesso' => false,
                'erro' => $e->getMessage()
            ];
        }
    }

    // ========== MÉTODOS PRIVADOS ==========

    private function autenticar() {
        $escopos = [
            'cob.read', 'cob.write', 'pix.read', 'pix.write',
            'webhook.read', 'webhook.write', 'payloadlocation.write', 'payloadlocation.read'
        ];

        $dados = [
            'grant_type' => 'client_credentials',
            'client_id' => $this->clientId,
            'scope' => implode(' ', $escopos)
        ];

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->urlAutenticacao,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($dados),
            CURLOPT_SSLCERT => $this->certPublico,
            CURLOPT_SSLKEY => $this->certPrivado,
            CURLOPT_SSLKEYPASSWD => $this->senhaCert,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded']
        ]);

        $resposta = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode !== 200) {
            throw new Exception('Erro autenticação: ' . $resposta);
        }

        $dadosToken = json_decode($resposta, true);
        $this->token = $dadosToken;
        $this->horaToken = time();
        
        return $dadosToken['access_token'];
    }

    private function getToken() {
        if (!$this->token || (time() - $this->horaToken) > 3000) {
            return $this->autenticar();
        }
        return $this->token['access_token'];
    }

/**
 * Configurar Webhook para uma chave PIX
 */
public function configurarWebhook($chave, $urlWebhook) {
    $dados = ['webhookUrl' => $urlWebhook];
    return $this->send('PUT', '/webhook/' . $chave, $dados);
}

/**
 * Consultar Webhook configurado
 */
public function consultarWebhook($chave = null) {
    $endpoint = $chave ? '/webhook/' . $chave : '/webhook';
    return $this->send('GET', $endpoint);
}

/**
 * Deletar Webhook
 */
public function deletarWebhook($chave) {
    return $this->send('DELETE', '/webhook/' . $chave);
}

    private function send($metodo, $endpoint, $dados = []) {
        $url = $this->urlPix . $endpoint;
        $token = $this->getToken();

        $curl = curl_init();
        $opcoes = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $metodo,
            CURLOPT_SSLCERT => $this->certPublico,
            CURLOPT_SSLKEY => $this->certPrivado,
            CURLOPT_SSLKEYPASSWD => $this->senhaCert,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token
            ]
        ];

        if (in_array($metodo, ['POST', 'PUT']) && !empty($dados)) {
            $opcoes[CURLOPT_POSTFIELDS] = json_encode($dados);
        }

        curl_setopt_array($curl, $opcoes);
        $resposta = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($httpCode >= 400) {
            throw new Exception('Erro API - HTTP ' . $httpCode . ': ' . $resposta);
        }

        return json_decode($resposta, true);
    }
}
?>