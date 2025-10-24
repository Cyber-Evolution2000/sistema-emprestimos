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

// ✅ ROTA GET PARA EMPRÉSTIMOS (COM CONTAGEM CORRETA)
app.get('/api/admin/emprestimos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const client = await pool.connect();
        
        // Verificar se tabela existe
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'emprestimos'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            client.release();
            return res.json([]);
        }
        
        // ✅ QUERY CORRIGIDA - SEM LEFT JOIN DESNECESSÁRIO
        const result = await client.query(`
            SELECT 
                e.*, 
                c.nome as cliente_nome,
                c.telefone as cliente_telefone,
                (SELECT COUNT(*) FROM parcelas p WHERE p.emprestimo_id = e.id) as total_parcelas,
                (SELECT COUNT(*) FROM parcelas p WHERE p.emprestimo_id = e.id AND p.status = 'Pago') as parcelas_pagas
            FROM emprestimos e
            LEFT JOIN clientes c ON e.cliente_cpf = c.cpf
            ORDER BY e.data_contratacao DESC
        `);
        
        client.release();
        
        res.json(result.rows);
        
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

// ✅ ROTAS PARA O SITE PÚBLICO (INDEX.HTML)

// ✅ ROTA COMPLETA PARA BUSCAR CLIENTE + EMPRÉSTIMOS (usada pelo index.html)
app.get('/api/clients/:cpf', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const { cpf } = req.params;
        console.log(`🔍 Buscando cliente e empréstimos para CPF: ${cpf}`);
        
        const client = await pool.connect();
        
        // 1. Buscar cliente
        const clienteResult = await client.query(
            'SELECT * FROM clientes WHERE cpf = $1',
            [cpf]
        );
        
        if (clienteResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        const cliente = clienteResult.rows[0];
        
        // 2. Buscar empréstimos do cliente
        const emprestimosResult = await client.query(`
            SELECT e.*, 
                   COUNT(p.id) as total_parcelas,
                   SUM(CASE WHEN p.status = 'Pago' THEN 1 ELSE 0 END) as parcelas_pagas
            FROM emprestimos e
            LEFT JOIN parcelas p ON e.id = p.emprestimo_id
            WHERE e.cliente_cpf = $1
            GROUP BY e.id
            ORDER BY e.data_contratacao DESC
        `, [cpf]);
        
        // 3. Buscar parcelas de cada empréstimo
        const emprestimosComParcelas = [];
        
        for (const emprestimo of emprestimosResult.rows) {
            const parcelasResult = await client.query(`
                SELECT * FROM parcelas 
                WHERE emprestimo_id = $1 
                ORDER BY numero_parcela
            `, [emprestimo.id]);
            
            // Converter parcelas para o formato que o index.html espera
            const boletos = parcelasResult.rows.map(parcela => {
                // Calcular valor atualizado com juros se estiver atrasada
                let valorAtualizado = parseFloat(parcela.valor);
                let status = parcela.status;
                
                if (parcela.status === 'Pendente' && parcela.vencimento) {
                    const vencimento = new Date(parcela.vencimento);
                    const hoje = new Date();
                    
                    if (vencimento < hoje) {
                        status = 'Atrasado';
                        // Aplicar juros de 2% por mês de atraso
                        const mesesAtraso = Math.floor((hoje - vencimento) / (30 * 24 * 60 * 60 * 1000));
                        const juros = parseFloat(emprestimo.taxa_juros) || 2.5;
                        valorAtualizado = valorAtualizado * Math.pow(1 + (juros / 100), mesesAtraso);
                    }
                }
                
                return {
                    parcela: parcela.numero_parcela,
                    valor: parseFloat(parcela.valor).toFixed(2),
                    valorAtualizado: valorAtualizado.toFixed(2),
                    vencimento: parcela.vencimento,
                    status: status,
                    dataPagamento: parcela.data_pagamento
                };
            });
            
            emprestimosComParcelas.push({
                id: emprestimo.id,
                valorTotal: parseFloat(emprestimo.valor_total).toFixed(2),
                parcelas: emprestimo.parcelas,
                dataContratacao: emprestimo.data_contratacao,
                status: emprestimo.status,
                boletos: boletos
            });
        }
        
        client.release();
        
        // 4. Montar resposta no formato que o index.html espera
        const resposta = {
            ...cliente,
            emprestimos: emprestimosComParcelas
        };
        
        console.log(`✅ Cliente encontrado: ${cliente.nome}, Empréstimos: ${emprestimosComParcelas.length}`);
        res.json(resposta);
        
    } catch (error) {
        console.error('❌ Erro ao buscar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para gerar PIX (simulação - você pode implementar depois)
app.post('/api/payments/pix', async (req, res) => {
    try {
        const { cpf, parcela } = req.body;
        
        // Simulação de dados PIX
        const pixData = {
            qrCode: 'https://via.placeholder.com/200x200/32BCAD/FFFFFF?text=QR+CODE+PIX',
            pixCopiaECola: `00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266141740005204000053039865406${Math.random()*1000}5802BR5925SISTEMA EMPRESTIMOS PIX6008BRASILIA62070503***6304${Math.random().toString(36).substr(2, 4)}`,
            valor: 150.00,
            expiracao: '2024-12-31T23:59:59'
        };
        
        res.json(pixData);
        
    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para adicionar alguns dados de exemplo (empréstimos)
app.post('/api/admin/adicionar-dados-exemplo', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const client = await pool.connect();
        
        // Adicionar empréstimos de exemplo para os clientes existentes
        await client.query(`
            CREATE TABLE IF NOT EXISTS emprestimos (
                id SERIAL PRIMARY KEY,
                cliente_cpf VARCHAR(14) REFERENCES clientes(cpf),
                valor_total DECIMAL(10,2) NOT NULL,
                parcelas INTEGER NOT NULL,
                data_contratacao DATE DEFAULT CURRENT_DATE,
                status VARCHAR(20) DEFAULT 'Ativo'
            );
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS parcelas (
                id SERIAL PRIMARY KEY,
                emprestimo_id INTEGER REFERENCES emprestimos(id),
                numero_parcela INTEGER NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                vencimento DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'Pendente',
                data_pagamento DATE NULL
            );
        `);
        
        // Adicionar empréstimos de exemplo
        await client.query(`
            INSERT INTO emprestimos (cliente_cpf, valor_total, parcelas) VALUES
            ('123.456.789-00', 5000.00, 12),
            ('987.654.321-00', 3000.00, 6)
            ON CONFLICT DO NOTHING;
        `);
        
        // Adicionar parcelas de exemplo
        await client.query(`
            INSERT INTO parcelas (emprestimo_id, numero_parcela, valor, vencimento, status) VALUES
            (1, 1, 416.67, '2024-11-10', 'Pendente'),
            (1, 2, 416.67, '2024-12-10', 'Pendente'),
            (2, 1, 500.00, '2024-11-15', 'Pago'),
            (2, 2, 500.00, '2024-12-15', 'Pendente')
            ON CONFLICT DO NOTHING;
        `);
        
        client.release();
        
        res.json({ 
            success: true,
            message: 'Dados de exemplo adicionados com sucesso!',
            emprestimos_adicionados: 2,
            parcelas_adicionadas: 4
        });
        
    } catch (error) {
        console.error('Erro ao adicionar dados exemplo:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA POST PARA CRIAR EMPRÉSTIMOS
app.post('/api/admin/emprestimos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const { cliente_cpf, valor_total, parcelas, taxa_juros, observacoes } = req.body;
        
        if (!cliente_cpf || !valor_total || !parcelas) {
            return res.status(400).json({ error: 'CPF do cliente, valor total e parcelas são obrigatórios' });
        }
        
        const client = await pool.connect();
        
        // Verificar se tabela existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS emprestimos (
                id SERIAL PRIMARY KEY,
                cliente_cpf VARCHAR(14) REFERENCES clientes(cpf),
                valor_total DECIMAL(10,2) NOT NULL,
                parcelas INTEGER NOT NULL,
                taxa_juros DECIMAL(5,2) DEFAULT 0,
                observacoes TEXT,
                data_contratacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'Ativo'
            );
        `);
        
        // Inserir empréstimo
        const result = await client.query(
            `INSERT INTO emprestimos (cliente_cpf, valor_total, parcelas, taxa_juros, observacoes) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [cliente_cpf, valor_total, parcelas, taxa_juros || 0, observacoes || '']
        );
        
        // Criar parcelas automaticamente
        const emprestimoId = result.rows[0].id;
        const valorParcela = valor_total / parcelas;
        
        // Criar tabela de parcelas se não existir
        await client.query(`
            CREATE TABLE IF NOT EXISTS parcelas (
                id SERIAL PRIMARY KEY,
                emprestimo_id INTEGER REFERENCES emprestimos(id),
                numero_parcela INTEGER NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                vencimento DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'Pendente',
                data_pagamento DATE NULL
            );
        `);
        
        // Gerar datas de vencimento (dia 10 de cada mês)
        const datasVencimento = [];
        const hoje = new Date();
        
        for (let i = 1; i <= parcelas; i++) {
            const dataVencimento = new Date(hoje);
            dataVencimento.setMonth(hoje.getMonth() + i);
            dataVencimento.setDate(10);
            
            datasVencimento.push(dataVencimento.toISOString().split('T')[0]);
        }
        
        // Inserir parcelas
        for (let i = 0; i < parcelas; i++) {
            await client.query(
                `INSERT INTO parcelas (emprestimo_id, numero_parcela, valor, vencimento) 
                 VALUES ($1, $2, $3, $4)`,
                [emprestimoId, i + 1, valorParcela, datasVencimento[i]]
            );
        }
        
        client.release();
        
        res.json({ 
            success: true,
            message: 'Empréstimo cadastrado com sucesso!',
            emprestimo: result.rows[0],
            parcelas_criadas: parcelas
        });
        
    } catch (error) {
        console.error('Erro ao salvar empréstimo:', error);
        
        if (error.code === '23503') { // Violação de chave estrangeira
            res.status(400).json({ error: 'Cliente não encontrado' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// ✅ ADICIONE ESTA ROTA NO FINAL DO server.js
// ROTA PARA O INDEX.HTML BUSCAR CLIENTE + EMPRÉSTIMOS
app.get('/api/clients/:cpf', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const { cpf } = req.params;
        console.log(`🔍 Buscando cliente e empréstimos para CPF: ${cpf}`);
        
        const client = await pool.connect();
        
        // 1. Buscar cliente
        const clienteResult = await client.query(
            'SELECT * FROM clientes WHERE cpf = $1',
            [cpf]
        );
        
        if (clienteResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        const cliente = clienteResult.rows[0];
        
        // 2. Buscar empréstimos do cliente
        const emprestimosResult = await client.query(`
            SELECT e.* 
            FROM emprestimos e
            WHERE e.cliente_cpf = $1
            ORDER BY e.data_contratacao DESC
        `, [cpf]);
        
        // 3. Buscar parcelas de cada empréstimo
        const emprestimosComParcelas = [];
        
        for (const emprestimo of emprestimosResult.rows) {
            const parcelasResult = await client.query(`
                SELECT * FROM parcelas 
                WHERE emprestimo_id = $1 
                ORDER BY numero_parcela
            `, [emprestimo.id]);
            
            // Converter parcelas para o formato que o index.html espera
            const boletos = parcelasResult.rows.map(parcela => {
                return {
                    parcela: parcela.numero_parcela,
                    valor: parseFloat(parcela.valor).toFixed(2),
                    valorAtualizado: parseFloat(parcela.valor).toFixed(2), // Por enquanto sem juros
                    vencimento: parcela.vencimento,
                    status: parcela.status,
                    dataPagamento: parcela.data_pagamento
                };
            });
            
            emprestimosComParcelas.push({
                id: emprestimo.id,
                valorTotal: parseFloat(emprestimo.valor_total).toFixed(2),
                parcelas: emprestimo.parcelas,
                dataContratacao: emprestimo.data_contratacao,
                status: emprestimo.status,
                boletos: boletos
            });
        }
        
        client.release();
        
        // 4. Montar resposta
        const resposta = {
            ...cliente,
            emprestimos: emprestimosComParcelas
        };
        
        console.log(`✅ Cliente encontrado: ${cliente.nome}, Empréstimos: ${emprestimosComParcelas.length}`);
        res.json(resposta);
        
    } catch (error) {
        console.error('❌ Erro ao buscar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA DEBUG - VER EMPRÉSTIMOS POR CLIENTE
app.get('/api/admin/debug-emprestimos', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const client = await pool.connect();
        
        // Contagem por cliente
        const countResult = await client.query(`
            SELECT 
                cliente_cpf,
                COUNT(*) as total_emprestimos
            FROM emprestimos 
            GROUP BY cliente_cpf
            ORDER BY total_emprestimos DESC
        `);
        
        // Lista completa de empréstimos
        const listResult = await client.query(`
            SELECT id, cliente_cpf, valor_total, data_contratacao
            FROM emprestimos 
            ORDER BY cliente_cpf, data_contratacao
        `);
        
        client.release();
        
        res.json({
            contagem_por_cliente: countResult.rows,
            todos_emprestimos: listResult.rows,
            total_geral: listResult.rows.length
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA PUT PARA ATUALIZAR CLIENTE
app.put('/api/admin/clientes/:cpf', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const { cpf } = req.params;
        const { nome, email, telefone, endereco } = req.body;
        
        if (!nome || !telefone) {
            return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
        }
        
        const client = await pool.connect();
        
        const result = await client.query(
            'UPDATE clientes SET nome = $1, email = $2, telefone = $3, endereco = $4 WHERE cpf = $5 RETURNING *',
            [nome, email, telefone, endereco, cpf]
        );
        
        client.release();
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json({ 
            success: true,
            message: 'Cliente atualizado com sucesso!',
            cliente: result.rows[0]
        });
        
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA DELETE PARA EXCLUIR CLIENTE
app.delete('/api/admin/clientes/:cpf', async (req, res) => {
    try {
        if (!isDatabaseConnected) {
            return res.status(503).json({ error: 'Banco offline' });
        }
        
        const { cpf } = req.params;
        const client = await pool.connect();
        
        // Verificar se cliente existe
        const clienteCheck = await client.query(
            'SELECT * FROM clientes WHERE cpf = $1',
            [cpf]
        );
        
        if (clienteCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        // Verificar se tem empréstimos
        const emprestimosCheck = await client.query(
            'SELECT COUNT(*) FROM emprestimos WHERE cliente_cpf = $1',
            [cpf]
        );
        
        const totalEmprestimos = parseInt(emprestimosCheck.rows[0].count);
        if (totalEmprestimos > 0) {
            client.release();
            return res.status(400).json({ 
                error: `Cliente possui ${totalEmprestimos} empréstimo(s) ativo(s). Exclua os empréstimos primeiro.`
            });
        }
        
        // Excluir cliente
        await client.query('DELETE FROM clientes WHERE cpf = $1', [cpf]);
        client.release();
        
        res.json({ 
            success: true,
            message: 'Cliente excluído com sucesso!'
        });
        
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROTA PARA EXCLUIR EMPRÉSTIMO
app.delete('/api/admin/emprestimos/:id', async (req, res) => {
    try {
        const emprestimoId = parseInt(req.params.id);
        
        console.log('🗑️ Tentando excluir empréstimo ID:', emprestimoId);
        
        if (isNaN(emprestimoId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do empréstimo inválido' 
            });
        }

        // Verificar se o empréstimo existe
        const emprestimoCheck = await pool.query(
            'SELECT id FROM emprestimos WHERE id = $1',
            [emprestimoId]
        );

        if (emprestimoCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Empréstimo não encontrado' 
            });
        }

        // ✅ PRIMEIRO: Excluir as parcelas relacionadas
        console.log('🗑️ Excluindo parcelas do empréstimo:', emprestimoId);
        await pool.query(
            'DELETE FROM parcelas WHERE emprestimo_id = $1',
            [emprestimoId]
        );

        // ✅ DEPOIS: Excluir o empréstimo
        console.log('🗑️ Excluindo empréstimo:', emprestimoId);
        const result = await pool.query(
            'DELETE FROM emprestimos WHERE id = $1 RETURNING id',
            [emprestimoId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Empréstimo não encontrado após verificação' 
            });
        }

        console.log('✅ Empréstimo excluído com sucesso:', emprestimoId);
        
        res.json({ 
            success: true, 
            message: 'Empréstimo excluído com sucesso',
            id: emprestimoId
        });

    } catch (error) {
        console.error('❌ Erro ao excluir empréstimo:', error);
        
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor ao excluir empréstimo',
            error: error.message 
        });
    }
});