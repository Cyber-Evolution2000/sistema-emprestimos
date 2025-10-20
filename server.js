const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONFIGURAÇÃO SIMPLES
let pool;
let isDatabaseConnected = false;

// Tentar conectar ao banco
async function conectarBanco() {
    try {
        if (!process.env.DATABASE_URL) {
            console.log('❌ DATABASE_URL não configurada');
            return false;
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        console.log('✅ Conectado ao PostgreSQL!');
        isDatabaseConnected = true;
        return true;
    } catch (error) {
        console.log('❌ Erro na conexão:', error.message);
        isDatabaseConnected = false;
        return false;
    }
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // ✅ SERVIR ARQUIVOS ESTÁTICOS

// ✅ ROTAS DA API
app.get('/api/health', async (req, res) => {
    res.json({
        status: isDatabaseConnected ? 'OK' : 'ERROR',
        database: {
            connected: isDatabaseConnected,
            hasCredentials: !!process.env.DATABASE_URL
        }
    });
});

app.get('/api/debug', async (req, res) => {
    res.json({
        system: 'Sistema de Empréstimos',
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseConnected: isDatabaseConnected,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/admin/clientes', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM clientes');
        client.release();
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTAS DE PÁGINAS (IMPORTANTE!)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ INICIAR
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
    await conectarBanco();
});