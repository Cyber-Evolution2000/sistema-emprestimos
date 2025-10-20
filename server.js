const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONEXÃO COM POSTGRESQL - CONFIGURAÇÃO ROBUSTA
function criarPool() {
  try {
    // URL do Render com fallback
    const connectionString = process.env.DATABASE_URL || 'postgresql://admin:VI5ygJqYR2aGq2BdzdbnenKeN5vCNAxg@dpg-cvjf6m5umphs6s7v8qg0-a.oregon-postgres.render.com/sistema_emprestimos';
    
    console.log('🔗 Configurando conexão com PostgreSQL...');
    
    const poolConfig = {
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      // Configurações otimizadas para Render
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      maxUses: 7500,
    };

    const pool = new Pool(poolConfig);
    
    // Event listeners para debug
    pool.on('connect', () => {
      console.log('✅ Nova conexão estabelecida com PostgreSQL');
    });
    
    pool.on('error', (err) => {
      console.error('💥 Erro no pool de conexão:', err);
    });
    
    console.log('✅ Pool de conexão configurado com sucesso');
    return pool;
    
  } catch (error) {
    console.error('❌ Erro ao criar pool:', error.message);
    return null;
  }
}

let pool = criarPool();
let isDatabaseConnected = false;

// ✅ VERIFICAR CONEXÃO COM BANCO
async function testarConexao() {
  if (!pool) {
    console.log('🔄 Recriando pool de conexão...');
    pool = criarPool();
    if (!pool) return false;
  }

  let client;
  try {
    console.log('🔍 Testando conexão com banco...');
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as server_time');
    console.log('✅ Conexão OK. Tempo do servidor:', result.rows[0].server_time);
    isDatabaseConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão:', error.message);
    isDatabaseConnected = false;
    
    // Tentar reconectar
    console.log('🔄 Tentando reconectar em 5 segundos...');
    setTimeout(() => {
      pool = criarPool();
      testarConexao();
    }, 5000);
    
    return false;
  } finally {
    if (client) client.release();
  }
}

// ✅ DIAGNÓSTICO DA CONEXÃO COM BANCO
async function diagnosticarConexao() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DO BANCO DE DADOS...');
  
  try {
    const poolConfig = {
      connectionString: process.env.DATABASE_URL || 'postgresql://admin:VI5ygJqYR2aGq2BdzdbnenKeN5vCNAxg@dpg-cvjf6m5umphs6s7v8qg0-a.oregon-postgres.render.com/sistema_emprestimos',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };

    console.log('📡 Tentando conectar com PostgreSQL...');
    const testPool = new Pool(poolConfig);
    const client = await testPool.connect();
    
    console.log('✅ Conexão estabelecida!');
    
    // Testar consulta simples
    const result = await client.query('SELECT NOW() as tempo_atual, version() as versao');
    console.log('⏰ Tempo do servidor:', result.rows[0].tempo_atual);
    console.log('🐘 Versão PostgreSQL:', result.rows[0].versao.split(',')[0]);
    
    // Verificar tabelas
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Tabelas existentes:', tabelas.rows.map(t => t.table_name));
    
    client.release();
    await testPool.end();
    
    console.log('🎉 DIAGNÓSTICO CONCLUÍDO: Banco de dados funcionando perfeitamente!');
    return true;
    
  } catch (error) {
    console.error('💥 ERRO NO DIAGNÓSTICO:', error.message);
    console.error('🔧 Detalhes técnicos:', error);
    return false;
  }
}

// ✅ CRIAR TABELAS SE NÃO EXISTIREM
async function criarTabelas() {
  if (!isDatabaseConnected) {
    console.log('⏳ Aguardando conexão com banco...');
    return false;
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
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    return false;
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

// ✅ MIDDLEWARE PARA VERIFICAR CONEXÃO (MAIS TOLERANTE)
app.use(async (req, res, next) => {
  // Não bloquear rotas críticas
  if (req.path === '/api/health' || req.path === '/api/test') {
    return next();
  }
  
  // Para rotas de API, verificar conexão mas não bloquear totalmente
  if (req.path.startsWith('/api/') && !isDatabaseConnected) {
    console.log('⚠️  Banco offline para rota:', req.path);
    
    // Tentar reconectar uma vez
    const connected = await testarConexao();
    if (!connected) {
      // Para rotas GET, retornar array vazio em vez de erro
      if (req.method === 'GET') {
        if (req.path.includes('/clientes') || req.path.includes('/emprestimos')) {
          return res.json([]);
        }
      }
      // Para outras rotas, retornar erro
      return res.status(503).json({ 
        error: 'Serviço temporariamente indisponível',
        message: 'Banco de dados offline'
      });
    }
  }
  
  next();
});

// ✅ ROTA SIMPLES PARA TESTE
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API funcionando',
    database: isDatabaseConnected ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

// ✅ ROTA DE HEALTH CHECK DETALHADA
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testarConexao();
    
    let dbDetails = {};
    if (dbConnected && pool) {
      try {
        const client = await pool.connect();
        const tables = await client.query(`
          SELECT COUNT(*) as total_clientes FROM clientes;
        `);
        dbDetails.totalClientes = tables.rows[0].total_clientes;
        client.release();
      } catch (dbError) {
        dbDetails.error = dbError.message;
      }
    }
    
    res.json({ 
      status: dbConnected ? 'OK' : 'ERROR',
      message: dbConnected ? 'Sistema operacional' : 'Problemas no banco',
      database: {
        connected: dbConnected,
        details: dbDetails
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Erro no health check: ' + error.message
    });
  }
});

// ✅ ROTA PARA BUSCAR CLIENTE POR CPF (FRONTEND)
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
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (client) client.release();
  }
});

// ✅ ROTA PARA SALVAR/ATUALIZAR CLIENTE (ADMIN)
app.post('/api/admin/clientes', async (req, res) => {
  let client;
  try {
    const { cpf, nome, email, telefone, endereco } = req.body;
    
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();

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

// ✅ ROTA PARA LISTAR TODOS OS CLIENTES (ADMIN)
app.get('/api/admin/clientes', async (req, res) => {
  let client;
  try {
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();
    
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

// ======================== ROTAS DE EMPRÉSTIMOS ========================
// ✅ ROTA PARA BUSCAR TODOS OS EMPRÉSTIMOS
app.get('/api/admin/emprestimos', async (req, res) => {
  let client;
  try {
    console.log('📦 Buscando lista de empréstimos...');
    
    if (!isDatabaseConnected) {
      console.log('❌ Banco desconectado');
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();
    console.log('✅ Cliente conectado, executando query...');
    
    const result = await client.query(`
      SELECT 
        e.id,
        e.valor_total,
        e.parcelas,
        e.data_contratacao,
        c.nome as cliente_nome,
        c.cpf as cliente_cpf
      FROM emprestimos e
      JOIN clientes c ON e.cliente_id = c.id
      ORDER BY e.created_at DESC
    `);

    console.log(`✅ Encontrados ${result.rows.length} empréstimos`);

    const emprestimos = result.rows.map(emp => ({
      id: emp.id,
      cliente: {
        nome: emp.cliente_nome,
        cpf: emp.cliente_cpf
      },
      valorTotal: parseFloat(emp.valor_total),
      parcelas: emp.parcelas,
      dataContratacao: emp.data_contratacao,
      status: 'Em andamento'
    }));

    res.json(emprestimos);
    
  } catch (error) {
    console.error('❌ Erro ao listar empréstimos:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  } finally {
    if (client) {
      client.release();
      console.log('🔓 Cliente liberado');
    }
  }
});

// ✅ ROTA PARA CRIAR NOVO EMPRÉSTIMO
app.post('/api/admin/emprestimos', async (req, res) => {
  let client;
  try {
    const { clienteCpf, valorTotal, parcelas, dataContratacao } = req.body;
    
    console.log('💾 Salvando empréstimo:', { clienteCpf, valorTotal, parcelas });

    if (!clienteCpf || !valorTotal || !parcelas) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    client = await pool.connect();

    // Buscar cliente
    const clienteResult = await client.query(
      'SELECT id FROM clientes WHERE cpf = $1',
      [clienteCpf]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const clienteId = clienteResult.rows[0].id;

    // Inserir empréstimo
    const emprestimoResult = await client.query(`
      INSERT INTO emprestimos (cliente_id, valor_total, parcelas, data_contratacao)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [clienteId, valorTotal, parcelas, dataContratacao || new Date()]);

    const emprestimo = emprestimoResult.rows[0];

    // Criar parcelas automáticas
    const valorParcela = valorTotal / parcelas;
    for (let i = 1; i <= parcelas; i++) {
      const dataVencimento = new Date(dataContratacao || new Date());
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      
      await client.query(`
        INSERT INTO parcelas (emprestimo_id, numero_parcela, valor, vencimento, status)
        VALUES ($1, $2, $3, $4, 'Pendente')
      `, [emprestimo.id, i, valorParcela.toFixed(2), dataVencimento.toISOString().split('T')[0]]);
    }

    res.json({ 
      success: true, 
      message: 'Empréstimo criado com sucesso!',
      id: emprestimo.id
    });

  } catch (error) {
    console.error('❌ Erro ao criar empréstimo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (client) client.release();
  }
});

// ✅ ROTA PARA BUSCAR DETALHES DE UM EMPRÉSTIMO
app.get('/api/admin/emprestimos/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();
    
    const result = await client.query(`
      SELECT e.*, c.nome as cliente_nome, c.cpf as cliente_cpf
      FROM emprestimos e
      JOIN clientes c ON e.cliente_id = c.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    const emprestimo = result.rows[0];
    res.json({
      id: emprestimo.id,
      clienteCpf: emprestimo.cliente_cpf,
      clienteNome: emprestimo.cliente_nome,
      valorTotal: parseFloat(emprestimo.valor_total),
      parcelas: emprestimo.parcelas,
      dataContratacao: emprestimo.data_contratacao
    });

  } catch (error) {
    console.error('❌ Erro ao buscar empréstimo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (client) client.release();
  }
});

// ✅ ROTA PARA EXCLUIR EMPRÉSTIMO
app.delete('/api/admin/emprestimos/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    
    if (!isDatabaseConnected) {
      return res.status(503).json({ error: 'Banco de dados offline' });
    }

    client = await pool.connect();

    await client.query('DELETE FROM parcelas WHERE emprestimo_id = $1', [id]);
    await client.query('DELETE FROM emprestimos WHERE id = $1', [id]);

    res.json({ 
      success: true, 
      message: 'Empréstimo excluído com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao excluir empréstimo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (client) client.release();
  }
});

// ✅ Rota para gerar PIX
app.post('/api/payments/pix', async (req, res) => {
  try {
    const { cpf, parcela } = req.body;
    
    // Simular geração de PIX
    const paymentData = {
      success: true,
      valor: 100.00,
      txid: 'pix-' + Date.now(),
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlslD0iI0ZGRiIvPjxwYXRoIGQ9Ik00MCA0MGgxMjB2MTIwSDQweiIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==`,
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
  
  // Inicializar conexão com banco
  console.log('🔄 Iniciando conexão com banco de dados...');
  await testarConexao();
  
  // Executar diagnóstico
  console.log('🔍 Executando diagnóstico...');
  await diagnosticarConexao();
  
  // Criar tabelas se necessário
  console.log('📊 Verificando tabelas...');
  await criarTabelas();
  
  console.log('🎉 Sistema inicializado com sucesso!');
});

// ✅ TRATAR ENCERRAMENTO GRACIOSO
process.on('SIGINT', async () => {
  console.log('🔄 Encerrando conexões...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});