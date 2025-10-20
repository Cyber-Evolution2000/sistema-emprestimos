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