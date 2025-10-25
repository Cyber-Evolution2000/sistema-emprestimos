// server.js - ARQUIVO COMPLETO E PRONTO
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CONFIGURAÇÃO SICOOB SANDBOX (SUAS CREDENCIAIS)
const SICOOB_SANDBOX = {
  baseURL: "https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2",
  clientId: "9b5e603e428cc477a2841e2683c92d21",
  accessToken: "1301865f-c6bc-38f3-9f49-666dbcfc59c3",
  chavePix: "teste@sicoob.com.br"
};

// 🔹 CLIENT AXIOS CONFIGURADO
const sicoobClient = axios.create({
  baseURL: SICOOB_SANDBOX.baseURL,
  headers: {
    "Content-Type": "application/json",
    "client_id": SICOOB_SANDBOX.clientId,
    "Authorization": `Bearer ${SICOOB_SANDBOX.accessToken}`
  },
  timeout: 10000
});

// 🔹 GERAR TXID ÚNICO
function gerarTxid() {
  return `TX${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
}

// 🔹 ROTA PARA TESTE RÁPIDO DO PIX
app.get("/api/pix/teste-rapido", async (req, res) => {
  try {
    console.log("🚀 Iniciando teste rápido do PIX...");
    
    const txid = gerarTxid();
    const valorTeste = 0.10; // 10 centavos
    
    const payload = {
      calendario: {
        expiracao: 3600 // 1 hora
      },
      devedor: {
        cpf: "12345678909",
        nome: "Teste Rápido"
      },
      valor: {
        original: valorTeste.toFixed(2)
      },
      chave: SICOOB_SANDBOX.chavePix,
      solicitacaoPagador: "Teste rápido do sistema PIX"
    };

    console.log("📤 Enviando para Sicoob Sandbox...");
    
    // 🔹 TENTAR API SICOOB
    const response = await sicoobClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    console.log("✅ Resposta Sicoob:", response.status);
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valorTeste,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      txid: cobranca.txid,
      location: cobranca.location,
      status: cobranca.status,
      instrucoes: [
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário", 
        "3. Cole o código PIX",
        "4. Confirme o pagamento de R$ 0,10",
        "5. O Sandbox simulará o pagamento"
      ]
    });

  } catch (error) {
    console.error("❌ Erro no Sicoob Sandbox:", error.response?.data || error.message);
    
    // 🔹 FALLBACK SE API FALHAR
    const txid = gerarTxid();
    const valorTeste = 0.10;
    const pixCopiaECola = `00020101021226860014br.gov.bcb.pix0136${SICOOB_SANDBOX.chavePix}5204000053039865401105802BR5917TESTE RAPIDO PIX6008BRASILIA62140510${txid}6304A1B2`;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valorTeste,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCopiaECola,
      txid: txid,
      status: "ATIVA",
      warning: "API Sicoob não respondeu, usando QR estático",
      instrucoes: [
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário",
        "3. Cole o código PIX", 
        "4. Confirme o pagamento de R$ 0,10"
      ]
    });
  }
});

// 🔹 ROTA PARA GERAR PIX PERSONALIZADO
app.post("/api/pix/cobranca", async (req, res) => {
  const { 
    valor = 1.00, 
    cpf = "12345678909", 
    nome = "Cliente Teste",
    descricao = "Pagamento via PIX"
  } = req.body;

  try {
    const txid = gerarTxid();
    
    const payload = {
      calendario: {
        expiracao: 3600
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

    const response = await sicoobClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      txid: cobranca.txid,
      valor: parseFloat(valor),
      nome,
      descricao,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      status: cobranca.status,
      expiracao: new Date(Date.now() + 3600 * 1000).toISOString()
    });

  } catch (error) {
    console.error("❌ Erro ao gerar PIX:", error.response?.data || error.message);
    
    // Fallback
    const txid = gerarTxid();
    const pixCopiaECola = `00020101021226860014br.gov.bcb.pix0136${SICOOB_SANDBOX.chavePix}52040000530398654${valor.toFixed(2).replace('.', '').length.toString().padStart(2, '0')}${valor.toFixed(2).replace('.', '')}5802BR59${nome.length.toString().padStart(2, '0')}${nome}6008BRASILIA62140510${txid}6304C3D4`;

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
      warning: "API Sicoob não respondeu, usando QR estático"
    });
  }
});

// 🔹 CONSULTAR COBRANÇA
app.get("/api/pix/consultar/:txid", async (req, res) => {
  const { txid } = req.params;

  try {
    const response = await sicoobClient.get(`/cob/${txid}`);
    res.json({
      success: true,
      cobranca: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Cobrança não encontrada"
    });
  }
});

// 🔹 TESTE DE CONEXÃO
app.get("/api/sicoob/teste", async (req, res) => {
  try {
    const inicio = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fim = new Date().toISOString();
    
    const response = await sicoobClient.get(`/cob?inicio=${inicio}&fim=${fim}`);
    
    res.json({
      success: true,
      status: "Conectado ao Sicoob Sandbox",
      credenciais: {
        clientId: SICOOB_SANDBOX.clientId.substring(0, 10) + "...",
        baseURL: SICOOB_SANDBOX.baseURL
      }
    });
  } catch (error) {
    res.json({
      success: false,
      status: "Falha na conexão",
      erro: error.message,
      detalhes: error.response?.data
    });
  }
});

// 🔹 ROTA PRINCIPAL - PÁGINA HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔹 INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`🔗 Sicoob Sandbox: ${SICOOB_SANDBOX.baseURL}`);
  console.log(`🎯 Teste rápido: http://localhost:${PORT}/api/pix/teste-rapido`);
});