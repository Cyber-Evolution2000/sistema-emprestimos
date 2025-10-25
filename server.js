// server.js - COM CHAVE PIX CNPJ CORRETA
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
  chavePix: "24430463000151" // CNPJ sem pontuação
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
    const valor = 0.10;
    
    const payload = {
      calendario: {
        expiracao: 3600
      },
      devedor: {
        cnpj: "12345678000195", // CNPJ para teste
        nome: "P C LIMA INACIO"
      },
      valor: {
        original: valor.toFixed(2)
      },
      chave: SANDBOX.chavePix, // Seu CNPJ como chave PIX
      solicitacaoPagador: "Teste Sandbox - P C LIMA INACIO"
    };

    console.log("🚀 Criando PIX com CNPJ...");
    console.log("Chave PIX:", SANDBOX.chavePix);

    // 🔹 CRIAR COBRANÇA PIX
    const response = await apiClient.put(`/cob/${txid}`, payload);
    const cobranca = response.data;

    console.log("✅ PIX criado com sucesso!");

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
        "2. Abra seu app bancário",
        "3. Cole no campo 'Pagar com PIX'", 
        "4. Deve aparecer: R$ 0,10",
        "5. Beneficiário: P C LIMA INACIO"
      ]
    });

  } catch (error) {
    console.error("❌ Erro detalhado:", error.response?.data);
    
    // 🔹 TENTAR COM CHAVE PIX ALTERNATIVA
    if (error.response?.data?.httpCode === 400) {
      console.log("🔄 Tentando com chave alternativa...");
      
      // Usar uma chave PIX genérica do Sandbox
      const SANDBOX_ALTERNATIVO = {
        ...SANDBOX,
        chavePix: "teste@sicoob.com.br" // Chave genérica do Sandbox
      };
      
      try {
        const txid = gerarTxid();
        const payload = {
          calendario: { expiracao: 3600 },
          devedor: { cpf: "12345678909", nome: "Teste Sandbox" },
          valor: { original: "0.10" },
          chave: SANDBOX_ALTERNATIVO.chavePix,
          solicitacaoPagador: "Teste com chave genérica"
        };

        const response = await axios.put(
          `${SANDBOX_ALTERNATIVO.baseURL}/cob/${txid}`, 
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              "client_id": SANDBOX_ALTERNATIVO.clientId,
              "Authorization": `Bearer ${SANDBOX_ALTERNATIVO.accessToken}`
            }
          }
        );

        const cobranca = response.data;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

        res.json({
          success: true,
          valor: 0.10,
          qrCode: qrCodeUrl,
          pixCopiaECola: cobranca.pixCopiaECola,
          txid: cobranca.txid,
          status: cobranca.status,
          warning: "Usando chave PIX genérica do Sandbox",
          instrucoes: [
            "🎯 PIX GERADO COM CHAVE GENÉRICA!",
            "1. Copie o código PIX abaixo",
            "2. Abra seu app bancário",
            "3. Cole no campo PIX",
            "4. Valor: R$ 0,10"
          ]
        });

      } catch (error2) {
        res.status(500).json({
          success: false,
          error: "Chave PIX não configurada no Sandbox",
          details: error2.response?.data,
          solucao: "Configure uma chave PIX no portal do Sandbox Sicoob"
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: "Erro no Sandbox",
        details: error.response?.data
      });
    }
  }
});

// 🔹 TESTE DE CHAVES PIX
app.get("/api/pix/testar-chaves", async (req, res) => {
  const chavesTeste = [
    "24430463000151", // Seu CNPJ
    "teste@sicoob.com.br", // Email genérico
    "12345678900", // CPF genérico
    "+5511999999999" // Celular genérico
  ];

  const resultados = [];

  for (const chave of chavesTeste) {
    try {
      const txid = gerarTxid();
      const payload = {
        calendario: { expiracao: 3600 },
        devedor: { cpf: "12345678909", nome: "Teste" },
        valor: { original: "0.10" },
        chave: chave,
        solicitacaoPagador: "Teste de chave PIX"
      };

      const response = await apiClient.put(`/cob/${txid}`, payload);
      resultados.push({
        chave: chave,
        status: "✅ FUNCIONOU",
        txid: response.data.txid
      });
      break; // Para no primeiro que funcionar

    } catch (error) {
      resultados.push({
        chave: chave,
        status: "❌ FALHOU",
        erro: error.response?.data?.moreInformation
      });
    }
  }

  res.json({
    success: true,
    teste_chaves: resultados,
    instrucao: resultados.some(r => r.status === "✅ FUNCIONOU") 
      ? "Use a chave que funcionou acima" 
      : "Nenhuma chave funcionou. Configure no portal Sandbox."
  });
});

// 🔹 PÁGINA PRINCIPAL
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🔧 Configurar Chave PIX - Sandbox</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { padding: 12px 20px; margin: 5px; background: #28a745; color: white; 
                   border: none; border-radius: 5px; cursor: pointer; }
            .btn-test { background: #17a2b8; }
        </style>
    </head>
    <body>
        <h1>🔧 Configurar Chave PIX - Sandbox</h1>
        
        <div class="card">
            <h3>📋 Seus Dados:</h3>
            <p><strong>Nome:</strong> P C LIMA INACIO</p>
            <p><strong>CNPJ:</strong> 24.430.463/0001-51</p>
            <p><strong>Chave PIX usada:</strong> ${SANDBOX.chavePix}</p>
        </div>

        <div class="card">
            <h3>🧪 Testes:</h3>
            <button class="btn" onclick="testarPIX()">Testar PIX com CNPJ</button>
            <button class="btn btn-test" onclick="testarChaves()">Testar Diferentes Chaves</button>
        </div>

        <div id="resultado"></div>

        <script>
            async function testarPIX() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔄 Testando PIX...</p>';
                
                const response = await fetch('/api/pix/criar-teste');
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #d4edda;">
                            <h3>✅ PIX Criado!</h3>
                            \${data.warning ? '<p style="color: orange;">⚠️ ' + data.warning + '</p>' : ''}
                            <img src="\${data.qrCode}" alt="QR Code">
                            <textarea>\${data.pixCopiaECola}</textarea>
                            <button class="btn" onclick="copiarPIX('\${data.pixCopiaECola}')">📋 Copiar</button>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = \`
                        <div class="card" style="background: #f8d7da;">
                            <h3>❌ Erro</h3>
                            <p>\${data.error}</p>
                            <p><small>\${data.solucao || ''}</small></p>
                        </div>
                    \`;
                }
            }

            async function testarChaves() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔍 Testando chaves PIX...</p>';
                
                const response = await fetch('/api/pix/testar-chaves');
                const data = await response.json();
                
                let html = '<div class="card"><h3>🔑 Resultado dos Testes:</h3>';
                data.teste_chaves.forEach(test => {
                    html += \`<p><strong>\${test.chave}</strong>: \${test.status}</p>\`;
                    if (test.erro) html += \`<small style="color: red;">\${test.erro}</small>\`;
                });
                html += \`<p><strong>Instrução:</strong> \${data.instrucao}</p></div>\`;
                resultado.innerHTML = html;
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
  console.log(`🔗 Sandbox: ${SANDBOX.baseURL}`);
  console.log(`🎯 Testar PIX: http://localhost:${PORT}/api/pix/criar-teste`);
  console.log(`🔑 Testar chaves: http://localhost:${PORT}/api/pix/testar-chaves`);
});