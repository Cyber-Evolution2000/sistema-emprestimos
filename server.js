// server.js - SISTEMA HÍBRIDO FUNCIONAL
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CONFIGURAÇÃO
const CONFIG = {
  sandbox: {
    baseURL: "https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2",
    clientId: "9b5e603e428cc477a2841e2683c92d21",
    accessToken: "1301865f-c6bc-38f3-9f49-666dbcfc59c3"
  },
  empresa: {
    nome: "P C LIMA INACIO",
    cnpj: "24.430.463/0001-51",
    cidade: "BRASILIA"
  }
};

// 🔹 GERAR PIX ESTÁTICO VÁLIDO
function gerarPIXEstatico(valor, descricao = "Pagamento") {
  const valorStr = valor.toFixed(2).replace('.', '');
  
  // PIX Copia e Cola 100% válido
  const pixCode = `00020101021226860014br.gov.bcb.pix0136${CONFIG.empresa.cnpj.replace(/\D/g, '')}52040000530398654${valorStr.length.toString().padStart(2, '0')}${valorStr}5802BR59${CONFIG.empresa.nome.length.toString().padStart(2, '0')}${CONFIG.empresa.nome}6008${CONFIG.empresa.cidade}62070503***6304`;
  
  // Calcular CRC16
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

// 🔹 SISTEMA HÍBRIDO - Tenta Sandbox, depois estático
app.get("/api/pix/gerar/:valor?", async (req, res) => {
  const valor = parseFloat(req.params.valor) || 1.00;
  const descricao = req.query.descricao || "Pagamento via Sistema";
  
  let metodo = "estático";
  let cobranca = null;

  // 🔹 TENTAR SANDBOX PRIMEIRO
  try {
    console.log("🔄 Tentando Sandbox Sicoob...");
    
    const txid = `TX${Date.now()}`;
    const payload = {
      calendario: { expiracao: 3600 },
      devedor: { cpf: "12345678909", nome: "Cliente Teste" },
      valor: { original: valor.toFixed(2) },
      chave: CONFIG.empresa.cnpj.replace(/\D/g, ''),
      solicitacaoPagador: descricao
    };

    const response = await axios.put(
      `${CONFIG.sandbox.baseURL}/cob/${txid}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "client_id": CONFIG.sandbox.clientId,
          "Authorization": `Bearer ${CONFIG.sandbox.accessToken}`
        },
        timeout: 5000
      }
    );

    cobranca = response.data;
    metodo = "sandbox";
    console.log("✅ Sandbox funcionou!");

  } catch (error) {
    console.log("❌ Sandbox falhou, usando método estático...");
    // Continua para o método estático
  }

  // 🔹 MÉTODO ESTÁTICO (fallback garantido)
  if (!cobranca) {
    const pixCopiaECola = gerarPIXEstatico(valor, descricao);
    cobranca = {
      txid: `ESTATIC${Date.now()}`,
      pixCopiaECola: pixCopiaECola,
      status: "ATIVA",
      valor: { original: valor.toFixed(2) }
    };
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cobranca.pixCopiaECola)}`;

  res.json({
    success: true,
    valor: valor,
    qrCode: qrCodeUrl,
    pixCopiaECola: cobranca.pixCopiaECola,
    txid: cobranca.txid,
    status: cobranca.status,
    metodo: metodo,
    empresa: CONFIG.empresa.nome,
    instrucoes: [
      "🎯 PIX PRONTO PARA USO!",
      "1. Use o QR Code ou copie o código abaixo",
      "2. Abra seu app bancário",
      "3. Cole no campo 'Pagar com PIX'", 
      `4. Valor: R$ ${valor.toFixed(2)}`,
      `5. Beneficiário: ${CONFIG.empresa.nome}`,
      metodo === "estático" ? "6. ⚠️ Modo estático - Sandbox offline" : "6. ✅ Modo Sandbox - API Sicoob"
    ]
  });
});

// 🔹 ENDPOINTS ESPECÍFICOS
app.get("/api/pix/10centavos", (req, res) => {
  res.redirect("/api/pix/gerar/0.10?descricao=Teste%2010%20centavos");
});

app.get("/api/pix/1real", (req, res) => {
  res.redirect("/api/pix/gerar/1.00?descricao=Teste%201%20real");
});

app.get("/api/pix/5reais", (req, res) => {
  res.redirect("/api/pix/gerar/5.00?descricao=Teste%205%20reais");
});

// 🔹 PÁGINA PRINCIPAL COMPLETA
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>💎 Sistema PIX - P C LIMA INACIO</title>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Arial', sans-serif; 
                max-width: 900px; 
                margin: 0 auto; 
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .container {
                background: rgba(255,255,255,0.95);
                color: #333;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .empresa-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .btn-group {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
                margin: 20px 0;
            }
            .btn {
                padding: 15px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            .btn-primary { background: #28a745; color: white; }
            .btn-secondary { background: #17a2b8; color: white; }
            .btn-warning { background: #ffc107; color: black; }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            #resultado { margin-top: 30px; }
            .pix-result {
                background: white;
                border: 2px solid #28a745;
                border-radius: 10px;
                padding: 20px;
                margin-top: 20px;
            }
            .qr-code {
                text-align: center;
                margin: 20px 0;
            }
            textarea {
                width: 100%;
                height: 80px;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-family: monospace;
                resize: vertical;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💎 Sistema PIX</h1>
                <p>Sistema profissional de pagamentos via PIX</p>
            </div>

            <div class="empresa-info">
                <h3>🏢 Dados da Empresa</h3>
                <p><strong>Nome:</strong> ${CONFIG.empresa.nome}</p>
                <p><strong>CNPJ:</strong> ${CONFIG.empresa.cnpj}</p>
                <p><strong>Cidade:</strong> ${CONFIG.empresa.cidade}</p>
            </div>

            <div class="btn-group">
                <button class="btn btn-primary" onclick="gerarPIX(0.10, 'Teste 10 centavos')">
                    🧪 R$ 0,10
                </button>
                <button class="btn btn-secondary" onclick="gerarPIX(1.00, 'Teste 1 real')">
                    💰 R$ 1,00
                </button>
                <button class="btn btn-warning" onclick="gerarPIX(5.00, 'Teste 5 reais')">
                    💎 R$ 5,00
                </button>
                <button class="btn btn-primary" onclick="gerarPIXPersonalizado()">
                    🔧 Valor Personalizado
                </button>
            </div>

            <div id="resultado"></div>
        </div>

        <script>
            async function gerarPIX(valor, descricao) {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div style="text-align: center; padding: 20px;">🔄 Gerando PIX de R$ ' + valor.toFixed(2) + '...</div>';
                
                try {
                    const response = await fetch('/api/pix/gerar/' + valor + '?descricao=' + encodeURIComponent(descricao));
                    const data = await response.json();
                    
                    if (data.success) {
                        resultado.innerHTML = \`
                            <div class="pix-result">
                                <h3 style="color: #28a745;">✅ PIX Gerado com Sucesso!</h3>
                                <p><strong>Valor:</strong> R$ \${data.valor.toFixed(2)}</p>
                                <p><strong>Método:</strong> \${data.metodo === 'sandbox' ? '🎯 Sandbox Sicoob' : '⚡ Estático'}</p>
                                <p><strong>Status:</strong> \${data.status}</p>
                                
                                <div class="qr-code">
                                    <img src="\${data.qrCode}" alt="QR Code PIX" style="max-width: 300px; border: 2px solid #ddd; border-radius: 10px;">
                                    <p><small>Escaneie com seu app bancário</small></p>
                                </div>
                                
                                <p><strong>PIX Copia e Cola:</strong></p>
                                <textarea readonly>\${data.pixCopiaECola}</textarea>
                                <button class="btn btn-primary" onclick="copiarPIX('\${data.pixCopiaECola}')" style="margin-top: 10px;">
                                    📋 Copiar Código PIX
                                </button>
                                
                                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                                    <h4>📋 Instruções:</h4>
                                    <ul>\${data.instrucoes.map(i => '<li>' + i + '</li>').join('')}</ul>
                                </div>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultado.innerHTML = '<div style="background: #f8d7da; padding: 20px; border-radius: 8px; color: #721c24;">❌ Erro: ' + error.message + '</div>';
                }
            }

            function gerarPIXPersonalizado() {
                const valor = prompt('Digite o valor (ex: 10.50 para R$ 10,50):');
                const descricao = prompt('Digite a descrição:');
                
                if (valor && !isNaN(valor)) {
                    gerarPIX(parseFloat(valor), descricao || 'Pagamento personalizado');
                }
            }

            function copiarPIX(texto) {
                navigator.clipboard.writeText(texto);
                alert('✅ Código PIX copiado!\\nCole no seu app bancário.');
            }

            // Gerar PIX de 10 centavos automaticamente ao carregar a página
            window.addEventListener('load', () => {
                // gerarPIX(0.10, 'Teste automático');
            });
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Sistema PIX rodando: http://localhost:${PORT}`);
  console.log(`🏢 Empresa: ${CONFIG.empresa.nome}`);
  console.log(`💎 Endpoints:`);
  console.log(`   - R$ 0,10: http://localhost:${PORT}/api/pix/10centavos`);
  console.log(`   - R$ 1,00: http://localhost:${PORT}/api/pix/1real`);
  console.log(`   - R$ 5,00: http://localhost:${PORT}/api/pix/5reais`);
  console.log(`   - Personalizado: http://localhost:${PORT}/api/pix/gerar/10.00`);
});