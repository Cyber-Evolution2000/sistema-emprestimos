const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONFIGURAÇÃO À PROVA DE FALHAS
let pool;
let isDatabaseConnected = false;

// ✅ SERVIR ARQUIVOS ESTÁTICOS DE MÚLTIPLAS PASTAS
app.use(express.static(__dirname));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/css', express.static(path.join(__dirname, 'css')));

// ✅ SE NÃO ENCONTRAR A PASTA, CRIA DINAMICAMENTE
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Criada pasta: ${dirPath}`);
    }
}

// ✅ CONEXÃO BANCO (sua versão atual)
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

// ✅ ROTA DE DEBUG DE ARQUIVOS (TEMPORÁRIA)
app.get('/api/debug-files', (req, res) => {
    const files = {
        currentDir: __dirname,
        files: []
    };
    
    try {
        const items = fs.readdirSync(__dirname);
        items.forEach(item => {
            const fullPath = path.join(__dirname, item);
            const stat = fs.statSync(fullPath);
            files.files.push({
                name: item,
                type: stat.isDirectory() ? 'folder' : 'file',
                path: fullPath
            });
        });
    } catch (error) {
        files.error = error.message;
    }
    
    res.json(files);
});

// ✅ ROTAS API (suas rotas atuais)
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

// ✅ ROTA ADMIN - SERVE HTML DIRETO
app.get('/admin', (req, res) => {
    // Tenta encontrar o arquivo admin.html em vários locais
    const possiblePaths = [
        path.join(__dirname, 'admin.html'),
        path.join(__dirname, 'views', 'admin.html'),
        path.join(__dirname, 'public', 'admin.html')
    ];
    
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            console.log(`✅ Encontrado admin.html em: ${filePath}`);
            return res.sendFile(filePath);
        }
    }
    
    // Se não encontrou, cria um HTML básico
    console.log('❌ admin.html não encontrado, servindo HTML básico');
    const basicHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin - Sistema Empréstimos</title>
        <link rel="stylesheet" href="/css/admin.css">
    </head>
    <body>
        <h1>✅ Sistema Admin Funcionando!</h1>
        <p>Arquivos estáticos devem estar carregando...</p>
        <script src="/scripts/admin-novo.js"></script>
    </body>
    </html>
    `;
    res.send(basicHTML);
});

// ✅ ROTA PRINCIPAL
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// ✅ ROTA PARA VERIFICAR SE ARQUIVO JS EXISTE
app.get('/api/check-script', (req, res) => {
    const scriptPath = path.join(__dirname, 'scripts', 'admin-novo.js');
    const exists = fs.existsSync(scriptPath);
    
    res.json({
        scriptExists: exists,
        scriptPath: scriptPath,
        currentDir: __dirname
    });
});

// ✅ INICIAR SERVIDOR
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
    console.log(`📁 Diretório atual: ${__dirname}`);
    
    // Verificar se scripts/ existe
    ensureDirectoryExistence(path.join(__dirname, 'scripts'));
    
    await conectarBanco();
});

// ✅ ROTAS API PARA CLIENTES
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
        const result = await client.query(
            'INSERT INTO clientes (cpf, nome, email, telefone, endereco) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [cpf, nome, email, telefone, endereco]
        );
        client.release();
        
        res.json({ 
            message: 'Cliente cadastrado com sucesso!',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        
        if (error.code === '23505') { // Violação de chave única (CPF duplicado)
            res.status(400).json({ error: 'CPF já cadastrado' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// ✅ ROTA PARA EMPRÉSTIMOS (BÁSICA)
app.get('/api/admin/emprestimos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        // Por enquanto, retorna array vazio até criar a tabela
        res.json([]);
        
    } catch (error) {
        console.error('Erro ao buscar empréstimos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA PARA PAGAMENTOS (BÁSICA)
app.get('/api/admin/pagamentos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        // Por enquanto, retorna array vazio
        res.json([]);
        
    } catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ DEBUG DETALHADO DA TABELA
app.get('/api/debug-clientes', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.json({ error: 'Banco offline', connected: false });
        }
        
        const client = await pool.connect();
        
        // 1. Verificar se a tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'clientes'
            );
        `);
        
        const tabelaExiste = tableCheck.rows[0].exists;
        
        if (!tabelaExiste) {
            client.release();
            return res.json({ 
                error: 'Tabela clientes não existe',
                tabelaExiste: false,
                precisaCriarTabela: true
            });
        }
        
        // 2. Tentar buscar dados
        const result = await client.query('SELECT * FROM clientes');
        client.release();
        
        res.json({
            tabelaExiste: true,
            totalClientes: result.rows.length,
            clientes: result.rows
        });
        
    } catch (error) {
        res.json({ 
            error: error.message,
            detalhes: 'Erro ao acessar tabela clientes'
        });
    }
});

// ✅ ROTA PARA CLIENTES (GET)
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

// ✅ ROTA PARA CRIAR CLIENTE (POST)
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

// ✅ ROTA PARA EMPRÉSTIMOS (GET)
app.get('/api/admin/emprestimos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        // Por enquanto retorna vazio - você pode implementar depois
        res.json([]);
        
    } catch (error) {
        console.error('Erro ao buscar empréstimos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA PARA CRIAR TABELA CLIENTES (SE PRECISAR)
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