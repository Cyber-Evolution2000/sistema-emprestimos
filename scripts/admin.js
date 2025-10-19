// ✅ SISTEMA ADMIN CONECTADO À API - BANCO DE DADOS COMPARTILHADO

let clientes = [];
let emprestimos = [];

// Funções de Navegação
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

// ✅ CARREGAR DADOS DA API
async function carregarClientes() {
    try {
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        
        clientes = await response.json();
        exibirClientes();
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        alert('Erro ao carregar clientes: ' + error.message);
    }
}

async function carregarEmprestimos() {
    try {
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Erro ao carregar empréstimos');
        
        clientes = await response.json();
        exibirEmprestimos();
    } catch (error) {
        console.error('❌ Erro ao carregar empréstimos:', error);
        alert('Erro ao carregar empréstimos: ' + error.message);
    }
}

async function carregarPagamentos() {
    try {
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Erro ao carregar pagamentos');
        
        clientes = await response.json();
        exibirPagamentos();
    } catch (error) {
        console.error('❌ Erro ao carregar pagamentos:', error);
        alert('Erro ao carregar pagamentos: ' + error.message);
    }
}

// ✅ EXIBIR DADOS
function exibirClientes() {
    const tbody = document.getElementById('tabelaClientes');
    tbody.innerHTML = '';

    clientes.forEach(cliente => {
        const totalEmprestimos = cliente.emprestimos ? cliente.emprestimos.length : 0;
        
        const row = `
            <tr>
                <td>${cliente.cpf}</td>
                <td><strong>${cliente.nome}</strong></td>
                <td>${cliente.telefone || 'N/A'}</td>
                <td>${cliente.email || 'N/A'}</td>
                <td><span class="badge bg-primary">${totalEmprestimos}</span></td>
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

function exibirEmprestimos() {
    const tbody = document.getElementById('tabelaEmprestimos');
    tbody.innerHTML = '';

    clientes.forEach(cliente => {
        if (cliente.emprestimos) {
            cliente.emprestimos.forEach(emprestimo => {
                const row = `
                    <tr>
                        <td><strong>${cliente.nome}</strong><br><small>${cliente.cpf}</small></td>
                        <td>R$ ${parseFloat(emprestimo.valorTotal).toFixed(2)}</td>
                        <td>${emprestimo.parcelas}</td>
                        <td>${emprestimo.dataContratacao || 'N/A'}</td>
                        <td><span class="badge bg-success">Ativo</span></td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="editarEmprestimo(${emprestimo.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }
    });
}

function exibirPagamentos() {
    const tbody = document.getElementById('tabelaPagamentos');
    tbody.innerHTML = '';

    clientes.forEach(cliente => {
        if (cliente.emprestimos) {
            cliente.emprestimos.forEach(emprestimo => {
                if (emprestimo.boletos) {
                    emprestimo.boletos.forEach(parcela => {
                        const valorAtual = parcela.valorAtualizado || parcela.valor;
                        const statusClass = parcela.status === 'Pago' ? 'success' : 
                                          parcela.status === 'Atrasado' ? 'danger' : 'warning';
                        
                        const row = `
                            <tr>
                                <td><strong>${cliente.nome}</strong><br><small>${cliente.cpf}</small></td>
                                <td>${parcela.parcela}</td>
                                <td>R$ ${parseFloat(parcela.valor).toFixed(2)}</td>
                                <td>${parcela.vencimento}</td>
                                <td><span class="badge bg-${statusClass}">${parcela.status}</span></td>
                                <td class="valor-atualizado">R$ ${parseFloat(valorAtual).toFixed(2)}</td>
                                <td>
                                    ${parcela.status !== 'Pago' ? `
                                        <button class="btn btn-sm btn-success" onclick="marcarComoPago('${cliente.cpf}', ${parcela.parcela})">
                                            <i class="fas fa-check"></i> Pagar
                                        </button>
                                    ` : '✅ Pago'}
                                </td>
                            </tr>
                        `;
                        tbody.innerHTML += row;
                    });
                }
            });
        }
    });
}

// ✅ MODAL CLIENTE
function abrirModalCliente(cliente = null) {
    const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
    const form = document.getElementById('formCliente');
    
    form.reset();
    document.getElementById('clienteId').value = '';
    
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

async function salvarCliente() {
    const form = document.getElementById('formCliente');
    const formData = new FormData(form);
    
    const clienteData = {
        cpf: document.getElementById('cpf').value,
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        emprestimos: []
    };
    
    try {
        const response = await fetch('/api/admin/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        });
        
        if (!response.ok) throw new Error('Erro ao salvar cliente');
        
        const result = await response.json();
        
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        alert('✅ Cliente salvo com sucesso!');
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao salvar cliente:', error);
        alert('Erro ao salvar cliente: ' + error.message);
    }
}

function editarCliente(cpf) {
    const cliente = clientes.find(c => c.cpf === cpf);
    if (cliente) {
        abrirModalCliente(cliente);
    }
}

async function excluirCliente(cpf) {
    if (confirm(`Tem certeza que deseja excluir o cliente ${cpf}?`)) {
        // Implementar exclusão se necessário
        alert('Funcionalidade de exclusão será implementada em breve.');
    }
}

// ✅ DASHBOARD
async function atualizarDashboard() {
    try {
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Erro ao carregar dados do dashboard');
        
        const clientesData = await response.json();
        
        let totalClientes = clientesData.length;
        let totalEmprestimos = 0;
        let totalPendentes = 0;
        let totalAtrasados = 0;
        
        clientesData.forEach(cliente => {
            if (cliente.emprestimos) {
                totalEmprestimos += cliente.emprestimos.length;
                
                cliente.emprestimos.forEach(emp => {
                    if (emp.boletos) {
                        emp.boletos.forEach(parcela => {
                            if (parcela.status === 'Pendente') totalPendentes++;
                            if (parcela.status === 'Atrasado') totalAtrasados++;
                        });
                    }
                });
            }
        });
        
        document.getElementById('totalClientes').textContent = totalClientes;
        document.getElementById('totalEmprestimos').textContent = totalEmprestimos;
        document.getElementById('totalPendentes').textContent = totalPendentes;
        document.getElementById('totalAtrasados').textContent = totalAtrasados;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar dashboard:', error);
    }
}

// ✅ INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Admin inicializado');
    atualizarDashboard();
});

// Funções para empréstimos (para implementar depois)
function abrirModalEmprestimo() {
    alert('Funcionalidade de empréstimos será implementada em breve.');
}

function salvarEmprestimo() {
    alert('Funcionalidade de empréstimos será implementada em breve.');
}

function marcarComoPago(cpf, parcela) {
    alert(`Funcionalidade de marcar como pago será implementada para CPF: ${cpf}, Parcela: ${parcela}`);
}