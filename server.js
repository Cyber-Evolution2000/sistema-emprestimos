// server.js - SUBSTITUA TODO O CÓDIGO POR ESTE
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 ROTA 1: TESTE RÁPIDO R$ 0,10
app.get("/api/pix/teste-rapido", async (req, res) => {
  try {
    const valor = 0.10;
    const pixCode = "00020101021226860014br.gov.bcb.pix0136123456789005204000053039865401105802BR5913TESTE RAPIDO6008BRASILIA62070503***6304E0E3";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

    res.json({
      success: true,
      valor: valor,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCode,
      instrucoes: ["Copie o código e cole no seu banco - R$ 0,10"]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 ROTA 2: TESTE R$ 1,00 
app.get("/api/pix/teste-1real", async (req, res) => {
  try {
    const valor = 1.00;
    const pixCode = "00020101021226860014br.gov.bcb.pix0136123456789005204000053039865401005802BR5910TESTE 1 REAL6008BRASILIA62070503***6304A1B2";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

    res.json({
      success: true,
      valor: valor,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCode,
      instrucoes: ["Copie o código e cole no seu banco - R$ 1,00"]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 ROTA 3: TESTE R$ 5,00
app.get("/api/pix/teste-5reais", async (req, res) => {
  try {
    const valor = 5.00;
    const pixCode = "00020101021226860014br.gov.bcb.pix0136123456789005204000053039865405005802BR5910TESTE 5 REAIS6008BRASILIA62070503***6304C3D4";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

    res.json({
      success: true,
      valor: valor,
      qrCode: qrCodeUrl,
      pixCopiaECola: pixCode,
      instrucoes: ["Copie o código e cole no seu banco - R$ 5,00"]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔹 INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`🔗 Endpoints criados:`);
  console.log(`   - /api/pix/teste-rapido`);
  console.log(`   - /api/pix/teste-1real`);
  console.log(`   - /api/pix/teste-5reais`);
});