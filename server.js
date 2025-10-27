// server.js - CORRIGIDO COM AUTENTICAÇÃO SICOOB
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CREDENCIAIS SICOOB PRODUÇÃO
const SICOOB_PRODUCAO = {
  baseURL: "https://api.sicoob.com.br/pix/api/v2",
  tokenURL: "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token",
  clientId: "df6cf8e2-008c-48a4-94ca-f795b4b3d728",
  empresa: {
    nome: "P C LIMA INACIO",
    cnpj: "24430463000151",
    cidade: "BRASILIA",
    conta: "4558-6",
    cooperativa: "4437"
  }
};

// 🔹 VARIÁVEIS DE TOKEN
let accessToken = null;
let tokenExpiraEm = null;

// 🔹 OBTER TOKEN - MÉTODO CORRIGIDO
async function obterToken() {
  try {
    console.log("🔑 Obtendo token Sicoob...");
    
    // Para autenticação Sicoob, precisamos enviar credentials em Basic Auth
    const credentials = Buffer.from(`${SICOOB_PRODUCAO.clientId}:`).toString('base64');
    
    const response = await axios.post(
      SICOOB_PRODUCAO.tokenURL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'cob.write cob.read pix.write pix.read webhook.write'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 10000
      }
    );

    accessToken = response.data.access_token;
    tokenExpiraEm = Date.now() + (response.data.expires_in * 1000);
    
    console.log("✅ Token obtido com sucesso!");
    console.log("Expira em:", new Date(tokenExpiraEm).toLocaleString());
    
    return accessToken;
    
  } catch (error) {
    console.error("❌ Erro ao obter token:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
    throw error;
  }
}

// 🔹 CLIENT API COM TOKEN
async function getApiClient() {
  if (!accessToken || Date.now() >= tokenExpiraEm - 60000) {
    await obterToken();
  }

  return axios.create({
    baseURL: SICOOB_PRODUCAO.baseURL,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "client_id": SICOOB_PRODUCAO.clientId
    },
    timeout: 15000
  });
}

// 🔹 GERAR TXID
function gerarTxid() {
  return `PC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// 🔹 TESTE DE CONEXÃO
app.get("/api/teste-conexao", async (req, res) => {
  try {
    console.log("🔌 Testando conexão com Sicoob...");
    
    await obterToken();
    
    const apiClient = await getApiClient();
    
    // Tentar listar cobranças (endpoint mais simples)
    const response = await apiClient.get("/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z");
    
    res.json({
      success: true,
      message: "✅ Conexão com Sicoob estabelecida!",
      token: accessToken ? "✅ Válido" : "❌ Inválido",
      apiStatus: response.status,
      empresa: SICOOB_PRODUCAO.empresa.nome
    });

  } catch (error) {
    console.error("❌ Erro teste conexão:", error.response?.data);
    
    res.json({
      success: false,
      error: "Falha na conexão",
      details: error.response?.data,
      message: "Verifique Client ID e permissões"
    });
  }
});

// 🔹 CRIAR PIX - MÉTODO SEGURO
app.get("/api/pix/teste/:valor?", async (req, res) => {
  const valor = parseFloat(req.params.valor) || 0.10;
  
  try {
    console.log(`💰 Tentando criar PIX de R$ ${valor}...`);
    
    const apiClient = await getApiClient();
    const txid = gerarTxid();
    
    const payload = {
      calendario: {
        expiracao: 3600 // 1 hora para testes
      },
      devedor: {
        cpf: "12345678909", // CPF de teste
        nome: "Cliente Teste Sistema"
      },
      valor: {
        original: valor.toFixed(2)
      },
      chave: SICOOB_PRODUCAO.empresa.cnpj,
      solicitacaoPagador: `Teste sistema PIX - ${SICOOB_PRODUCAO.empresa.nome}`
    };

    console.log("📤 Enviando para Sicoob...");
    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    console.log("✅ PIX criado:", cobranca.txid);

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
        "🎯 PIX PRODUÇÃO CRIADO!",
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário",
        `3. Valor: R$ ${valor.toFixed(2)}`,
        `4. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        "5. ⏰ Válido por 1 hora"
      ]
    });

  } catch (error) {
    console.error("❌ Erro criar PIX:", error.response?.data || error.message);
    
    // 🔹 FALLBACK PARA PIX ESTÁTICO
    console.log("🔄 Usando fallback estático...");
    const pixCopiaECola = gerarPixEstatico(valor);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valor,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCopiaECola,
      txid: `FALLBACK${Date.now()}`,
      status: "ATIVA",
      empresa: SICOOB_PRODUCAO.empresa.nome,
      warning: "API Sicoob offline - usando PIX estático",
      instrucoes: [
        "🎯 PIX ESTÁTICO (Fallback)",
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário",
        `3. Valor: R$ ${valor.toFixed(2)}`,
        `4. Beneficiário: ${SICOOB_PRODUCAO.empresa.nome}`,
        "5. ⚠️ Modo estático - API offline"
      ]
    });
  }
});

// 🔹 GERAR PIX ESTÁTICO (fallback)
function gerarPixEstatico(valor) {
  const valorStr = valor.toFixed(2).replace('.', '');
  
  const pixCode = `00020101021226860014br.gov.bcb.pix0136${SICOOB_PRODUCAO.empresa.cnpj}52040000530398654${valorStr.length.toString().padStart(2, '0')}${valorStr}5802BR59${SICOOB_PRODUCAO.empresa.nome.length.toString().padStart(2, '0')}${SICOOB_PRODUCAO.empresa.nome}6008${SICOOB_PRODUCAO.empresa.cidade}62070503***6304`;
  
  let crc = 0xFFFF;
  for (let i = 0; i < pixCode.length; i++) {
    crc ^= pixCode.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  crc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  
  return pixCode + crc;
}

// 🔹 PÁGINA PRINCIPAL
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🔧 Sistema PIX - Diagnóstico</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { padding: 12px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .btn-success { background: #28a745; }
            .btn-warning { background: #ffc107; color: black; }
            #resultado { margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>🔧 Sistema PIX - Diagnóstico</h1>
        
        <div class="card">
            <h3>🏢 Dados da Empresa</h3>
            <p><strong>Nome:</strong> ${SICOOB_PRODUCAO.empresa.nome}</p>
            <p><strong>CNPJ:</strong> ${SICOOB_PRODUCAO.empresa.cnpj}</p>
            <p><strong>Client ID:</strong> ${SICOOB_PRODUCAO.clientId}</p>
        </div>

        <div class="card">
            <h3>🧪 Testes</h3>
            <button class="btn" onclick="testarConexao()">Testar Conexão Sicoob</button>
            <button class="btn btn-success" onclick="testarPIX(0.10)">Testar PIX R$ 0,10</button>
            <button class="btn btn-warning" onclick="testarPIX(1.00)">Testar PIX R$ 1,00</button>
        </div>

        <div id="resultado"></div>

        <script>
            async function testarConexao() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔌 Testando conexão...</p>';
                
                const response = await fetch('/api/teste-conexao');
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #d4edda;">
                            <h3>✅ ${data.message}</h3>
                            <p><strong>Token:</strong> ${data.token}</p>
                            <p><strong>Empresa:</strong> ${data.empresa}</p>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #f8d7da;">
                            <h3>❌ ${data.error}</h3>
                            <p>${data.message}</p>
                            <pre>${JSON.stringify(data.details, null, 2)}</pre>
                        </div>
                    \`;
                }
            }

            async function testarPIX(valor) {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔄 Gerando PIX...</p>';
                
                const response = await fetch('/api/pix/teste/' + valor);
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #d4edda;">
                            <h3>✅ PIX Gerado!</h3>
                            ${data.warning ? '<p style="color: orange;">⚠️ ' + data.warning + '</p>' : ''}
                            <p><strong>Valor:</strong> R$ ${data.valor}</p>
                            <img src="${data.qrCode}" alt="QR Code" style="max-width: 300px;">
                            <textarea style="width: 100%; height: 80px;">${data.pixCopiaECola}</textarea>
                            <button class="btn" onclick="copiarPIX('${data.pixCopiaECola}')">📋 Copiar</button>
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
  console.log(`🚀 Servidor: http://localhost:${PORT}`);
  console.log(`🔗 Teste conexão: http://localhost:${PORT}/api/teste-conexao`);
});