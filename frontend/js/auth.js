import api from './api.js?v=3';

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

        // Load remembered username
        this.loadRememberedUsername();
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const rememberCheck = document.getElementById('remember-username');
        const errorEl = document.getElementById('login-error');

        try {
            this.showLoading(true);
            const response = await api.login(username, password);

            // Save or clear remembered username
            if (rememberCheck && rememberCheck.checked) {
                localStorage.setItem('remembered_username', username);
            } else {
                localStorage.removeItem('remembered_username');
            }

            api.setToken(response.token);
            this.currentUser = response.user;

            this.showApp();
            this.showToast('Inicio de sesion exitoso', 'success');
        } catch (error) {
            errorEl.textContent = error.message || 'Error al iniciar sesion';
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        api.clearToken();
        this.currentUser = null;
        window.dispatchEvent(new Event('session-reset'));
        this.showAuth();
        this.showToast('Sesion cerrada', 'info');
    }

    onSessionExpired() {
        this.currentUser = null;
        window.dispatchEvent(new Event('session-reset'));
        this.showAuth();
        this.showToast('Tu sesion ha expirado. Por favor, inicia sesion nuevamente.', 'warning');
    }

    showAuth() {
        this.hideSplash();
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');

        // Clear form and restore remembered username
        document.getElementById('login-form').reset();
        this.loadRememberedUsername();
    }

    loadRememberedUsername() {
        const saved = localStorage.getItem('remembered_username');
        const usernameInput = document.getElementById('login-username');
        const rememberCheck = document.getElementById('remember-username');

        if (saved && usernameInput) {
            usernameInput.value = saved;
            if (rememberCheck) rememberCheck.checked = true;
        }
    }

    showApp() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');

        // Dispatch role-ready so other modules can adapt UI
        window.dispatchEvent(new CustomEvent('role-ready', { detail: { role: this.currentUser?.role } }));
        // Trigger app initialization
        window.dispatchEvent(new Event('app-ready'));
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (token && !this.isTokenExpired(token)) {
            api.setToken(token);
            try {
                const response = await api.getMe();
                this.currentUser = response.user;
                this.showApp();
            } catch (error) {
                api.clearToken();
                this.hideSplash();
                this.showAuth();
            }
        } else {
            if (token) {
                api.clearToken();
                this.showToast('Tu sesion ha expirado. Por favor, inicia sesion nuevamente.', 'warning');
            }
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

    getRole() {
        return this.currentUser?.role || null;
    }

    getUser() {
        return this.currentUser;
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
