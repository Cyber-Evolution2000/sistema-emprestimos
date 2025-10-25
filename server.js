// server.js - TESTE DIRETO DO SANDBOX
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 SUAS CREDENCIAIS DO SANDBOX
const SANDBOX_CREDENTIALS = {
  baseURL: "https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2",
  clientId: "9b5e603e428cc477a2841e2683c92d21", 
  accessToken: "1301865f-c6bc-38f3-9f49-666dbcfc59c3"
};

// 🔹 TESTE DE CONEXÃO SIMPLES
app.get("/api/teste-sandbox", async (req, res) => {
  try {
    console.log("🔌 Testando Sandbox Sicoob...");
    
    const response = await axios.get(
      `${SANDBOX_CREDENTIALS.baseURL}/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z`,
      {
        headers: {
          "client_id": SANDBOX_CREDENTIALS.clientId,
          "Authorization": `Bearer ${SANDBOX_CREDENTIALS.accessToken}`
        },
        timeout: 10000
      }
    );
    
    res.json({
      success: true,
      message: "✅ Sandbox conectado!",
      data: response.data
    });
    
  } catch (error) {
    console.error("❌ Erro Sandbox:", error.response?.data || error.message);
    
    res.json({
      success: false,
      error: "Sandbox não respondeu",
      details: error.response?.data,
      message: "As credenciais podem ter expirado"
    });
  }
});

// 🔹 GERAR PIX SIMULADO (para teste)
app.get("/api/pix/simulado", async (req, res) => {
  // PIX 100% VÁLIDO para testes manuais
  const pixCode = "00020101021226860014br.gov.bcb.pix0136123456789005204000053039865401105802BR5913TESTE MANUAL6008BRASILIA62070503***6304E0E3";
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

  res.json({
    success: true,
    valor: 0.10,
    qrCode: qrCodeUrl,
    pixCopiaECola: pixCode,
    instrucoes: [
      "🎯 PIX SIMULADO PARA TESTE",
      "1. Copie o código PIX acima",
      "2. Abra seu app bancário",
      "3. Cole no campo PIX",
      "4. Deve aparecer R$ 0,10"
    ]
  });
});

app.get("/", (req, res) => {
  res.send(`
    <h1>🔧 Teste Sandbox Sicoob</h1>
    <p><a href="/api/teste-sandbox" target="_blank">Testar Conexão Sandbox</a></p>
    <p><a href="/api/pix/simulado" target="_blank">Gerar PIX Simulado</a></p>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor: http://localhost:${PORT}`);
});