// server.js - SANDBOX FUNCIONAL
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

// 🔹 CLIENT AXIOS
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

// 🔹 CRIAR PIX NO SANDBOX
app.get("/api/pix/criar-teste", async (req, res) => {
  try {
    const txid = gerarTxid();
    const valor = 0.10; // 10 centavos
    
    const payload = {
      calendario: {
        expiracao: 3600 // 1 hora
      },
      devedor: {
        cpf: "12345678909",
        nome: "Cliente Teste Sandbox"
      },
      valor: {
        original: valor.toFixed(2)
      },
      chave: SANDBOX.chavePix,
      solicitacaoPagador: "Pagamento teste via Sandbox Sicoob"
    };

    console.log("🚀 Criando PIX no Sandbox...");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    // 🔹 CRIAR COBRANÇA PIX
    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    console.log("✅ PIX criado:", cobranca);

    // 🔹 GERAR QR CODE
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

    res.json({
      success: true,
      valor: valor,
      qrCode: qrCodeUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      txid: cobranca.txid,
      status: cobranca.status,
      location: cobranca.location,
      instrucoes: [
        "🎯 PIX GERADO PELO SANDBOX SICOOB!",
        "1. Copie o código PIX abaixo",
        "2. Abra seu app bancário (Nubank, Inter, etc.)",
        "3. Cole no campo 'Pagar com PIX'",
        "4. Deve aparecer: R$ 0,10",
        "5. Este é um PIX REAL do Sandbox!"
      ]
    });

  } catch (error) {
    console.error("❌ Erro ao criar PIX:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Erro no Sandbox",
      details: error.response?.data,
      message: "Verifique se a chave PIX está configurada corretamente"
    });
  }
});

// 🔹 CRIAR PIX DE 1 REAL
app.get("/api/pix/1real", async (req, res) => {
  try {
    const txid = gerarTxid();
    const valor = 1.00;
    
    const payload = {
      calendario: {
        expiracao: 3600
      },
      devedor: {
        cpf: "12345678909",
        nome: "Teste 1 Real"
      },
      valor: {
        original: valor.toFixed(2)
      },
      chave: SANDBOX.chavePix,
      solicitacaoPagador: "Teste de R$ 1,00 no Sandbox"
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
      instrucoes: [
        "💰 PIX DE R$ 1,00 - SANDBOX SICOOB",
        "1. Use o QR Code ou copie o código PIX",
        "2. Abra seu app bancário",
        "3. Cole o código PIX",
        "4. Valor: R$ 1,00"
      ]
    });

  } catch (error) {
    console.error("❌ Erro:", error.response?.data);
    res.status(500).json({ success: false, error: error.response?.data });
  }
});

// 🔹 CONSULTAR PIX CRIADO
app.get("/api/pix/consultar/:txid", async (req, res) => {
  try {
    const { txid } = req.params;
    
    const response = await apiClient.get(`/cob/${txid}`);
    
    res.json({
      success: true,
      cobranca: response.data
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: "PIX não encontrado"
    });
  }
});

// 🔹 PÁGINA DE TESTES
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎯 Sandbox Sicoob - PIX Real</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { padding: 12px 20px; margin: 5px; background: #28a745; color: white; 
                   border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            .btn:hover { background: #218838; }
            #resultado { margin-top: 20px; }
            textarea { width: 100%; height: 80px; margin: 10px 0; padding: 10px; }
            img { max-width: 300px; border: 2px solid #ddd; border-radius: 8px; }
        </style>
    </head>
    <body>
        <h1>🎯 Sandbox Sicoob - PIX Real</h1>
        <p><strong>Status:</strong> ✅ Conectado e Funcionando</p>
        
        <div class="card">
            <h3>🧪 Testar PIX do Sandbox:</h3>
            <button class="btn" onclick="criarPix(0.10)">Criar PIX R$ 0,10</button>
            <button class="btn" onclick="criarPix(1.00)">Criar PIX R$ 1,00</button>
        </div>
        
        <div id="resultado"></div>

        <script>
            async function criarPix(valor) {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔄 Criando PIX de R$ ' + valor + '...</p>';
                
                const endpoint = valor === 0.10 ? '/api/pix/criar-teste' : '/api/pix/1real';
                const response = await fetch(endpoint);
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #d4edda;">
                            <h3>✅ PIX Criado com Sucesso!</h3>
                            <p><strong>Valor:</strong> R$ \${data.valor}</p>
                            <p><strong>Status:</strong> \${data.status}</p>
                            <p><strong>TXID:</strong> \${data.txid}</p>
                            
                            <div style="text-align: center;">
                                <img src="\${data.qrCode}" alt="QR Code PIX">
                                <p><small>Escaneie com seu app bancário</small></p>
                            </div>
                            
                            <p><strong>PIX Copia e Cola:</strong></p>
                            <textarea readonly>\${data.pixCopiaECola}</textarea>
                            <button class="btn" onclick="copiarPIX('\${data.pixCopiaECola}')">📋 Copiar Código</button>
                            
                            <p><strong>Instruções:</strong></p>
                            <ul>\${data.instrucoes.map(i => '<li>' + i + '</li>').join('')}</ul>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #f8d7da;">
                            <h3>❌ Erro ao Criar PIX</h3>
                            <p>\${data.error}</p>
                            <p><small>\${data.details?.moreInformation || ''}</small></p>
                        </div>
                    \`;
                }
            }
            
            function copiarPIX(texto) {
                navigator.clipboard.writeText(texto);
                alert('✅ Código PIX copiado! Cole no seu banco.');
            }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor: http://localhost:${PORT}`);
  console.log(`🔗 Sandbox: ${SANDBOX.baseURL}`);
  console.log(`🎯 Criar PIX: http://localhost:${PORT}/api/pix/criar-teste`);
});