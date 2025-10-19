// scripts/admin.js
class AdminSystem {
    constructor() {
        this.clientes = [];
        this.init();
    }

    init() {
        this.carregarDados();
        this.bindEvents();
    }

    bindEvents() {
        // Formatação de CPF
        document.getElementById('cpf')?.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                e.target.value = value;
            }
        });

        // Formatação de telefone
        document.getElementById('telefone')?.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                e.target.value = value;
            }
        });
    }

    async carregarDados() {
        try {
            // Tentar carregar da API
            const response = await fetch('/api/admin/clientes');
            if (response.ok) {
                this.clientes = await response.json();
            } else {
                // Se API não funcionar, usar dados locais
                this.clientes = this.carregarDadosLocais();
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.clientes = this.carregarDadosLocais();
        }
        
        this.atualizarDashboard();
        this.atualizarTabelaClientes();
        this.atualizarTabelaEmprestimos();
        this.atualizarTabelaPagamentos();
        this.atualizarSelectClientes();
    }

    carregarDadosLocais() {
        // Dados de exemplo
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

    atualizarDashboard() {
        // Totais
        document.getElementById('totalClientes').textContent = this.clientes.length;
        
        const totalEmprestimos = this.clientes.reduce((total, cliente) => 
            total + (cliente.emprestimos ? cliente.emprestimos.length : 0), 0);
        document.getElementById('totalEmprestimos').textContent = totalEmprestimos;

        // Calcular pagamentos pendentes e atrasados
        let pendentes = 0;
        let atrasados = 0;

        this.clientes.forEach(cliente => {
            if (cliente.emprestimos) {
                cliente.emprestimos.forEach(emprestimo => {
                    if (emprestimo.boletos) {
                        emprestimo.boletos.forEach(boleto => {
                            if (boleto.status === 'Pendente') pendentes++;
                            if (boleto.status === 'Atrasado') atrasados++;
                        });
                    }
                });
            }
        });

        document.getElementById('totalPendentes').textContent = pendentes;
        document.getElementById('totalAtrasados').textContent = atrasados;

        // Atualizar alertas
        this.atualizarAlertas();
    }

    atualizarAlertas() {
        const alertasList = document.getElementById('alertasList');
        if (!alertasList) return;
        
        alertasList.innerHTML = '';

        const hoje = new Date();
        let alertas = [];

        // Verificar parcelas atrasadas
        this.clientes.forEach(cliente => {
            if (cliente.emprestimos) {
                cliente.emprestimos.forEach(emprestimo => {
                    if (emprestimo.boletos) {
                        emprestimo.boletos.forEach(boleto => {
                            if (boleto.status === 'Atrasado') {
                                const vencimento = new Date(boleto.vencimento.split('-').reverse().join('-'));
                                const diasAtraso = Math.ceil((hoje - vencimento) / (1000 * 60 * 60 * 24));
                                
                                alertas.push({
                                    tipo: 'danger',
                                    mensagem: `🚨 ${cliente.nome} - Parcela ${boleto.parcela} atrasada há ${diasAtraso} dias`
                                });
                            } else if (boleto.status === 'Pendente') {
                                const vencimento = new Date(boleto.vencimento.split('-').reverse().join('-'));
                                const diasParaVencer = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                                
                                if (diasParaVencer <= 3) {
                                    alertas.push({
                                        tipo: 'warning',
                                        mensagem: `⚠️ ${cliente.nome} - Parcela ${boleto.parcela} vence em ${diasParaVencer} dias`
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });

        // Limitar a 5 alertas
        alertas = alertas.slice(0, 5);

        if (alertas.length === 0) {
            alertasList.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> Nenhum alerta no momento
                </div>
            `;
        } else {
            alertas.forEach(alerta => {
                const alertElement = document.createElement('div');
                alertElement.className = `alert alert-${alerta.tipo} alert-dismissible fade show`;
                alertElement.innerHTML = `
                    ${alerta.mensagem}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                alertasList.appendChild(alertElement);
            });
        }
    }

    atualizarTabelaClientes() {
        const tbody = document.getElementById('tabelaClientes');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (this.clientes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        Nenhum cliente cadastrado
                    </td>
                </tr>
            `;
            return;
        }

        this.clientes.forEach(cliente => {
            const totalEmprestimos = cliente.emprestimos ? cliente.emprestimos.length : 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatarCPF(cliente.cpf)}</td>
                <td>${cliente.nome}</td>
                <td>${this.formatarTelefone(cliente.telefone)}</td>
                <td>${cliente.email || '-'}</td>
                <td><span class="badge bg-primary">${totalEmprestimos}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="admin.editarCliente('${cliente.cpf}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="admin.excluirCliente('${cliente.cpf}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    atualizarTabelaEmprestimos() {
        const tbody = document.getElementById('tabelaEmprestimos');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        let hasEmprestimos = false;

        this.clientes.forEach(cliente => {
            if (cliente.emprestimos) {
                cliente.emprestimos.forEach((emprestimo, index) => {
                    hasEmprestimos = true;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${cliente.nome}</td>
                        <td>R$ ${emprestimo.valorTotal.toFixed(2)}</td>
                        <td>${emprestimo.parcelas}</td>
                        <td>${emprestimo.dataContratacao || '-'}</td>
                        <td><span class="badge bg-success">Ativo</span></td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="admin.verParcelas('${cliente.cpf}', ${index})">
                                <i class="fas fa-list"></i> Parcelas
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="admin.excluirEmprestimo('${cliente.cpf}', ${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        });

        if (!hasEmprestimos) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        Nenhum empréstimo cadastrado
                    </td>
                </tr>
            `;
        }
    }

    atualizarTabelaPagamentos() {
        const tbody = document.getElementById('tabelaPagamentos');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        let hasPagamentos = false;

        this.clientes.forEach(cliente => {
            if (cliente.emprestimos) {
                cliente.emprestimos.forEach(emprestimo => {
                    if (emprestimo.boletos) {
                        emprestimo.boletos.forEach(boleto => {
                            hasPagamentos = true;
                            const diasAtraso = this.calcularDiasAtraso(boleto.vencimento);
                            const valorComJuros = this.calcularValorComJuros(boleto.valor, diasAtraso);
                            const statusClass = boleto.status === 'Pago' ? 'success' : 
                                              boleto.status === 'Atrasado' ? 'danger' : 'warning';
                            
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${cliente.nome}</td>
                                <td>${boleto.parcela}</td>
                                <td>R$ ${boleto.valor.toFixed(2)}</td>
                                <td>${boleto.vencimento}</td>
                                <td><span class="badge bg-${statusClass}">${boleto.status}</span></td>
                                <td>R$ ${valorComJuros.toFixed(2)}</td>
                                <td>
                                    ${boleto.status !== 'Pago' ? `
                                        <button class="btn btn-sm btn-success" onclick="admin.marcarComoPago('${cliente.cpf}', ${emprestimo.boletos.indexOf(boleto)})">
                                            <i class="fas fa-check"></i> Pagar
                                        </button>
                                    ` : ''}
                                </td>
                            `;
                            tbody.appendChild(row);
                        });
                    }
                });
            }
        });

        if (!hasPagamentos) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        Nenhum pagamento encontrado
                    </td>
                </tr>
            `;
        }
    }

    atualizarSelectClientes() {
        const select = document.getElementById('clienteSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um cliente</option>';
        this.clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.cpf;
            option.textContent = `${cliente.nome} (${this.formatarCPF(cliente.cpf)})`;
            select.appendChild(option);
        });
    }

    // Métodos para clientes
    abrirModalCliente(cliente = null) {
        const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
        const form = document.getElementById('formCliente');
        
        form.reset();
        
        if (cliente) {
            document.getElementById('modalClienteTitle').textContent = 'Editar Cliente';
            document.getElementById('clienteId').value = cliente.cpf;
            document.getElementById('cpf').value = cliente.cpf;
            document.getElementById('cpf').readOnly = true;
            document.getElementById('nome').value = cliente.nome;
            document.getElementById('email').value = cliente.email || '';
            document.getElementById('telefone').value = cliente.telefone;
            document.getElementById('endereco').value = cliente.endereco || '';
        } else {
            document.getElementById('modalClienteTitle').textContent = 'Novo Cliente';
            document.getElementById('cpf').readOnly = false;
        }
        
        modal.show();
    }

    async salvarCliente() {
        const form = document.getElementById('formCliente');
        
        const cliente = {
            cpf: document.getElementById('cpf').value,
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value,
            endereco: document.getElementById('endereco').value,
            emprestimos: []
        };

        // Validar CPF
        if (!this.validarCPF(cliente.cpf)) {
            alert('CPF inválido!');
            return;
        }

        try {
            // Verificar se é edição ou novo
            const clienteExistente = this.clientes.find(c => c.cpf === cliente.cpf);
            
            if (clienteExistente && !document.getElementById('clienteId').value) {
                alert('Já existe um cliente com este CPF!');
                return;
            }

            if (clienteExistente) {
                // Manter empréstimos existentes
                cliente.emprestimos = clienteExistente.emprestimos || [];
                // Atualizar
                Object.assign(clienteExistente, cliente);
            } else {
                // Adicionar novo cliente
                this.clientes.push(cliente);
            }

            // Salvar via API
            await this.salvarDados();
            
            // Recarregar dados
            await this.carregarDados();
            
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            alert('Cliente salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            alert('Erro ao salvar cliente');
        }
    }

    editarCliente(cpf) {
        const cliente = this.clientes.find(c => c.cpf === cpf);
        if (cliente) {
            this.abrirModalCliente(cliente);
        }
    }

    async excluirCliente(cpf) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                this.clientes = this.clientes.filter(c => c.cpf !== cpf);
                await this.salvarDados();
                await this.carregarDados();
                alert('Cliente excluído com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                alert('Erro ao excluir cliente');
            }
        }
    }

    // Métodos para empréstimos
    abrirModalEmprestimo(emprestimo = null) {
        const modal = new bootstrap.Modal(document.getElementById('modalEmprestimo'));
        const form = document.getElementById('formEmprestimo');
        
        form.reset();
        this.atualizarSelectClientes();
        
        if (emprestimo) {
            document.getElementById('modalEmprestimoTitle').textContent = 'Editar Empréstimo';
        } else {
            document.getElementById('modalEmprestimoTitle').textContent = 'Novo Empréstimo';
        }
        
        modal.show();
    }

    async salvarEmprestimo() {
        const clienteCpf = document.getElementById('clienteSelect').value;
        const valorTotal = parseFloat(document.getElementById('valorTotal').value);
        const parcelas = parseInt(document.getElementById('parcelas').value);
        const dataContratacao = document.getElementById('dataContratacao').value || new Date().toISOString().split('T')[0];

        if (!clienteCpf || !valorTotal || !parcelas) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        const cliente = this.clientes.find(c => c.cpf === clienteCpf);
        if (!cliente) {
            alert('Cliente não encontrado!');
            return;
        }

        try {
            // Criar boletos
            const valorParcela = valorTotal / parcelas;
            const boletos = [];
            const dataBase = new Date(dataContratacao);

            for (let i = 1; i <= parcelas; i++) {
                const dataVencimento = new Date(dataBase);
                dataVencimento.setMonth(dataVencimento.getMonth() + i);
                
                boletos.push({
                    parcela: i,
                    valor: parseFloat(valorParcela.toFixed(2)),
                    vencimento: this.formatarData(dataVencimento),
                    status: 'Pendente'
                });
            }

            const novoEmprestimo = {
                valorTotal: valorTotal,
                parcelas: parcelas,
                dataContratacao: dataContratacao,
                boletos: boletos
            };

            // Adicionar empréstimo ao cliente
            if (!cliente.emprestimos) {
                cliente.emprestimos = [];
            }
            
            cliente.emprestimos.push(novoEmprestimo);
            
            // Salvar
            await this.salvarDados();
            
            // Recarregar dados
            await this.carregarDados();
            
            bootstrap.Modal.getInstance(document.getElementById('modalEmprestimo')).hide();
            alert('Empréstimo criado com sucesso!');
        } catch (error) {
            console.error('Erro ao criar empréstimo:', error);
            alert('Erro ao criar empréstimo');
        }
    }

    // Utilitários
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

    formatarData(data) {
        return data.toLocaleDateString('pt-BR');
    }

    validarCPF(cpf) {
        return cpf.length === 11 && /^\d+$/.test(cpf);
    }

    calcularDiasAtraso(vencimentoStr) {
        const hoje = new Date();
        const vencimento = new Date(vencimentoStr.split('-').reverse().join('-'));
        const diffTime = hoje - vencimento;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    calcularValorComJuros(valorOriginal, diasAtraso) {
        if (diasAtraso <= 0) return valorOriginal;
        const juros = valorOriginal * 0.01 * diasAtraso;
        return valorOriginal + juros;
    }

    async marcarComoPago(cpf, indexBoleto) {
        const cliente = this.clientes.find(c => c.cpf === cpf);
        if (cliente && cliente.emprestimos) {
            // Encontrar o boleto em todos os empréstimos do cliente
            for (let emprestimo of cliente.emprestimos) {
                if (emprestimo.boletos && emprestimo.boletos[indexBoleto]) {
                    const boleto = emprestimo.boletos[indexBoleto];
                    boleto.status = 'Pago';
                    boleto.dataPagamento = new Date().toISOString().split('T')[0];
                    break;
                }
            }
            
            // Salvar
            await this.salvarDados();
            
            // Recarregar dados
            await this.carregarDados();
            alert('Pagamento registrado com sucesso!');
        }
    }

    verParcelas(cpf, indexEmprestimo) {
        const cliente = this.clientes.find(c => c.cpf === cpf);
        if (cliente && cliente.emprestimos && cliente.emprestimos[indexEmprestimo]) {
            const emprestimo = cliente.emprestimos[indexEmprestimo];
            let mensagem = `Parcelas do empréstimo de ${cliente.nome}:\n\n`;
            
            if (emprestimo.boletos) {
                emprestimo.boletos.forEach(boleto => {
                    mensagem += `Parcela ${boleto.parcela}: R$ ${boleto.valor.toFixed(2)} - ${boleto.vencimento} - ${boleto.status}\n`;
                });
            }
            
            alert(mensagem);
        }
    }

    async excluirEmprestimo(cpf, indexEmprestimo) {
        if (confirm('Tem certeza que deseja excluir este empréstimo?')) {
            const cliente = this.clientes.find(c => c.cpf === cpf);
            if (cliente && cliente.emprestimos) {
                cliente.emprestimos.splice(indexEmprestimo, 1);
                
                // Salvar
                await this.salvarDados();
                
                // Recarregar dados
                await this.carregarDados();
                alert('Empréstimo excluído com sucesso!');
            }
        }
    }

    async salvarDados() {
        try {
            const response = await fetch('/api/admin/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.clientes)
            });

            if (!response.ok) {
                throw new Error('Erro ao salvar dados');
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            // Fallback para localStorage
            localStorage.setItem('clientesData', JSON.stringify(this.clientes));
        }
    }
}

// Função de logout global
function logout() {
    if (confirm('Deseja realmente sair da área administrativa?')) {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('adminUser');
        window.location.href = 'login.html';
    }
}

// Funções globais para o HTML
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionName).style.display = 'block';
    
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

function abrirModalCliente() {
    admin.abrirModalCliente();
}

function abrirModalEmprestimo() {
    admin.abrirModalEmprestimo();
}

function salvarCliente() {
    admin.salvarCliente();
}

function salvarEmprestimo() {
    admin.salvarEmprestimo();
}

// Inicializar sistema
let admin;
document.addEventListener('DOMContentLoaded', function() {
    admin = new AdminSystem();
});