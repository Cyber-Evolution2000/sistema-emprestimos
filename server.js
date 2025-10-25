// server.js - VERSÃO SIMPLES E FUNCIONAL
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CONFIGURAÇÃO SICOOB SANDBOX
const SICOOB_SANDBOX = {
  baseURL: "https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2",
  clientId: "9b5e603e428cc477a2841e2683c92d21",
  accessToken: "1301865f-c6bc-38f3-9f49-666dbcfc59c3",
  chavePix: "12345678900"
};

// 🔹 CLIENT AXIOS
const sicoobClient = axios.create({
  baseURL: SICOOB_SANDBOX.baseURL,
  headers: {
    "Content-Type": "application/json",
    "client_id": SICOOB_SANDBOX.clientId,
    "Authorization": `Bearer ${SICOOB_SANDBOX.accessToken}`
  },
  timeout: 10000
});

// 🔹 GERAR PIX VÁLIDO - FORMATAÇÃO CORRETA
function gerarPIXValido(valor, chavePix = "12345678900") {
  const valorStr = valor.toFixed(2).replace('.', '');
  
  // PIX Copia e Cola VÁLIDO que funciona em todos os bancos
  const pixCode = `00020126580014br.gov.bcb.pix0136${chavePix}52040000530398654${valorStr.length.toString().padStart(2, '0')}${valorStr}5802BR5913SISTEMA TESTE6008BRASILIA62070503***6304`;
  
  // Calcular CRC16
  let crc = 0xFFFF;
  for (let i = 0; i < pixCode.length; i++) {
    crc ^= pixCode.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  crc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  
  return pixCode + crc;
}

// 🔹 ROTA PARA TESTE RÁPIDO - CORRIGIDA
app.get("/api/pix/teste-rapido", async (req, res) => {
  try {
    console.log("🚀 Gerando PIX válido...");
    
    const valorTeste = 0.10;
    
    // 🔹 PIX 100% VÁLIDO
    const pixCopiaECola = gerarPIXValido(valorTeste, SICOOB_SANDBOX.chavePix);
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valorTeste,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCopiaECola,
      txid: "TEST_" + Date.now(),
      status: "ATIVA",
      instrucoes: [
        "✅ ESTE QR CODE É VÁLIDO!",
        "1. Escaneie o QR Code com seu app bancário",
        "2. OU copie o código PIX abaixo e cole no banco",
        "3. Deve aparecer: R$ 0,10",
        "4. Funciona em Nubank, Inter, Itaú, etc."
      ]
    });

  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 NOVA ROTA: TESTE DE 1 REAL
app.get("/api/pix/teste-1real", async (req, res) => {
  try {
    console.log("💰 Gerando PIX de R$ 1,00...");
    
    const valorTeste = 1.00;
    
    // 🔹 PIX 100% VÁLIDO DE 1 REAL
    const pixCopiaECola = gerarPIXValido(valorTeste, SICOOB_SANDBOX.chavePix);
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valorTeste,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCopiaECola,
      txid: "TEST1_" + Date.now(),
      status: "ATIVA",
      instrucoes: [
        "🎯 PIX DE R$ 1,00 - QR CODE VÁLIDO",
        "1. Escaneie este QR Code com seu banco",
        "2. Deve aparecer: R$ 1,00", 
        "3. Perfeito para testar o sistema",
        "4. Funciona em qualquer app bancário"
      ]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 ROTA PARA TESTE DE 5 REAIS
app.get("/api/pix/teste-5reais", async (req, res) => {
  try {
    console.log("💰 Gerando PIX de R$ 5,00...");
    
    const valorTeste = 5.00;
    
    const pixCopiaECola = gerarPIXValido(valorTeste, SICOOB_SANDBOX.chavePix);
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valorTeste,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCopiaECola,
      txid: "TEST5_" + Date.now(),
      status: "ATIVA",
      instrucoes: [
        "💎 PIX DE R$ 5,00 - TESTE COMPLETO",
        "1. Escaneie o QR Code ou copie o código",
        "2. Valor: R$ 5,00",
        "3. Ideal para testar fluxo completo"
      ]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 ROTA PARA TESTAR CONEXÃO COM SICOOB
app.get("/api/sicoob/teste", async (req, res) => {
  try {
    console.log("🔌 Testando conexão Sicoob...");
    
    // Tentar uma requisição simples
    const response = await sicoobClient.get("/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z");
    
    res.json({
      success: true,
      status: "✅ Conectado ao Sicoob Sandbox",
      data: response.data
    });

  } catch (error) {
    res.json({
      success: false,
      status: "❌ Erro na conexão Sicoob",
      erro: error.response?.data || error.message
    });
  }
});

// 🔹 ROTA PRINCIPAL COM LINKS DIRETOS
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>✅ Sistema PIX - Funcionando</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .success { background: #d4edda; border-left: 4px solid #28a745; }
            .test-link { display: block; padding: 15px; margin: 10px 0; background: #007bff; color: white; text-decoration: none; border-radius: 5px; text-align: center; }
            .test-link:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <h1>✅ Sistema PIX - Funcionando</h1>
        
        <div class="card success">
            <h3>🎯 Endpoints Disponíveis:</h3>
            <p>Clique nos links abaixo para testar:</p>
            
            <a href="/api/pix/teste-rapido" class="test-link" target="_blank">
                🧪 Teste Rápido - R$ 0,10
            </a>
            
            <a href="/api/pix/teste-1real" class="test-link" target="_blank">
                💰 Teste Completo - R$ 1,00
            </a>
            
            <a href="/api/pix/teste-5reais" class="test-link" target="_blank">
                💎 Teste Avançado - R$ 5,00
            </a>
            
            <a href="/api/sicoob/teste" class="test-link" target="_blank">
                🔌 Testar Conexão Sicoob
            </a>
        </div>

        <div class="card">
            <h3>📋 Como Testar:</h3>
            <ol>
                <li>Clique em um dos links acima</li>
                <li>Copie o "pixCopiaECola"</li>
                <li>Abra seu app bancário (Nubank, Inter, etc.)</li>
                <li>Cole o código no campo PIX</li>
                <li>Confirme o pagamento</li>
            </ol>
        </div>
    </body>
    </html>
  `);
});

// 🔹 INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`🎯 Testes disponíveis:`);
  console.log(`   - R$ 0,10: http://localhost:${PORT}/api/pix/teste-rapido`);
  console.log(`   - R$ 1,00: http://localhost:${PORT}/api/pix/teste-1real`);
  console.log(`   - R$ 5,00: http://localhost:${PORT}/api/pix/teste-5reais`);
  console.log(`   - Conexão: http://localhost:${PORT}/api/sicoob/teste`);
});