import api from './api.js';

class ActivityDetail {
    constructor() {
        this.currentActivityId = null;
        this.currentActivity = null;
    }

    init() {
        document.getElementById('detail-back-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate-view', { detail: { view: 'activities' } }));
        });

        document.getElementById('detail-filter-status').addEventListener('change', () => {
            this.loadVouchers();
        });
    }

    async loadDetail(activityId) {
        this.currentActivityId = activityId;

        this.showLoading(true);
        try {
            const [metricsData, vouchers] = await Promise.all([
                api.getActivityMetrics(activityId),
                api.getVouchers(activityId, null)
            ]);

            this.currentActivity = metricsData.activity;
            document.getElementById('detail-filter-status').value = '';

            this.renderHeader(metricsData.activity);
            this.renderMetrics(metricsData.metrics);
            this.renderVouchers(vouchers);
        } catch (error) {
            console.error('Error loading activity detail:', error);
            this.showToast('Error al cargar detalles de actividad', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderHeader(activity) {
        document.getElementById('detail-activity-name').textContent = activity.name;
        const badge = document.getElementById('detail-activity-badge');
        badge.textContent = activity.isActive !== false ? 'Activa' : 'Inactiva';
        badge.className = `voucher-badge ${activity.isActive !== false ? 'redeemed' : 'pending'}`;
    }

    renderMetrics(metrics) {
        const container = document.getElementById('detail-metrics');
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-content">
                    <h3>Recaudación</h3>
                    <p class="stat-value">$${metrics.totalRevenue.toFixed(2)}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🎫</div>
                <div class="stat-content">
                    <h3>Vendidos</h3>
                    <p class="stat-value">${metrics.totalVouchers}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                    <h3>Retirados</h3>
                    <p class="stat-value">${metrics.redeemedCount}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <h3>Tasa de Retiro</h3>
                    <p class="stat-value">${metrics.redemptionRate}%</p>
                </div>
            </div>
        `;
    }

    async loadVouchers() {
        const isRedeemed = document.getElementById('detail-filter-status').value;
        try {
            const vouchers = await api.getVouchers(
                this.currentActivityId,
                isRedeemed !== '' ? isRedeemed : null
            );
            this.renderVouchers(vouchers);
        } catch (error) {
            console.error('Error loading vouchers:', error);
        }
    }

    renderVouchers(vouchers) {
        const container = document.getElementById('detail-vouchers-list');

        if (vouchers.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay vouchers</p>';
            return;
        }

        container.innerHTML = vouchers.map(voucher => `
            <div class="voucher-item">
                <div>
                    <h4>${voucher.customerName}</h4>
                    <p class="text-muted">Monto: $${voucher.amount}</p>
                    <small class="text-muted">${new Date(voucher.createdAt).toLocaleString()}</small>
                </div>
                <div>
                    <span class="voucher-badge ${voucher.isRedeemed ? 'redeemed' : 'pending'}">
                        ${voucher.isRedeemed ? 'Retirado' : 'Pendiente'}
                    </span>
                    ${voucher.isRedeemed ? `
                        <br><small class="text-muted">${new Date(voucher.redeemedAt).toLocaleString()}</small>
                    ` : ''}
                </div>
            </div>
        `).join('');
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

export default new ActivityDetail();
