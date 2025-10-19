const express = require('express');
const router = express.Router();

// GET /api/webhooks/status/:txid
router.get('/status/:txid', (req, res) => {
    try {
        const { txid } = req.params;
        
        // Simular consulta de status (em produção, consultar Sicoob API)
        // Para teste, sempre retornamos "ATIVA"
        res.json({
            status: 'ATIVA',
            txid: txid,
            message: 'Pagamento ainda não confirmado'
        });
    } catch (error) {
        console.error('Erro ao consultar status:', error);
        res.status(500).json({ error: 'Erro ao consultar status do pagamento' });
    }
});

// POST /api/webhooks/pix (webhook do Sicoob)
router.post('/pix', (req, res) => {
    try {
        console.log('Webhook PIX recebido:', req.body);
        // Aqui você processaria os pagamentos recebidos do Sicoob
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no webhook PIX:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

module.exports = router;