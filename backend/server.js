const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // ← ADICIONE ESTA LINHA
const clientRoutes = require('./routes/clients');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../')));

// ✅ ROTAS DA API PRIMEIRO
app.use('/api/clients', clientRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// ✅ Rota para admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin.html'));
});

// ✅ Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API funcionando' });
});

// ✅ Dados de exemplo (apenas para fallback)
const clientsData = [
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

// ✅ Rota da API para clientes (fallback se as rotas individuais não funcionarem)
app.get('/api/clients/:cpf', (req, res) => {
    const { cpf } = req.params;
    
    // Primeiro tentar carregar do arquivo
    try {
        if (fs.existsSync('./data/database.json')) {
            const data = fs.readFileSync('./data/database.json', 'utf8');
            const clientes = JSON.parse(data);
            const client = clientes.find(c => c.cpf === cpf);
            
            if (client) {
                const updatedClient = calculateInterestAndUpdateStatus(JSON.parse(JSON.stringify(client)));
                return res.json(updatedClient);
            }
        }
    } catch (error) {
        console.log('Erro ao carregar do arquivo, usando dados de exemplo');
    }
    
    // Fallback para dados de exemplo
    const client = clientsData.find(c => c.cpf === cpf);
    if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    const updatedClient = calculateInterestAndUpdateStatus(JSON.parse(JSON.stringify(client)));
    res.json(updatedClient);
});

// ✅ Rota para gerar PIX
app.post('/api/payments/pix', (req, res) => {
    const { cpf, emprestimoIndex, parcela } = req.body;
    
    // Primeiro tentar carregar do arquivo
    let client = null;
    try {
        if (fs.existsSync('./data/database.json')) {
            const data = fs.readFileSync('./data/database.json', 'utf8');
            const clientes = JSON.parse(data);
            client = clientes.find(c => c.cpf === cpf);
        }
    } catch (error) {
        console.log('Erro ao carregar do arquivo, usando dados de exemplo');
    }
    
    // Fallback para dados de exemplo
    if (!client) {
        client = clientsData.find(c => c.cpf === cpf);
    }
    
    if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Encontrar o boleto específico
    const emprestimo = client.emprestimos[emprestimoIndex];
    if (!emprestimo) {
        return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }
    
    const boleto = emprestimo.boletos.find(b => b.parcela === parcela);
    if (!boleto) {
        return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    // Calcular valor atualizado com juros
    const valorAtualizado = calculateValorComJuros(boleto);

    // Simular geração de PIX
    const paymentData = {
        success: true,
        valor: valorAtualizado,
        txid: 'teste-' + Date.now(),
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PIX-TESTE-${Date.now()}`,
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136TESTE${Date.now()}520400005303986540${valorAtualizado.toFixed(2)}5802BR5903PIX6008Sao Paulo62070503***6304`,
        location: `https://pix.example.com/pay/teste-${Date.now()}`
    };

    res.json(paymentData);
});

// ✅ Rota para verificar status
app.get('/api/webhooks/status/:txid', (req, res) => {
    res.json({
        status: 'ATIVA',
        txid: req.params.txid,
        message: 'Pagamento ainda não confirmado'
    });
});

// ✅ DEPOIS servimos o frontend para qualquer outra rota
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// ✅ Funções auxiliares
function calculateInterestAndUpdateStatus(client) {
    const hoje = new Date();
    
    client.emprestimos.forEach(emprestimo => {
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
    });

    return client;
}

function calculateValorComJuros(boleto) {
    const hoje = new Date();
    const vencimento = new Date(boleto.vencimento.split('-').reverse().join('-'));
    const diffTime = hoje - vencimento;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return boleto.valor;
    
    const juros = boleto.valor * 0.01 * diffDays;
    return parseFloat((boleto.valor + juros).toFixed(2));
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`👤 Teste com CPF: 07220135319 ou 70277930162`);
});