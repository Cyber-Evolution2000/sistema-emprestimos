// backend/controllers/paymentController.js
const database = require('../config/database');
const sicoobPix = require('../config/sicoob');
const { v4: uuidv4 } = require('uuid');

class PaymentController {
    async generatePixPayment(req, res) {
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
            const valorAtualizado = this.calcularValorComJuros(boleto);
            
            // Gerar TXID único
            const txid = uuidv4().replace(/-/g, '').substring(0, 35);
            
            // Criar cobrança no Sicoob PIX
            const cobrancaData = {
                calendario: {
                    expiracao: 86400 // 24 horas em segundos
                },
                devedor: {
                    cpf: client.cpf,
                    nome: client.nome
                },
                valor: {
                    original: valorAtualizado.toFixed(2)
                },
                chave: process.env.SICOOB_PIX_KEY, // Sua chave PIX
                solicitacaoPagador: `Parcela ${parcela} - Empréstimo`,
                infoAdicionais: [
                    {
                        nome: "Parcela",
                        valor: parcela.toString()
                    },
                    {
                        nome: "CPF",
                        valor: client.cpf
                    }
                ]
            };

            // Criar cobrança no Sicoob
            const cobranca = await sicoobPix.createCobrancaImediata(txid, cobrancaData);
            
            // Salvar TXID no boleto para consulta futura
            boleto.txid = txid;
            boleto.valorAtualizado = valorAtualizado;
            database.updateClient(client);

            res.json({
                success: true,
                qrCode: `${sicoobPix.baseURL}/cob/${txid}/imagem`,
                location: cobranca.location,
                valor: valorAtualizado,
                txid: txid,
                pixCopiaECola: this.generatePixCopiaECola(cobranca)
            });

        } catch (error) {
            console.error('Erro ao gerar PIX:', error);
            res.status(500).json({ error: 'Erro ao gerar pagamento PIX' });
        }
    }

    calcularValorComJuros(boleto) {
        const hoje = new Date();
        const vencimento = new Date(boleto.vencimento.split('-').reverse().join('-'));
        const diffTime = hoje - vencimento;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return boleto.valor;
        
        // 1% de juros ao dia
        const juros = boleto.valor * 0.01 * diffDays;
        return boleto.valor + juros;
    }

    generatePixCopiaECola(cobranca) {
        // Gerar código PIX copia e cola a partir dos dados da cobrança
        // Implementação simplificada - na prática use a library apropriada
        return `00020126580014br.gov.bcb.pix0136${process.env.SICOOB_PIX_KEY}520400005303986540${cobranca.valor.original}5802BR5903PIX6008Sao Paulo62070503***6304`;
    }

    async webhookPix(req, res) {
        try {
            const { pix } = req.body;
            
            // Processar cada PIX recebido
            for (const pagamento of pix) {
                await this.processarPagamentoRecebido(pagamento);
            }
            
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Erro no webhook PIX:', error);
            res.status(500).json({ error: 'Erro ao processar webhook' });
        }
    }

    async processarPagamentoRecebido(pagamento) {
        try {
            // Extrair informações do pagamento
            const txid = pagamento.txid;
            const valor = parseFloat(pagamento.valor);
            const endToEndId = pagamento.endToEndId;
            
            // Buscar no banco de dados pelo TXID
            const clients = database.read();
            let boletoEncontrado = null;
            let clientEncontrado = null;
            
            for (const client of clients) {
                for (const emprestimo of client.emprestimos) {
                    for (const boleto of emprestimo.boletos) {
                        if (boleto.txid === txid && boleto.status !== 'Pago') {
                            boletoEncontrado = boleto;
                            clientEncontrado = client;
                            break;
                        }
                    }
                    if (boletoEncontrado) break;
                }
                if (boletoEncontrado) break;
            }
            
            if (boletoEncontrado && clientEncontrado) {
                // Verificar se o valor pago é suficiente
                const valorEsperado = boletoEncontrado.valorAtualizado || boletoEncontrado.valor;
                
                if (valor >= valorEsperado * 0.95) { // Aceita 5% a menos por questões de arredondamento
                    // Atualizar status para pago
                    boletoEncontrado.status = 'Pago';
                    boletoEncontrado.dataPagamento = new Date().toISOString().split('T')[0];
                    boletoEncontrado.endToEndId = endToEndId;
                    
                    // Salvar no banco
                    database.updateClient(clientEncontrado);
                    
                    console.log(`Pagamento confirmado: Parcela ${boletoEncontrado.parcela} - Cliente ${clientEncontrado.nome}`);
                } else {
                    console.log(`Pagamento insuficiente: Esperado ${valorEsperado}, Recebido ${valor}`);
                }
            }
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
        }
    }

    async consultarStatusPagamento(req, res) {
        try {
            const { txid } = req.params;
            
            // Consultar cobrança no Sicoob
            const cobranca = await sicoobPix.consultarCobranca(txid);
            
            res.json({
                status: cobranca.status,
                valor: cobranca.valor,
                revisao: cobranca.revisao
            });
        } catch (error) {
            console.error('Erro ao consultar status:', error);
            res.status(500).json({ error: 'Erro ao consultar status do pagamento' });
        }
    }
}

module.exports = new PaymentController();