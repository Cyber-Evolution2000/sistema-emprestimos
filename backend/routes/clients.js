const express = require('express');
const router = express.Router();
const database = require('../config/database');

// GET /api/clients/:cpf
router.get('/:cpf', (req, res) => {
    try {
        const { cpf } = req.params;
        
        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        const client = database.findClientByCPF(cpf);
        
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Calcular juros e atualizar status
        const updatedClient = calculateInterestAndUpdateStatus(client);
        
        res.json(updatedClient);
    } catch (error) {
        console.error('Erro na consulta do cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

function calculateInterestAndUpdateStatus(client) {
    const hoje = new Date();
    
    client.emprestimos.forEach(emprestimo => {
        emprestimo.boletos.forEach(boleto => {
            if (boleto.status !== 'Pago') {
                const vencimento = new Date(boleto.vencimento.split('-').reverse().join('-'));
                const diffTime = hoje - vencimento;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 0) {
                    // Aplicar juros de 1% ao dia
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

module.exports = router;