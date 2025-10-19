// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// Helper para ler o banco de dados
function readDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao ler banco de dados:', error);
    }
    
    // Retornar dados padrão se o arquivo não existir
    return [
        {
            "cpf": "07220135319",
            "nome": "Patricia da Silva Oliveira",
            "email": "patricia.silva@email.com",
            "endereco": "Edificio Ipanema, Emperatriz - MA",
            "telefone": "98984894575",
            "emprestimos": [
                {
                    "valorTotal": 7866.0,
                    "parcelas": 5,
                    "dataContratacao": "2024-01-01",
                    "boletos": [
                        {
                            "parcela": 1,
                            "valor": 1573.20,
                            "vencimento": "10-01-2024",
                            "status": "Pago"
                        },
                        {
                            "parcela": 2,
                            "valor": 1573.20,
                            "vencimento": "10-02-2024",
                            "status": "Pago"
                        },
                        {
                            "parcela": 3,
                            "valor": 1573.20,
                            "vencimento": "10-03-2024", 
                            "status": "Pendente"
                        }
                    ]
                }
            ]
        },
        {
            "cpf": "70277930162", 
            "nome": "Wylck Lorrhan Nascimento dos Santos",
            "email": "wylck.lorrhan@email.com",
            "endereco": "Rua das Macieiras Nº 219, Centro - Bom Jesus das Selvas/MA",
            "telefone": "98985417436",
            "emprestimos": [
                {
                    "valorTotal": 5000.0,
                    "parcelas": 3,
                    "dataContratacao": "2023-12-01",
                    "boletos": [
                        {
                            "parcela": 1,
                            "valor": 1666.67,
                            "vencimento": "15-12-2023",
                            "status": "Atrasado"
                        },
                        {
                            "parcela": 2,
                            "valor": 1666.67,
                            "vencimento": "15-01-2024",
                            "status": "Pendente"
                        }
                    ]
                }
            ]
        }
    ];
}

// Helper para salvar no banco de dados
function saveDatabase(data) {
    try {
        // Garantir que o diretório existe
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar banco de dados:', error);
        return false;
    }
}

// GET /api/admin/clientes - Listar todos os clientes
router.get('/clientes', (req, res) => {
    try {
        const clientes = readDatabase();
        res.json(clientes);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/admin/clientes - Salvar todos os clientes
router.post('/clientes', (req, res) => {
    try {
        const clientes = req.body;
        
        if (!Array.isArray(clientes)) {
            return res.status(400).json({ error: 'Dados inválidos' });
        }

        const success = saveDatabase(clientes);
        
        if (success) {
            res.json({ success: true, message: 'Dados salvos com sucesso' });
        } else {
            res.status(500).json({ error: 'Erro ao salvar dados' });
        }
    } catch (error) {
        console.error('Erro ao salvar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/admin/clientes/novo - Adicionar novo cliente
router.post('/clientes/novo', (req, res) => {
    try {
        const novoCliente = req.body;
        const clientes = readDatabase();
        
        // Verificar se CPF já existe
        const clienteExistente = clientes.find(c => c.cpf === novoCliente.cpf);
        if (clienteExistente) {
            return res.status(400).json({ error: 'CPF já cadastrado' });
        }
        
        // Garantir que o cliente tem a estrutura correta
        if (!novoCliente.emprestimos) {
            novoCliente.emprestimos = [];
        }
        
        clientes.push(novoCliente);
        const success = saveDatabase(clientes);
        
        if (success) {
            res.json({ success: true, message: 'Cliente cadastrado com sucesso' });
        } else {
            res.status(500).json({ error: 'Erro ao salvar cliente' });
        }
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/admin/clientes/:cpf - Atualizar cliente
router.put('/clientes/:cpf', (req, res) => {
    try {
        const { cpf } = req.params;
        const dadosAtualizados = req.body;
        const clientes = readDatabase();
        
        const index = clientes.findIndex(c => c.cpf === cpf);
        if (index === -1) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        // Manter os empréstimos existentes
        dadosAtualizados.emprestimos = clientes[index].emprestimos;
        clientes[index] = dadosAtualizados;
        
        const success = saveDatabase(clientes);
        
        if (success) {
            res.json({ success: true, message: 'Cliente atualizado com sucesso' });
        } else {
            res.status(500).json({ error: 'Erro ao atualizar cliente' });
        }
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/admin/clientes/:cpf - Excluir cliente
router.delete('/clientes/:cpf', (req, res) => {
    try {
        const { cpf } = req.params;
        const clientes = readDatabase();
        
        const index = clientes.findIndex(c => c.cpf === cpf);
        if (index === -1) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        clientes.splice(index, 1);
        const success = saveDatabase(clientes);
        
        if (success) {
            res.json({ success: true, message: 'Cliente excluído com sucesso' });
        } else {
            res.status(500).json({ error: 'Erro ao excluir cliente' });
        }
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/admin/emprestimos/novo - Adicionar novo empréstimo
router.post('/emprestimos/novo', (req, res) => {
    try {
        const { cpf, valorTotal, parcelas, dataContratacao } = req.body;
        const clientes = readDatabase();
        
        const cliente = clientes.find(c => c.cpf === cpf);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        // Criar boletos
        const valorParcela = valorTotal / parcelas;
        const boletos = [];
        const dataBase = new Date(dataContratacao || new Date());

        for (let i = 1; i <= parcelas; i++) {
            const dataVencimento = new Date(dataBase);
            dataVencimento.setMonth(dataVencimento.getMonth() + i);
            
            boletos.push({
                parcela: i,
                valor: parseFloat(valorParcela.toFixed(2)),
                vencimento: dataVencimento.toLocaleDateString('pt-BR'),
                status: 'Pendente'
            });
        }

        const novoEmprestimo = {
            valorTotal: parseFloat(valorTotal),
            parcelas: parseInt(parcelas),
            dataContratacao: dataContratacao || new Date().toISOString().split('T')[0],
            boletos: boletos
        };

        if (!cliente.emprestimos) {
            cliente.emprestimos = [];
        }
        
        cliente.emprestimos.push(novoEmpréstimo);
        const success = saveDatabase(clientes);
        
        if (success) {
            res.json({ success: true, message: 'Empréstimo criado com sucesso' });
        } else {
            res.status(500).json({ error: 'Erro ao criar empréstimo' });
        }
    } catch (error) {
        console.error('Erro ao criar empréstimo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/admin/pagamentos/pagar - Marcar parcela como paga
router.put('/pagamentos/pagar', (req, res) => {
    try {
        const { cpf, indexEmprestimo, indexBoleto } = req.body;
        const clientes = readDatabase();
        
        const cliente = clientes.find(c => c.cpf === cpf);
        if (!cliente || !cliente.emprestimos[indexEmprestimo]) {
            return res.status(404).json({ error: 'Parcela não encontrada' });
        }
        
        const boleto = cliente.emprestimos[indexEmprestimo].boletos[indexBoleto];
        if (!boleto) {
            return res.status(404).json({ error: 'Parcela não encontrada' });
        }
        
        boleto.status = 'Pago';
        boleto.dataPagamento = new Date().toISOString().split('T')[0];
        
        const success = saveDatabase(clientes);
        
        if (success) {
            res.json({ success: true, message: 'Pagamento registrado com sucesso' });
        } else {
            res.status(500).json({ error: 'Erro ao registrar pagamento' });
        }
    } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;