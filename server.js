// server.js - COM NOVO CLIENT ID SOFTWARE EXPRESS
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 NOVAS CREDENCIAIS - SOFTWARE EXPRESS
const SICOOB_PRODUCAO = {
  tokenURL: "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token",
  baseURL: "https://api.sicoob.com.br/pix/api/v2",
  clientId: "a9b286bc-edec-4b03-90e7-96c5a6cce89b", // 🔼 NOVO CLIENT ID
  empresa: {
    nome: "P C LIMA INACIO",
    cnpj: "24430463000151",
    cidade: "BRASILIA",
    conta: "4558-6",
    cooperativa: "4437",
    parceira: "Software Express" // 🔼 NOVA EMPRESA PARCEIRA
  }
};

// 🔹 ESCOPOS COMPLETOS CONFORME CATÁLOGO
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

let accessToken = null;
let tokenExpiraEm = null;

// 🔹 OBTER TOKEN - VERSÃO OTIMIZADA
async function obterTokenSicoob() {
  try {
    console.log("🔑 Obtendo token com novo Client ID...");
    console.log("Client ID:", SICOOB_PRODUCAO.clientId);
    console.log("Empresa Parceira:", SICOOB_PRODUCAO.empresa.parceira);
    
    const response = await axios({
      method: 'post',
      url: SICOOB_PRODUCAO.tokenURL,
      data: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SICOOB_PRODUCAO.clientId,
        scope: SICOOB_SCOPES
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000
    });

    accessToken = response.data.access_token;
    tokenExpiraEm = Date.now() + (response.data.expires_in * 1000);
    
    console.log("✅ ✅ ✅ TOKEN OBTIDO COM SUCESSO!");
    console.log("Token:", accessToken.substring(0, 50) + "...");
    console.log("Expira em:", new Date(tokenExpiraEm).toLocaleString());
    console.log("Empresa Parceira: Software Express");
    
    return accessToken;
    
  } catch (error) {
    console.error("❌ ERRO NA AUTENTICAÇÃO:");
    
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Resposta:", JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.error === "invalid_client") {
        console.error("🚨 PROBLEMA: Client ID não autorizado");
        console.error("💡 SOLUÇÃO: Contatar Software Express para ativar OAuth2");
      }
    } else {
      console.error("Erro:", error.message);
    }
    
    throw error;
  }
}

// 🔹 CLIENT API
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

// 🔹 TESTE DE CONEXÃO COM NOVO CLIENT ID
app.get("/api/producao/teste", async (req, res) => {
  try {
    console.log("🏦 Testando conexão com Software Express...");
    
    const token = await obterTokenSicoob();
    
    if (!token) {
      throw new Error("Token não obtido");
    }

    const apiClient = await getApiClient();
    
    // Testar endpoint de cobranças
    const response = await apiClient.get("/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z");
    
    res.json({
      success: true,
      message: "✅ ✅ ✅ CONECTADO AO SICOOB PRODUÇÃO!",
      token: `✅ Válido (${token.substring(0, 20)}...)`,
      apiStatus: response.status,
      empresa: SICOOB_PRODUCAO.empresa.nome,
      parceira: SICOOB_PRODUCAO.empresa.parceira,
      clientId: SICOOB_PRODUCAO.clientId,
      escopos: SICOOB_SCOPES,
      details: "Sistema pronto para criar cobranças PIX reais"
    });

  } catch (error) {
    console.error("❌ Erro produção:", error.response?.data || error.message);
    
    let detalhesErro = "Erro desconhecido";
    let solucao = "Entre em contato com a Software Express";
    
    if (error.response?.data?.error === "invalid_client") {
      detalhesErro = "Client ID não autorizado para OAuth2";
      solucao = "Solicitar à Software Express ativação do OAuth2";
    } else if (error.response?.data?.error === "unauthorized_client") {
      detalhesErro = "Client não autorizado para estes escopos";
      solucao = "Software Express precisa liberar os escopos PIX";
    }
    
    res.json({
      success: false,
      error: "Falha na autenticação produção",
      detalhesErro: detalhesErro,
      solucao: solucao,
      respostaSicoob: error.response?.data,
      clientId: SICOOB_PRODUCAO.clientId,
      parceira: SICOOB_PRODUCAO.empresa.parceira
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
        expiracao: 3600 // 1 hora
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
      parceira: SICOOB_PRODUCAO.empresa.parceira,
      instrucoes: [
        "🎯 PIX PRODUÇÃO CRIADO - SOFTWARE EXPRESS!",
        "1. Este PIX movimenta dinheiro REAL",
        "2. Use o QR Code ou copie o código PIX",
        "3. Abra seu app bancário",
        `4. Valor: R$ ${parseFloat(valor).toFixed(2)}`,
        `5. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        `6. Parceira: ${SICOOB_PRODUCAO.empresa.parceira}`,
        "7. ⏰ Válido por 1 hora",
        "8. 💰 Será creditado na conta 4558-6"
      ]
    });

  } catch (error) {
    console.error("❌ Erro criar PIX produção:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Erro ao criar cobrança PIX",
      details: error.response?.data,
      message: "Verifique com Software Express se a API PIX está ativa"
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
      parceira: SICOOB_PRODUCAO.empresa.parceira,
      instrucoes: [
        "🎯 PIX PRODUÇÃO - SOFTWARE EXPRESS!",
        "1. Este é um PIX REAL - movimenta dinheiro",
        "2. Copie o código e cole no seu banco",
        `3. Valor: R$ ${valor.toFixed(2)}`,
        `4. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        `5. Parceira: ${SICOOB_PRODUCAO.empresa.parceira}`,
        "6. ⚠️ AMBIENTE REAL - TESTE COM VALOR BAIXO"
      ]
    });

  } catch (error) {
    console.error("❌ Erro teste produção:", error.response?.data);
    
    res.status(500).json({
      success: false,
      error: "API produção não respondeu",
      details: error.response?.data,
      message: "Software Express precisa ativar API PIX para este Client ID"
    });
  }
});

// 🔹 PÁGINA PRINCIPAL ATUALIZADA
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🏦 PIX Produção - Software Express</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { padding: 12px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .btn-success { background: #28a745; }
            #resultado { margin-top: 20px; }
            .success { background: #d4edda; }
            .error { background: #f8d7da; }
        </style>
    </head>
    <body>
        <h1>🏦 Sistema PIX Produção - SOFTWARE EXPRESS</h1>
        
        <div class="card">
            <h3>🔑 Novas Credenciais Sicoob</h3>
            <p><strong>Client ID:</strong> ${SICOOB_PRODUCAO.clientId}</p>
            <p><strong>Empresa:</strong> ${SICOOB_PRODUCAO.empresa.nome}</p>
            <p><strong>Parceira:</strong> ${SICOOB_PRODUCAO.empresa.parceira}</p>
            <p><strong>CNPJ:</strong> ${SICOOB_PRODUCAO.empresa.cnpj}</p>
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
                resultado.innerHTML = '<p>🔌 Testando produção Software Express...</p>';
                
                const response = await fetch('/api/producao/teste');
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = '<div class="card success">✅ ' + data.message + '</div>';
                } else {
                    resultado.innerHTML = \`
                        <div class="card error">
                            <h3>❌ \${data.error}</h3>
                            <p><strong>Detalhes:</strong> \${data.detalhesErro}</p>
                            <p><strong>Solução:</strong> \${data.solucao}</p>
                            <p><strong>Parceira:</strong> \${data.parceira}</p>
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
                        <div class="card success">
                            <h3>✅ PIX Produção Criado!</h3>
                            <p><strong>Valor:</strong> R$ \${data.valor}</p>
                            <p><strong>Parceira:</strong> \${data.parceira}</p>
                            <img src="\${data.qrCode}" alt="QR Code" style="max-width: 300px;">
                            <textarea style="width: 100%; height: 80px;">\${data.pixCopiaECola}</textarea>
                            <button class="btn" onclick="copiarPIX('\${data.pixCopiaECola}')">📋 Copiar</button>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = \`
                        <div class="card error">
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
  console.log(`🚀 Sistema PIX Software Express: http://localhost:${PORT}`);
  console.log(`🔗 Teste conexão: http://localhost:${PORT}/api/producao/teste`);
  console.log(`🏦 Nova Parceira: Software Express`);
  console.log(`🔑 Novo Client ID: ${SICOOB_PRODUCAO.clientId}`);
});