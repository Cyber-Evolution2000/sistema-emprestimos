// ✅ SISTEMA ADMIN - VERSÃO ROBUSTA COM FALLBACKS
console.log('🚀 Admin sistema carregado');

// Dados em memória como fallback
let clientesData = [];
let emprestimosData = [];

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

// ✅ CARREGAR CLIENTES - COM FALLBACK
async function carregarClientes() {
    try {
        console.log('🔄 Carregando clientes...');
        
        const response = await fetch('/api/admin/clientes');
        
        if (response.ok) {
            clientesData = await response.json();
            console.log('✅ Clientes carregados da API:', clientesData.length);
            exibirClientes(clientesData);
        } else {
            throw new Error(`API retornou status ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes da API:', error);
        
        // Fallback: usar dados em memória
        if (clientesData.length === 0) {
            // Tentar carregar do localStorage como último recurso
            const clientesSalvos = localStorage.getItem('clientesAdmin');
            if (clientesSalvos) {
                clientesData = JSON.parse(clientesSalvos);
                console.log('📦 Clientes carregados do localStorage:', clientesData.length);
            }
        }
        
        exibirClientes(clientesData);
        
        // Mostrar aviso
        const tbody = document.getElementById('tabelaClientes');
        if (clientesData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        Erro ao carregar clientes<br>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        } else {
            // Adicionar aviso no topo
            const aviso = document.createElement('tr');
            aviso.innerHTML = `
                <td colspan="6" class="text-center text-warning bg-light">
                    <small><i class="fas fa-info-circle"></i> Modo offline - dados em memória</small>
                </td>
            `;
            tbody.insertBefore(aviso, tbody.firstChild);
        }
    }
}

function exibirClientes(clientes) {
    const tbody = document.getElementById('tabelaClientes');
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    Nenhum cliente cadastrado
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

// ✅ CARREGAR EMPRÉSTIMOS - COM FALLBACK
async function carregarEmprestimos() {
    try {
        console.log('🔄 Carregando empréstimos...');
        
        const response = await fetch('/api/admin/emprestimos');
        
        if (response.ok) {
            emprestimosData = await response.json();
            console.log('✅ Empréstimos carregados da API:', emprestimosData.length);
            exibirEmprestimos(emprestimosData);
        } else {
            throw new Error(`API retornou status ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar empréstimos da API:', error);
        
        // Fallback: usar dados em memória
        if (emprestimosData.length === 0) {
            const emprestimosSalvos = localStorage.getItem('emprestimosAdmin');
            if (emprestimosSalvos) {
                emprestimosData = JSON.parse(emprestimosSalvos);
                console.log('📦 Empréstimos carregados do localStorage:', emprestimosData.length);
            }
        }
        
        exibirEmprestimos(emprestimosData);
        
        // Mostrar aviso
        const tbody = document.getElementById('tabelaEmprestimos');
        if (emprestimosData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        Erro ao carregar empréstimos<br>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        } else {
            const aviso = document.createElement('tr');
            aviso.innerHTML = `
                <td colspan="6" class="text-center text-warning bg-light">
                    <small><i class="fas fa-info-circle"></i> Modo offline - dados em memória</small>
                </td>
            `;
            tbody.insertBefore(aviso, tbody.firstChild);
        }
    }
}

function exibirEmprestimos(emprestimos) {
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

// ✅ MODAL CLIENTE
async function abrirModalCliente(cliente = null) {
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

        // Tentar salvar na API
        try {
            const response = await fetch('/api/admin/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clienteData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('✅ ' + result.message);
            } else {
                throw new Error('API offline');
            }
        } catch (apiError) {
            // Fallback: salvar localmente
            console.log('📦 Salvando cliente localmente:', apiError.message);
            
            const index = clientesData.findIndex(c => c.cpf === cpf);
            if (index >= 0) {
                clientesData[index] = clienteData;
            } else {
                clientesData.push(clienteData);
            }
            
            // Salvar no localStorage
            localStorage.setItem('clientesAdmin', JSON.stringify(clientesData));
            
            alert('✅ Cliente salvo localmente (modo offline)');
        }

        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao salvar cliente:', error);
        alert('Erro ao salvar cliente: ' + error.message);
    }
}

// ✅ MODAL EMPRÉSTIMO
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
    const selectCliente = document.getElementById('clienteSelect');
    selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
    
    // Usar dados em memória (já carregados)
    clientesData.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.cpf;
        option.textContent = `${cliente.nome} - ${cliente.cpf}`;
        selectCliente.appendChild(option);
    });
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

        // Tentar salvar na API
        try {
            const response = await fetch('/api/admin/emprestimos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emprestimoData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('✅ ' + result.message);
            } else {
                throw new Error('API offline');
            }
        } catch (apiError) {
            // Fallback: salvar localmente
            console.log('📦 Salvando empréstimo localmente:', apiError.message);
            
            const cliente = clientesData.find(c => c.cpf === clienteCpf);
            const novoEmprestimo = {
                id: Date.now(), // ID temporário
                cliente: {
                    nome: cliente ? cliente.nome : 'Cliente Desconhecido',
                    cpf: clienteCpf
                },
                valorTotal: valorTotal,
                parcelas: parcelas,
                dataContratacao: dataContratacao,
                status: 'Em andamento'
            };
            
            emprestimosData.push(novoEmprestimo);
            localStorage.setItem('emprestimosAdmin', JSON.stringify(emprestimosData));
            
            alert('✅ Empréstimo salvo localmente (modo offline)');
        }

        bootstrap.Modal.getInstance(document.getElementById('modalEmprestimo')).hide();
        carregarEmprestimos();
        
    } catch (error) {
        console.error('❌ Erro ao salvar empréstimo:', error);
        alert('Erro ao salvar empréstimo: ' + error.message);
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

function editarCliente(cpf) {
    const cliente = clientesData.find(c => c.cpf === cpf);
    if (cliente) {
        abrirModalCliente(cliente);
    }
}

function excluirCliente(cpf) {
    if (confirm(`Tem certeza que deseja excluir o cliente ${cpf}?`)) {
        clientesData = clientesData.filter(c => c.cpf !== cpf);
        localStorage.setItem('clientesAdmin', JSON.stringify(clientesData));
        carregarClientes();
        alert('✅ Cliente excluído');
    }
}

function verDetalhesEmprestimo(id) {
    const emprestimo = emprestimosData.find(e => e.id === id);
    if (emprestimo) {
        alert(`Detalhes do Empréstimo:\n\nCliente: ${emprestimo.cliente.nome}\nValor: R$ ${emprestimo.valorTotal.toFixed(2)}\nParcelas: ${emprestimo.parcelas}\nStatus: ${emprestimo.status}`);
    }
}

function editarEmprestimo(id) {
    alert('Edição de empréstimo será implementada em breve.');
}

function excluirEmprestimo(id) {
    if (confirm('Tem certeza que deseja excluir este empréstimo?')) {
        emprestimosData = emprestimosData.filter(e => e.id !== id);
        localStorage.setItem('emprestimosAdmin', JSON.stringify(emprestimosData));
        carregarEmprestimos();
        alert('✅ Empréstimo excluído');
    }
}

// ✅ DASHBOARD E OUTRAS FUNÇÕES
function carregarPagamentos() {
    document.getElementById('tabelaPagamentos').innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">
                Funcionalidade em desenvolvimento
            </td>
        </tr>
    `;
}

function atualizarDashboard() {
    document.getElementById('totalClientes').textContent = clientesData.length;
    document.getElementById('totalEmprestimos').textContent = emprestimosData.length;
    document.getElementById('totalPendentes').textContent = '0';
    document.getElementById('totalAtrasados').textContent = '0';
}

// ✅ INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Admin inicializado');
    atualizarDashboard();
    
    // Carregar dados salvos localmente
    const clientesSalvos = localStorage.getItem('clientesAdmin');
    if (clientesSalvos) {
        clientesData = JSON.parse(clientesSalvos);
    }
    
    const emprestimosSalvos = localStorage.getItem('emprestimosAdmin');
    if (emprestimosSalvos) {
        emprestimosData = JSON.parse(emprestimosSalvos);
    }
});