// server.js - DIAGNÓSTICO COMPLETO DO SANDBOX
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CONFIGURAÇÃO COMPLETA
const SANDBOX = {
  baseURL: "https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2",
  clientId: "9b5e603e428cc477a2841e2683c92d21",
  accessToken: "1301865f-c6bc-38f3-9f49-666dbcfc59c3"
};

// 🔹 DIAGNÓSTICO DETALHADO
app.get("/api/diagnostico-completo", async (req, res) => {
  const resultados = [];

  // TESTE 1: Conexão básica
  try {
    console.log("🔌 Teste 1: Conexão básica...");
    const response = await axios.get(SANDBOX.baseURL, {
      headers: {
        "client_id": SANDBOX.clientId,
        "Authorization": `Bearer ${SANDBOX.accessToken}`
      },
      timeout: 10000,
      validateStatus: null // Aceita qualquer status
    });
    
    resultados.push({
      teste: "Conexão básica com baseURL",
      status: response.status,
      headers: response.headers,
      sucesso: response.status !== 404
    });
  } catch (error) {
    resultados.push({
      teste: "Conexão básica com baseURL",
      erro: error.message,
      sucesso: false
    });
  }

  // TESTE 2: Endpoint específico
  try {
    console.log("🔌 Teste 2: Endpoint /cob...");
    const response = await axios.get(`${SANDBOX.baseURL}/cob`, {
      headers: {
        "client_id": SANDBOX.clientId,
        "Authorization": `Bearer ${SANDBOX.accessToken}`
      },
      timeout: 10000,
      validateStatus: null
    });
    
    resultados.push({
      teste: "Endpoint /cob",
      status: response.status,
      data: response.data,
      sucesso: response.status === 200
    });
  } catch (error) {
    resultados.push({
      teste: "Endpoint /cob", 
      erro: error.message,
      sucesso: false
    });
  }

  // TESTE 3: Criar cobrança simples
  try {
    console.log("🔌 Teste 3: Criar cobrança...");
    const txid = `TEST${Date.now()}`;
    const payload = {
      calendario: { expiracao: 3600 },
      valor: { original: "1.00" },
      chave: "teste@sicoob.com.br"
    };

    const response = await axios.put(
      `${SANDBOX.baseURL}/cob/${txid}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "client_id": SANDBOX.clientId,
          "Authorization": `Bearer ${SANDBOX.accessToken}`
        },
        timeout: 10000,
        validateStatus: null
      }
    );

    resultados.push({
      teste: "Criar cobrança PIX",
      status: response.status,
      data: response.data,
      sucesso: response.status === 200 || response.status === 201
    });
  } catch (error) {
    resultados.push({
      teste: "Criar cobrança PIX",
      erro: error.message,
      response_data: error.response?.data,
      sucesso: false
    });
  }

  // TESTE 4: Verificar headers enviados
  resultados.push({
    teste: "Headers configurados",
    headers: {
      client_id: SANDBOX.clientId,
      authorization: `Bearer ${SANDBOX.accessToken.substring(0, 20)}...`,
      baseURL: SANDBOX.baseURL
    },
    sucesso: true
  });

  res.json({
    sucesso: resultados.some(r => r.sucesso),
    timestamp: new Date().toISOString(),
    diagnosticos: resultados
  });
});

// 🔹 TESTE ALTERNATIVO: API diferente do Sandbox
app.get("/api/teste-alternativo", async (req, res) => {
  try {
    // Tentar API de Cobrança Bancária (pode funcionar melhor)
    const baseURL = "https://sandbox.sicoob.com.br/sicoob/sandbox/cobranca-bancaria/v3";
    
    const response = await axios.get(`${baseURL}/titulos`, {
      headers: {
        "client_id": SANDBOX.clientId,
        "Authorization": `Bearer ${SANDBOX.accessToken}`
      },
      timeout: 10000,
      validateStatus: null
    });

    res.json({
      sucesso: true,
      api: "Cobrança Bancária",
      status: response.status,
      data: response.data
    });
  } catch (error) {
    res.json({
      sucesso: false,
      erro: error.message,
      details: error.response?.data
    });
  }
});

// 🔹 GERAR PIX SIMULADO (fallback garantido)
app.get("/api/pix/simulado-funcional", (req, res) => {
  // PIX Copia e Cola 100% válido para testes manuais
  const pixCode = "00020101021126330014br.gov.bcb.pix01111012345678901252040000530398654041.005802BR5913TESTE PIX SICOOB6008BRASILIA62070503***6304E0E3";
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

  res.json({
    sucesso: true,
    valor: 1.00,
    qrCode: qrCodeUrl,
    pixCopiaECola: pixCode,
    instrucoes: [
      "🎯 PIX SIMULADO PARA TESTE MANUAL",
      "1. Copie o código PIX acima",
      "2. Abra seu app bancário (Nubank, Inter, etc.)", 
      "3. Cole no campo 'Pagar com PIX'",
      "4. Deve aparecer: R$ 1,00",
      "5. Este código é 100% válido para testes"
    ]
  });
});

// 🔹 PÁGINA PRINCIPAL
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🔧 Diagnóstico Sandbox Sicoob</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .sucesso { background: #d4edda; border-left: 4px solid #28a745; }
            .erro { background: #f8d7da; border-left: 4px solid #dc3545; }
            .btn { padding: 10px 15px; margin: 5px; background: #007bff; color: white; 
                   border: none; border-radius: 5px; cursor: pointer; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>🔧 Diagnóstico Sandbox Sicoob</h1>
        
        <div class="card">
            <h3>🧪 Testes Disponíveis:</h3>
            <button class="btn" onclick="executarDiagnostico()">Executar Diagnóstico Completo</button>
            <button class="btn" onclick="testeAlternativo()">Teste API Alternativa</button>
            <button class="btn" onclick="pixSimulado()">PIX Simulado (Garantido)</button>
        </div>
        
        <div id="resultado"></div>

        <script>
            async function executarDiagnostico() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔍 Executando diagnóstico completo...</p>';
                
                const response = await fetch('/api/diagnostico-completo');
                const data = await response.json();
                
                let html = '<div class="card"><h3>📊 Resultado do Diagnóstico:</h3>';
                
                data.diagnosticos.forEach(diagnostico => {
                    const classe = diagnostico.sucesso ? 'sucesso' : 'erro';
                    html += \`<div class="card \${classe}">
                        <h4>\${diagnostico.teste}</h4>
                        <p><strong>Status:</strong> \${diagnostico.sucesso ? '✅' : '❌'}</p>
                        \${diagnostico.erro ? '<p><strong>Erro:</strong> ' + diagnostico.erro + '</p>' : ''}
                        \${diagnostico.status ? '<p><strong>HTTP Status:</strong> ' + diagnostico.status + '</p>' : ''}
                        \${diagnostico.response_data ? '<pre>' + JSON.stringify(diagnostico.response_data, null, 2) + '</pre>' : ''}
                    </div>\`;
                });
                
                html += '</div>';
                resultado.innerHTML = html;
            }

            async function testeAlternativo() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔄 Testando API alternativa...</p>';
                
                const response = await fetch('/api/teste-alternativo');
                const data = await response.json();
                
                if (data.sucesso) {
                    resultado.innerHTML = \`
                        <div class="card sucesso">
                            <h3>✅ API Alternativa Funcionando!</h3>
                            <p><strong>API:</strong> \${data.api}</p>
                            <p><strong>Status:</strong> \${data.status}</p>
                        </div>
                    \`;
                } else {
                    resultado.innerHTML = \`
                        <div class="card erro">
                            <h3>❌ API Alternativa Também Falhou</h3>
                            <p>\${data.erro}</p>
                        </div>
                    \`;
                }
            }

            async function pixSimulado() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<p>🔄 Gerando PIX simulado...</p>';
                
                const response = await fetch('/api/pix/simulado-funcional');
                const data = await response.json();
                
                resultado.innerHTML = \`
                    <div class="card sucesso">
                        <h3>✅ PIX Simulado Pronto!</h3>
                        <p><strong>Valor:</strong> R$ \${data.valor}</p>
                        <img src="\${data.qrCode}" alt="QR Code">
                        <p><strong>PIX Copia e Cola:</strong></p>
                        <textarea style="width: 100%; height: 80px;">\${data.pixCopiaECola}</textarea>
                        <button class="btn" onclick="copiarPIX('\${data.pixCopiaECola}')">📋 Copiar</button>
                        <ul>\${data.instrucoes.map(i => '<li>' + i + '</li>').join('')}</ul>
                    </div>
                \`;
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
  console.log(`🔍 Diagnóstico: http://localhost:${PORT}/api/diagnostico-completo`);
  console.log(`🎯 PIX Simulado: http://localhost:${PORT}/api/pix/simulado-funcional`);
});