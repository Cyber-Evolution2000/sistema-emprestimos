const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CONEXÃO COM POSTGRESQL - URL CORRIGIDA
const pool = new Pool({
  connectionString: 'postgresql://admin:VI5ygJqYR2aGq2BdzdbnenKeN5vCNAxg@dpg-cvjf6m5umphs6s7v8qg0-a.oregon-postgres.render.com/sistema_emprestimos',
  ssl: { rejectUnauthorized: false }
});

// ✅ CRIAR TABELAS SE NÃO EXISTIREM
async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        cpf VARCHAR(11) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        telefone VARCHAR(20),
        endereco TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS emprestimos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        valor_total DECIMAL(10,2) NOT NULL,
        parcelas INTEGER NOT NULL,
        data_contratacao DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS parcelas (
        id SERIAL PRIMARY KEY,
        emprestimo_id INTEGER REFERENCES emprestimos(id),
        numero_parcela INTEGER NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        vencimento DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Pendente',
        data_pagamento DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabelas criadas/verificadas');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SERVIR ARQUIVOS ESTÁTICOS - CAMINHO CORRETO
app.use(express.static(__dirname));

// ✅ ROTA PARA BUSCAR CLIENTE POR CPF - CONSULTA CORRIGIDA
app.get('/api/clients/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    
    // Primeiro busca o cliente
    const clienteResult = await pool.query(
      'SELECT * FROM clientes WHERE cpf = $1',
      [cpf]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const cliente = clienteResult.rows[0];

    // Busca os empréstimos do cliente
    const emprestimosResult = await pool.query(
      `SELECT e.* FROM emprestimos e WHERE e.cliente_id = $1`,
      [cliente.id]
    );

    cliente.emprestimos = [];

    // Para cada empréstimo, busca as parcelas
    for (const emprestimo of emprestimosResult.rows) {
      const parcelasResult = await pool.query(
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
    console.error('❌ Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ✅ ROTA PARA SALVAR/ATUALIZAR CLIENTE (ADMIN)
app.post('/api/admin/clientes', async (req, res) => {
  try {
    const { cpf, nome, email, telefone, endereco, emprestimos } = req.body;

    // Inserir ou atualizar cliente
    const clienteResult = await pool.query(`
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

    // Processar empréstimos
    if (emprestimos && emprestimos.length > 0) {
      for (const emp of emprestimos) {
        const empResult = await pool.query(`
          INSERT INTO emprestimos (cliente_id, valor_total, parcelas, data_contratacao)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [cliente.id, emp.valorTotal, emp.parcelas, emp.dataContratacao]);

        const emprestimo = empResult.rows[0];

        // Processar parcelas
        if (emp.boletos && emp.boletos.length > 0) {
          for (const boleto of emp.boletos) {
            await pool.query(`
              INSERT INTO parcelas (emprestimo_id, numero_parcela, valor, vencimento, status, data_pagamento)
              VALUES ($1, $2, $3, TO_DATE($4, 'DD-MM-YYYY'), $5, $6)
              ON CONFLICT (emprestimo_id, numero_parcela) DO UPDATE SET
                valor = EXCLUDED.valor,
                vencimento = EXCLUDED.vencimento,
                status = EXCLUDED.status,
                data_pagamento = EXCLUDED.data_pagamento
            `, [emprestimo.id, boleto.parcela, boleto.valor, boleto.vencimento, boleto.status, boleto.dataPagamento]);
          }
        }
      }
    }

    res.json({ success: true, cliente });
  } catch (error) {
    console.error('❌ Erro ao salvar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ✅ ROTA PARA LISTAR TODOS OS CLIENTES (ADMIN) - CONSULTA CORRIGIDA
app.get('/api/admin/clientes', async (req, res) => {
  try {
    // Busca todos os clientes
    const clientesResult = await pool.query(`
      SELECT * FROM clientes ORDER BY nome
    `);

    const clientes = [];

    // Para cada cliente, busca empréstimos e parcelas
    for (const cliente of clientesResult.rows) {
      const emprestimosResult = await pool.query(
        `SELECT e.* FROM emprestimos e WHERE e.cliente_id = $1`,
        [cliente.id]
      );

      const emprestimos = [];

      for (const emprestimo of emprestimosResult.rows) {
        const parcelasResult = await pool.query(
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

        emprestimos.push({
          id: emprestimo.id,
          valorTotal: parseFloat(emprestimo.valor_total),
          parcelas: emprestimo.parcelas,
          dataContratacao: emprestimo.data_contratacao,
          boletos: boletos
        });
      }

      clientes.push({
        ...cliente,
        emprestimos: emprestimos
      });
    }

    res.json(clientes);
  } catch (error) {
    console.error('❌ Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ✅ Rota para gerar PIX
app.post('/api/payments/pix', async (req, res) => {
  try {
    const { cpf, parcela } = req.body;
    
    // Buscar dados da parcela
    const result = await pool.query(`
      SELECT p.*, c.nome
      FROM parcelas p
      JOIN emprestimos e ON e.id = p.emprestimo_id
      JOIN clientes c ON c.id = e.cliente_id
      WHERE c.cpf = $1 AND p.numero_parcela = $2
    `, [cpf, parcela]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    const parcelaData = result.rows[0];
    
    // Calcular valor atualizado com juros
    const valorAtualizado = calculateValorComJuros({
      valor: parseFloat(parcelaData.valor),
      vencimento: parcelaData.vencimento
    });

    // Simular geração de PIX
    const paymentData = {
      success: true,
      valor: valorAtualizado,
      txid: 'pix-' + Date.now(),
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGRiIvPjxwYXRoIGQ9Ik00MCA0MGgxMjB2MTIwSDQweiIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==`,
      pixCopiaECola: `00020126580014br.gov.bcb.pix0136pix.sistema.emprestimos${Date.now()}520400005303986540${valorAtualizado.toFixed(2)}5802BR5903PIX6008Sistema62070503***6304`,
      cliente: parcelaData.nome
    };

    res.json(paymentData);
  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error);
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
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando' });
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

function calculateValorComJuros(boleto) {
  const hoje = new Date();
  const vencimento = new Date(boleto.vencimento);
  const diffTime = hoje - vencimento;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return boleto.valor;
  
  const juros = boleto.valor * 0.01 * diffDays;
  return parseFloat((boleto.valor + juros).toFixed(2));
}

// ✅ INICIAR SERVIDOR
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  await criarTabelas();
});