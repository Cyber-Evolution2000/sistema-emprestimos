// server.js - SISTEMA PIX PRODUÇÃO REAL
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CREDENCIAIS REAIS PRODUÇÃO SICOOB
const SICOOB_PRODUCAO = {
  tokenURL: "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token",
  baseURL: "https://api.sicoob.com.br/pix/api/v2",
  clientId: "df6cf8e2-008c-48a4-94ca-f795b4b3d728",
  empresa: {
    nome: "P C LIMA INACIO",
    cnpj: "24430463000151",
    cidade: "BRASILIA",
    conta: "4558-6",
    cooperativa: "4437"
  }
};

// 🔹 VARIÁVEIS GLOBAIS
let accessToken = null;
let tokenExpiraEm = null;

// 🔹 OBTER TOKEN - MÉTODO OFICIAL SICOOB
async function obterTokenSicoob() {
  try {
    console.log("🔑 Obtendo token de produção Sicoob...");
    
    const response = await axios.post(
      SICOOB_PRODUCAO.tokenURL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SICOOB_PRODUCAO.clientId,
        scope: 'cob.write cob.read pix.write pix.read webhook.write'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      }
    );

    accessToken = response.data.access_token;
    tokenExpiraEm = Date.now() + (response.data.expires_in * 1000);
    
    console.log("✅ Token produção obtido!");
    console.log("Expira em:", new Date(tokenExpiraEm).toLocaleString());
    
    return accessToken;
    
  } catch (error) {
    console.error("❌ Erro token produção:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("URL:", error.config?.url);
    throw error;
  }
}

// 🔹 CLIENT API COM TOKEN
async function getApiClient() {
  if (!accessToken || Date.now() >= tokenExpiraEm - 60000) {
    await obterTokenSicoob();
  }

  return axios.create({
    baseURL: SICOOB_PRODUCAO.baseURL,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "client_id": SICOOB_PRODUCAO.clientId
    },
    timeout: 20000
  });
}

// 🔹 GERAR TXID ÚNICO
function gerarTxid() {
  return `PC${Date.now()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
}

// 🔹 TESTE DE CONEXÃO PRODUÇÃO
app.get("/api/producao/teste", async (req, res) => {
  try {
    console.log("🏦 Testando conexão produção Sicoob...");
    
    const token = await obterTokenSicoob();
    const apiClient = await getApiClient();
    
    // Testar endpoint simples
    const response = await apiClient.get("/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z");
    
    res.json({
      success: true,
      message: "✅ CONECTADO AO SICOOB PRODUÇÃO!",
      token: token ? `✅ (${token.substring(0, 20)}...)` : "❌",
      apiStatus: response.status,
      empresa: SICOOB_PRODUCAO.empresa.nome,
      details: "Sistema pronto para receber pagamentos reais"
    });

  } catch (error) {
    console.error("❌ Erro produção:", error.response?.data);
    
    res.json({
      success: false,
      error: "Falha na autenticação produção",
      details: error.response?.data,
      solucao: "Verifique com a 7AZ Softwares se o Client ID está ativo para produção"
    });
  }
});

// 🔹 CRIAR PIX PRODUÇÃO REAL
app.post("/api/pix/criar", async (req, res) => {
  try {
    const { valor, cpf, nome, descricao = "Pagamento via sistema P C LIMA INACIO" } = req.body;
    
    if (!valor || valor <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Valor é obrigatório e deve ser maior que zero" 
      });
    }

    console.log(`💰 Criando PIX produção: R$ ${valor}`);
    
    const apiClient = await getApiClient();
    const txid = gerarTxid();
    
    const payload = {
      calendario: {
        expiracao: 86400 // 24 horas
      },
      devedor: {
        cpf: (cpf || "00000000191").replace(/\D/g, ''),
        nome: nome || "Cliente"
      },
      valor: {
        original: parseFloat(valor).toFixed(2)
      },
      chave: SICOOB_PRODUCAO.empresa.cnpj,
      solicitacaoPagador: descricao
    };

    console.log("📤 Enviando para Sicoob produção...");
    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    console.log("✅ PIX REAL CRIADO:", cobranca.txid);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      txid: cobranca.txid,
      valor: parseFloat(valor),
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      location: cobranca.location,
      status: cobranca.status,
      expiracao: new Date(Date.now() + 86400 * 1000).toISOString(),
      empresa: SICOOB_PRODUCAO.empresa.nome,
      cnpj: SICOOB_PRODUCAO.empresa.cnpj,
      instrucoes: [
        "🎯 PIX PRODUÇÃO CRIADO - SICOOB REAL!",
        "1. Este PIX movimenta dinheiro REAL",
        "2. Use o QR Code ou copie o código PIX",
        "3. Abra seu app bancário",
        `4. Valor: R$ ${parseFloat(valor).toFixed(2)}`,
        `5. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        `6. CNPJ: ${SICOOB_PRODUCAO.empresa.cnpj}`,
        "7. ⏰ Válido por 24 horas",
        "8. 💰 O pagamento será creditado na conta 4558-6"
      ]
    });

  } catch (error) {
    console.error("❌ Erro criar PIX produção:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Erro ao criar cobrança PIX",
      details: error.response?.data,
      message: "Entre em contato com a 7AZ Softwares para ativar a API"
    });
  }
});

// 🔹 ENDPOINT DE TESTE RÁPIDO
app.get("/api/pix/teste/:valor?", async (req, res) => {
  const valor = parseFloat(req.params.valor) || 0.10;
  
  try {
    const apiClient = await getApiClient();
    const txid = gerarTxid();
    
    const payload = {
      calendario: { expiracao: 3600 },
      devedor: { cpf: "12345678909", nome: "Cliente Teste" },
      valor: { original: valor.toFixed(2) },
      chave: SICOOB_PRODUCAO.empresa.cnpj,
      solicitacaoPagador: "Teste sistema produção - P C LIMA INACIO"
    };

    console.log("🚀 Criando PIX teste produção...");
    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valor,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      txid: cobranca.txid,
      status: cobranca.status,
      empresa: SICOOB_PRODUCAO.empresa.nome,
      instrucoes: [
        "🎯 PIX PRODUÇÃO - SICOOB REAL!",
        "1. Este é um PIX REAL - movimenta dinheiro",
        "2. Copie o código e cole no seu banco",
        `3. Valor: R$ ${valor.toFixed(2)}`,
        `4. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        "5. O valor será creditado na conta 4558-6",
        "6. ⚠️ AMBIENTE REAL - TESTE COM VALOR BAIXO"
      ]
    });

  } catch (error) {
    console.error("❌ Erro teste produção:", error.response?.data);
    
    res.status(500).json({
      success: false,
      error: "API produção não respondeu",
      details: error.response?.data,
      message: "Client ID precisa ser ativado para produção"
    });
  }
});

// 🔹 CONFIGURAR WEBHOOK
app.put("/api/webhook/configurar", async (req, res) => {
  try {
    const apiClient = await getApiClient();
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/pix`;
    
    const response = await apiClient.put(`/webhook/${SICOOB_PRODUCAO.empresa.cnpj}`, {
      webhookUrl: webhookUrl
    });

    res.json({
      success: true,
      message: "✅ Webhook produção configurado!",
      url: webhookUrl,
      empresa: SICOOB_PRODUCAO.empresa.nome
    });
    
  } catch (error) {
    console.error("❌ Erro webhook:", error.response?.data);
    res.status(500).json({
      success: false,
      error: "Erro ao configurar webhook"
    });
  }
});

// 🔹 PÁGINA PRINCIPAL PRODUÇÃO
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🏦 PIX Produção - P C LIMA INACIO</title>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Arial', sans-serif; 
                max-width: 1000px; 
                margin: 0 auto; 
                padding: 20px;
                background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
                color: white;
            }
            .container {
                background: rgba(255,255,255,0.95);
                color: #333;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #2c3e50;
                padding-bottom: 20px;
            }
            .badge {
                background: #e74c3c;
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
            }
            .empresa-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                border-left: 4px solid #3498db;
            }
            .btn-group {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 30px 0;
            }
            .btn {
                padding: 15px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            .btn-test { background: #3498db; color: white; }
            .btn-success { background: #27ae60; color: white; }
            .btn-warning { background: #f39c12; color: white; }
            .btn-danger { background: #e74c3c; color: white; }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            #resultado { margin-top: 30px; }
            .pix-result {
                background: white;
                border: 3px solid #27ae60;
                border-radius: 10px;
                padding: 25px;
                margin-top: 20px;
            }
            .alert {
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .alert-danger { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .alert-success { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
            .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏦 Sistema PIX Produção <span class="badge">SICOOB REAL</span></h1>
                <p>Ambiente de Produção - Pagamentos Reais</p>
            </div>

            <div class="empresa-info">
                <h3>🏢 Dados Cadastrais SICOOB</h3>
                <p><strong>Cooperado:</strong> ${SICOOB_PRODUCAO.empresa.nome}</p>
                <p><strong>CNPJ:</strong> ${SICOOB_PRODUCAO.empresa.cnpj}</p>
                <p><strong>Cooperativa:</strong> ${SICOOB_PRODUCAO.empresa.cooperativa}</p>
                <p><strong>Conta:</strong> ${SICOOB_PRODUCAO.empresa.conta}</p>
                <p><strong>Client ID:</strong> ${SICOOB_PRODUCAO.clientId}</p>
            </div>

            <div class="alert alert-warning">
                <strong>⚠️ AMBIENTE DE PRODUÇÃO:</strong> 
                Todos os PIX gerados aqui movimentam valores REAIS na conta ${SICOOB_PRODUCAO.empresa.conta}.
            </div>

            <div class="btn-group">
                <button class="btn btn-test" onclick="testarConexao()">🔌 Testar Conexão</button>
                <button class="btn btn-success" onclick="criarPIX(0.10)">🧪 R$ 0,10</button>
                <button class="btn btn-warning" onclick="criarPIX(1.00)">💰 R$ 1,00</button>
                <button class="btn btn-danger" onclick="criarPIX(5.00)">💎 R$ 5,00</button>
                <button class="btn btn-test" onclick="configurarWebhook()">🔧 Webhook</button>
            </div>

            <div id="resultado"></div>
        </div>

        <script>
            async function testarConexao() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div class="alert alert-warning">🔌 Conectando com SICOOB produção...</div>';
                
                try {
                    const response = await fetch('/api/producao/teste');
                    const data = await response.json();
                    
                    if (data.success) {
                        resultado.innerHTML = \`
                            <div class="alert alert-success">
                                <h3>✅ \${data.message}</h3>
                                <p><strong>Token:</strong> \${data.token}</p>
                                <p><strong>Status API:</strong> \${data.apiStatus}</p>
                                <p>\${data.details}</p>
                            </div>
                        \`;
                    } else {
                        resultado.innerHTML = \`
                            <div class="alert alert-danger">
                                <h3>❌ \${data.error}</h3>
                                <p>\${data.solucao}</p>
                                <pre>\${JSON.stringify(data.details, null, 2)}</pre>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultado.innerHTML = '<div class="alert alert-danger">❌ Erro de conexão: ' + error.message + '</div>';
                }
            }

            async function criarPIX(valor) {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div class="alert alert-warning">💰 Criando PIX de R$ ' + valor.toFixed(2) + '...</div>';
                
                try {
                    const response = await fetch('/api/pix/teste/' + valor);
                    const data = await response.json();
                    
                    if (data.success) {
                        resultado.innerHTML = \`
                            <div class="pix-result">
                                <h3 style="color: #27ae60;">✅ PIX PRODUÇÃO CRIADO!</h3>
                                <div class="alert alert-warning">
                                    <strong>🏦 AMBIENTE REAL:</strong> Este PIX movimentará R$ \${data.valor.toFixed(2)} na conta \${SICOOB_PRODUCAO.empresa.conta}.
                                </div>
                                
                                <p><strong>Valor:</strong> R$ \${data.valor.toFixed(2)}</p>
                                <p><strong>TXID:</strong> \${data.txid}</p>
                                <p><strong>Status:</strong> \${data.status}</p>
                                <p><strong>Empresa:</strong> \${data.empresa}</p>
                                
                                <div style="text-align: center; margin: 20px 0;">
                                    <img src="\${data.qrCode}" alt="QR Code PIX" style="max-width: 300px; border: 3px solid #27ae60; border-radius: 10px;">
                                    <p><small>Escaneie com seu app bancário</small></p>
                                </div>
                                
                                <p><strong>PIX Copia e Cola:</strong></p>
                                <textarea style="width: 100%; height: 100px; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-family: monospace;">\${data.pixCopiaECola}</textarea>
                                
                                <button class="btn btn-success" onclick="copiarPIX('\${data.pixCopiaECola}')" style="margin-top: 15px; width: 100%;">
                                    📋 COPIAR CÓDIGO PIX
                                </button>
                                
                                <div style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                                    <h4>📋 Instruções:</h4>
                                    <ul>\${data.instrucoes.map(i => '<li>' + i + '</li>').join('')}</ul>
                                </div>
                            </div>
                        \`;
                    } else {
                        resultado.innerHTML = \`
                            <div class="alert alert-danger">
                                <h3>❌ \${data.error}</h3>
                                <p>\${data.message}</p>
                                <pre>\${JSON.stringify(data.details, null, 2)}</pre>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultado.innerHTML = '<div class="alert alert-danger">❌ Erro: ' + error.message + '</div>';
                }
            }

            async function configurarWebhook() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div class="alert alert-warning">🔧 Configurando webhook...</div>';
                
                try {
                    const response = await fetch('/api/webhook/configurar', { method: 'PUT' });
                    const data = await response.json();
                    
                    if (data.success) {
                        resultado.innerHTML = \`
                            <div class="alert alert-success">
                                <h3>✅ \${data.message}</h3>
                                <p><strong>URL:</strong> \${data.url}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultado.innerHTML = '<div class="alert alert-danger">❌ Erro: ' + error.message + '</div>';
                }
            }

            function copiarPIX(texto) {
                navigator.clipboard.writeText(texto);
                alert('✅ Código PIX copiado!\\n\\n⚠️ ATENÇÃO: Este é um PIX REAL.\\nO pagamento será processado na conta ' + SICOOB_PRODUCAO.empresa.conta);
            }

            // Testar conexão automaticamente
            window.addEventListener('load', testarConexao);
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 SISTEMA PIX PRODUÇÃO INICIADO: http://localhost:${PORT}`);
  console.log(`🏦 Banco: SICOOB Produção Real`);
  console.log(`🏢 Cooperado: ${SICOOB_PRODUCAO.empresa.nome}`);
  console.log(`🔑 Client ID: ${SICOOB_PRODUCAO.clientId}`);
  console.log(`💳 Conta: ${SICOOB_PRODUCAO.empresa.conta}`);
  console.log(`🌐 API: ${SICOOB_PRODUCAO.baseURL}`);
});