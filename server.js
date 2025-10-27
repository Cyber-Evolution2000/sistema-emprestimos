// server.js - SISTEMA PIX SIMPLIFICADO
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CONFIGURAÇÃO SIMPLES - APENAS CLIENT ID
const CONFIG = {
  tokenURL: "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token",
  baseURL: "https://api.sicoob.com.br/pix/api/v2",
  clientId: "a9b286bc-edec-4b03-90e7-96c5a6cce89b"
};

let accessToken = null;
let tokenExpiraEm = null;

// 🔹 OBTER TOKEN - VERSÃO SIMPLES
async function obterToken() {
  try {
    console.log("🔑 Obtendo token...");
    
    const response = await axios({
      method: 'post',
      url: CONFIG.tokenURL,
      data: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CONFIG.clientId,
        scope: 'cob.write cob.read pix.write pix.read'
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000
    });

    accessToken = response.data.access_token;
    tokenExpiraEm = Date.now() + (response.data.expires_in * 1000);
    
    console.log("✅ Token obtido!");
    return accessToken;
    
  } catch (error) {
    console.error("❌ Erro:", error.response?.data || error.message);
    throw error;
  }
}

// 🔹 CLIENT API
async function getApiClient() {
  if (!accessToken || Date.now() >= tokenExpiraEm - 60000) {
    await obterToken();
  }

  return axios.create({
    baseURL: CONFIG.baseURL,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "client_id": CONFIG.clientId
    },
    timeout: 25000
  });
}

// 🔹 GERAR TXID
function gerarTxid() {
  return `PIX${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// 🔹 TESTE DE CONEXÃO
app.get("/api/teste", async (req, res) => {
  try {
    const token = await obterToken();
    
    const apiClient = await getApiClient();
    const response = await apiClient.get("/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z");
    
    res.json({
      success: true,
      message: "✅ Conectado ao Sicoob!",
      token: token.substring(0, 30) + "..."
    });

  } catch (error) {
    res.json({
      success: false,
      error: "Falha na autenticação",
      details: error.response?.data
    });
  }
});

// 🔹 CRIAR PIX
app.post("/api/pix", async (req, res) => {
  try {
    const { valor } = req.body;
    
    if (!valor) {
      return res.status(400).json({ 
        success: false, 
        error: "Valor é obrigatório" 
      });
    }

    const apiClient = await getApiClient();
    const txid = gerarTxid();
    
    const payload = {
      calendario: { expiracao: 3600 },
      devedor: { cpf: "12345678909", nome: "Cliente" },
      valor: { original: parseFloat(valor).toFixed(2) },
      chave: "24430463000151", // Seu CNPJ
      solicitacaoPagador: "Pagamento via PIX"
    };

    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      valor: parseFloat(valor),
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      txid: cobranca.txid
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erro ao criar PIX",
      details: error.response?.data
    });
  }
});

// 🔹 PÁGINA SIMPLES
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sistema PIX</title>
        <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            input { padding: 10px; margin: 5px; width: 200px; }
        </style>
    </head>
    <body>
        <h1>💰 Sistema PIX</h1>
        
        <div class="card">
            <h3>Testar Conexão</h3>
            <button class="btn" onclick="testar()">Testar</button>
        </div>

        <div class="card">
            <h3>Criar PIX</h3>
            <input type="number" id="valor" placeholder="Valor" step="0.01">
            <button class="btn" onclick="criarPIX()">Criar PIX</button>
        </div>

        <div id="resultado"></div>

        <script>
            async function testar() {
                const response = await fetch('/api/teste');
                const data = await response.json();
                
                const resultado = document.getElementById('resultado');
                if (data.success) {
                    resultado.innerHTML = '<div class="card" style="background: #d4edda;">✅ ' + data.message + '</div>';
                } else {
                    resultado.innerHTML = '<div class="card" style="background: #f8d7da;">❌ ' + data.error + '</div>';
                }
            }

            async function criarPIX() {
                const valor = document.getElementById('valor').value;
                if (!valor) return alert('Digite um valor');
                
                const response = await fetch('/api/pix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ valor: valor })
                });
                
                const data = await response.json();
                const resultado = document.getElementById('resultado');
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #d4edda;">
                            <h3>✅ PIX Criado!</h3>
                            <p>Valor: R$ \${data.valor}</p>
                            <img src="\${data.qrCode}" width="300">
                            <textarea style="width: 100%; height: 60px; margin: 10px 0;">\${data.pixCopiaECola}</textarea>
                            <button class="btn" onclick="copiar('\${data.pixCopiaECola}')">Copiar</button>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = '<div class="card" style="background: #f8d7da;">❌ ' + data.error + '</div>';
                }
            }

            function copiar(texto) {
                navigator.clipboard.writeText(texto);
                alert('Copiado!');
            }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor: http://localhost:${PORT}`);
});