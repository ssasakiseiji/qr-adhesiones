import api from './api.js';

class Activities {
    constructor() {
        this.activities = [];
        this.currentActivity = null;
    }

    async init() {
        await this.loadActivities();
        this.initEventListeners();
    }

    initEventListeners() {
        // Activity selector in header
        document.getElementById('activity-selector').addEventListener('change', (e) => {
            this.selectActivity(e.target.value);
        });

        // New activity button
        document.getElementById('new-activity-btn').addEventListener('click', () => {
            this.showActivityModal();
        });

        // Activity form
        document.getElementById('activity-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createActivity();
        });

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideActivityModal();
        });
    }

    async loadActivities() {
        try {
            this.activities = await api.getActivities();
            this.renderActivitySelector();
            this.renderActivitiesList();
            
            // Select first activity if available
            if (this.activities.length > 0 && !this.currentActivity) {
                this.selectActivity(this.activities[0].id);
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            this.showToast('Error al cargar actividades', 'error');
        }
    }

    renderActivitySelector() {
        const selector = document.getElementById('activity-selector');
        selector.innerHTML = '<option value="">Seleccionar actividad...</option>';
        
        this.activities.forEach(activity => {
            const option = document.createElement('option');
            option.value = activity.id;
            option.textContent = activity.name;
            if (this.currentActivity && activity.id === this.currentActivity.id) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        // Also update filter selects
        const filterSelect = document.getElementById('filter-activity');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Todas las actividades</option>';
            this.activities.forEach(activity => {
                const option = document.createElement('option');
                option.value = activity.id;
                option.textContent = activity.name;
                filterSelect.appendChild(option);
            });
        }
    }

    renderActivitiesList() {
        const container = document.getElementById('activities-list');
        if (!container) return;

        if (this.activities.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay actividades creadas</p>';
            return;
        }

        container.innerHTML = this.activities.map(activity => `
            <div class="voucher-item">
                <div>
                    <h4>${activity.name}</h4>
                    <p class="text-muted">${activity.description || 'Sin descripción'}</p>
                    <small class="text-muted">Creada: ${new Date(activity.createdAt).toLocaleDateString()}</small>
                </div>
                <div>
                    <span class="voucher-badge ${activity.isActive ? 'redeemed' : 'pending'}">
                        ${activity.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    selectActivity(activityId) {
        this.currentActivity = this.activities.find(a => a.id === activityId);
        
        // Update selector
        document.getElementById('activity-selector').value = activityId || '';
        
        // Trigger update event
        window.dispatchEvent(new CustomEvent('activity-changed', {
            detail: { activity: this.currentActivity }
        }));
    }

    showActivityModal() {
        document.getElementById('activity-modal').classList.remove('hidden');
        document.getElementById('activity-form').reset();
    }

    hideActivityModal() {
        document.getElementById('activity-modal').classList.add('hidden');
    }

    async createActivity() {
        const name = document.getElementById('activity-name').value;
        const description = document.getElementById('activity-description').value;

        try {
            this.showLoading(true);
            await api.createActivity(name, description);
            await this.loadActivities();
            this.hideActivityModal();
            this.showToast('Actividad creada exitosamente', 'success');
        } catch (error) {
            console.error('Error creating activity:', error);
            this.showToast('Error al crear actividad', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    getCurrentActivity() {
        return this.currentActivity;
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

export default new Activities();
