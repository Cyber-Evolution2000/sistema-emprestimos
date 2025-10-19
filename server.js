const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONEXÃO COM POSTGRESQL - CONFIGURAÇÃO CORRIGIDA
const getPoolConfig = () => {
  // Use a URL do Render ou a string de conexão direta
  const connectionString = process.env.DATABASE_URL || 'postgresql://admin:VI5ygJqYR2aGq2BdzdbnenKeN5vCNAxg@dpg-d3q7scs9c44c73ci2l40-a.oregon-postgres.render.com/sistema_emprestimos';
  
  console.log('🔗 String de conexão:', connectionString ? 'Configurada' : 'Não encontrada');
  
  return {
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // Configurações otimizadas para Render
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
};

let pool;
let isDatabaseConnected = false;

// ✅ INICIALIZAR POOL DE CONEXÃO
function initializePool() {
  try {
    const poolConfig = getPoolConfig();
    pool = new Pool(poolConfig);
    console.log('✅ Pool de conexão inicializado');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar pool:', error.message);
    return false;
  }
}

// ✅ VERIFICAR CONEXÃO COM BANCO
async function testarConexao() {
  if (!pool) {
    console.log('🔄 Inicializando pool...');
    initializePool();
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexão com PostgreSQL estabelecida:', result.rows[0].now);
    isDatabaseConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
    isDatabaseConnected = false;
    return false;
  } finally {
    if (client) client.release();
  }
}

// ✅ CRIAR TABELAS SE NÃO EXISTIREM
async function criarTabelas() {
  if (!isDatabaseConnected) {
    console.log('⏳ Aguardando conexão com banco...');
    return;
  }

  let client;
  try {
    client = await pool.connect();
    console.log('📊 Verificando/Criando tabelas...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        cpf VARCHAR(11) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        telefone VARCHAR(20),
        endereco TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS emprestimos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        valor_total DECIMAL(10,2) NOT NULL,
        parcelas INTEGER NOT NULL,
        data_contratacao DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS parcelas (
        id SERIAL PRIMARY KEY,
        emprestimo_id INTEGER REFERENCES emprestimos(id),
        numero_parcela INTEGER NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        vencimento DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Pendente',
        data_pagamento DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabelas criadas/verificadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
  } finally {
    if (client) client.release();
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SERVIR ARQUIVOS ESTÁTICOS
app.use(express.static(__dirname));

// ✅ MIDDLEWARE PARA VERIFICAR CONEXÃO
app.use(async (req, res, next) => {
  if (!isDatabaseConnected) {
    const connected = await testarConexao();
    if (!connected) {
      return res.status(503).json({ 
        error: 'Serviço temporariamente indisponível',
        message: 'Banco de dados offline'
      });
    }
  }
  next();
});

// ✅ ROTA SIMPLES PARA TESTE
app.get('/api/test', async (req, res) => {
  try {
    const connected = await testarConexao();
    res.json({ 
      status: 'OK', 
      database: connected ? 'Conectado' : 'Desconectado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message 
    });
  }
});

// ✅ ROTA PARA BUSCAR CLIENTE POR CPF
app.get('/api/clients/:cpf', async (req, res) => {
  let client;
  try {
    const { cpf } = req.params;
    
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();
    
    // Primeiro busca o cliente
    const clienteResult = await client.query(
      'SELECT * FROM clientes WHERE cpf = $1',
      [cpf]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const cliente = clienteResult.rows[0];

    // Busca os empréstimos do cliente
    const emprestimosResult = await client.query(
      `SELECT e.* FROM emprestimos e WHERE e.cliente_id = $1`,
      [cliente.id]
    );

    cliente.emprestimos = [];

    // Para cada empréstimo, busca as parcelas
    for (const emprestimo of emprestimosResult.rows) {
      const parcelasResult = await client.query(
        `SELECT p.*, TO_CHAR(p.vencimento, 'DD-MM-YYYY') as vencimento_formatado 
         FROM parcelas p 
         WHERE p.emprestimo_id = $1 
         ORDER BY p.numero_parcela`,
        [emprestimo.id]
      );

      const boletos = parcelasResult.rows.map(p => ({
        id: p.id,
        parcela: p.numero_parcela,
        valor: parseFloat(p.valor),
        vencimento: p.vencimento_formatado,
        status: p.status,
        dataPagamento: p.data_pagamento
      }));

      cliente.emprestimos.push({
        id: emprestimo.id,
        valorTotal: parseFloat(emprestimo.valor_total),
        parcelas: emprestimo.parcelas,
        dataContratacao: emprestimo.data_contratacao,
        boletos: boletos
      });
    }

    const clienteComJuros = calculateInterestAndUpdateStatus(cliente);
    res.json(clienteComJuros);
  } catch (error) {
    console.error('❌ Erro ao buscar cliente:', error.message);
    
    // Tenta reconectar se houve erro de conexão
    if (error.message.includes('conexão') || error.message.includes('connection')) {
      isDatabaseConnected = false;
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (client) client.release();
  }
});

// ✅ ROTA PARA SALVAR/ATUALIZAR CLIENTE (ADMIN) - Versão Simplificada
app.post('/api/admin/clientes', async (req, res) => {
  let client;
  try {
    const { cpf, nome, email, telefone, endereco } = req.body;
    
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();

    // Apenas salva o cliente por enquanto (sem empréstimos)
    const clienteResult = await client.query(`
      INSERT INTO clientes (cpf, nome, email, telefone, endereco)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cpf) DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        endereco = EXCLUDED.endereco
      RETURNING *
    `, [cpf, nome, email, telefone, endereco]);

    const cliente = clienteResult.rows[0];

    res.json({ 
      success: true, 
      message: 'Cliente salvo com sucesso',
      cliente: cliente
    });
  } catch (error) {
    console.error('❌ Erro ao salvar cliente:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (client) client.release();
  }
});

// ✅ ROTA PARA LISTAR TODOS OS CLIENTES (ADMIN) - Versão Simplificada
app.get('/api/admin/clientes', async (req, res) => {
  let client;
  try {
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();
    
    // Busca apenas os clientes (sem relacionamentos por enquanto)
    const clientesResult = await client.query(`
      SELECT * FROM clientes ORDER BY nome
    `);

    res.json(clientesResult.rows);
  } catch (error) {
    console.error('❌ Erro ao listar clientes:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (client) client.release();
  }
});

// ✅ Rota para gerar PIX
app.post('/api/payments/pix', async (req, res) => {
  try {
    const { cpf, parcela } = req.body;
    
    // Simular geração de PIX (sem banco por enquanto)
    const paymentData = {
      success: true,
      valor: 100.00, // Valor fixo por enquanto
      txid: 'pix-' + Date.now(),
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGRiIvPjxwYXRoIGQ9Ik00MCA0MGgxMjB2MTIwSDQweiIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==`,
      pixCopiaECola: `00020126580014br.gov.bcb.pix0136pix.sistema.emprestimos${Date.now()}520400005303986540100.005802BR5903PIX6008Sistema62070503***6304`,
      cliente: 'Cliente Teste'
    };

    res.json(paymentData);
  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ✅ Rota para verificar status
app.get('/api/webhooks/status/:txid', (req, res) => {
  res.json({
    status: 'ATIVA',
    txid: req.params.txid,
    message: 'Pagamento ainda não confirmado'
  });
});

// ✅ Rota para admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ✅ Rota de health check
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testarConexao();
    res.json({ 
      status: 'OK', 
      message: 'API funcionando',
      database: dbConnected ? 'Conectado' : 'Desconectado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Problemas na API',
      database: 'Desconectado'
    });
  }
});

// ✅ DEPOIS servimos o frontend para qualquer outra rota
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ Funções auxiliares
function calculateInterestAndUpdateStatus(client) {
  const hoje = new Date();
  
  if (client.emprestimos) {
    client.emprestimos.forEach(emprestimo => {
      if (emprestimo.boletos) {
        emprestimo.boletos.forEach(boleto => {
          if (boleto.status !== 'Pago') {
            const vencimento = new Date(boleto.vencimento.split('-').reverse().join('-'));
            const diffTime = hoje - vencimento;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
              const juros = boleto.valor * 0.01 * diffDays;
              boleto.valorAtualizado = parseFloat((boleto.valor + juros).toFixed(2));
              boleto.diasAtraso = diffDays;
              boleto.status = 'Atrasado';
            } else {
              boleto.valorAtualizado = boleto.valor;
              boleto.diasAtraso = 0;
            }
          }
        });
      }
    });
  }

  return client;
}

// ✅ INICIAR SERVIDOR
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  
  // Inicializar pool
  initializePool();
  
  // Tentar conectar ao banco
  setTimeout(async () => {
    console.log('🔄 Conectando ao banco de dados...');
    await testarConexao();
    await criarTabelas();
  }, 3000);
});

// ✅ TRATAR ENCERRAMENTO GRACIOSO
process.on('SIGINT', async () => {
  console.log('🔄 Encerrando conexões...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});