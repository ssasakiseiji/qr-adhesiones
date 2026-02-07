import api from './api.js?v=2';

class Auth {
    constructor() {
        this.currentUser = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Session expired
        window.addEventListener('session-expired', () => {
            this.onSessionExpired();
        });

        // Load remembered email
        this.loadRememberedEmail();
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberCheck = document.getElementById('remember-email');
        const errorEl = document.getElementById('login-error');

        try {
            this.showLoading(true);
            const response = await api.login(email, password);

            // Save or clear remembered email
            if (rememberCheck && rememberCheck.checked) {
                localStorage.setItem('remembered_email', email);
            } else {
                localStorage.removeItem('remembered_email');
            }

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

    logout() {
        api.clearToken();
        this.currentUser = null;
        window.dispatchEvent(new Event('session-reset'));
        this.showAuth();
        this.showToast('Sesión cerrada', 'info');
    }

    onSessionExpired() {
        this.currentUser = null;
        window.dispatchEvent(new Event('session-reset'));
        this.showAuth();
        this.showToast('Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.', 'warning');
    }

    showAuth() {
        this.hideSplash();
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');

        // Clear form and restore remembered email
        document.getElementById('login-form').reset();
        this.loadRememberedEmail();
    }

    loadRememberedEmail() {
        const saved = localStorage.getItem('remembered_email');
        const emailInput = document.getElementById('login-email');
        const rememberCheck = document.getElementById('remember-email');

        if (saved && emailInput) {
            emailInput.value = saved;
            if (rememberCheck) rememberCheck.checked = true;
        }
    }

    showApp() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        // Trigger app initialization
        window.dispatchEvent(new Event('app-ready'));
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (token && !this.isTokenExpired(token)) {
            api.setToken(token);
            // Splash is already visible from page load - showApp() will trigger data load
            this.showApp();
        } else {
            if (token) {
                api.clearToken();
                this.showToast('Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.', 'warning');
            }
            // Hide splash and show login
            this.hideSplash();
            this.showAuth();
        }
    }

    hideSplash() {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('hidden');
    }

    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 < Date.now();
        } catch {
            return true;
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
