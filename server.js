// server.js - VERSÃO CORRIGIDA SEM CERTIFICADO/SECRET
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 CREDENCIAIS - CLIENT ID CONFIRMADO ATIVO
const SICOOB_PRODUCAO = {
  tokenURL: "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token",
  baseURL: "https://api.sicoob.com.br/pix/api/v2",
  clientId: "df6cf8e2-008c-48a4-94ca-f795b4b3d728",
  empresa: {
    nome: "P C LIMA INACIO",
    cnpj: "24430463000151",
    cidade: "BRASILIA", 
    conta: "4558-6",
    cooperativa: "4437"
  }
};

// 🔹 ESCOPOS SIMPLIFICADOS - APENAS OS ESSENCIAIS
const SICOOB_SCOPES = "cob.write cob.read pix.write pix.read";

let accessToken = null;
let tokenExpiraEm = null;

// 🔹 OBTER TOKEN - VERSÃO CORRIGIDA
async function obterTokenSicoob() {
  try {
    console.log("🔑 Obtendo token Sicoob...");
    console.log("Client ID:", SICOOB_PRODUCAO.clientId);
    
    const response = await axios({
      method: 'post',
      url: SICOOB_PRODUCAO.tokenURL,
      data: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SICOOB_PRODUCAO.clientId,
        scope: SICOOB_SCOPES
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000
    });

    accessToken = response.data.access_token;
    tokenExpiraEm = Date.now() + (response.data.expires_in * 1000);
    
    console.log("✅ Token obtido com sucesso!");
    console.log("Token:", accessToken.substring(0, 50) + "...");
    console.log("Expira em:", new Date(tokenExpiraEm).toLocaleString());
    
    return accessToken;
    
  } catch (error) {
    console.error("❌ ERRO NA AUTENTICAÇÃO:");
    
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Resposta:", error.response.data);
      
      // 🔍 DETALHES ESPECÍFICOS DO ERRO
      if (error.response.data.error === "invalid_client") {
        console.error("🚨 SOLUÇÃO: Client ID precisa ser ativado para OAuth2");
        console.error("📞 Contate a 7AZ e peça:");
        console.error("   - Ativar OAuth2 para este Client ID");
        console.error("   - Verificar se escopos PIX estão liberados");
        console.error("   - Confirmar se não precisa de Client Secret");
      }
    }
    
    throw error;
  }
}

// 🔹 CLIENT API
async function getApiClient() {
  if (!accessToken || Date.now() >= tokenExpiraEm - 60000) {
    await obterTokenSicoob();
  }

  return axios.create({
    baseURL: SICOOB_PRODUCAO.baseURL,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "client_id": SICOOB_PRODUCAO.clientId
    },
    timeout: 25000
  });
}

// 🔹 ENDPOINT DE TESTE DETALHADO
app.get("/api/producao/teste", async (req, res) => {
  try {
    console.log("🏦 Testando conexão produção...");
    
    const token = await obterTokenSicoob();
    
    if (!token) {
      throw new Error("Token não obtido");
    }

    const apiClient = await getApiClient();
    
    // Testar endpoint simples
    const response = await apiClient.get("/cob?inicio=2024-01-01T00:00:00Z&fim=2024-01-02T00:00:00Z");
    
    res.json({
      success: true,
      message: "✅ CONECTADO AO SICOOB PRODUÇÃO!",
      token: `✅ Válido (${token.substring(0, 20)}...)`,
      apiStatus: response.status,
      empresa: SICOOB_PRODUCAO.empresa.nome,
      escopos: SICOOB_SCOPES
    });

  } catch (error) {
    console.error("❌ Erro detalhado:", error.response?.data || error.message);
    
    let detalhesErro = "Erro de autenticação";
    let solucao = "Entre em contato com a 7AZ Softwares";
    
    if (error.response?.data?.error === "invalid_client") {
      detalhesErro = "Client ID não autorizado para OAuth2";
      solucao = "Solicite à 7AZ: 'Ativar OAuth2 para Client ID " + SICOOB_PRODUCAO.clientId + "'";
    }
    
    res.json({
      success: false,
      error: "Falha na autenticação",
      detalhesErro: detalhesErro,
      solucao: solucao,
      respostaSicoob: error.response?.data,
      clientId: SICOOB_PRODUCAO.clientId
    });
  }
});

// 🔹 DIAGNÓSTICO COMPLETO
app.get("/api/diagnostico-completo", async (req, res) => {
  try {
    console.log("🔍 Diagnóstico completo...");
    
    // Teste 1: Conectividade básica
    let conectividade = "❌ Falhou";
    try {
      await axios.get('https://api.sicoob.com.br', { timeout: 10000 });
      conectividade = "✅ OK";
    } catch (e) {
      conectividade = "❌ Sem internet com Sicoob";
    }

    // Teste 2: Autenticação
    let autenticacao = "❌ Falhou";
    let tokenInfo = null;
    try {
      const token = await obterTokenSicoob();
      autenticacao = "✅ OK";
      tokenInfo = {
        token: token.substring(0, 30) + "...",
        expiracao: new Date(tokenExpiraEm).toLocaleString()
      };
    } catch (e) {
      autenticacao = `❌ ${e.response?.data?.error || e.message}`;
    }

    res.json({
      diagnostico: {
        timestamp: new Date().toISOString(),
        conectividade: conectividade,
        autenticacao: autenticacao,
        token: tokenInfo
      },
      credenciais: {
        clientId: SICOOB_PRODUCAO.clientId,
        empresa: SICOOB_PRODUCAO.empresa.nome,
        cnpj: SICOOB_PRODUCAO.empresa.cnpj,
        escopos: SICOOB_SCOPES
      },
      status: "🔴 AGUARDANDO ATIVAÇÃO OAUTH2",
      acoes: [
        "1. 📞 Contatar 7AZ Softwares IMEDIATAMENTE",
        "2. 💬 Mensagem: 'Client ID precisa de ativação OAuth2'", 
        "3. 🎯 Solicitar: 'Liberar escopos PIX para OAuth2'",
        "4. 🔄 Testar novamente após ativação"
      ]
    });

  } catch (error) {
    res.json({
      error: "Erro no diagnóstico",
      message: error.message
    });
  }
});

// 🔹 PÁGINA PRINCIPAL ATUALIZADA
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🏦 PIX Produção - Diagnóstico</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
            .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .btn { padding: 12px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .btn-success { background: #28a745; }
            .btn-danger { background: #dc3545; }
            #resultado { margin-top: 20px; }
            .success { background: #d4edda; border-color: #c3e6cb; }
            .error { background: #f8d7da; border-color: #f5c6cb; }
            .warning { background: #fff3cd; border-color: #ffeaa7; }
        </style>
    </head>
    <body>
        <h1>🏦 Sistema PIX Produção - DIAGNÓSTICO</h1>
        
        <div class="card warning">
            <h3>⚠️ STATUS: AGUARDANDO ATIVAÇÃO 7AZ</h3>
            <p><strong>Client ID:</strong> ${SICOOB_PRODUCAO.clientId} ✅ <em>Ativo mas precisa de OAuth2</em></p>
            <p><strong>Empresa:</strong> ${SICOOB_PRODUCAO.empresa.nome}</p>
            <p><strong>Problema:</strong> Client ID não autorizado para OAuth2</p>
        </div>

        <div class="card">
            <h3>🔧 Testes de Diagnóstico</h3>
            <button class="btn" onclick="testarConexao()">Testar Conexão</button>
            <button class="btn btn-success" onclick="diagnosticoCompleto()">Diagnóstico Completo</button>
            <button class="btn btn-danger" onclick="mostrarContato7AZ()">Contatar 7AZ</button>
        </div>

        <div id="resultado"></div>

        <script>
            async function testarConexao() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div class="card">🔌 Testando produção...</div>';
                
                const response = await fetch('/api/producao/teste');
                const data = await response.json();
                
                if (data.success) {
                    resultado.innerHTML = '<div class="card success">✅ ' + data.message + '</div>';
                } else {
                    resultado.innerHTML = \`
                        <div class="card error">
                            <h3>❌ \${data.error}</h3>
                            <p><strong>Detalhes:</strong> \${data.detalhesErro}</p>
                            <p><strong>Solução:</strong> \${data.solucao}</p>
                            <button class="btn btn-danger" onclick="mostrarContato7AZ()">📞 Contatar 7AZ</button>
                        </div>
                    \`;
                }
            }

            async function diagnosticoCompleto() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = '<div class="card">🔍 Executando diagnóstico completo...</div>';
                
                const response = await fetch('/api/diagnostico-completo');
                const data = await response.json();
                
                resultado.innerHTML = \`
                    <div class="card \${data.diagnostico.autenticacao.includes('✅') ? 'success' : 'error'}">
                        <h3>\${data.status}</h3>
                        <p><strong>Conectividade:</strong> \${data.diagnostico.conectividade}</p>
                        <p><strong>Autenticação:</strong> \${data.diagnostico.autenticacao}</p>
                        <h4>📋 Ações Necessárias:</h4>
                        <ul>\${data.acoes.map(acao => '<li>' + acao + '</li>').join('')}</ul>
                        <button class="btn btn-danger" onclick="mostrarContato7AZ()">📞 Contatar 7AZ Agora</button>
                    </div>
                \`;
            }

            function mostrarContato7AZ() {
                const resultado = document.getElementById('resultado');
                resultado.innerHTML = \`
                    <div class="card warning">
                        <h3>📞 CONTATAR 7AZ SOFTWARES</h3>
                        <p><strong>Mensagem para enviar:</strong></p>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                            "Prezados, nosso Client ID <strong>${SICOOB_PRODUCAO.clientId}</strong> 
                            está retornando 'invalid_client' no OAuth2.<br><br>
                            <strong>Solicito:</strong><br>
                            1. Ativar OAuth2 para este Client ID<br>
                            2. Liberar escopos PIX: cob.write, cob.read, pix.write, pix.read<br>
                            3. Confirmar se necessário Client Secret<br><br>
                            Empresa: ${SICOOB_PRODUCAO.empresa.nome}<br>
                            CNPJ: ${SICOOB_PRODUCAO.empresa.cnpj}"
                        </div>
                        <p><strong>📧 Email/WhatsApp da 7AZ</strong></p>
                    </div>
                \`;
            }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Sistema PIX Diagnóstico: http://localhost:${PORT}`);
  console.log(`🔍 Diagnóstico: http://localhost:${PORT}/api/diagnostico-completo`);
});