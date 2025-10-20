const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONFIGURAÇÃO DO BANCO
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

// ✅ MIDDLEWARE
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // ✅ SERVIR ARQUIVOS ESTÁTICOS DA PASTA 'public'

// ✅ CONFIGURAR EJS COMO TEMPLATE ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// ✅ ROTAS DE PÁGINAS (COM EJS)
app.get('/admin', (req, res) => {
    res.render('admin/dashboard', { 
        title: 'Dashboard Admin',
        databaseStatus: isDatabaseConnected ? 'online' : 'offline'
    });
});

app.get('/admin/loans', (req, res) => {
    res.render('admin/loans', { 
        title: 'Gerenciar Empréstimos',
        databaseStatus: isDatabaseConnected ? 'online' : 'offline'
    });
});

app.get('/admin/clients', (req, res) => {
    res.render('admin/clients', { 
        title: 'Gerenciar Clientes',
        databaseStatus: isDatabaseConnected ? 'online' : 'offline'
    });
});

app.get('/admin/payments', (req, res) => {
    res.render('admin/payments', { 
        title: 'Pagamentos',
        databaseStatus: isDatabaseConnected ? 'online' : 'offline'
    });
});

app.get('/admin/settings', (req, res) => {
    res.render('admin/settings', { 
        title: 'Configurações',
        databaseStatus: isDatabaseConnected ? 'online' : 'offline'
    });
});

// ✅ ROTA PRINCIPAL (OPCIONAL)
app.get('/', (req, res) => {
    res.redirect('/admin'); // ou envie um arquivo HTML se preferir
});

// ✅ INICIAR SERVIDOR
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
    await conectarBanco();
});