import axios from "axios";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

export async function gerarPix(req, res) {
  try {
    const cert = fs.readFileSync(process.env.SICOOB_CERT_PATH);
    const agent = new https.Agent({
      pfx: cert,
      passphrase: process.env.SICOOB_CERT_PASSWORD,
    });

    // gerar token de acesso
    const tokenResp = await axios.post(
      process.env.SICOOB_SANDBOX_TOKEN_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.SICOOB_CLIENT_ID,
        client_secret: process.env.SICOOB_CLIENT_SECRET,
      }),
      { httpsAgent: agent }
    );

    const token = tokenResp.data.access_token;
    const txid = uuidv4().slice(0, 25);

    const payload = {
      calendario: { expiracao: 3600 },
      valor: { original: req.body.valor.toFixed(2) },
      chave: process.env.SICOOB_SANDBOX_KEY,
      solicitacaoPagador: "Pagamento de teste via Sicoob",
    };

    const cob = await axios.put(
      `${process.env.SICOOB_SANDBOX_URL}/cob/${txid}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        httpsAgent: agent,
      }
    );

    res.json({
      success: true,
      txid,
      valor: req.body.valor,
      qrCode: cob.data.loc.location,
      pixCopiaECola: cob.data.pixCopiaECola,
      expiracao: cob.data.calendario.expiracao,
    });
  } catch (err) {
    console.error("Erro ao gerar PIX:", err.response?.data || err);
    res.status(500).json({ success: false, message: "Erro ao gerar PIX" });
  }
}
