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
        document.getElementById('consultaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.consultarCliente();
        });

        // Formatação do CPF enquanto digita
        document.getElementById('cpf').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                e.target.value = value;
            }
        });
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

    async gerarPagamentoPIX(cpf, emprestimoIndex, parcela) {
        this.mostrarCarregamento(true);

        try {
            const response = await fetch(`${this.apiBase}/pix/cobranca`, {
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
        
        // Validação básica de CPF
        if (/^(\d)\1{10}$/.test(cpf)) return false; // CPF com todos números iguais
        
        return true;
    }

    mostrarCarregamento(mostrar) {
        const loadingElement = document.getElementById('loading');
        const formElement = document.getElementById('consultaForm');
        
        if (mostrar) {
            loadingElement.style.display = 'block';
            formElement.style.opacity = '0.5';
        } else {
            loadingElement.style.display = 'none';
            formElement.style.opacity = '1';
        }
    }

    mostrarErro(mensagem) {
        alert('Erro: ' + mensagem);
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
        cliente.emprestimos.forEach((emprestimo, index) => {
            html += `
                <div class="card mb-4">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4 class="mb-0">Empréstimo ${index + 1}</h4>
                        <span class="badge bg-primary fs-6">Valor Total: R$ ${emprestimo.valorTotal.toFixed(2)}</span>
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
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        });
        
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
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="qrcode-container">
                                        <img src="${paymentData.qrCode}" 
                                             alt="QR Code PIX" 
                                             class="img-fluid"
                                             style="max-width: 300px;"
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
                                            <a href="https://pix.sicoob.com.br/pagar/${paymentData.txid}" 
                                               class="btn btn-primary" 
                                               target="_blank">
                                               🔗 Abrir no App do Banco
                                            </a>
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
    pixCodeTextarea.setSelectionRange(0, 99999); // Para mobile
    
    try {
        const successful = navigator.clipboard.writeText(pixCodeTextarea.value);
        alert('✅ Código PIX copiado para a área de transferência!');
    } catch (err) {
        // Fallback para navegadores mais antigos
        document.execCommand('copy');
        alert('✅ Código PIX copiado!');
    }
}

// Inicializar sistema quando a página carregar
let loanSystem;
document.addEventListener('DOMContentLoaded', function() {
    loanSystem = new LoanSystem();
});

async function gerarPix() {
  const valor = parseFloat(document.getElementById("valor").value);
  const res = await fetch("/api/pix/cobranca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valor }),
  });
  const data = await res.json();
  if (data.success) {
    document.getElementById("qr").src = data.qrCode;
    document.getElementById("pixCopia").value = data.pixCopiaECola;
  } else {
    alert("Erro ao gerar PIX");
  }
}
