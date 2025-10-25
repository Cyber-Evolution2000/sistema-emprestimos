// server.js - VERSÃO CORRIGIDA PARA SANDBOX
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
const SANDBOX = {
  baseURL: "https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2",
  clientId: "9b5e603e428cc477a2841e2683c92d21",
  accessToken: "1301865f-c6bc-38f3-9f49-666dbcfc59c3",
  chavePix: "12345678900" // CPF para testes
};

// 🔹 CLIENT AXIOS CONFIGURADO
const apiClient = axios.create({
  baseURL: SANDBOX.baseURL,
  headers: {
    "Content-Type": "application/json",
    "client_id": SANDBOX.clientId,
    "Authorization": `Bearer ${SANDBOX.accessToken}`
  },
  timeout: 15000
});

// 🔹 GERAR TXID
function gerarTxid() {
  return `TEST${Date.now()}`;
}

// 🔹 TESTE DE CONEXÃO COM SANDBOX
app.get("/api/sandbox/teste", async (req, res) => {
  try {
    console.log("🔌 Testando conexão com Sandbox...");
    
    // Tentar listar cobranças (endpoint mais simples)
    const response = await apiClient.get("/cob?inicio=2024-12-01T00:00:00Z&fim=2024-12-02T00:00:00Z");
    
    res.json({
      success: true,
      message: "✅ Conectado ao Sandbox Sicoob!",
      status: response.status,
      data: response.data
    });
    
  } catch (error) {
    console.error("❌ Erro Sandbox:", error.response?.data || error.message);
    
    res.json({
      success: false,
      error: "Falha na conexão",
      details: error.response?.data,
      status: error.response?.status
    });
  }
});

// 🔹 CRIAR COBRANÇA PIX NO SANDBOX
app.post("/api/pix/criar", async (req, res) => {
  try {
    const { valor = 1.00, nome = "Teste", descricao = "Pagamento teste" } = req.body;
    
    const txid = gerarTxid();
    const payload = {
      calendario: {
        expiracao: 3600
      },
      devedor: {
        cpf: "12345678909",
        nome: nome
      },
      valor: {
        original: valor.toFixed(2)
      },
      chave: SANDBOX.chavePix,
      solicitacaoPagador: descricao
    };

    console.log("📤 Criando cobrança PIX...");
    
    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    console.log("✅ Cobrança criada:", cobranca.txid);

    // Gerar QR Code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      txid: cobranca.txid,
      valor: valor,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      location: cobranca.location,
      status: cobranca.status,
      expiracao: new Date(Date.now() + 3600 * 1000).toISOString()
    });

  } catch (error) {
    console.error("❌ Erro ao criar PIX:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Erro no Sandbox",
      details: error.response?.data
    });
  }
});

// 🔹 TESTE RÁPIDO - CRIAR PIX DE R$ 0,10
app.get("/api/pix/teste-rapido", async (req, res) => {
  try {
    const txid = gerarTxid();
    const payload = {
      calendario: {
        expiracao: 3600
      },
      devedor: {
        cpf: "12345678909",
        nome: "Teste Rápido"
      },
      valor: {
        original: "0.10"
      },
      chave: SANDBOX.chavePix,
      solicitacaoPagador: "Teste rápido Sandbox"
    };

    console.log("🚀 Criando PIX de teste...");
    
    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      valor: 0.10,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      txid: cobranca.txid,
      status: cobranca.status,
      instrucoes: [
        "✅ PIX GERADO PELO SANDBOX SICOOB!",
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário",
        "3. Cole o código no campo PIX",
        "4. Deve aparecer: R$ 0,10"
      ]
    });

  } catch (error) {
    console.error("❌ Erro teste rápido:", error.response?.data);
    
    res.status(500).json({
      success: false,
      error: "Sandbox não respondeu",
      details: error.response?.data
    });
  }
});

// 🔹 CONSULTAR COBRANÇA
app.get("/api/pix/consultar/:txid", async (req, res) => {
  try {
    const { txid } = req.params;
    
    const response = await apiClient.get(`/cob/${txid}`);
    
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

// 🔹 PÁGINA PRINCIPAL
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🧪 Sandbox Sicoob - Testes</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { display: inline-block; padding: 10px 15px; margin: 5px; background: #007bff; color: white; 
                   text-decoration: none; border-radius: 5px; cursor: pointer; }
            .btn:hover { background: #0056b3; }
            #resultado { margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>🧪 Sandbox Sicoob - Testes PIX</h1>
        
        <div class="card">
            <h3>🔗 Testes Disponíveis:</h3>
            <button class="btn" onclick="testarConexao()">Testar Conexão Sandbox</button>
            <button class="btn" onclick="criarPixTeste()">Criar PIX R$ 0,10</button>
            <button class="btn" onclick="criarPix1Real()">Criar PIX R$ 1,00</button>
        </div>
        
        <div id="resultado"></div>

        <script>
            async function testarConexao() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔌 Testando conexão...</p>';
                
                const response = await fetch('/api/sandbox/teste');
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = '<div style="background: #d4edda; padding: 15px; border-radius: 5px;">✅ ' + data.message + '</div>';
                } else {
                    resultado.innerHTML = '<div style="background: #f8d7da; padding: 15px; border-radius: 5px;">❌ Erro: ' + (data.details?.httpMessage || data.error) + '</div>';
                }
            }
            
            async function criarPixTeste() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔄 Criando PIX...</p>';
                
                const response = await fetch('/api/pix/teste-rapido');
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div style="background: #d4edda; padding: 15px; border-radius: 5px;">
                            <h4>✅ PIX Criado com Sucesso!</h4>
                            <p><strong>Valor:</strong> R$ \${data.valor}</p>
                            <p><strong>TXID:</strong> \${data.txid}</p>
                            <img src="\${data.qrCode}" alt="QR Code">
                            <p><strong>PIX Copia e Cola:</strong></p>
                            <textarea style="width: 100%; height: 80px;">\${data.pixCopiaECola}</textarea>
                            <button onclick="copiarPIX('\${data.pixCopiaECola}')">📋 Copiar</button>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = '<div style="background: #f8d7da; padding: 15px; border-radius: 5px;">❌ Erro: ' + data.error + '</div>';
                }
            }
            
            async function criarPix1Real() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔄 Criando PIX de R$ 1,00...</p>';
                
                const response = await fetch('/api/pix/criar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ valor: 1.00, nome: "Teste 1 Real", descricao: "PIX de R$ 1,00" })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div style="background: #d4edda; padding: 15px; border-radius: 5px;">
                            <h4>✅ PIX de R$ 1,00 Criado!</h4>
                            <p><strong>Valor:</strong> R$ \${data.valor}</p>
                            <img src="\${data.qrCode}" alt="QR Code">
                            <p><strong>PIX Copia e Cola:</strong></p>
                            <textarea style="width: 100%; height: 80px;">\${data.pixCopiaECola}</textarea>
                            <button onclick="copiarPIX('\${data.pixCopiaECola}')">📋 Copiar</button>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = '<div style="background: #f8d7da; padding: 15px; border-radius: 5px;">❌ Erro: ' + data.error + '</div>';
                }
            }
            
            function copiarPIX(texto) {
                navigator.clipboard.writeText(texto);
                alert('✅ Código PIX copiado!');
            }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor: http://localhost:${PORT}`);
  console.log(`🔗 Sandbox: ${SANDBOX.baseURL}`);
});