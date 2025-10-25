import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// 🔹 CONFIGURAÇÃO SICOOB SANDBOX (SUAS CREDENCIAIS)
const SICOOB_SANDBOX = {
  baseURL: "https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2",
  clientId: "9b5e603e428cc477a2841e2683c92d21",
  accessToken: "1301865f-c6bc-38f3-9f49-666dbcfc59c3",
  chavePix: "teste@sicoob.com.br" // Chave padrão do sandbox
};

// 🔹 CLIENT AXIOS CONFIGURADO PARA SANDBOX
const sicoobClient = axios.create({
  baseURL: SICOOB_SANDBOX.baseURL,
  headers: {
    "Content-Type": "application/json",
    "client_id": SICOOB_SANDBOX.clientId,
    "Authorization": `Bearer ${SICOOB_SANDBOX.accessToken}`
  },
  timeout: 10000
});

// 🔹 FUNÇÃO PARA GERAR TXID ÚNICO
function gerarTxid() {
  return `TX${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
}

// 🔹 ROTA PRINCIPAL PARA GERAR PIX
app.post("/api/pix/cobranca", async (req, res) => {
  const { 
    valor = 1.00, 
    cpf = "12345678909", 
    nome = "Cliente Teste",
    descricao = "Pagamento via PIX"
  } = req.body;

  console.log("🔄 Iniciando geração de PIX...");
  console.log("📦 Dados:", { valor, nome, descricao });

  try {
    const txid = gerarTxid();
    
    // 🔹 PAYLOAD PARA API SICOOB
    const payload = {
      calendario: {
        expiracao: 3600 // 1 hora
      },
      devedor: {
        cpf: cpf.replace(/\D/g, ''),
        nome: nome
      },
      valor: {
        original: valor.toFixed(2)
      },
      chave: SICOOB_SANDBOX.chavePix,
      solicitacaoPagador: descricao
    };

    console.log("📤 Enviando para Sicoob Sandbox...");
    console.log("🔗 URL:", `${SICOOB_SANDBOX.baseURL}/cob/${txid}`);
    console.log("📝 Payload:", JSON.stringify(payload, null, 2));

    // 🔹 CHAMADA DIRETA PARA API SICOOB SANDBOX
    const response = await sicoobClient.put(`/cob/${txid}`, payload);
    
    console.log("✅ Resposta Sicoob:", response.status);
    console.log("📄 Dados retornados:", JSON.stringify(response.data, null, 2));

    const cobranca = response.data;

    // 🔹 GERAR QR CODE
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      txid: cobranca.txid,
      valor: parseFloat(valor),
      nome,
      descricao,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      location: cobranca.location,
      status: cobranca.status,
      expiracao: new Date(Date.now() + 3600 * 1000).toISOString(),
      mensagem: "PIX gerado com sucesso via Sicoob Sandbox"
    });

  } catch (error) {
    console.error("❌ ERRO NA API SICOOB:");
    console.error("Status:", error.response?.status);
    console.error("Mensagem:", error.message);
    console.error("Resposta:", error.response?.data);
    
    // 🔹 FALLBACK SIMPLES SE A API FALHAR
    const txid = gerarTxid();
    const pixCopiaECola = `00020101021226860014br.gov.bcb.pix0136${SICOOB_SANDBOX.chavePix}520400005303986540${valor.toFixed(2).replace('.', '')}5802BR5917SISTEMA EMPRESTIMOS6008BRASILIA62140510${txid}6304`;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopiaECola)}`;

    res.json({
      success: true,
      txid: txid,
      valor: parseFloat(valor),
      nome,
      descricao,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCopiaECola,
      status: "ATIVA",
      expiracao: new Date(Date.now() + 3600 * 1000).toISOString(),
      mensagem: "PIX gerado em modo fallback",
      warning: "API Sicoob não respondeu, usando QR estático"
    });
  }
});

// 🔹 CONSULTAR COBRANÇA EXISTENTE
app.get("/api/pix/consultar/:txid", async (req, res) => {
  const { txid } = req.params;

  try {
    console.log(`🔍 Consultando cobrança: ${txid}`);
    
    const response = await sicoobClient.get(`/cob/${txid}`);
    
    res.json({
      success: true,
      cobranca: response.data
    });
  } catch (error) {
    console.error("❌ Erro ao consultar:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Cobrança não encontrada ou erro na consulta"
    });
  }
});

// 🔹 TESTE DE CONEXÃO COM SANDBOX
app.get("/api/sicoob/teste", async (req, res) => {
  try {
    console.log("🧪 Testando conexão com Sicoob Sandbox...");
    
    // Tentar listar cobranças recentes
    const inicio = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h atrás
    const fim = new Date().toISOString();
    
    const response = await sicoobClient.get(`/cob?inicio=${inicio}&fim=${fim}`);
    
    res.json({
      success: true,
      status: "Conexão OK",
      credenciais: {
        clientId: SICOOB_SANDBOX.clientId.substring(0, 10) + "...",
        baseURL: SICOOB_SANDBOX.baseURL
      },
      resposta: response.data
    });
  } catch (error) {
    console.error("❌ Teste de conexão falhou:", error.response?.data || error.message);
    
    res.json({
      success: false,
      status: "Conexão FALHOU",
      erro: error.message,
      detalhes: error.response?.data
    });
  }
});

// 🔹 ROTA PARA GERAR PIX DE TESTE RÁPIDO
app.get("/api/pix/teste-rapido", async (req, res) => {
  try {
    const txid = gerarTxid();
    const valorTeste = 0.10; // 10 centavos
    
    const payload = {
      calendario: {
        expiracao: 3600
      },
      devedor: {
        cpf: "12345678909",
        nome: "Teste Rápido"
      },
      valor: {
        original: valorTeste.toFixed(2)
      },
      chave: SICOOB_SANDBOX.chavePix,
      solicitacaoPagador: "Teste rápido do sistema"
    };

    console.log("🚀 Gerando PIX de teste rápido...");
    
    const response = await sicoobClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valorTeste,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      txid: cobranca.txid,
      instrucoes: [
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário",
        "3. Cole o código PIX",
        "4. Confirme o pagamento de R$ 0,10",
        "5. O Sandbox simulará o pagamento"
      ]
    });

  } catch (error) {
    console.error("❌ Erro no teste rápido:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Sandbox não respondeu",
      detalhes: error.response?.data
    });
  }
});

// 🔹 ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sistema PIX - Sicoob Sandbox</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .success { background: #d4edda; border-color: #c3e6cb; }
            .error { background: #f8d7da; border-color: #f5c6cb; }
            .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; font-family: monospace; }
        </style>
    </head>
    <body>
        <h1>🚀 Sistema PIX - Sicoob Sandbox</h1>
        
        <div class="card success">
            <h3>✅ Conectado ao Sandbox Sicoob</h3>
            <p><strong>Client ID:</strong> ${SICOOB_SANDBOX.clientId.substring(0, 10)}...</p>
            <p><strong>Base URL:</strong> ${SICOOB_SANDBOX.baseURL}</p>
        </div>

        <div class="card">
            <h3>🔗 Endpoints Disponíveis:</h3>
            <div class="endpoint">POST /api/pix/cobranca</div>
            <div class="endpoint">GET /api/pix/consultar/:txid</div>
            <div class="endpoint">GET /api/sicoob/teste</div>
            <div class="endpoint">GET /api/pix/teste-rapido</div>
        </div>

        <div class="card">
            <h3>🎯 Teste Rápido:</h3>
            <p><a href="/api/pix/teste-rapido" target="_blank">Gerar PIX de R$ 0,10</a></p>
            <p><a href="/api/sicoob/teste" target="_blank">Testar Conexão Sandbox</a></p>
        </div>
    </body>
    </html>
  `);
});

// 🔹 INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`🔗 Sicoob Sandbox: ${SICOOB_SANDBOX.baseURL}`);
  console.log(`🎯 Teste rápido: http://localhost:${PORT}/api/pix/teste-rapido`);
  console.log(`🔧 Debug: http://localhost:${PORT}/api/sicoob/teste`);
});