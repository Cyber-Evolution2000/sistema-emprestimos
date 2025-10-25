import express from "express";
import { Pool } from "pg";
import fs from "fs";
import https from "https";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

let pool;
let isDatabaseConnected = false;

// 🔹 CONECTAR BANCO DE DADOS
async function conectarBanco() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("❌ DATABASE_URL não configurada");
      return;
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();

    console.log("✅ Banco conectado com sucesso!");
    isDatabaseConnected = true;
  } catch (err) {
    console.error("❌ Erro no banco:", err.message);
  }
}

// 🔹 AUTENTICAR NA API SICOOB
async function getSicoobToken() {
  try {
    const cert = fs.readFileSync(process.env.SICOOB_CERT_PATH);
    const agent = new https.Agent({
      pfx: cert,
      passphrase: process.env.SICOOB_CERT_PASSWORD,
    });

    const resp = await axios.post(
      process.env.SICOOB_SANDBOX_TOKEN_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.SICOOB_CLIENT_ID,
        client_secret: process.env.SICOOB_CLIENT_SECRET,
      }),
      { httpsAgent: agent }
    );

    return resp.data.access_token;
  } catch (err) {
    console.error("⚠️ Erro ao obter token Sicoob:", err.message);
    return null;
  }
}

// 🔹 ROTA PARA GERAR COBRANÇA PIX
app.post("/api/pix/cobranca", async (req, res) => {
  const { valor = 40.0, cpf = "12345678900", descricao = "Pagamento de teste" } = req.body;

  try {
    const cert = fs.readFileSync(process.env.SICOOB_CERT_PATH);
    const agent = new https.Agent({
      pfx: cert,
      passphrase: process.env.SICOOB_CERT_PASSWORD,
    });

    const token = await getSicoobToken();

    const txid = `TX${Date.now()}`;
    const payload = {
      calendario: { expiracao: 3600 },
      devedor: { cpf, nome: "Cliente Teste" },
      valor: { original: valor.toFixed(2) },
      chave: process.env.SICOOB_PIX_KEY,
      solicitacaoPagador: descricao,
    };

    let responseData;

    if (token) {
      const resp = await axios.put(
        `${process.env.SICOOB_SANDBOX_URL}/cob/${txid}`,
        payload,
        {
          httpsAgent: agent,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      responseData = resp.data;
    } else {
      // fallback (simulado)
      responseData = {
        txid,
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136${process.env.SICOOB_PIX_KEY}520400005303986540${valor
          .toFixed(2)
          .replace(".", "")}5802BR5925SISTEMA EMPRESTIMOS PIX6008BRASILIA62070503***6304TEST`,
      };
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      responseData.pixCopiaECola
    )}`;

    res.json({
      success: true,
      txid,
      valor,
      descricao,
      qrCode: qrUrl,
      pixCopiaECola: responseData.pixCopiaECola,
      expiracao: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (err) {
    console.error("💥 Erro PIX:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 SERVIDOR
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  await conectarBanco();
});
