const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONFIGURAÇÃO DO BANCO (mantenha sua configuração atual)
let pool;
let isDatabaseConnected = false;

async function conectarBanco() {
    // ... seu código atual ...
}

// ✅ SERVIR TODOS OS ARQUIVOS ESTÁTICOS
app.use(express.static(__dirname)); // ✅ ISSO JÁ SERVE scripts/, css/, etc.

// ✅ SUAS ROTAS API (mantenha suas rotas atuais)
app.get('/api/health', async (req, res) => {
    // ... seu código atual ...
});

app.get('/api/admin/clientes', async (req, res) => {
    // ... seu código atual ...
});

// ✅ ROTAS DE PÁGINAS
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
    res.redirect('/admin');
});

// ✅ INICIAR
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
    await conectarBanco();
});