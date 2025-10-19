// scripts/login.js
class LoginSystem {
    constructor() {
        this.attempts = 0;
        this.maxAttempts = 3;
        this.lockTime = 5 * 60 * 1000; // 5 minutos em milissegundos
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthentication();
    }

    bindEvents() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter key support
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }

    checkAuthentication() {
        const isLoggedIn = localStorage.getItem('adminLoggedIn');
        const loginTime = localStorage.getItem('loginTime');
        
        if (isLoggedIn && loginTime) {
            // Verificar se a sessão expirou (8 horas)
            const sessionTime = 8 * 60 * 60 * 1000; // 8 horas
            if (Date.now() - parseInt(loginTime) < sessionTime) {
                window.location.href = 'admin.html';
                return;
            } else {
                localStorage.removeItem('adminLoggedIn');
                localStorage.removeItem('loginTime');
            }
        }

        // Verificar se está bloqueado
        const lockUntil = localStorage.getItem('lockUntil');
        if (lockUntil && Date.now() < parseInt(lockUntil)) {
            this.showLockMessage(parseInt(lockUntil));
        }
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Verificar bloqueio
        const lockUntil = localStorage.getItem('lockUntil');
        if (lockUntil && Date.now() < parseInt(lockUntil)) {
            this.showLockMessage(parseInt(lockUntil));
            return;
        }

        // Credenciais padrão (altere para suas credenciais)
        const validCredentials = [
            { username: 'admin', password: 'admin123' },
            { username: 'gestor', password: 'gestor2024' }
        ];

        const isValid = validCredentials.some(cred => 
            cred.username === username && cred.password === password
        );

        if (isValid) {
            this.loginSuccess();
        } else {
            this.loginFailed();
        }
    }

    loginSuccess() {
        // Resetar tentativas
        this.attempts = 0;
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lockUntil');

        // Salvar sessão
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('loginTime', Date.now().toString());
        localStorage.setItem('adminUser', document.getElementById('username').value);

        // Redirecionar para admin
        window.location.href = 'admin.html';
    }

    loginFailed() {
        this.attempts++;
        localStorage.setItem('loginAttempts', this.attempts.toString());

        const remainingAttempts = this.maxAttempts - this.attempts;
        
        if (remainingAttempts > 0) {
            this.showError(`Credenciais inválidas. ${remainingAttempts} tentativa(s) restante(s).`);
        } else {
            this.lockAccount();
        }

        // Limpar campo de senha
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }

    lockAccount() {
        const lockUntil = Date.now() + this.lockTime;
        localStorage.setItem('lockUntil', lockUntil.toString());
        this.showLockMessage(lockUntil);
    }

    showLockMessage(lockUntil) {
        const minutesLeft = Math.ceil((lockUntil - Date.now()) / (60 * 1000));
        this.showError(`Conta bloqueada por ${minutesLeft} minutos devido a várias tentativas falhas.`);
        
        document.getElementById('username').disabled = true;
        document.getElementById('password').disabled = true;
        document.querySelector('button[type="submit"]').disabled = true;

        // Ativar campos após o bloqueio
        setTimeout(() => {
            document.getElementById('username').disabled = false;
            document.getElementById('password').disabled = false;
            document.querySelector('button[type="submit"]').disabled = false;
            this.attempts = 0;
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lockUntil');
            this.hideError();
        }, this.lockTime);
    }

    showError(message) {
        const errorDiv = document.getElementById('loginError');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorDiv.style.display = 'block';
        
        // Scroll para o erro
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    hideError() {
        document.getElementById('loginError').style.display = 'none';
    }
}

// Inicializar sistema de login
const loginSystem = new LoginSystem();