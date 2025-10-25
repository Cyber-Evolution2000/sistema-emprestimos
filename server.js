// scripts/app.js
class LoanSystem {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('Sistema de Empréstimos inicializado');
    }

    bindEvents() {
        // Consulta
        document.getElementById('consultaForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.consultarCliente();
        });

        // Admin - Criar Cliente
        document.getElementById('criarClienteForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.criarCliente();
        });

        // Admin - Criar Empréstimo
        document.getElementById('criarEmprestimoForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.criarEmprestimo();
        });

        // Formatação do CPF enquanto digita
        document.getElementById('cpf')?.addEventListener('input', this.formatarCPFInput);
        document.getElementById('clientCpf')?.addEventListener('input', this.formatarCPFInput);
        document.getElementById('loanCpf')?.addEventListener('input', this.formatarCPFInput);
    }

    formatarCPFInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            if (value.length > 3) value = value.replace(/^(\d{3})(\d)/, '$1.$2');
            if (value.length > 6) value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
            if (value.length > 9) value = value.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
            e.target.value = value;
        }
    }

    async consultarCliente() {
        const cpfInput = document.getElementById('cpf').value.replace(/\D/g, '');
        
        if (!this.validarCPF(cpfInput)) {
            this.mostrarErro('CPF inválido. Digite 11 números.');
            return;
        }

        this.mostrarCarregamento(true);

        try {
            const response = await fetch(`${this.apiBase}/clients/${cpfInput}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na consulta');
            }

            const data = await response.json();
            this.exibirResultados(data);

        } catch (error) {
            this.mostrarErro(error.message);
        } finally {
            this.mostrarCarregamento(false);
        }
    }

    async criarCliente() {
        const formData = new FormData(document.getElementById('criarClienteForm'));
        const dados = {
            cpf: formData.get('cpf').replace(/\D/g, ''),
            nome: formData.get('nome'),
            telefone: formData.get('telefone'),
            email: formData.get('email'),
            endereco: formData.get('endereco')
        };

        if (!this.validarCPF(dados.cpf)) {
            this.mostrarErro('CPF inválido.');
            return;
        }

        this.mostrarCarregamento(true);

        try {
            const response = await fetch(`${this.apiBase}/clients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar cliente');
            }

            const data = await response.json();
            this.mostrarSucesso('Cliente criado com sucesso!');
            document.getElementById('criarClienteForm').reset();

        } catch (error) {
            this.mostrarErro(error.message);
        } finally {
            this.mostrarCarregamento(false);
        }
    }

    async criarEmprestimo() {
        const formData = new FormData(document.getElementById('criarEmprestimoForm'));
        const dados = {
            clientCpf: formData.get('cpf').replace(/\D/g, ''),
            valorTotal: parseFloat(formData.get('valorTotal')),
            parcelas: parseInt(formData.get('parcelas')),
            dataVencimento: formData.get('dataVencimento')
        };

        if (!this.validarCPF(dados.clientCpf)) {
            this.mostrarErro('CPF inválido.');
            return;
        }

        this.mostrarCarregamento(true);

        try {
            const response = await fetch(`${this.apiBase}/loans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar empréstimo');
            }

            const data = await response.json();
            this.mostrarSucesso('Empréstimo criado com sucesso!');
            document.getElementById('criarEmprestimoForm').reset();

        } catch (error) {
            this.mostrarErro(error.message);
        } finally {
            this.mostrarCarregamento(false);
        }
    }

    async gerarPagamentoPIX(cpf, emprestimoIndex, parcela) {
        this.mostrarCarregamento(true);

        try {
            const response = await fetch(`${this.apiBase}/payments/pix`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cpf: cpf,
                    emprestimoIndex: emprestimoIndex,
                    parcela: parcela
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao gerar pagamento');
            }

            const data = await response.json();

            if (data.success) {
                this.mostrarPagamentoSicoob(data);
            } else {
                throw new Error('Erro ao gerar pagamento PIX');
            }
        } catch (error) {
            this.mostrarErro(error.message);
        } finally {
            this.mostrarCarregamento(false);
        }
    }

    validarCPF(cpf) {
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        return true;
    }

    mostrarCarregamento(mostrar) {
        const loadingElement = document.getElementById('loading');
        const forms = document.querySelectorAll('form');
        
        if (mostrar) {
            if (loadingElement) loadingElement.style.display = 'block';
            forms.forEach(form => form.style.opacity = '0.5');
        } else {
            if (loadingElement) loadingElement.style.display = 'none';
            forms.forEach(form => form.style.opacity = '1');
        }
    }

    mostrarErro(mensagem) {
        alert('❌ Erro: ' + mensagem);
    }

    mostrarSucesso(mensagem) {
        alert('✅ ' + mensagem);
    }

    formatarCPF(cpf) {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    formatarTelefone(telefone) {
        const cleaned = telefone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        }
        return telefone;
    }

    calcularDiasAtraso(vencimentoStr) {
        const hoje = new Date();
        const vencimento = new Date(vencimentoStr.split('-').reverse().join('-'));
        const diffTime = hoje - vencimento;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 ? diffDays : 0;
    }

    calcularValorComJuros(valorOriginal, diasAtraso) {
        if (diasAtraso <= 0) return valorOriginal;
        
        const jurosDiario = 0.01; // 1% ao dia
        const jurosTotal = valorOriginal * jurosDiario * diasAtraso;
        return valorOriginal + jurosTotal;
    }

    exibirResultados(cliente) {
        const resultadoDiv = document.getElementById('resultado');
        resultadoDiv.style.display = 'block';
        
        let html = `
            <div class="card mb-4">
                <div class="card-header">
                    <h4 class="mb-0"><i class="fas fa-user"></i> Dados do Cliente</h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Nome:</strong> ${cliente.nome}</p>
                            <p><strong>CPF:</strong> ${this.formatarCPF(cliente.cpf)}</p>
                            <p><strong>Telefone:</strong> ${this.formatarTelefone(cliente.telefone)}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>E-mail:</strong> ${cliente.email}</p>
                            <p><strong>Endereço:</strong> ${cliente.endereco}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Empréstimos
        if (cliente.emprestimos && cliente.emprestimos.length > 0) {
            cliente.emprestimos.forEach((emprestimo, index) => {
                html += `
                    <div class="card mb-4">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h4 class="mb-0">Empréstimo ${index + 1}</h4>
                            <span class="badge bg-primary fs-6">Valor Total: R$ ${emprestimo.valor_total.toFixed(2)}</span>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Parcela</th>
                                            <th>Valor Original</th>
                                            <th>Vencimento</th>
                                            <th>Status</th>
                                            <th>Valor Atualizado</th>
                                            <th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                `;
                
                if (emprestimo.boletos && emprestimo.boletos.length > 0) {
                    emprestimo.boletos.forEach(boleto => {
                        const diasAtraso = this.calcularDiasAtraso(boleto.vencimento);
                        const valorAtualizado = this.calcularValorComJuros(boleto.valor, diasAtraso);
                        const vencido = diasAtraso > 0;
                        
                        const statusClass = boleto.status === 'Pago' ? 'status-pago' : 
                                        (vencido ? 'status-atrasado' : 'status-pendente');
                        
                        const statusText = boleto.status === 'Pago' ? 'Pago' : 
                                        (vencido ? `Atrasado (${diasAtraso} dias)` : 'Pendente');
                        
                        html += `
                            <tr>
                                <td><strong>${boleto.parcela}</strong></td>
                                <td>R$ ${boleto.valor.toFixed(2)}</td>
                                <td>${boleto.vencimento}</td>
                                <td class="${statusClass}">${statusText}</td>
                                <td class="${vencido && boleto.status !== 'Pago' ? 'valor-atualizado' : ''}">
                                    R$ ${valorAtualizado.toFixed(2)}
                                </td>
                                <td>
                        `;
                        
                        if (boleto.status !== 'Pago') {
                            html += `
                                <button class="btn btn-sm btn-success" 
                                        onclick="loanSystem.gerarPagamentoPIX('${cliente.cpf}', ${index}, ${boleto.parcela})">
                                    <i class="fas fa-qrcode"></i> Pagar PIX
                                </button>
                            `;
                        } else {
                            html += `
                                <span class="badge bg-success">
                                    <i class="fas fa-check"></i> Pago
                                </span>
                            `;
                        }
                        
                        html += `</td></tr>`;
                    });
                } else {
                    html += `<tr><td colspan="6" class="text-center">Nenhuma parcela encontrada</td></tr>`;
                }
                
                html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Nenhum empréstimo encontrado para este cliente.
                </div>
            `;
        }
        
        resultadoDiv.innerHTML = html;
    }

    mostrarPagamentoSicoob(paymentData) {
        const modalHtml = `
            <div class="modal fade" id="pagamentoModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">💎 Pagamento via PIX Sicoob</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <p class="fs-5">Valor: <strong>R$ ${paymentData.valor.toFixed(2)}</strong></p>
                            
                            ${paymentData.warning ? `
                                <div class="alert alert-warning">
                                    <i class="fas fa-exclamation-triangle"></i> ${paymentData.warning}
                                </div>
                            ` : ''}
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="qrcode-container">
                                        <img src="${paymentData.qrCode}" 
                                             alt="QR Code PIX" 
                                             class="img-fluid"
                                             style="max-width: 300px; border: 1px solid #ddd; border-radius: 8px;"
                                             onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData.pixCopiaECola)}'">
                                        <p class="mt-2"><small>Escaneie o QR Code com seu app bancário</small></p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="p-3">
                                        <h6>📋 PIX Copia e Cola:</h6>
                                        <div class="input-group mb-3">
                                            <textarea class="form-control" 
                                                      id="pixCode" 
                                                      rows="4" 
                                                      readonly>${paymentData.pixCopiaECola}</textarea>
                                            <button class="btn btn-outline-primary" 
                                                    type="button" 
                                                    onclick="copiarPIXCode()">
                                                📋 Copiar
                                            </button>
                                        </div>
                                        <div class="d-grid gap-2">
                                            <button class="btn btn-primary" onclick="abrirAppBanco('${paymentData.pixCopiaECola}')">
                                                🔗 Abrir no App do Banco
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="alert alert-info mt-3">
                                <small>
                                    <strong>💡 Informações:</strong><br>
                                    • Pagamento processado via Sicoob PIX<br>
                                    • Status atualizado automaticamente<br>
                                    • QR Code válido por 24 horas
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            <button type="button" class="btn btn-primary" onclick="consultarStatusPagamento('${paymentData.txid}')">
                                🔄 Verificar Status
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal anterior se existir
        const modalAntigo = document.getElementById('pagamentoModal');
        if (modalAntigo) {
            modalAntigo.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('pagamentoModal'));
        modal.show();
    }
}

// Funções globais
async function consultarStatusPagamento(txid) {
    try {
        const response = await fetch(`/api/webhooks/status/${txid}`);
        const data = await response.json();
        
        if (data.status === 'ATIVA') {
            alert('⏳ Pagamento ainda não confirmado. Tente novamente em alguns instantes.');
        } else if (data.status === 'CONCLUIDA') {
            alert('✅ Pagamento confirmado com sucesso!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('pagamentoModal'));
            if (modal) modal.hide();
            // Recarregar dados do cliente
            loanSystem.consultarCliente();
        } else {
            alert(`Status: ${data.status}`);
        }
    } catch (error) {
        alert('❌ Erro ao consultar status: ' + error.message);
    }
}

function copiarPIXCode() {
    const pixCodeTextarea = document.getElementById('pixCode');
    pixCodeTextarea.select();
    pixCodeTextarea.setSelectionRange(0, 99999);
    
    try {
        navigator.clipboard.writeText(pixCodeTextarea.value);
        alert('✅ Código PIX copiado para a área de transferência!');
    } catch (err) {
        document.execCommand('copy');
        alert('✅ Código PIX copiado!');
    }
}

function abrirAppBanco(pixCopiaECola) {
    // Tentar abrir em app bancário (formato comum)
    const url = `pix://${encodeURIComponent(pixCopiaECola)}`;
    window.open(url, '_blank');
    
    // Fallback - mostrar mensagem
    alert('Se o app bancário não abrir automaticamente, cole o código PIX Copia e Cola manualmente.');
}

// Inicializar sistema quando a página carregar
let loanSystem;
document.addEventListener('DOMContentLoaded', function() {
    loanSystem = new LoanSystem();
});

// Na função de gerar PIX, adicione logs detalhados:
app.post('/api/payments/pix', async (req, res) => {
    try {
        const { cpf, emprestimoIndex, parcela } = req.body;
        console.log('📦 Dados recebidos:', { cpf, emprestimoIndex, parcela });

        // ... código existente para buscar installment ...

        console.log('🔑 Credenciais Sicoob:', {
            baseURL: SICOOB_CONFIG.baseURL,
            clientId: SICOOB_CONFIG.clientId.substring(0, 10) + '...', // não logar completo por segurança
            chavePix: SICOOB_CONFIG.chavePix
        });

        const cobrancaData = {
            calendario: {
                expiracao: 3600 // 1 hora
            },
            devedor: {
                nome: installment.cliente_nome,
                cpf: cpf.replace(/\D/g, '')
            },
            valor: {
                original: valor
            },
            chave: SICOOB_CONFIG.chavePix,
            solicitacaoPagador: `Parcela ${parcela} - Empréstimo`
        };

        console.log('📤 Enviando para Sicoob:', cobrancaData);

        try {
            // Criar cobrança no Sicoob
            const response = await sicoobClient.put(`/cob/${txid}`, cobrancaData);
            console.log('✅ Resposta Sicoob:', response.data);
            
            const cobranca = response.data;
            
            // ... resto do código ...

        } catch (sicoobError) {
            console.error('❌ ERRO SICOOB DETALHADO:');
            console.error('Status:', sicoobError.response?.status);
            console.error('Headers:', sicoobError.response?.headers);
            console.error('Data:', sicoobError.response?.data);
            console.error('Mensagem:', sicoobError.message);
            
            // Fallback local
            console.log('🔄 Usando fallback local...');
            // ... gerar PIX local
        }

    } catch (error) {
        console.error('💥 Erro geral PIX:', error);
        res.status(500).json({ error: 'Erro ao gerar pagamento PIX' });
    }
});