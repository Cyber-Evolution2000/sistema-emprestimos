const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONFIGURAÇÃO DO BANCO
let pool;
let isDatabaseConnected = false;

// ✅ CONEXÃO BANCO
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
app.use(express.static(__dirname));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/css', express.static(path.join(__dirname, 'css')));

// ✅ ROTAS PRINCIPAIS
app.get('/', (req, res) => {
    res.redirect('/admin');
});

app.get('/admin', (req, res) => {
    const adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.send('✅ Sistema Admin - admin.html não encontrado');
    }
});

// ✅ ROTAS API DE SAÚDE
app.get('/api/health', async (req, res) => {
    res.json({
        status: isDatabaseConnected ? 'OK' : 'ERROR',
        database: {
            connected: isDatabaseConnected,
            hasCredentials: !!process.env.DATABASE_URL
        },
        timestamp: new Date().toISOString()
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

// ✅ ROTAS API PARA CLIENTES (VERSÃO ÚNICA)
app.get('/api/admin/clientes', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const client = await pool.connect();
        
        // Verificar se a tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'clientes'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            client.release();
            return res.json([]); // Retorna array vazio se tabela não existe
        }
        
        // Buscar clientes
        const result = await client.query('SELECT * FROM clientes ORDER BY nome');
        client.release();
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/clientes', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const { cpf, nome, email, telefone, endereco } = req.body;
        
        if (!cpf || !nome || !telefone) {
            return res.status(400).json({ error: 'CPF, nome e telefone são obrigatórios' });
        }
        
        const client = await pool.connect();
        
        // Criar tabela se não existir
        await client.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                cpf VARCHAR(14) PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                telefone VARCHAR(20) NOT NULL,
                endereco TEXT,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Inserir cliente
        const result = await client.query(
            'INSERT INTO clientes (cpf, nome, email, telefone, endereco) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [cpf, nome, email, telefone, endereco]
        );
        
        client.release();
        
        res.json({ 
            success: true,
            message: 'Cliente cadastrado com sucesso!',
            cliente: result.rows[0]
        });
        
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        
        if (error.code === '23505') { // CPF duplicado
            res.status(400).json({ error: 'CPF já cadastrado' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// ✅ ROTA PARA EMPRÉSTIMOS
app.get('/api/admin/emprestimos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        // Por enquanto retorna vazio
        res.json([]);
        
    } catch (error) {
        console.error('Erro ao buscar empréstimos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA PARA PAGAMENTOS
app.get('/api/admin/pagamentos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        // Por enquanto retorna vazio
        res.json([]);
        
    } catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA PARA CRIAR TABELA CLIENTES
app.post('/api/admin/criar-tabela-clientes', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const client = await pool.connect();
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                cpf VARCHAR(14) PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                telefone VARCHAR(20) NOT NULL,
                endereco TEXT,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        client.release();
        
        res.json({ 
            success: true,
            message: 'Tabela clientes criada/verificada com sucesso!'
        });
        
    } catch (error) {
        console.error('Erro ao criar tabela:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ INICIAR SERVIDOR
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
    await conectarBanco();
});