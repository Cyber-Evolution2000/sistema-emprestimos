const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 10000;

// ✅ DIAGNÓSTICO COMPLETO
console.log('=== 🩺 INICIANDO DIAGNÓSTICO DO BANCO ===');

// Verificar se DATABASE_URL existe
const hasDatabaseUrl = !!process.env.DATABASE_URL;
console.log('1. DATABASE_URL configurada?:', hasDatabaseUrl ? '✅ SIM' : '❌ NÃO');

if (hasDatabaseUrl) {
  console.log('2. DATABASE_URL:', process.env.DATABASE_URL.substring(0, 50) + '...');
} else {
  console.log('❌ ERRO: DATABASE_URL não encontrada nas variáveis de ambiente');
  console.log('💡 SOLUÇÃO: Configure DATABASE_URL no Render → Environment');
}

let pool;

try {
  if (hasDatabaseUrl) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
    console.log('3. Pool criado: ✅ SUCESSO');
  } else {
    console.log('3. Pool criado: ❌ PULADO (sem DATABASE_URL)');
  }
} catch (error) {
  console.log('3. Pool criado: ❌ ERRO -', error.message);
}

app.use(express.json());
app.use(express.static(__dirname));

// ✅ ROTA DE DIAGNÓSTICO DETALHADO
app.get('/api/debug', async (req, res) => {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
    database: {}
  };

  try {
    if (!pool) {
      throw new Error('Pool não inicializado - DATABASE_URL provavelmente não configurada');
    }

    const client = await pool.connect();
    diagnostic.database.connection = '✅ CONECTADO';
    
    const timeResult = await client.query('SELECT NOW() as current_time');
    diagnostic.database.currentTime = timeResult.rows[0].current_time;
    
    const versionResult = await client.query('SELECT version()');
    diagnostic.database.version = versionResult.rows[0].version.split(',')[0];
    
    client.release();
    
  } catch (error) {
    diagnostic.database.connection = '❌ ERRO';
    diagnostic.database.error = error.message;
  }

  res.json(diagnostic);
});

// ✅ HEALTH CHECK SIMPLES
app.get('/api/health', async (req, res) => {
  try {
    if (!pool) {
      throw new Error('DATABASE_URL não configurada');
    }
    
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      database: { connected: true },
      message: '✅ Sistema operando normalmente'
    });
  } catch (error) {
    res.json({ 
      status: 'ERROR', 
      database: { connected: false },
      error: error.message
    });
  }
});

// ✅ ROTA CLIENTES (apenas se banco funcionar)
app.get('/api/admin/clientes', async (req, res) => {
  try {
    if (!pool) throw new Error('Banco não configurado');
    
    const result = await pool.query('SELECT * FROM clientes ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    res.status(503).json({ error: 'Banco offline: ' + error.message });
  }
});

app.post('/api/admin/clientes', async (req, res) => {
  try {
    if (!pool) throw new Error('Banco não configurado');
    
    const { cpf, nome, telefone, email, endereco } = req.body;
    const result = await pool.query(
      `INSERT INTO clientes (cpf, nome, telefone, email, endereco) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [cpf, nome, telefone, email, endereco]
    );
    
    res.json({ 
      success: true, 
      message: '✅ Cliente salvo no PostgreSQL!',
      cliente: result.rows[0]
    });
  } catch (error) {
    res.status(503).json({ error: 'Erro no banco: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`=== 🚀 Servidor rodando na porta ${PORT} ===`);
  console.log(`=== 📊 Diagnóstico: https://sistema-emprestimos.onrender.com/api/debug ===`);
  console.log(`=== ❤️  Health Check: https://sistema-emprestimos.onrender.com/api/health ===`);
});