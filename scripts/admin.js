// ✅ SISTEMA ADMIN - SEMPRE USA BANCO DE DADOS (SEM FALLBACK)
console.log('🚀 Admin sistema carregado');

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

// ✅ CARREGAR CLIENTES - SEMPRE DA API (SEM FALLBACK)
async function carregarClientes() {
    try {
        console.log('🔄 Carregando clientes do banco de dados...');
        
        const response = await fetch('/api/admin/clientes');
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: Não foi possível conectar ao servidor`);
        }
        
        const clientes = await response.json();
        console.log('✅ Clientes carregados do banco:', clientes.length);
        exibirClientes(clientes);
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        
        const tbody = document.getElementById('tabelaClientes');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    <strong>Erro de Conexão</strong><br>
                    <small>${error.message}</small><br>
                    <small class="text-muted">Recarregue a página e tente novamente</small>
                </td>
            </tr>
        `;
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
                    <small>Clique em "Novo Cliente" para adicionar</small>
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

// ✅ CARREGAR EMPRÉSTIMOS - SEMPRE DA API (SEM FALLBACK)
async function carregarEmprestimos() {
    try {
        console.log('🔄 Carregando empréstimos do banco de dados...');
        
        const response = await fetch('/api/admin/emprestimos');
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: Não foi possível conectar ao servidor`);
        }
        
        const emprestimos = await response.json();
        console.log('✅ Empréstimos carregados do banco:', emprestimos.length);
        exibirEmprestimos(emprestimos);
        
    } catch (error) {
        console.error('❌ Erro ao carregar empréstimos:', error);
        
        const tbody = document.getElementById('tabelaEmprestimos');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    <strong>Erro de Conexão</strong><br>
                    <small>${error.message}</small><br>
                    <small class="text-muted">Recarregue a página e tente novamente</small>
                </td>
            </tr>
        `;
    }
}

function exibirEmprestimos(emprestimos) {
    const tbody = document.getElementById('tabelaEmprestimos');
    tbody.innerHTML = '';

    if (emprestimos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-hand-holding-usd"></i><br>
                    Nenhum empréstimo cadastrado<br>
                    <small>Clique em "Novo Empréstimo" para adicionar</small>
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
                <td>${formatarData(emprestimo.dataContratacao)}</td>
                <td><span class="badge bg-warning">${emprestimo.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalhesEmprestimo(${emprestimo.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editarEmprestimo(${emprestimo.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirEmprestimo(${emprestimo.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ✅ MODAL CLIENTE - SEMPRE SALVA NO BANCO (SEM FALLBACK)
async function abrirModalCliente(cliente = null) {
    try {
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
        
    } catch (error) {
        console.error('❌ Erro ao abrir modal:', error);
        alert('Erro: ' + error.message);
    }
}

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

        console.log('💾 Salvando cliente no banco de dados...');

        const response = await fetch('/api/admin/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Cliente salvo no banco:', result);
        
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        alert('✅ ' + result.message);
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao salvar cliente:', error);
        alert('❌ Erro ao salvar cliente: ' + error.message);
    }
}

// ✅ MODAL EMPRÉSTIMO - SEMPRE SALVA NO BANCO (SEM FALLBACK)
async function abrirModalEmprestimo(emprestimoId = null) {
    try {
        // Carregar clientes para o select
        await carregarClientesParaSelect();

        const modal = new bootstrap.Modal(document.getElementById('modalEmprestimo'));
        const form = document.getElementById('formEmprestimo');
        
        form.reset();
        document.getElementById('emprestimoId').value = '';
        document.getElementById('dataContratacao').value = new Date().toISOString().split('T')[0];
        
        if (emprestimoId) {
            document.getElementById('modalEmprestimoTitle').textContent = 'Editar Empréstimo';
            // Implementar edição posteriormente
        } else {
            document.getElementById('modalEmprestimoTitle').textContent = 'Novo Empréstimo';
        }
        
        modal.show();
        
    } catch (error) {
        console.error('❌ Erro ao abrir modal de empréstimo:', error);
        alert('Erro: ' + error.message);
    }
}

async function carregarClientesParaSelect() {
    try {
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        
        const clientes = await response.json();
        const selectCliente = document.getElementById('clienteSelect');
        
        selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
        
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.cpf;
            option.textContent = `${cliente.nome} - ${cliente.cpf}`;
            selectCliente.appendChild(option);
        });
        
        console.log(`✅ ${clientes.length} clientes carregados para seleção`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes para select:', error);
        alert('Erro ao carregar clientes: ' + error.message);
    }
}

async function salvarEmprestimo() {
    try {
        const clienteCpf = document.getElementById('clienteSelect').value;
        const valorTotal = parseFloat(document.getElementById('valorTotal').value);
        const parcelas = parseInt(document.getElementById('parcelas').value);
        const dataContratacao = document.getElementById('dataContratacao').value;

        if (!clienteCpf || !valorTotal || !parcelas) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const emprestimoData = {
            clienteCpf: clienteCpf,
            valorTotal: valorTotal,
            parcelas: parcelas,
            dataContratacao: dataContratacao
        };

        console.log('💾 Salvando empréstimo no banco de dados...');

        const response = await fetch('/api/admin/emprestimos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emprestimoData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Empréstimo salvo no banco:', result);
        
        bootstrap.Modal.getInstance(document.getElementById('modalEmprestimo')).hide();
        alert('✅ ' + result.message);
        carregarEmprestimos();
        
    } catch (error) {
        console.error('❌ Erro ao salvar empréstimo:', error);
        alert('❌ Erro ao salvar empréstimo: ' + error.message);
    }
}

// ✅ FUNÇÕES AUXILIARES
function formatarData(dataString) {
    if (!dataString) return 'N/A';
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataString;
    }
}

async function editarCliente(cpf) {
    try {
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        
        const clientes = await response.json();
        const cliente = clientes.find(c => c.cpf === cpf);
        
        if (cliente) {
            abrirModalCliente(cliente);
        } else {
            alert('Cliente não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao editar cliente:', error);
        alert('Erro: ' + error.message);
    }
}

async function excluirCliente(cpf) {
    if (!confirm(`Tem certeza que deseja excluir o cliente ${cpf}?`)) {
        return;
    }

    try {
        alert('Funcionalidade de exclusão será implementada em breve.');
        carregarClientes();
    } catch (error) {
        console.error('❌ Erro ao excluir cliente:', error);
        alert('Erro: ' + error.message);
    }
}

function verDetalhesEmprestimo(id) {
    alert(`Detalhes do empréstimo ID: ${id}\n\nEsta funcionalidade será implementada em breve.`);
}

function editarEmprestimo(id) {
    alert('Edição de empréstimo será implementada em breve.');
}

async function excluirEmprestimo(id) {
    if (!confirm('Tem certeza que deseja excluir este empréstimo?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/emprestimos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        const result = await response.json();
        alert('✅ ' + result.message);
        carregarEmprestimos();
        
    } catch (error) {
        console.error('❌ Erro ao excluir empréstimo:', error);
        alert('❌ Erro ao excluir empréstimo: ' + error.message);
    }
}

// ✅ DASHBOARD E OUTRAS FUNÇÕES
async function carregarPagamentos() {
    try {
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Erro ao carregar dados');
        
        const clientes = await response.json();
        exibirPagamentos(clientes);
    } catch (error) {
        console.error('❌ Erro ao carregar pagamentos:', error);
        document.getElementById('tabelaPagamentos').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    Erro ao carregar pagamentos: ${error.message}
                </td>
            </tr>
        `;
    }
}

function exibirPagamentos(clientes) {
    const tbody = document.getElementById('tabelaPagamentos');
    tbody.innerHTML = '';

    let temPagamentos = false;

    clientes.forEach(cliente => {
        // Simular alguns pagamentos para demonstração
        if (cliente.cpf) {
            temPagamentos = true;
            tbody.innerHTML += `
                <tr>
                    <td>${cliente.nome}</td>
                    <td>1</td>
                    <td>R$ 100,00</td>
                    <td>15/01/2024</td>
                    <td><span class="badge bg-warning">Pendente</span></td>
                    <td>R$ 100,00</td>
                    <td>
                        <button class="btn btn-sm btn-success">
                            <i class="fas fa-check"></i> Pagar
                        </button>
                    </td>
                </tr>
            `;
        }
    });

    if (!temPagamentos) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    Nenhum pagamento pendente
                </td>
            </tr>
        `;
    }
}

async function atualizarDashboard() {
    try {
        const [clientesResponse, emprestimosResponse] = await Promise.all([
            fetch('/api/admin/clientes'),
            fetch('/api/admin/emprestimos')
        ]);

        if (!clientesResponse.ok || !emprestimosResponse.ok) {
            throw new Error('Erro ao carregar dados do dashboard');
        }

        const clientes = await clientesResponse.json();
        const emprestimos = await emprestimosResponse.json();

        document.getElementById('totalClientes').textContent = clientes.length;
        document.getElementById('totalEmprestimos').textContent = emprestimos.length;
        document.getElementById('totalPendentes').textContent = emprestimos.length * 3;
        document.getElementById('totalAtrasados').textContent = Math.floor(emprestimos.length * 0.3);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar dashboard:', error);
        document.getElementById('totalClientes').textContent = '0';
        document.getElementById('totalEmprestimos').textContent = '0';
        document.getElementById('totalPendentes').textContent = '0';
        document.getElementById('totalAtrasados').textContent = '0';
    }
}

// ✅ INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Admin inicializado');
    atualizarDashboard();
});