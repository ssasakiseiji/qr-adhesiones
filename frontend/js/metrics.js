import api from './api.js?v=2';
import activities from './activities.js?v=2';
import vouchers from './vouchers.js?v=2';
import { icon } from './icons.js?v=2';

class Metrics {
    constructor() {
        this.currentMetrics = null;
    }

    init() {
        this.initEventListeners();
    }

    reset() {
        this.currentMetrics = null;
    }

    initEventListeners() {
        // Filter changes
        document.getElementById('filter-activity').addEventListener('change', () => {
            this.loadVouchersTable();
        });

        document.getElementById('filter-status').addEventListener('change', () => {
            this.loadVouchersTable();
        });

        // Listen for activity changes
        window.addEventListener('activity-changed', () => {
            this.loadMetrics();
        });

        // Listen for voucher events
        window.addEventListener('voucher-created', () => {
            this.loadMetrics();
        });

        window.addEventListener('voucher-redeemed', () => {
            this.loadMetrics();
        });

        // Reset state on session end
        window.addEventListener('session-reset', () => {
            this.reset();
        });
    }

    async loadMetrics() {
        try {
            this.showLoading(true);
            const metrics = await api.getSummaryMetrics();
            this.currentMetrics = metrics;
            
            this.renderOverallMetrics(metrics.overall);
            this.renderActivityMetrics(metrics.byActivity);
            await this.loadVouchersTable();
        } catch (error) {
            console.error('Error loading metrics:', error);
            this.showToast('Error al cargar métricas', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderOverallMetrics(overall) {
        const container = document.getElementById('overall-metrics');
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">${icon('money')}</div>
                    <div class="stat-content">
                        <h3>Recaudación Total</h3>
                        <p class="stat-value">$${overall.totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${icon('ticket')}</div>
                    <div class="stat-content">
                        <h3>Vouchers Vendidos</h3>
                        <p class="stat-value">${overall.totalVouchers}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${icon('check')}</div>
                    <div class="stat-content">
                        <h3>Vouchers Retirados</h3>
                        <p class="stat-value">${overall.redeemedCount}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${icon('chart')}</div>
                    <div class="stat-content">
                        <h3>Tasa de Retiro</h3>
                        <p class="stat-value">${overall.redemptionRate}%</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderActivityMetrics(byActivity) {
        const container = document.getElementById('activity-metrics');
        
        if (byActivity.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay datos disponibles</p>';
            return;
        }

        container.innerHTML = byActivity.map(activity => `
            <div class="voucher-item">
                <div style="min-width:0;width:100%;">
                    <h4>${activity.activityName}</h4>
                    <div class="activity-metrics-grid">
                        <div>
                            <small class="text-muted">Recaudación</small>
                            <p class="activity-metric-value activity-metric-highlight">$${activity.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div>
                            <small class="text-muted">Vendidos</small>
                            <p class="activity-metric-value">${activity.totalVouchers}</p>
                        </div>
                        <div>
                            <small class="text-muted">Retirados</small>
                            <p class="activity-metric-value">${activity.redeemedCount}</p>
                        </div>
                        <div>
                            <small class="text-muted">Tasa de Retiro</small>
                            <p class="activity-metric-value">${activity.redemptionRate}%</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadVouchersTable() {
        const activityId = document.getElementById('filter-activity').value;
        const isRedeemed = document.getElementById('filter-status').value;
        
        const vouchersList = await vouchers.loadVouchers(
            activityId || null,
            isRedeemed !== '' ? isRedeemed : null
        );

        this.renderVouchersTable(vouchersList);
    }

    renderVouchersTable(vouchersList) {
        const container = document.getElementById('vouchers-table');
        
        if (vouchersList.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay vouchers</p>';
            return;
        }

        container.innerHTML = `
            <div class="vouchers-list">
                ${vouchersList.map(voucher => `
                    <div class="voucher-item">
                        <div>
                            <h4>${voucher.customerName}</h4>
                            <p class="text-muted">Monto: $${voucher.amount}</p>
                            <small class="text-muted">
                                ${voucher.activity ? voucher.activity.name : 'Sin actividad'} • 
                                ${new Date(voucher.createdAt).toLocaleString()}
                            </small>
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
                `).join('')}
            </div>
        `;
    }

    async updateDashboard() {
        const activity = activities.getCurrentActivity();
        
        if (!activity) {
            // Show overall metrics
            const metrics = await api.getSummaryMetrics();
            this.updateDashboardStats(metrics.overall);
            
            // Load recent vouchers
            const recentVouchers = await vouchers.loadVouchers(null, null);
            vouchers.renderVouchersList(recentVouchers.slice(0, 5), 'recent-vouchers-list');
        } else {
            // Show activity-specific metrics
            const metrics = await api.getActivityMetrics(activity.id);
            this.updateDashboardStats(metrics.metrics);
            
            // Load recent vouchers for activity
            const recentVouchers = await vouchers.loadVouchers(activity.id, null);
            vouchers.renderVouchersList(recentVouchers.slice(0, 5), 'recent-vouchers-list');
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('stat-revenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
        document.getElementById('stat-sold').textContent = stats.totalVouchers;
        document.getElementById('stat-redeemed').textContent = stats.redeemedCount;
        document.getElementById('stat-rate').textContent = `${stats.redemptionRate}%`;
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

export default new Metrics();
