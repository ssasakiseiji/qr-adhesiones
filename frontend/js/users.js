import api from './api.js?v=4';
import { icon } from './icons.js?v=4';

class Users {
    constructor() {
        this.users = [];
        this.editingUserId = null;
    }

    init() {
        document.getElementById('new-user-btn').addEventListener('click', () => {
            this.showUserModal();
        });

        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveUser();
        });

        document.getElementById('user-modal-close').addEventListener('click', () => {
            this.hideUserModal();
        });
    }

    async loadUsers() {
        try {
            this.users = await api.getUsers();
            this.renderUsersList();
        } catch (error) {
            console.error('Error loading users:', error);
            this.showToast('Error al cargar usuarios', 'error');
        }
    }

    renderUsersList() {
        const container = document.getElementById('users-list');

        if (this.users.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay usuarios</p>';
            return;
        }

        const roleLabels = { esbirro: 'Esbirro', comision: 'Comision', superadmin: 'Superadmin' };
        const roleBadgeClass = { esbirro: 'pending', comision: 'redeemed', superadmin: 'badge-superadmin' };

        container.innerHTML = this.users.map(user => `
            <div class="voucher-item">
                <div>
                    <h4>${this.escapeHtml(user.username)}</h4>
                    ${user.email ? `<p class="text-muted">${this.escapeHtml(user.email)}</p>` : ''}
                    <small class="text-muted">Creado: ${new Date(user.createdAt).toLocaleDateString()}</small>
                </div>
                <div style="display:flex;align-items:center;gap:var(--spacing-xs);">
                    <span class="voucher-badge ${roleBadgeClass[user.role] || 'pending'}">
                        ${roleLabels[user.role] || user.role}
                    </span>
                    <button class="btn-icon" data-action="edit" data-user-id="${user.id}" title="Editar">
                        ${icon('edit')}
                    </button>
                    <button class="btn-icon btn-danger" data-action="delete" data-user-id="${user.id}" title="Eliminar">
                        ${icon('trash')}
                    </button>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => this.editUser(btn.dataset.userId));
        });
        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => this.deleteUser(btn.dataset.userId));
        });
    }

    showUserModal(userId = null) {
        this.editingUserId = userId;
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const form = document.getElementById('user-form');
        const passwordInput = document.getElementById('user-password');
        const passwordHint = document.getElementById('password-hint');

        form.reset();

        if (userId) {
            title.textContent = 'Editar Usuario';
            const user = this.users.find(u => u.id === userId);
            if (user) {
                document.getElementById('user-username').value = user.username;
                document.getElementById('user-email').value = user.email || '';
                document.getElementById('user-role').value = user.role;
            }
            passwordInput.required = false;
            passwordHint.style.display = 'block';
        } else {
            title.textContent = 'Nuevo Usuario';
            passwordInput.required = true;
            passwordHint.style.display = 'none';
        }

        modal.classList.remove('hidden');
    }

    hideUserModal() {
        document.getElementById('user-modal').classList.add('hidden');
        this.editingUserId = null;
    }

    async saveUser() {
        const username = document.getElementById('user-username').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;

        try {
            this.showLoading(true);
            if (this.editingUserId) {
                const data = { username, email: email || null, role };
                if (password) data.password = password;
                await api.updateUser(this.editingUserId, data);
                this.showToast('Usuario actualizado', 'success');
            } else {
                await api.createUser(username, password, role, email || null);
                this.showToast('Usuario creado', 'success');
            }
            this.hideUserModal();
            await this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            this.showToast(error.message || 'Error al guardar usuario', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    editUser(userId) {
        this.showUserModal(userId);
    }

    async deleteUser(userId) {
        if (!confirm('Eliminar este usuario?')) return;
        try {
            this.showLoading(true);
            await api.deleteUser(userId);
            this.showToast('Usuario eliminado', 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast(error.message || 'Error al eliminar usuario', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
        setTimeout(() => toast.remove(), 3000);
    }
}

const users = new Users();
export default users;
