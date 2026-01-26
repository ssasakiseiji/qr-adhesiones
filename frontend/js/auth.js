import api from './api.js';

class Auth {
    constructor() {
        this.currentUser = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }

    switchTab(tabName) {
        // Update tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}-form`);
        });

        // Clear errors
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        try {
            this.showLoading(true);
            const response = await api.login(email, password);
            
            api.setToken(response.token);
            this.currentUser = response.user;
            
            this.showApp();
            this.showToast('Inicio de sesión exitoso', 'success');
        } catch (error) {
            errorEl.textContent = error.message || 'Error al iniciar sesión';
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');

        try {
            this.showLoading(true);
            const response = await api.register(username, email, password);
            
            api.setToken(response.token);
            this.currentUser = response.user;
            
            this.showApp();
            this.showToast('Registro exitoso', 'success');
        } catch (error) {
            errorEl.textContent = error.message || 'Error al registrarse';
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        api.clearToken();
        this.currentUser = null;
        this.showAuth();
        this.showToast('Sesión cerrada', 'info');
    }

    showAuth() {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        
        // Clear forms
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
    }

    showApp() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        // Trigger app initialization
        window.dispatchEvent(new Event('app-ready'));
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            api.setToken(token);
            this.showApp();
        } else {
            this.showAuth();
        }
    }

    showLoading(show) {
        document.getElementById('loading-overlay').classList.toggle('hidden', !show);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

export default new Auth();
