
/**
 * server.js
 * Exemplo de backend simples para integração com Sicoob Pix Recebimentos.
 * Usa mTLS (cert + key) para o token endpoint e para chamadas à API.
 *
 * Atenção: este é um exemplo didático. Faça auditoria e adaptações antes de rodar em produção.
 */
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const AUTH_URL = process.env.AUTH_URL;
const SICOOB_BASE = process.env.SICOOB_BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CERT_PATH = process.env.CERT_PATH || './htdocs/cert/ChavePública.pem';
const KEY_PATH = process.env.KEY_PATH || './htdocs/cert/chave_privada.pem';
const CERT_PASSPHRASE = process.env.CERT_PASSPHRASE || '';
const PIX_KEY = process.env.PIX_KEY || '';
const SCOPE = 'pix.write cob.write payloadlocation.write webhook.write';

let cachedToken = null;
let tokenExpiresAt = 0;

function getHttpsAgent() {
  const cert = fs.readFileSync(CERT_PATH);
  const key = fs.readFileSync(KEY_PATH);
  return new https.Agent({
    cert,
    key,
    passphrase: CERT_PASSPHRASE,
    rejectUnauthorized: true // em produção mantenha true; em sandbox pode ajustar
  });
}

async function getAccessToken() {
  // cache simples
  if (cachedToken && Date.now() < tokenExpiresAt - 30*1000) return cachedToken;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('scope', SCOPE);

  try {
    const res = await axios.post(AUTH_URL, params.toString(), {
      httpsAgent: getHttpsAgent(),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    });
    cachedToken = res.data.access_token;
    const expiresIn = res.data.expires_in || 300;
    tokenExpiresAt = Date.now() + (expiresIn * 1000);
    return cachedToken;
  } catch (err) {
    console.error('Erro obtendo token:', err.toString(), err.response && err.response.data);
    throw err;
  }
}

app.post('/api/create-cob', async (req, res) => {
  /**
   * Body esperado:
   * {
   *   "txid": "op123",           // opcional - se não enviado, o servidor cria um UUID
   *   "valor": "10.50",
   *   "chave": "<PIX_KEY>",      // opcional - usa PIX_KEY do .env
   *   "solicitacaoPagador": "Compra X"
   * }
   */
  try {
    const { txid, valor, chave, solicitacaoPagador } = req.body;
    const useTxid = txid || uuidv4();

    const token = await getAccessToken();

    const payload = {
      calendario: { expiracao: 3600 },
      devedor: null,
      valor: {
        original: String(valor || "0.01")
      },
      chave: chave || PIX_KEY,
      solicitacaoPagamento: solicitacaoPagador || 'Pagamento via Pix',
      infoAdicionais: []
    };

    // Faz a criação da cobrança imediata (POST /cob)
    const url = `${SICOOB_BASE}/cob`;
    const resp = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-ec-codigo': process.env.COOPERATIVE_ID || ''
      },
      httpsAgent: getHttpsAgent()
    });

    // A API pode retornar location/payload/txid etc.
    const cobranca = resp.data;
    // Tenta gerar QR code localmente caso a API retorne o payload ou loc
    let qrBase64 = null;
    try {
      const pixString = cobranca?.copyPaste ?? cobranca?.qrcode ?? cobranca?.payload ?? null;
      if (pixString) {
        qrBase64 = await QRCode.toDataURL(pixString);
      }
    } catch (e) {
      // ignora
    }

    res.json({ success: true, data: cobranca, qr: qrBase64 });
  } catch (err) {
    console.error('Erro create-cob:', err.toString(), err.response && err.response.data);
    res.status(500).json({ success: false, error: err.toString(), details: err.response && err.response.data });
  }
});

app.put('/api/webhook-config/:chave', async (req, res) => {
  // Exemplo de configurar webhook (PUT /webhook/{chave})
  try {
    const chave = req.params.chave;
    const token = await getAccessToken();
    const url = `${SICOOB_BASE}/webhook/${encodeURIComponent(chave)}`;
    const payload = {
      url: process.env.WEBHOOK_BASE_URL || 'http://seu.dominio.com/api/webhook',
      events: ['PIX_RECEIVED', 'COB_UPDATED']
    };
    const resp = await axios.put(url, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-ec-codigo': process.env.COOPERATIVE_ID || '' },
      httpsAgent: getHttpsAgent()
    });
    res.json({ success: true, data: resp.data });
  } catch (err) {
    console.error('Erro webhook-config:', err.toString(), err.response && err.response.data);
    res.status(500).json({ success: false, error: err.toString(), details: err.response && err.response.data });
  }
});

app.post('/api/webhook', (req, res) => {
  // Recebe notificações do Sicoob (exemplo)
  console.log('WEBHOOK RECEIVED:', JSON.stringify(req.body, null, 2));
  // Deve-se validar origem e assinatura conforme documentação do Sicoob em produção.
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
