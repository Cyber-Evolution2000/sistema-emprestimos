// scripts/admin-firebase.js
import { dbService } from './firebase-config.js';

class AdminSystemFirebase {
    constructor() {
        this.clientes = [];
        this.init();
    }

    async init() {
        await this.carregarDados();
        this.bindEvents();
        this.atualizarUsuarioLogado();
    }

    async carregarDados() {
        try {
            this.clientes = await dbService.listarClientes();
            this.atualizarDashboard();
            this.atualizarTabelaClientes();
            this.atualizarTabelaEmprestimos();
            this.atualizarTabelaPagamentos();
            this.atualizarSelectClientes();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados do sistema');
        }
    }

    // ... (coloque aqui todas as outras funções do admin.js adaptadas para Firebase)

    atualizarUsuarioLogado() {
        const usuario = localStorage.getItem('adminUser');
        if (usuario) {
            const userInfo = document.createElement('div');
            userInfo.className = 'px-3 py-2 text-white small border-top border-white';
            userInfo.innerHTML = `<i class="fas fa-user"></i> Logado como: <strong>${usuario}</strong>`;
            
            const sidebar = document.querySelector('.sidebar .position-sticky');
            if (sidebar) {
                // Remove info anterior se existir
                const oldInfo = document.querySelector('.user-info');
                if (oldInfo) oldInfo.remove();
                
                userInfo.classList.add('user-info');
                sidebar.appendChild(userInfo);
            }
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
    admin = new AdminSystemFirebase();
});