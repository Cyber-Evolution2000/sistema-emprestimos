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

// ✅ FUNÇÕES DE EMPRÉSTIMOS
async function carregarEmprestimos() {
  try {
    const response = await fetch('/api/admin/emprestimos');
    if (!response.ok) throw new Error('Erro ao carregar empréstimos');
    
    const emprestimos = await response.json();
    exibirEmprestimos(emprestimos);
  } catch (error) {
    console.error('❌ Erro ao carregar empréstimos:', error);
    alert('Erro ao carregar empréstimos: ' + error.message);
  }
}

function exibirEmprestimos(emprestimos) {
  const tbody = document.getElementById('tabelaEmprestimos');
  tbody.innerHTML = '';

  if (emprestimos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          Nenhum empréstimo cadastrado
        </td>
      </tr>
    `;
    return;
  }

  emprestimos.forEach(emprestimo => {
    const statusClass = emprestimo.status === 'Pago' ? 'success' : 
                       emprestimo.status === 'Atrasado' ? 'danger' : 'warning';
    
    const progresso = Math.round((emprestimo.parcelasPagas / emprestimo.parcelas) * 100);
    
    const row = `
      <tr>
        <td>
          <strong>${emprestimo.cliente.nome}</strong><br>
          <small class="text-muted">${emprestimo.cliente.cpf}</small>
        </td>
        <td>R$ ${emprestimo.valorTotal.toFixed(2)}</td>
        <td>
          ${emprestimo.parcelas} parcelas<br>
          <small class="text-muted">${emprestimo.parcelasPagas} pagas</small>
        </td>
        <td>${formatarData(emprestimo.dataContratacao)}</td>
        <td>
          <span class="badge bg-${statusClass}">${emprestimo.status}</span>
          ${emprestimo.parcelasAtrasadas > 0 ? 
            `<br><small class="text-danger">${emprestimo.parcelasAtrasadas} atrasadas</small>` : ''}
        </td>
        <td>
          <div class="progress" style="height: 6px; width: 80px;">
            <div class="progress-bar bg-${statusClass}" style="width: ${progresso}%"></div>
          </div>
          <small>${progresso}%</small>
        </td>
        <td>
          <button class="btn btn-sm btn-info" onclick="verDetalhesEmprestimo(${emprestimo.id})" title="Detalhes">
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
}

async function abrirModalEmprestimo(emprestimoId = null) {
  try {
    // Carregar lista de clientes para o select
    const clientesResponse = await fetch('/api/admin/clientes');
    if (!clientesResponse.ok) throw new Error('Erro ao carregar clientes');
    
    const clientes = await clientesResponse.json();
    
    const selectCliente = document.getElementById('clienteSelect');
    selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
    
    clientes.forEach(cliente => {
      const option = document.createElement('option');
      option.value = cliente.cpf;
      option.textContent = `${cliente.nome} - ${cliente.cpf}`;
      selectCliente.appendChild(option);
    });

    const modal = new bootstrap.Modal(document.getElementById('modalEmprestimo'));
    const form = document.getElementById('formEmprestimo');
    
    form.reset();
    document.getElementById('emprestimoId').value = '';
    
    if (emprestimoId) {
      // Modo edição
      document.getElementById('modalEmprestimoTitle').textContent = 'Editar Empréstimo';
      
      const emprestimoResponse = await fetch(`/api/admin/emprestimos/${emprestimoId}`);
      if (!emprestimoResponse.ok) throw new Error('Erro ao carregar empréstimo');
      
      const emprestimo = await emprestimoResponse.json();
      
      document.getElementById('emprestimoId').value = emprestimo.id;
      document.getElementById('clienteSelect').value = emprestimo.clienteCpf;
      document.getElementById('valorTotal').value = emprestimo.valorTotal;
      document.getElementById('parcelas').value = emprestimo.parcelas;
      document.getElementById('dataContratacao').value = emprestimo.dataContratacao;
      
    } else {
      // Modo novo
      document.getElementById('modalEmprestimoTitle').textContent = 'Novo Empréstimo';
      document.getElementById('dataContratacao').value = new Date().toISOString().split('T')[0];
    }
    
    modal.show();
  } catch (error) {
    console.error('❌ Erro ao abrir modal de empréstimo:', error);
    alert('Erro: ' + error.message);
  }
}

async function salvarEmprestimo() {
  try {
    const emprestimoId = document.getElementById('emprestimoId').value;
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

    const url = emprestimoId ? `/api/admin/emprestimos/${emprestimoId}` : '/api/admin/emprestimos';
    const method = emprestimoId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emprestimoData)
    });

    if (!response.ok) throw new Error('Erro ao salvar empréstimo');

    const result = await response.json();
    
    bootstrap.Modal.getInstance(document.getElementById('modalEmprestimo')).hide();
    alert('✅ ' + result.message);
    carregarEmprestimos();
    
  } catch (error) {
    console.error('❌ Erro ao salvar empréstimo:', error);
    alert('Erro ao salvar empréstimo: ' + error.message);
  }
}

async function excluirEmprestimo(id) {
  if (!confirm('Tem certeza que deseja excluir este empréstimo? Todas as parcelas também serão excluídas.')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/emprestimos/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Erro ao excluir empréstimo');

    const result = await response.json();
    alert('✅ ' + result.message);
    carregarEmprestimos();
    
  } catch (error) {
    console.error('❌ Erro ao excluir empréstimo:', error);
    alert('Erro ao excluir empréstimo: ' + error.message);
  }
}

async function verDetalhesEmprestimo(id) {
  try {
    const response = await fetch(`/api/admin/emprestimos/${id}`);
    if (!response.ok) throw new Error('Erro ao carregar detalhes');
    
    const emprestimo = await response.json();
    
    let detalhesHTML = `
      <h5>Detalhes do Empréstimo</h5>
      <p><strong>Cliente:</strong> ${emprestimo.clienteNome} (${emprestimo.clienteCpf})</p>
      <p><strong>Valor Total:</strong> R$ ${emprestimo.valorTotal.toFixed(2)}</p>
      <p><strong>Parcelas:</strong> ${emprestimo.parcelas}</p>
      <p><strong>Data de Contratação:</strong> ${formatarData(emprestimo.dataContratacao)}</p>
      
      <h6 class="mt-4">Parcelas</h6>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    emprestimo.boletos.forEach(boleto => {
      const statusClass = boleto.status === 'Pago' ? 'success' : 
                         boleto.status === 'Atrasado' ? 'danger' : 'warning';
      
      detalhesHTML += `
        <tr>
          <td>${boleto.parcela}</td>
          <td>R$ ${boleto.valor.toFixed(2)}</td>
          <td>${boleto.vencimento}</td>
          <td><span class="badge bg-${statusClass}">${boleto.status}</span></td>
        </tr>
      `;
    });
    
    detalhesHTML += `
          </tbody>
        </table>
      </div>
    `;
    
    // Criar modal de detalhes
    const modalHTML = `
      <div class="modal fade" id="detalhesEmprestimoModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Detalhes do Empréstimo</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              ${detalhesHTML}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Adicionar modal ao DOM se não existir
    if (!document.getElementById('detalhesEmprestimoModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else {
      document.getElementById('detalhesEmprestimoModal').remove();
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('detalhesEmprestimoModal'));
    modal.show();
    
  } catch (error) {
    console.error('❌ Erro ao carregar detalhes:', error);
    alert('Erro: ' + error.message);
  }
}

// ✅ FUNÇÃO AUXILIAR PARA FORMATAR DATA
function formatarData(dataString) {
  if (!dataString) return 'N/A';
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR');
}