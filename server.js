// server.js - SISTEMA PIX PRODUÇÃO SICOOB
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CREDENCIAIS REAIS SICOOB PRODUÇÃO
const SICOOB_PRODUCAO = {
  baseURL: "https://api.sicoob.com.br/pix/api/v2",
  tokenURL: "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token",
  clientId: "df6cf8e2-008c-48a4-94ca-f795b4b3d728",
  // Secret ID não é necessário (conforme documentação)
  empresa: {
    nome: "P C LIMA INACIO",
    cnpj: "24430463000151", // Sem pontuação
    cidade: "BRASILIA",
    conta: "4558-6",
    cooperativa: "4437"
  }
};

// 🔹 VARIÁVEL PARA ARMAZENAR TOKEN
let accessToken = null;
let tokenExpiraEm = null;

// 🔹 OBTER TOKEN DE ACESSO
async function obterToken() {
  try {
    // Para produção via 7AZ Softwares (sem certificado)
    const response = await axios.post(SICOOB_PRODUCAO.tokenURL, 
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SICOOB_PRODUCAO.clientId,
        scope: 'cob.write cob.read pix.write pix.read' // Escopos necessários
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiraEm = Date.now() + (response.data.expires_in * 1000);
    
    console.log("✅ Token de produção obtido com sucesso!");
    return accessToken;
    
  } catch (error) {
    console.error("❌ Erro ao obter token:", error.response?.data || error.message);
    throw error;
  }
}

// 🔹 CLIENT AXIOS PARA API SICOOB
async function getApiClient() {
  // Verificar se token expirou
  if (!accessToken || Date.now() >= tokenExpiraEm) {
    await obterToken();
  }

  return axios.create({
    baseURL: SICOOB_PRODUCAO.baseURL,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    timeout: 15000
  });
}

// 🔹 GERAR TXID ÚNICO
function gerarTxid() {
  return `PC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// 🔹 CRIAR COBRANÇA PIX REAL
app.post("/api/pix/criar-cobranca", async (req, res) => {
  try {
    const { valor, cpf, nome, descricao = "Pagamento via sistema" } = req.body;
    
    if (!valor) {
      return res.status(400).json({ 
        success: false, 
        error: "Valor é obrigatório" 
      });
    }

    const apiClient = await getApiClient();
    const txid = gerarTxid();
    
    const payload = {
      calendario: {
        expiracao: 86400 // 24 horas
      },
      devedor: {
        cpf: (cpf || "00000000191").replace(/\D/g, ''), // CPF padrão se não informado
        nome: nome || "Cliente"
      },
      valor: {
        original: parseFloat(valor).toFixed(2)
      },
      chave: SICOOB_PRODUCAO.empresa.cnpj, // Seu CNPJ como chave PIX
      solicitacaoPagador: descricao
    };

    console.log("🚀 Criando cobrança PIX produção...");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    console.log("✅ Cobrança criada:", cobranca.txid);

    // Gerar QR Code
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
      instrucoes: [
        "🎯 PIX GERADO - SICOOB PRODUÇÃO!",
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário",
        "3. Cole no campo PIX",
        `4. Valor: R$ ${parseFloat(valor).toFixed(2)}`,
        `5. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        "6. ⏰ Válido por 24 horas"
      ]
    });

  } catch (error) {
    console.error("❌ Erro produção:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Erro ao criar cobrança",
      details: error.response?.data,
      message: "Verifique as credenciais e escopos da API"
    });
  }
});

// 🔹 CONSULTAR COBRANÇA
app.get("/api/pix/consultar/:txid", async (req, res) => {
  try {
    const { txid } = req.params;
    const apiClient = await getApiClient();
    
    const response = await apiClient.get(`/cob/${txid}`);
    
    res.json({
      success: true,
      cobranca: response.data
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Cobrança não encontrada",
      details: error.response?.data
    });
  }
});

// 🔹 WEBHOOK PARA RECEBER NOTIFICAÇÕES PIX
app.post("/api/webhook/pix", async (req, res) => {
  try {
    const { pix } = req.body;
    
    console.log("📩 Webhook PIX recebido:", pix);
    
    if (pix && pix.length > 0) {
      for (const pagamento of pix) {
        console.log(`💰 Pagamento recebido: ${pagamento.endToEndId} - R$ ${pagamento.valor}`);
        // Aqui você atualiza seu banco de dados
        // Marca a parcela como paga, etc.
      }
    }

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error("Erro webhook:", error);
    res.status(500).json({ success: false });
  }
});

// 🔹 CONFIGURAR WEBHOOK (executar uma vez)
app.put("/api/configurar-webhook", async (req, res) => {
  try {
    const apiClient = await getApiClient();
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/pix`;
    
    const response = await apiClient.put(`/webhook/${SICOOB_PRODUCAO.empresa.cnpj}`, {
      webhookUrl: webhookUrl
    });

    res.json({
      success: true,
      message: "Webhook configurado com sucesso",
      url: webhookUrl
    });
    
  } catch (error) {
    console.error("Erro configurar webhook:", error.response?.data);
    res.status(500).json({
      success: false,
      error: "Erro ao configurar webhook"
    });
  }
});

// 🔹 ENDPOINTS DE TESTE RÁPIDO
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
      solicitacaoPagador: "Teste sistema PIX produção"
    };

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
        "1. Este é um PIX REAL da produção",
        "2. Copie o código e cole no seu banco",
        `3. Valor: R$ ${valor.toFixed(2)}`,
        `4. CNPJ: ${SICOOB_PRODUCAO.empresa.cnpj}`,
        "5. O pagamento será REALMENTE processado"
      ]
    });

  } catch (error) {
    console.error("Erro teste produção:", error.response?.data);
    
    res.status(500).json({
      success: false,
      error: "API produção não respondeu",
      details: error.response?.data
    });
  }
});

// 🔹 PÁGINA PRINCIPAL PRODUÇÃO
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🏦 Sistema PIX - Produção SICOOB</title>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Arial', sans-serif; 
                max-width: 1000px; 
                margin: 0 auto; 
                padding: 20px;
                background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                color: white;
            }
            .container {
                background: rgba(255,255,255,0.95);
                color: #333;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #2ecc71;
                padding-bottom: 20px;
            }
            .badge {
                background: #2ecc71;
                color: white;
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 12px;
                margin-left: 10px;
            }
            .empresa-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                border-left: 4px solid #2ecc71;
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
            .btn-success { background: #2ecc71; color: white; }
            .btn-primary { background: #3498db; color: white; }
            .btn-warning { background: #f39c12; color: white; }
            .btn-danger { background: #e74c3c; color: white; }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            #resultado { margin-top: 30px; }
            .pix-result {
                background: white;
                border: 3px solid #2ecc71;
                border-radius: 10px;
                padding: 25px;
                margin-top: 20px;
            }
            .qr-code {
                text-align: center;
                margin: 25px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            textarea {
                width: 100%;
                height: 100px;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                resize: vertical;
            }
            .alert {
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            .alert-success { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏦 Sistema PIX Produção <span class="badge">SICOOB REAL</span></h1>
                <p>Sistema profissional de pagamentos - Ambiente de Produção</p>
            </div>

            <div class="empresa-info">
                <h3>🏢 Dados Cadastrais SICOOB</h3>
                <p><strong>Cooperado:</strong> ${SICOOB_PRODUCAO.empresa.nome}</p>
                <p><strong>CNPJ:</strong> ${SICOOB_PRODUCAO.empresa.cnpj}</p>
                <p><strong>Cooperativa:</strong> ${SICOOB_PRODUCAO.empresa.cooperativa}</p>
                <p><strong>Conta:</strong> ${SICOOB_PRODUCAO.empresa.conta}</p>
                <p><strong>Empresa Parceira:</strong> 7AZ Softwares LTDA</p>
            </div>

            <div class="alert alert-warning">
                <strong>⚠️ ATENÇÃO:</strong> Este é o ambiente de PRODUÇÃO. 
                Os PIX gerados aqui são REAIS e movimentam valores reais.
            </div>

            <div class="btn-group">
                <button class="btn btn-success" onclick="testarPIX(0.10)">
                    🧪 Teste R$ 0,10
                </button>
                <button class="btn btn-primary" onclick="testarPIX(1.00)">
                    💰 Teste R$ 1,00
                </button>
                <button class="btn btn-warning" onclick="testarPIX(5.00)">
                    💎 Teste R$ 5,00
                </button>
                <button class="btn btn-danger" onclick="testarPIX(10.00)">
                    🚀 Teste R$ 10,00
                </button>
                <button class="btn btn-primary" onclick="configurarWebhook()">
                    🔧 Configurar Webhook
                </button>
            </div>

            <div id="resultado"></div>
        </div>

        <script>
            async function testarPIX(valor) {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 10px;">🔄 Conectando com SICOOB produção...<br><small>Gerando PIX de R$ ' + valor.toFixed(2) + '</small></div>';
                
                try {
                    const response = await fetch('/api/pix/teste/' + valor);
                    const data = await response.json();
                    
                    if (data.success) {
                        resultado.innerHTML = \`
                            <div class="pix-result">
                                <h3 style="color: #2ecc71;">✅ PIX PRODUÇÃO CRIADO!</h3>
                                <div class="alert alert-success">
                                    <strong>🏦 AMBIENTE REAL:</strong> Este PIX movimentará valores reais na sua conta SICOOB.
                                </div>
                                
                                <p><strong>Valor:</strong> R$ \${data.valor.toFixed(2)}</p>
                                <p><strong>TXID:</strong> \${data.txid}</p>
                                <p><strong>Status:</strong> \${data.status}</p>
                                <p><strong>Empresa:</strong> \${data.empresa}</p>
                                
                                <div class="qr-code">
                                    <img src="\${data.qrCode}" alt="QR Code PIX" style="max-width: 300px; border: 3px solid #2ecc71; border-radius: 10px;">
                                    <p><small>Escaneie com seu app bancário</small></p>
                                </div>
                                
                                <p><strong>PIX Copia e Cola:</strong></p>
                                <textarea readonly>\${data.pixCopiaECola}</textarea>
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
                            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; color: #721c24;">
                                <h3>❌ Erro na API Produção</h3>
                                <p>\${data.error}</p>
                                <pre>\${JSON.stringify(data.details, null, 2)}</pre>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultado.innerHTML = '<div style="background: #f8d7da; padding: 20px; border-radius: 8px; color: #721c24;">❌ Erro de conexão: ' + error.message + '</div>';
                }
            }

            async function configurarWebhook() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div style="text-align: center; padding: 20px;">🔧 Configurando webhook...</div>';
                
                try {
                    const response = await fetch('/api/configurar-webhook', { method: 'PUT' });
                    const data = await response.json();
                    
                    if (data.success) {
                        resultado.innerHTML = \`
                            <div class="alert alert-success">
                                <h3>✅ Webhook Configurado!</h3>
                                <p><strong>URL:</strong> \${data.url}</p>
                                <p>O sistema agora receberá notificações automáticas de pagamentos PIX.</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultado.innerHTML = '<div style="background: #f8d7da; padding: 20px; border-radius: 8px; color: #721c24;">❌ Erro: ' + error.message + '</div>';
                }
            }

            function copiarPIX(texto) {
                navigator.clipboard.writeText(texto);
                alert('✅ Código PIX copiado!\\n\\n⚠️ ATENÇÃO: Este é um PIX REAL.\\nO pagamento será processado na sua conta SICOOB.');
            }
        </script>
    </body>
    </html>
  `);
});

// 🔹 INICIAR SERVIDOR
app.listen(PORT, async () => {
  console.log(`🚀 SISTEMA PIX PRODUÇÃO INICIADO: http://localhost:${PORT}`);
  console.log(`🏦 Banco: SICOOB Produção`);
  console.log(`🏢 Cooperado: ${SICOOB_PRODUCAO.empresa.nome}`);
  console.log(`🔑 Client ID: ${SICOOB_PRODUCAO.clientId}`);
  console.log(`🌐 API: ${SICOOB_PRODUCAO.baseURL}`);
  console.log(`💎 Endpoints:`);
  console.log(`   - Teste: http://localhost:${PORT}/api/pix/teste/0.10`);
  console.log(`   - Webhook: http://localhost:${PORT}/api/configurar-webhook`);
  
  // Tentar obter token ao iniciar
  try {
    await obterToken();
    console.log("✅ Sistema pronto para produção!");
  } catch (error) {
    console.log("⚠️ Sistema iniciado, mas token não pôde ser obtido");
  }
});