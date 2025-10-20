const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ DIAGNÓSTICO INICIAL
console.log('=== 🩺 DIAGNÓSTICO DO SISTEMA ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ CONFIGURADA' : '❌ NÃO CONFIGURADA');

let pool;
let isDatabaseConnected = false;

// ✅ TENTAR CONECTAR COM BANCO
async function conectarBanco() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL não encontrada');
      return false;
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    // Testar conexão
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
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
app.use(express.static(__dirname));

// ✅ ROTA DE DIAGNÓSTICO
app.get('/api/debug', async (req, res) => {
  const debugInfo = {
    system: 'Sistema de Empréstimos',
    timestamp: new Date().toISOString(),
    environment: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    database: {
      connected: isDatabaseConnected,
      poolInitialized: !!pool
    }
  };

  try {
    if (pool && isDatabaseConnected) {
      const client = await pool.connect();
      const timeResult = await client.query('SELECT NOW() as current_time');
      debugInfo.database.currentTime = timeResult.rows[0].current_time;
      client.release();
    }
  } catch (error) {
    debugInfo.database.error = error.message;
  }

  res.json(debugInfo);
});

// ✅ HEALTH CHECK
app.get('/api/health', async (req, res) => {
  res.json({
    status: isDatabaseConnected ? 'OK' : 'ERROR',
    message: isDatabaseConnected ? 'Sistema operacional' : 'Banco de dados offline',
    database: {
      connected: isDatabaseConnected,
      hasCredentials: !!process.env.DATABASE_URL
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ ROTAS DA API
app.get('/api/admin/clientes', async (req, res) => {
  try {
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    const client = await pool.connect();
    const result = await client.query('SELECT * FROM clientes ORDER BY nome');
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro: ' + error.message });
  }
});

app.post('/api/admin/clientes', async (req, res) => {
  try {
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    const { cpf, nome, telefone, email, endereco } = req.body;

    if (!cpf || !nome || !telefone) {
      return res.status(400).json({ error: 'CPF, nome e telefone são obrigatórios' });
    }

    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO clientes (cpf, nome, telefone, email, endereco) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (cpf) DO UPDATE SET
         nome = EXCLUDED.nome,
         telefone = EXCLUDED.telefone,
         email = EXCLUDED.email,
         endereco = EXCLUDED.endereco
       RETURNING *`,
      [cpf, nome, telefone, email, endereco]
    );
    client.release();

    res.json({ 
      success: true, 
      message: '✅ Cliente salvo no banco de dados!',
      cliente: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro: ' + error.message });
  }
});

// ✅ ROTA ADMIN (IMPORTANTE!)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ✅ ROTA PRINCIPAL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ QUALQUER OUTRA ROTA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ INICIAR SERVIDOR
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Diagnóstico: https://sistema-emprestimos.onrender.com/api/debug`);
  console.log(`❤️  Health: https://sistema-emprestimos.onrender.com/api/health`);
  console.log(`👨‍💼 Admin: https://sistema-emprestimos.onrender.com/admin`);
  
  // Tentar conectar com banco
  console.log('🔄 Conectando ao banco de dados...');
  await conectarBanco();
  
  if (isDatabaseConnected) {
    console.log('🎉 Sistema pronto para uso!');
  } else {
    console.log('⚠️  Sistema em modo limitado (banco offline)');
  }
});