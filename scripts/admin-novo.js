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

// ✅ FUNÇÃO CORRIGIDA - EXIBIR CLIENTES SEM DUPLICAÇÃO
async function exibirClientes(clientes) {
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

    // ✅ BUSCAR TODOS OS EMPRÉSTIMOS UMA ÚNICA VEZ
    let todosEmprestimos = [];
    try {
        const response = await fetch('/api/admin/emprestimos');
        if (response.ok) {
            todosEmprestimos = await response.json();
        }
    } catch (error) {
        console.error('Erro ao buscar empréstimos:', error);
    }

    // ✅ CONTAR EMPRÉSTIMOS POR CLIENTE
    const contagemEmprestimos = {};
    todosEmprestimos.forEach(emprestimo => {
        const cpf = emprestimo.cliente_cpf;
        contagemEmprestimos[cpf] = (contagemEmprestimos[cpf] || 0) + 1;
    });

    // ✅ EXIBIR CLIENTES COM CONTAGEM CORRETA
    clientes.forEach(cliente => {
        const totalEmprestimos = contagemEmprestimos[cliente.cpf] || 0;
        
        const row = `
            <tr>
                <td>${cliente.cpf}</td>
                <td><strong>${cliente.nome}</strong></td>
                <td>${cliente.telefone || 'N/A'}</td>
                <td>${cliente.email || 'N/A'}</td>
                <td>
                    <span class="badge ${totalEmprestimos > 0 ? 'bg-primary' : 'bg-secondary'}">
                        ${totalEmprestimos}
                    </span>
                </td>
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

// ✅ FUNÇÃO CORRIGIDA - CARREGAR EMPRÉSTIMOS
async function carregarEmprestimos() {
    try {
        console.log('🔄 Buscando empréstimos do PostgreSQL...');
        
        const response = await fetch('/api/admin/emprestimos');
        
        if (!response.ok) {
            throw new Error(`Falha na conexão: ${response.status}`);
        }
        
        const emprestimos = await response.json();
        console.log(`✅ Empréstimos carregados: ${emprestimos.length}`, emprestimos);
        
        const tbody = document.getElementById('tabelaEmprestimos');
        tbody.innerHTML = '';

        if (emprestimos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-hand-holding-usd"></i><br>
                        Nenhum empréstimo cadastrado<br>
                        <small>Use o botão "Novo Empréstimo" para começar</small>
                    </td>
                </tr>
            `;
            return;
        }

        emprestimos.forEach(emprestimo => {
            console.log('📊 Processando empréstimo:', emprestimo);
            
            // ✅ CORREÇÃO AQUI: Use os nomes corretos das colunas
            const nomeCliente = emprestimo.cliente_nome || 'N/A';
            const cpfCliente = emprestimo.cliente_cpf || 'N/A';
            const totalParcelas = emprestimo.parcelas || 0;
            const parcelasPagas = emprestimo.parcelas_pagas || 0;
            const progresso = totalParcelas > 0 ? Math.round((parcelasPagas / totalParcelas) * 100) : 0;
            
            // Formatar data
            const dataContratacao = emprestimo.data_contratacao 
                ? new Date(emprestimo.data_contratacao).toLocaleDateString('pt-BR')
                : 'N/A';
            
            // Status com base no progresso
            let status = 'Ativo';
            let statusClass = 'bg-success';
            
            if (progresso === 100) {
                status = 'Quitado';
                statusClass = 'bg-primary';
            } else if (parcelasPagas > 0) {
                status = 'Em Andamento';
                statusClass = 'bg-warning';
            }
            
            const row = `
                <tr>
                    <td>
                        <strong>${nomeCliente}</strong><br>
                        <small class="text-muted">${cpfCliente}</small>
                    </td>
                    <td>R$ ${parseFloat(emprestimo.valor_total || 0).toFixed(2)}</td>
                    <td>${totalParcelas}</td>
                    <td>${dataContratacao}</td>
                    <td>
                        <span class="badge ${statusClass}">${status}</span>
                        <div class="progress mt-1" style="height: 5px;">
                            <div class="progress-bar ${statusClass.replace('bg-', 'bg-')}" 
                                 style="width: ${progresso}%"></div>
                        </div>
                        <small class="text-muted">${parcelasPagas}/${totalParcelas} parcelas</small>
                    </td>
                    <td>${emprestimo.taxa_juros ? emprestimo.taxa_juros + '%' : '0%'}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="verDetalhesEmprestimo(${emprestimo.id})" title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editarEmprestimo(${emprestimo.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="excluirEmprestimo(${emprestimo.id})" title="Excluir">
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
                <td colspan="7" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    <strong>Erro ao Carregar</strong><br>
                    <small>${error.message}</small><br>
                    <button class="btn btn-sm btn-primary mt-2" onclick="carregarEmprestimos()">
                        🔄 Tentar Novamente
                    </button>
                </td>
            </tr>
        `;
    }
}

// ✅ FUNÇÕES AUXILIARES PARA OS BOTÕES
function verDetalhesEmprestimo(id) {
    alert(`Detalhes do empréstimo #${id} - Em desenvolvimento`);
}

function editarEmprestimo(id) {
    alert(`Editar empréstimo #${id} - Em desenvolvimento`);
}

function excluirEmprestimo(id) {
    if (confirm(`Tem certeza que deseja excluir o empréstimo #${id}?`)) {
        alert(`Excluir empréstimo #${id} - Em desenvolvimento`);
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

// ✅ EDITAR CLIENTE - COM VERIFICAÇÃO DE SEGURANÇA
async function editarCliente(cpf) {
    // ✅ VERIFICAÇÃO DE SEGURANÇA - garantir que temos um CPF válido
    if (!cpf || cpf === 'undefined' || cpf === 'null') {
        console.error('❌ CPF inválido para edição:', cpf);
        return;
    }
    
    try {
        console.log('📝 Editando cliente:', cpf);
        
        // Buscar dados do cliente
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Falha ao buscar clientes');
        
        const clientes = await response.json();
        const cliente = clientes.find(c => c.cpf === cpf);
        
        if (!cliente) {
            showNotification('Cliente não encontrado!', 'error');
            return;
        }
        
        console.log('📋 Dados do cliente encontrado:', cliente);
        
        // ✅ VERIFICAR SE OS ELEMENTOS EXISTEM ANTES DE USAR
        const modalTitle = document.getElementById('modalClienteTitle');
        const cpfInput = document.getElementById('cpf');
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const telefoneInput = document.getElementById('telefone');
        const enderecoInput = document.getElementById('endereco');
        
        if (!modalTitle || !cpfInput || !nomeInput || !telefoneInput) {
            console.error('❌ Elementos do modal não encontrados');
            throw new Error('Elementos do formulário não encontrados');
        }
        
        // Preencher modal com dados do cliente
        modalTitle.textContent = 'Editar Cliente';
        cpfInput.value = cliente.cpf;
        nomeInput.value = cliente.nome;
        emailInput.value = cliente.email || '';
        telefoneInput.value = cliente.telefone || '';
        enderecoInput.value = cliente.endereco || '';
        cpfInput.readOnly = true; // CPF não pode ser editado
        
        console.log('✅ Formulário preenchido com sucesso');
        
        // Mostrar modal
        const modalElement = document.getElementById('modalCliente');
        if (!modalElement) {
            throw new Error('Modal não encontrado');
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        console.log('✅ Modal aberto com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao editar cliente:', error);
        showNotification('Erro ao carregar dados do cliente: ' + error.message, 'error');
    }
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

// ✅ EDITAR CLIENTE - FUNÇÃO COMPLETA
async function editarCliente(cpf) {
    try {
        console.log('📝 Editando cliente:', cpf);
        
        // Buscar dados do cliente
        const response = await fetch('/api/admin/clientes');
        if (!response.ok) throw new Error('Falha ao buscar clientes');
        
        const clientes = await response.json();
        const cliente = clientes.find(c => c.cpf === cpf);
        
        if (!cliente) {
            alert('Cliente não encontrado!');
            return;
        }
        
        // Preencher modal com dados do cliente
        document.getElementById('modalClienteTitle').textContent = 'Editar Cliente';
        document.getElementById('cpf').value = cliente.cpf;
        document.getElementById('nome').value = cliente.nome;
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('telefone').value = cliente.telefone || '';
        document.getElementById('endereco').value = cliente.endereco || '';
        document.getElementById('cpf').readOnly = true; // CPF não pode ser editado
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
        modal.show();
        
    } catch (error) {
        console.error('❌ Erro ao editar cliente:', error);
        alert('Erro ao carregar dados do cliente: ' + error.message);
    }
}

// ✅ EXCLUIR CLIENTE - FUNÇÃO COMPLETA
async function excluirCliente(cpf) {
    try {
        // Verificar se o cliente tem empréstimos
        const emprestimosResponse = await fetch('/api/admin/emprestimos');
        if (emprestimosResponse.ok) {
            const emprestimos = await emprestimosResponse.json();
            const emprestimosCliente = emprestimos.filter(e => e.cliente_cpf === cpf);
            
            if (emprestimosCliente.length > 0) {
                alert(`❌ Não é possível excluir este cliente!\n\nEle possui ${emprestimosCliente.length} empréstimo(s) ativo(s).\n\nExclua os empréstimos primeiro.`);
                return;
            }
        }
        
        // Confirmação de exclusão
        if (!confirm(`Tem certeza que deseja excluir o cliente ${cpf}?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }
        
        console.log('🗑️ Excluindo cliente:', cpf);
        
        // ✅ PRECISAMOS CRIAR ESTA ROTA NO SERVER.JS
        const response = await fetch(`/api/admin/clientes/${cpf}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Cliente não encontrado');
            }
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        alert('✅ ' + result.message);
        carregarClientes(); // Recarregar lista
        
    } catch (error) {
        console.error('❌ Erro ao excluir cliente:', error);
        
        if (error.message.includes('404')) {
            alert('❌ Cliente não encontrado!');
        } else if (error.message.includes('empréstimos')) {
            alert('❌ ' + error.message);
        } else {
            alert('❌ Erro ao excluir cliente: ' + error.message);
        }
    }
}

// ✅ ATUALIZAR FUNÇÃO salvarCliente PARA SUPORTAR EDIÇÃO
async function salvarCliente() {
    try {
        const cpf = document.getElementById('cpf').value;
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;
        const isEditing = document.getElementById('cpf').readOnly;

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

        let response;
        
        if (isEditing) {
            // ✅ MODO EDIÇÃO - PRECISAMOS CRIAR ESTA ROTA NO SERVER.JS
            console.log('✏️ Atualizando cliente existente...');
            response = await fetch(`/api/admin/clientes/${cpf}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clienteData)
            });
        } else {
            // ✅ MODO NOVO CLIENTE
            console.log('💾 Criando novo cliente...');
            response = await fetch('/api/admin/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clienteData)
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha ao salvar: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Cliente salvo:', result);
        
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        alert('✅ ' + result.message);
        carregarClientes();
        
    } catch (error) {
        console.error('💥 Erro ao salvar cliente:', error);
        alert('💥 Erro ao salvar cliente: ' + error.message);
    }
}

// ✅ FUNÇÃO AUXILIAR CORRIGIDA - ABRIR MODAL PARA NOVO CLIENTE
function abrirModalCliente() {
    try {
        const modalElement = document.getElementById('modalCliente');
        if (!modalElement) {
            throw new Error('Modal de cliente não encontrado');
        }
        
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('formCliente');
        
        // ✅ VERIFICAR ELEMENTOS ANTES DE USAR
        const modalTitle = document.getElementById('modalClienteTitle');
        const cpfInput = document.getElementById('cpf');
        
        if (modalTitle) modalTitle.textContent = 'Novo Cliente';
        if (cpfInput) cpfInput.readOnly = false; // Permitir digitar CPF
        
        if (form) form.reset();
        
        modal.show();
        console.log('✅ Modal de novo cliente aberto');
        
    } catch (error) {
        console.error('❌ Erro ao abrir modal:', error);
        showNotification('Erro ao abrir formulário: ' + error.message, 'error');
    }
}

// ✅ SISTEMA DE NOTIFICAÇÕES ELEGANTE
function showNotification(message, type = 'success', duration = 4000) {
    // Remover notificação anterior se existir
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.innerHTML = `
        <div class="d-flex align-items-center p-3">
            <div class="flex-grow-1">
                <strong>${type === 'success' ? '✅ Sucesso!' : type === 'error' ? '❌ Erro!' : '⚠️ Aviso!'}</strong>
                <div class="small">${message}</div>
            </div>
            <button type="button" class="btn-close btn-close-white ms-2" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover após o tempo definido
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

// ✅ FUNÇÃO SALVAR CLIENTE ATUALIZADA COM NOTIFICAÇÃO
async function salvarCliente() {
    try {
        const cpf = document.getElementById('cpf').value;
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;
        const isEditing = document.getElementById('cpf').readOnly;

        if (!cpf || !nome || !telefone) {
            showNotification('Por favor, preencha CPF, nome e telefone.', 'warning');
            return;
        }

        const clienteData = {
            cpf: cpf,
            nome: nome,
            email: email,
            telefone: telefone,
            endereco: endereco
        };

        let response;
        let actionText;
        
        if (isEditing) {
            console.log('✏️ Atualizando cliente existente...');
            response = await fetch(`/api/admin/clientes/${cpf}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clienteData)
            });
            actionText = 'atualizado';
        } else {
            console.log('💾 Criando novo cliente...');
            response = await fetch('/api/admin/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clienteData)
            });
            actionText = 'cadastrado';
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha ao salvar: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Cliente salvo:', result);
        
        // Fechar modal
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        
        // Mostrar notificação elegante
        showNotification(`Cliente ${actionText} com sucesso!`, 'success');
        
        // Recarregar lista
        setTimeout(() => {
            carregarClientes();
        }, 1000);
        
    } catch (error) {
        console.error('💥 Erro ao salvar cliente:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('23505')) {
            errorMessage = 'CPF já cadastrado no sistema!';
        } else if (error.message.includes('400')) {
            errorMessage = 'Dados inválidos. Verifique as informações.';
        }
        
        showNotification(errorMessage, 'error', 5000);
    }
}

// ✅ ATUALIZAR FUNÇÃO EXCLUIR CLIENTE COM NOTIFICAÇÃO
async function excluirCliente(cpf) {
    try {
        // Verificar se o cliente tem empréstimos
        const emprestimosResponse = await fetch('/api/admin/emprestimos');
        if (emprestimosResponse.ok) {
            const emprestimos = await emprestimosResponse.json();
            const emprestimosCliente = emprestimos.filter(e => e.cliente_cpf === cpf);
            
            if (emprestimosCliente.length > 0) {
                showNotification(
                    `Não é possível excluir! Cliente possui ${emprestimosCliente.length} empréstimo(s) ativo(s).`, 
                    'warning', 
                    6000
                );
                return;
            }
        }
        
        // Usar modal de confirmação personalizado do Bootstrap
        const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
        document.getElementById('confirmMessage').textContent = 
            `Tem certeza que deseja excluir o cliente ${cpf}? Esta ação não pode ser desfeita!`;
        
        // Esperar confirmação do usuário
        const userConfirmed = await new Promise((resolve) => {
            document.getElementById('confirmYes').onclick = () => {
                confirmModal.hide();
                resolve(true);
            };
            document.getElementById('confirmNo').onclick = () => {
                confirmModal.hide();
                resolve(false);
            };
            confirmModal.show();
        });
        
        if (!userConfirmed) return;
        
        console.log('🗑️ Excluindo cliente:', cpf);
        
        const response = await fetch(`/api/admin/clientes/${cpf}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Cliente não encontrado');
            }
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showNotification('Cliente excluído com sucesso!', 'success');
        carregarClientes();
        
    } catch (error) {
        console.error('❌ Erro ao excluir cliente:', error);
        
        if (error.message.includes('404')) {
            showNotification('Cliente não encontrado!', 'error');
        } else if (error.message.includes('empréstimos')) {
            showNotification(error.message, 'warning');
        } else {
            showNotification('Erro ao excluir cliente: ' + error.message, 'error');
        }
    }
}

// ✅ DEBUG - ENCONTRAR CHAMADAS AUTOMÁTICAS
console.log('🔍 Verificando chamadas automáticas...');

// Sobrescrever a função temporariamente para debug
const originalEditarCliente = window.editarCliente;
window.editarCliente = function(cpf) {
    console.log('🔄 editarCliente chamado com:', cpf, 'Stack:', new Error().stack);
    return originalEditarCliente(cpf);
};