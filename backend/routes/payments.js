const express = require('express');
const router = express.Router();
const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/payments/pix
router.post('/pix', (req, res) => {
    try {
        const { cpf, emprestimoIndex, parcela } = req.body;
        
        const client = database.findClientByCPF(cpf);
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        const emprestimo = client.emprestimos[emprestimoIndex];
        const boleto = emprestimo.boletos.find(b => b.parcela === parcela);
        
        if (!boleto) {
            return res.status(404).json({ error: 'Parcela não encontrada' });
        }

        // Calcular valor atualizado com juros
        const valorAtualizado = calcularValorComJuros(boleto);
        
        // Gerar TXID único
        const txid = uuidv4().replace(/-/g, '').substring(0, 35);
        
        // Simular dados da cobrança PIX (em produção, integrar com Sicoob)
        const paymentData = {
            success: true,
            valor: valorAtualizado,
            txid: txid,
            qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PIX-${txid}`,
            pixCopiaECola: `00020126580014br.gov.bcb.pix0136${txid}520400005303986540${valorAtualizado.toFixed(2)}5802BR5903PIX6008Sao Paulo62070503***6304`,
            location: `https://pix.example.com/pay/${txid}`
        };

        // Salvar TXID no boleto para consulta futura
        boleto.txid = txid;
        boleto.valorAtualizado = valorAtualizado;
        database.updateClient(client);

        res.json(paymentData);

    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        res.status(500).json({ error: 'Erro ao gerar pagamento PIX' });
    }
});

function calcularValorComJuros(boleto) {
    const hoje = new Date();
    const vencimento = new Date(boleto.vencimento.split('-').reverse().join('-'));
    const diffTime = hoje - vencimento;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return boleto.valor;
    
    // 1% de juros ao dia
    const juros = boleto.valor * 0.01 * diffDays;
    return parseFloat((boleto.valor + juros).toFixed(2));
}

module.exports = router;