// server.js - SISTEMA PIX PRODUÇÃO COM ESCOPOS CORRETOS
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

// 🔹 ESCOPOS EXATAMENTE COMO APARECE NA SUA TELA
const SICOOB_SCOPES = [
  "pix.read",
  "cobv.read", 
  "lotecobv.write",
  "payloadlocation.read",
  "webhook.write",
  "cob.read",
  "cob.write",
  "webhook.read",
  "pix.write",
  "lotecobv.read",
  "payloadlocation.write",
  "cobv.write"
].join(" ");

// 🔹 VARIÁVEIS GLOBAIS
let accessToken = null;
let tokenExpiraEm = null;

// 🔹 OBTER TOKEN - COM ESCOPOS CORRETOS
async function obterTokenSicoob() {
  try {
    console.log("🔑 Obtendo token produção Sicoob...");
    
    const response = await axios.post(
      SICOOB_PRODUCAO.tokenURL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SICOOB_PRODUCAO.clientId,
        scope: SICOOB_SCOPES
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 20000
      }
    );

    accessToken = response.data.access_token;
    tokenExpiraEm = Date.now() + (response.data.expires_in * 1000);
    
    console.log("✅ Token produção obtido!");
    console.log("Expira em:", new Date(tokenExpiraEm).toLocaleString());
    console.log("Escopos:", SICOOB_SCOPES);
    
    return accessToken;
    
  } catch (error) {
    console.error("❌ Erro ao obter token:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("URL:", SICOOB_PRODUCAO.tokenURL);
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
    timeout: 25000
  });
}

// 🔹 GERAR TXID ÚNICO
function gerarTxid() {
  return `PC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// 🔹 TESTE DE CONEXÃO PRODUÇÃO
app.get("/api/producao/teste", async (req, res) => {
  try {
    console.log("🏦 Testando conexão produção Sicoob...");
    
    const token = await obterTokenSicoob();
    
    if (!token) {
      throw new Error("Token não foi obtido");
    }

    const apiClient = await getApiClient();
    
    // Testar endpoint simples de listagem
    const response = await apiClient.get("/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z");
    
    res.json({
      success: true,
      message: "✅ CONECTADO AO SICOOB PRODUÇÃO!",
      token: `✅ Válido (${token.substring(0, 20)}...)`,
      apiStatus: response.status,
      empresa: SICOOB_PRODUCAO.empresa.nome,
      escopos: SICOOB_SCOPES,
      details: "Sistema pronto para criar cobranças PIX reais"
    });

  } catch (error) {
    console.error("❌ Erro produção:", error.response?.data || error.message);
    
    // Detalhes específicos do erro
    let detalhesErro = "Erro desconhecido";
    let solucao = "Entre em contato com a 7AZ Softwares";
    
    if (error.response?.data?.error === "invalid_client") {
      detalhesErro = "Client ID inválido ou não autorizado";
      solucao = "Verifique com a 7AZ se o Client ID está ativo para API PIX";
    } else if (error.response?.data?.error === "unauthorized_client") {
      detalhesErro = "Client não autorizado para estes escopos";
      solucao = "Solicite à 7AZ a ativação dos escopos PIX";
    } else if (error.code === 'ECONNABORTED') {
      detalhesErro = "Timeout na conexão com Sicoob";
      solucao = "API Sicoob pode estar instável, tente novamente";
    }
    
    res.json({
      success: false,
      error: "Falha na autenticação produção",
      details: error.response?.data || error.message,
      detalhesErro: detalhesErro,
      solucao: solucao,
      escopos_tentados: SICOOB_SCOPES
    });
  }
});

// 🔹 CRIAR PIX PRODUÇÃO REAL
app.post("/api/pix/criar", async (req, res) => {
  try {
    const { valor, cpf, nome, descricao = "Pagamento via sistema" } = req.body;
    
    if (!valor || valor <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Valor é obrigatório" 
      });
    }

    console.log(`💰 Criando PIX produção: R$ ${valor}`);
    
    const apiClient = await getApiClient();
    const txid = gerarTxid();
    
    const payload = {
      calendario: {
        expiracao: 3600 // 1 hora para testes
      },
      devedor: {
        cpf: (cpf || "12345678909").replace(/\D/g, ''),
        nome: nome || "Cliente"
      },
      valor: {
        original: parseFloat(valor).toFixed(2)
      },
      chave: SICOOB_PRODUCAO.empresa.cnpj,
      solicitacaoPagador: descricao
    };

    console.log("📤 Enviando cobrança para Sicoob...");
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
      expiracao: new Date(Date.now() + 3600 * 1000).toISOString(),
      empresa: SICOOB_PRODUCAO.empresa.nome,
      instrucoes: [
        "🎯 PIX PRODUÇÃO CRIADO - SICOOB REAL!",
        "1. Este PIX movimenta dinheiro REAL",
        "2. Use o QR Code ou copie o código PIX",
        "3. Abra seu app bancário",
        `4. Valor: R$ ${parseFloat(valor).toFixed(2)}`,
        `5. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        "6. ⏰ Válido por 1 hora",
        "7. 💰 Será creditado na conta 4558-6"
      ]
    });

  } catch (error) {
    console.error("❌ Erro criar PIX produção:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Erro ao criar cobrança PIX",
      details: error.response?.data,
      message: "Verifique se a API PIX está ativa para seu Client ID"
    });
  }
});

// 🔹 ENDPOINT DE TESTE RÁPIDO
app.get("/api/pix/teste/:valor?", async (req, res) => {
  const valor = parseFloat(req.params.valor) || 0.10;
  
  try {
    console.log(`🧪 Criando PIX teste: R$ ${valor}`);
    
    const apiClient = await getApiClient();
    const txid = gerarTxid();
    
    const payload = {
      calendario: { expiracao: 3600 },
      devedor: { cpf: "12345678909", nome: "Cliente Teste" },
      valor: { original: valor.toFixed(2) },
      chave: SICOOB_PRODUCAO.empresa.cnpj,
      solicitacaoPagador: "Teste sistema PIX - " + SICOOB_PRODUCAO.empresa.nome
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
        "1. Este é um PIX REAL - movimenta dinheiro",
        "2. Copie o código e cole no seu banco",
        `3. Valor: R$ ${valor.toFixed(2)}`,
        `4. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        "5. ⚠️ AMBIENTE REAL - TESTE COM VALOR BAIXO"
      ]
    });

  } catch (error) {
    console.error("❌ Erro teste produção:", error.response?.data);
    
    res.status(500).json({
      success: false,
      error: "API produção não respondeu",
      details: error.response?.data,
      message: "Client ID precisa ser ativado para API PIX produção"
    });
  }
});

// 🔹 PÁGINA PRINCIPAL
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🏦 PIX Produção - P C LIMA INACIO</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { padding: 12px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .btn-success { background: #28a745; }
            #resultado { margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>🏦 Sistema PIX Produção</h1>
        
        <div class="card">
            <h3>🔑 Credenciais Sicoob</h3>
            <p><strong>Client ID:</strong> ${SICOOB_PRODUCAO.clientId}</p>
            <p><strong>Empresa:</strong> ${SICOOB_PRODUCAO.empresa.nome}</p>
            <p><strong>CNPJ:</strong> ${SICOOB_PRODUCAO.empresa.cnpj}</p>
            <p><strong>Escopos Ativos:</strong> ${SICOOB_SCOPES}</p>
        </div>

        <div class="card">
            <h3>🧪 Testes Produção</h3>
            <button class="btn" onclick="testarConexao()">Testar Conexão Produção</button>
            <button class="btn btn-success" onclick="testarPIX(0.10)">Testar PIX R$ 0,10</button>
            <button class="btn btn-success" onclick="testarPIX(1.00)">Testar PIX R$ 1,00</button>
        </div>

        <div id="resultado"></div>

        <script>
            async function testarConexao() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔌 Testando produção...</p>';
                
                const response = await fetch('/api/producao/teste');
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = '<div class="card" style="background: #d4edda;">✅ ' + data.message + '</div>';
                } else {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #f8d7da;">
                            <h3>❌ \${data.error}</h3>
                            <p><strong>Detalhes:</strong> \${data.detalhesErro}</p>
                            <p><strong>Solução:</strong> \${data.solucao}</p>
                            <pre>\${JSON.stringify(data.details, null, 2)}</pre>
                        </div>
                    \`;
                }
            }

            async function testarPIX(valor) {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>💰 Criando PIX...</p>';
                
                const response = await fetch('/api/pix/teste/' + valor);
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #d4edda;">
                            <h3>✅ PIX Produção Criado!</h3>
                            <p><strong>Valor:</strong> R$ \${data.valor}</p>
                            <img src="\${data.qrCode}" alt="QR Code" style="max-width: 300px;">
                            <textarea style="width: 100%; height: 80px;">\${data.pixCopiaECola}</textarea>
                            <button class="btn" onclick="copiarPIX('\${data.pixCopiaECola}')">📋 Copiar</button>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #f8d7da;">
                            <h3>❌ \${data.error}</h3>
                            <p>\${data.message}</p>
                        </div>
                    \`;
                }
            }

            function copiarPIX(texto) {
                navigator.clipboard.writeText(texto);
                alert('✅ Código copiado!');
            }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Sistema PIX Produção: http://localhost:${PORT}`);
  console.log(`🔗 Teste conexão: http://localhost:${PORT}/api/producao/teste`);
});