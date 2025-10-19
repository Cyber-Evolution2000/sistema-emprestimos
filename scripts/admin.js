// scripts/admin.js - VERSÃO LOCALSTORAGE (ORIGINAL)

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

    carregarDados() {
        try {
            // Carregar do localStorage
            const clientesSalvos = localStorage.getItem('clientesData');
            this.clientes = clientesSalvos ? JSON.parse(clientesSalvos) : [];
            
            console.log('✅ Dados carregados:', this.clientes);
            this.atualizarDashboard();
            this.atualizarTabelaClientes();
            this.atualizarTabelaEmprestimos();
            this.atualizarTabelaPagamentos();
            this.atualizarSelectClientes();
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.clientes = [];
        }
    }

    salvarDados() {
        try {
            console.log('💾 Salvando dados...', this.clientes);
            localStorage.setItem('clientesData', JSON.stringify(this.clientes));
            console.log('✅ Dados salvos com sucesso!');
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
            alert('Erro ao salvar dados: ' + error.message);
            return false;
        }
    }

    // ... (resto dos métodos permanece igual - atualizarDashboard, atualizarTabelaClientes, etc.)

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

    salvarCliente() {
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

        const clienteExistente = this.clientes.find(c => c.cpf === cliente.cpf);
        
        if (clienteExistente && !document.getElementById('clienteId').value) {
            alert('Já existe um cliente com este CPF!');
            return;
        }

        if (clienteExistente) {
            Object.assign(clienteExistente, cliente);
        } else {
            this.clientes.push(cliente);
        }

        this.salvarDados();
        this.atualizarTabelaClientes();
        this.atualizarDashboard();
        this.atualizarSelectClientes();
        
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        alert('Cliente salvo com sucesso!');
    }

    // ... (outros métodos)
}

// Funções globais
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