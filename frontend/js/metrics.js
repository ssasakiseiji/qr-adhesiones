import api from './api.js?v=4';
import activities from './activities.js?v=4';
import vouchers from './vouchers.js?v=4';
import qrTemplate from './qrTemplate.js?v=4';
import auth from './auth.js?v=4';
import { icon } from './icons.js?v=4';

class Metrics {
    constructor() {
        this.currentMetrics = null;
        this.currentPage = 1;
        this.pageSize = 20;
        this.sortBy = 'createdAt';
        this.sortOrder = 'DESC';
        this.totalPages = 1;
    }

    init() {
        this.initEventListeners();
    }

    reset() {
        this.currentMetrics = null;
        this.currentPage = 1;
    }

    initEventListeners() {
        // Filter changes
        document.getElementById('filter-activity').addEventListener('change', () => {
            this.currentPage = 1;
            this.loadVouchersTable();
        });

        document.getElementById('filter-status').addEventListener('change', () => {
            this.currentPage = 1;
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

        // Voucher edit modal
        document.getElementById('voucher-edit-modal-close').addEventListener('click', () => {
            document.getElementById('voucher-edit-modal').classList.add('hidden');
        });

        document.getElementById('voucher-edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveVoucherEdit();
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
            this.showToast('Error al cargar metricas', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderOverallMetrics(overall) {
        const container = document.getElementById('overall-metrics');

        container.innerHTML = `
            <div class="stats-grid stats-grid-5">
                <div class="stat-card">
                    <div class="stat-icon">${icon('money')}</div>
                    <div class="stat-content">
                        <h3>Recaudacion</h3>
                        <p class="stat-value">Gs. ${Number(overall.totalRevenue).toLocaleString('es-PY')}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${icon('ticket')}</div>
                    <div class="stat-content">
                        <h3>Vendidos</h3>
                        <p class="stat-value">${overall.totalVouchers}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${icon('warning')}</div>
                    <div class="stat-content">
                        <h3>Por Retirar</h3>
                        <p class="stat-value">${overall.pendingCount}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${icon('money')}</div>
                    <div class="stat-content">
                        <h3>Costos</h3>
                        <p class="stat-value">Gs. ${Number(overall.totalCosts || 0).toLocaleString('es-PY')}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">${icon('chart')}</div>
                    <div class="stat-content">
                        <h3>Ganancia</h3>
                        <p class="stat-value">Gs. ${Number(overall.profit || 0).toLocaleString('es-PY')}</p>
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
                            <small class="text-muted">Recaudacion</small>
                            <p class="activity-metric-value activity-metric-highlight">Gs. ${Number(activity.totalRevenue).toLocaleString('es-PY')}</p>
                        </div>
                        <div>
                            <small class="text-muted">Costos</small>
                            <p class="activity-metric-value">Gs. ${Number(activity.totalCosts || 0).toLocaleString('es-PY')}</p>
                        </div>
                        <div>
                            <small class="text-muted">Ganancia</small>
                            <p class="activity-metric-value">Gs. ${Number(activity.profit || 0).toLocaleString('es-PY')}</p>
                        </div>
                        <div>
                            <small class="text-muted">Por Retirar</small>
                            <p class="activity-metric-value">${(activity.totalVouchers - activity.redeemedCount)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadVouchersTable() {
        const activityId = document.getElementById('filter-activity').value;
        const isRedeemed = document.getElementById('filter-status').value;

        try {
            const response = await api.getVouchers(
                activityId || null,
                isRedeemed !== '' ? isRedeemed : null,
                this.currentPage,
                this.pageSize,
                this.sortBy,
                this.sortOrder
            );

            if (response.pagination) {
                this.totalPages = response.pagination.totalPages;
                this.renderVouchersTable(response.vouchers, response.pagination);
            } else {
                // Backwards compat if backend hasn't been updated yet
                this.renderVouchersTable(response, null);
            }
        } catch (error) {
            console.error('Error loading vouchers table:', error);
        }
    }

    renderVouchersTable(vouchersList, pagination) {
        const container = document.getElementById('vouchers-table');
        const role = auth.getRole();
        const isSuperadmin = role === 'superadmin';

        if (!vouchersList || vouchersList.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay vouchers</p>';
            return;
        }

        const sortIcon = (col) => {
            if (this.sortBy !== col) return '';
            return this.sortOrder === 'ASC' ? ' ↑' : ' ↓';
        };

        const rows = vouchersList.map(voucher => `
            <tr>
                <td>${voucher.customerName}</td>
                <td>Gs. ${Number(voucher.amount).toLocaleString('es-PY')}</td>
                <td>${voucher.activity ? voucher.activity.name : '-'}</td>
                <td>
                    <span class="voucher-badge ${voucher.isRedeemed ? 'redeemed' : 'pending'}">
                        ${voucher.isRedeemed ? 'Retirado' : 'Pendiente'}
                    </span>
                </td>
                <td>${new Date(voucher.createdAt).toLocaleString()}</td>
                <td class="table-actions">
                    <button class="btn-icon" onclick="window.metricsModule.viewVoucher('${voucher.id}')" title="Ver voucher">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2rem;height:1.2rem;">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    ${isSuperadmin ? `
                        <button class="btn-icon" onclick="window.metricsModule.editVoucher('${voucher.id}', '${voucher.customerName.replace(/'/g, "\\'")}', ${voucher.amount})" title="Editar">
                            ${icon('edit')}
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        let paginationHtml = '';
        if (pagination && pagination.totalPages > 1) {
            paginationHtml = `
                <div class="table-pagination">
                    <button class="btn btn-outline btn-sm" onclick="window.metricsModule.goToPage(${this.currentPage - 1})" ${this.currentPage <= 1 ? 'disabled' : ''}>
                        Anterior
                    </button>
                    <span class="pagination-info">Pagina ${pagination.page} de ${pagination.totalPages}</span>
                    <button class="btn btn-outline btn-sm" onclick="window.metricsModule.goToPage(${this.currentPage + 1})" ${this.currentPage >= pagination.totalPages ? 'disabled' : ''}>
                        Siguiente
                    </button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="sortable" onclick="window.metricsModule.sortTable('customerName')">Cliente${sortIcon('customerName')}</th>
                            <th class="sortable" onclick="window.metricsModule.sortTable('amount')">Monto${sortIcon('amount')}</th>
                            <th>Actividad</th>
                            <th class="sortable" onclick="window.metricsModule.sortTable('isRedeemed')">Estado${sortIcon('isRedeemed')}</th>
                            <th class="sortable" onclick="window.metricsModule.sortTable('createdAt')">Fecha${sortIcon('createdAt')}</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
            ${paginationHtml}
        `;
    }

    sortTable(column) {
        if (this.sortBy === column) {
            this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            this.sortBy = column;
            this.sortOrder = 'DESC';
        }
        this.currentPage = 1;
        this.loadVouchersTable();
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadVouchersTable();
    }

    async viewVoucher(voucherId) {
        try {
            this.showLoading(true);
            await qrTemplate.showVoucherCard(voucherId);
        } catch (error) {
            console.error('Error viewing voucher:', error);
            this.showToast('Error al cargar voucher', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    editVoucher(id, customerName, amount) {
        document.getElementById('edit-voucher-id').value = id;
        document.getElementById('edit-customer-name').value = customerName;
        document.getElementById('edit-voucher-amount').value = amount;
        document.getElementById('voucher-edit-modal').classList.remove('hidden');
    }

    async saveVoucherEdit() {
        const id = document.getElementById('edit-voucher-id').value;
        const customerName = document.getElementById('edit-customer-name').value;
        const amount = parseInt(document.getElementById('edit-voucher-amount').value);

        try {
            await api.updateVoucher(id, { customerName, amount });
            document.getElementById('voucher-edit-modal').classList.add('hidden');
            this.showToast('Voucher actualizado', 'success');
            await this.loadVouchersTable();
        } catch (error) {
            console.error('Error updating voucher:', error);
            this.showToast('Error al actualizar voucher', 'error');
        }
    }

    async updateDashboard() {
        try {
            const activity = activities.getCurrentActivity();

            if (!activity) {
                const metrics = await api.getSummaryMetrics();
                this.updateDashboardStats(metrics.overall);
                const response = await api.getVouchers(null, null, 1, 5, 'createdAt', 'DESC');
                const recentVouchers = response.vouchers || response;
                vouchers.renderVouchersList(Array.isArray(recentVouchers) ? recentVouchers.slice(0, 5) : recentVouchers, 'recent-vouchers-list');
            } else {
                const metrics = await api.getActivityMetrics(activity.id);
                this.updateDashboardStats(metrics.metrics);
                const response = await api.getVouchers(activity.id, null, 1, 5, 'createdAt', 'DESC');
                const recentVouchers = response.vouchers || response;
                vouchers.renderVouchersList(Array.isArray(recentVouchers) ? recentVouchers.slice(0, 5) : recentVouchers, 'recent-vouchers-list');
            }
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('stat-revenue').textContent = `Gs. ${Number(stats.totalRevenue).toLocaleString('es-PY')}`;
        document.getElementById('stat-sold').textContent = stats.totalVouchers;
        document.getElementById('stat-redeemed').textContent = stats.redeemedCount;
        document.getElementById('stat-pending').textContent = stats.pendingCount;
        document.getElementById('stat-profit').textContent = `Gs. ${Number(stats.profit || 0).toLocaleString('es-PY')}`;
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

const metricsInstance = new Metrics();
window.metricsModule = metricsInstance;
export default metricsInstance;
