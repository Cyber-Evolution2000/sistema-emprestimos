// ✅ SISTEMA ADMIN - BANCO DE DADOS APENAS (ZERO FALLBACK)
console.log('🔒 Admin sistema carregado - MODO BANCO DE DADOS APENAS');

// ✅ FUNÇÕES DE NAVEGAÇÃO
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (sectionId === 'clientes') {
        carregarClientes();
    } else if (sectionId === 'emprestimos') {
        carregarEmprestimos();
    } else if (sectionId === 'pagamentos') {
        carregarPagamentos();
    } else if (sectionId === 'dashboard') {
        atualizarDashboard();
    }
}

// ✅ CARREGAR CLIENTES - BANCO APENAS
async function carregarClientes() {
    try {
        console.log('🔄 Buscando clientes do PostgreSQL...');
        
        const response = await fetch('/api/admin/clientes');
        
        if (response.status === 503) {
            throw new Error('Servidor indisponível. Tente novamente.');
        }
        
        if (!response.ok) {
            throw new Error(`Falha na conexão: ${response.status}`);
        }
        
        const clientes = await response.json();
        console.log(`✅ Clientes carregados do PostgreSQL: ${clientes.length}`);
        exibirClientes(clientes);
        
    } catch (error) {
        console.error('💥 Erro ao carregar clientes:', error);
        
        const tbody = document.getElementById('tabelaClientes');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="fas fa-database"></i><br>
                    <strong>Falha na Conexão</strong><br>
                    <small>${error.message}</small><br>
                    <small class="text-muted">Verifique se o servidor está online</small>
                </td>
            </tr>
        `;
        
        alert('🚨 ' + error.message);
    }
}

function exibirClientes(clientes) {
    const tbody = document.getElementById('tabelaClientes');
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-users"></i><br>
                    Nenhum cliente cadastrado<br>
                    <small>Use o botão "Novo Cliente" para começar</small>
                </td>
            </tr>
        `;
        return;
    }

    clientes.forEach(cliente => {
        const row = `
            <tr>
                <td>${cliente.cpf}</td>
                <td><strong>${cliente.nome}</strong></td>
                <td>${cliente.telefone || 'N/A'}</td>
                <td>${cliente.email || 'N/A'}</td>
                <td><span class="badge bg-primary">0</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editarCliente('${cliente.cpf}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirCliente('${cliente.cpf}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ✅ SALVAR CLIENTE - BANCO APENAS
async function salvarCliente() {
    try {
        const cpf = document.getElementById('cpf').value;
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;

        if (!cpf || !nome || !telefone) {
            alert('Por favor, preencha CPF, nome e telefone.');
            return;
        }

        const clienteData = {
            cpf: cpf,
            nome: nome,
            email: email,
            telefone: telefone,
            endereco: endereco
        };

        console.log('💾 Enviando cliente para o PostgreSQL...');

        const response = await fetch('/api/admin/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha ao salvar: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Cliente salvo no PostgreSQL:', result);
        
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        alert('✅ ' + result.message);
        carregarClientes();
        
    } catch (error) {
        console.error('💥 Erro ao salvar cliente:', error);
        alert('💥 Erro ao salvar cliente: ' + error.message);
    }
}

// ✅ OUTRAS FUNÇÕES BÁSICAS
async function carregarEmprestimos() {
    try {
        console.log('🔄 Buscando empréstimos do PostgreSQL...');
        
        const response = await fetch('/api/admin/emprestimos');
        
        if (!response.ok) {
            throw new Error(`Falha na conexão: ${response.status}`);
        }
        
        const emprestimos = await response.json();
        console.log(`✅ Empréstimos carregados: ${emprestimos.length}`);
        
        const tbody = document.getElementById('tabelaEmprestimos');
        tbody.innerHTML = '';

        if (emprestimos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        Nenhum empréstimo cadastrado
                    </td>
                </tr>
            `;
            return;
        }

        emprestimos.forEach(emprestimo => {
            const row = `
                <tr>
                    <td>
                        <strong>${emprestimo.cliente.nome}</strong><br>
                        <small class="text-muted">${emprestimo.cliente.cpf}</small>
                    </td>
                    <td>R$ ${emprestimo.valorTotal.toFixed(2)}</td>
                    <td>${emprestimo.parcelas}</td>
                    <td>${emprestimo.dataContratacao}</td>
                    <td><span class="badge bg-warning">${emprestimo.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('💥 Erro ao carregar empréstimos:', error);
        
        const tbody = document.getElementById('tabelaEmprestimos');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    <strong>Falha na Conexão</strong><br>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

function abrirModalCliente(cliente = null) {
    const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
    const form = document.getElementById('formCliente');
    
    form.reset();
    
    if (cliente) {
        document.getElementById('modalClienteTitle').textContent = 'Editar Cliente';
        document.getElementById('cpf').value = cliente.cpf;
        document.getElementById('nome').value = cliente.nome;
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('telefone').value = cliente.telefone || '';
        document.getElementById('endereco').value = cliente.endereco || '';
        document.getElementById('cpf').readOnly = true;
    } else {
        document.getElementById('modalClienteTitle').textContent = 'Novo Cliente';
        document.getElementById('cpf').readOnly = false;
    }
    
    modal.show();
}

// ✅ ABRIR MODAL DE EMPRÉSTIMO
function abrirModalEmprestimo() {
    const modal = new bootstrap.Modal(document.getElementById('modalEmprestimo'));
    const form = document.getElementById('formEmprestimo');
    
    form.reset();
    document.getElementById('modalEmprestimoTitle').textContent = 'Novo Empréstimo';
    
    // Carregar lista de clientes para o select
    carregarClientesParaSelect();
    
    modal.show();
}

// ✅ CARREGAR CLIENTES PARA SELECT
async function carregarClientesParaSelect() {
    try {
        const response = await fetch('/api/admin/clientes');
        
        if (!response.ok) {
            throw new Error('Falha ao carregar clientes');
        }
        
        const clientes = await response.json();
        const select = document.getElementById('clienteSelect');
        
        select.innerHTML = '<option value="">Selecione um cliente</option>';
        
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.cpf;
            option.textContent = `${cliente.nome} - ${cliente.cpf}`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        alert('Erro ao carregar lista de clientes');
    }
}

// ✅ CALCULAR PARCELAS AUTOMATICAMENTE
function calcularParcelas() {
    const valorTotal = parseFloat(document.getElementById('valorTotal').value) || 0;
    const parcelas = parseInt(document.getElementById('numeroParcelas').value) || 1;
    
    if (valorTotal > 0 && parcelas > 0) {
        const valorParcela = valorTotal / parcelas;
        document.getElementById('valorParcela').value = valorParcela.toFixed(2);
        
        // Gerar datas de vencimento
        gerarDatasVencimento(parcelas);
    }
}

// ✅ GERAR DATAS DE VENCIMENTO
function gerarDatasVencimento(parcelas) {
    const dataContainer = document.getElementById('datasVencimento');
    dataContainer.innerHTML = '';
    
    const dataBase = new Date();
    dataBase.setMonth(dataBase.getMonth() + 1); // Primeiro vencimento em 1 mês
    dataBase.setDate(10); // Vencimento no dia 10
    
    for (let i = 1; i <= parcelas; i++) {
        const dataVencimento = new Date(dataBase);
        dataVencimento.setMonth(dataBase.getMonth() + (i - 1));
        
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = `
            <label class="form-label small">Parcela ${i}:</label>
            <input type="date" class="form-control form-control-sm" 
                   value="${dataVencimento.toISOString().split('T')[0]}" 
                   readonly>
        `;
        dataContainer.appendChild(div);
    }
}

// ✅ SALVAR EMPRÉSTIMO
async function salvarEmprestimo() {
    try {
        const clienteCpf = document.getElementById('clienteSelect').value;
        const valorTotal = document.getElementById('valorTotal').value;
        const numeroParcelas = document.getElementById('numeroParcelas').value;
        const taxaJuros = document.getElementById('taxaJuros').value || 0;
        const observacoes = document.getElementById('observacoesEmprestimo').value;
        
        if (!clienteCpf || !valorTotal || !numeroParcelas) {
            alert('Por favor, preencha cliente, valor total e número de parcelas.');
            return;
        }
        
        const emprestimoData = {
            cliente_cpf: clienteCpf,
            valor_total: parseFloat(valorTotal),
            parcelas: parseInt(numeroParcelas),
            taxa_juros: parseFloat(taxaJuros),
            observacoes: observacoes
        };
        
        console.log('💾 Salvando empréstimo...', emprestimoData);
        
        const response = await fetch('/api/admin/emprestimos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emprestimoData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha ao salvar: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Empréstimo salvo:', result);
        
        bootstrap.Modal.getInstance(document.getElementById('modalEmprestimo')).hide();
        alert('✅ ' + result.message);
        carregarEmprestimos();
        
    } catch (error) {
        console.error('💥 Erro ao salvar empréstimo:', error);
        alert('💥 Erro ao salvar empréstimo: ' + error.message);
    }
}

function carregarPagamentos() {
    document.getElementById('tabelaPagamentos').innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">
                Módulo de pagamentos em desenvolvimento
            </td>
        </tr>
    `;
}

function atualizarDashboard() {
    document.getElementById('totalClientes').textContent = '0';
    document.getElementById('totalEmprestimos').textContent = '0';
    document.getElementById('totalPendentes').textContent = '0';
    document.getElementById('totalAtrasados').textContent = '0';
}

function editarCliente(cpf) {
    alert('Edição em desenvolvimento para CPF: ' + cpf);
}

function excluirCliente(cpf) {
    alert('Exclusão em desenvolvimento para CPF: ' + cpf);
}

// ✅ INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Sistema admin inicializado - BANCO DE DADOS APENAS');
    atualizarDashboard();
});

// ✅ DEBUG DO MODAL
function debugModal() {
    console.log('🔍 Debug do Modal:');
    console.log('- Modal element:', document.getElementById('modalEmprestimo'));
    console.log('- Bootstrap:', typeof bootstrap);
    console.log('- Modal class:', bootstrap?.Modal);
    
    const modalElement = document.getElementById('modalEmprestimo');
    if (modalElement) {
        console.log('- Modal encontrado');
        const modal = new bootstrap.Modal(modalElement);
        console.log('- Modal instance:', modal);
        return modal;
    } else {
        console.error('❌ Modal não encontrado!');
        return null;
    }
}

// ✅ VERSÃO CORRIGIDA - ABRIR MODAL DE EMPRÉSTIMO
function abrirModalEmprestimo() {
    console.log('🔄 Abrindo modal de empréstimo...');
    
    const modalElement = document.getElementById('modalEmprestimo');
    if (!modalElement) {
        console.error('❌ Modal não encontrado! Verifique o HTML.');
        alert('Erro: Modal não encontrado. Recarregue a página.');
        return;
    }
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        
        // Resetar formulário
        const form = document.getElementById('formEmprestimo');
        if (form) form.reset();
        
        // Atualizar título
        const title = document.getElementById('modalEmprestimoTitle');
        if (title) title.textContent = 'Novo Empréstimo';
        
        // Carregar clientes
        carregarClientesParaSelect();
        
        // Mostrar modal
        modal.show();
        console.log('✅ Modal aberto com sucesso!');
        
    } catch (error) {
        console.error('💥 Erro ao abrir modal:', error);
        alert('Erro ao abrir formulário: ' + error.message);
    }
}