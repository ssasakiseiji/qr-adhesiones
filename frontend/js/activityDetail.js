import api from './api.js?v=3';
import { icon } from './icons.js?v=3';

class ActivityDetail {
    constructor() {
        this.currentActivityId = null;
        this.currentActivity = null;
        this.products = [];
    }

    init() {
        document.getElementById('detail-back-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate-view', { detail: { view: 'activities' } }));
        });

        document.getElementById('detail-filter-status').addEventListener('change', () => {
            this.loadVouchers();
        });

        // Product management
        document.getElementById('add-product-btn').addEventListener('click', () => {
            document.getElementById('add-product-form').classList.remove('hidden');
            document.getElementById('new-product-name').focus();
        });

        document.getElementById('cancel-product-btn').addEventListener('click', () => {
            this.hideProductForm();
        });

        document.getElementById('save-product-btn').addEventListener('click', async () => {
            await this.saveProduct();
        });

        // Allow Enter key in product form
        document.getElementById('new-product-price').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveProduct();
            }
        });
    }

    async loadDetail(activityId) {
        this.currentActivityId = activityId;

        this.showLoading(true);
        try {
            const [metricsData, vouchers, products] = await Promise.all([
                api.getActivityMetrics(activityId),
                api.getVouchers(activityId, null),
                api.getProducts(activityId)
            ]);

            this.currentActivity = metricsData.activity;
            this.products = products;
            document.getElementById('detail-filter-status').value = '';

            this.renderHeader(metricsData.activity);
            this.renderMetrics(metricsData.metrics);
            this.renderVouchers(vouchers);
            this.renderProducts(products);
        } catch (error) {
            console.error('Error loading activity detail:', error);
            this.showToast('Error al cargar detalles de actividad', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderHeader(activity) {
        const nameEl = document.getElementById('detail-activity-name');
        nameEl.textContent = activity.name;
        nameEl.dataset.activityId = activity.id;
        const badge = document.getElementById('detail-activity-badge');
        badge.textContent = activity.isActive !== false ? 'Activa' : 'Inactiva';
        badge.className = `voucher-badge ${activity.isActive !== false ? 'redeemed' : 'pending'}`;
    }

    renderMetrics(metrics) {
        const container = document.getElementById('detail-metrics');
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">${icon('money')}</div>
                <div class="stat-content">
                    <h3>Recaudación</h3>
                    <p class="stat-value">Gs. ${Number(metrics.totalRevenue).toLocaleString('es-PY')}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">${icon('ticket')}</div>
                <div class="stat-content">
                    <h3>Vendidos</h3>
                    <p class="stat-value">${metrics.totalVouchers}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">${icon('check')}</div>
                <div class="stat-content">
                    <h3>Retirados</h3>
                    <p class="stat-value">${metrics.redeemedCount}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">${icon('chart')}</div>
                <div class="stat-content">
                    <h3>Tasa de Retiro</h3>
                    <p class="stat-value">${metrics.redemptionRate}%</p>
                </div>
            </div>
        `;
    }

    renderProducts(products) {
        const container = document.getElementById('products-list');

        if (products.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay productos definidos</p>';
            return;
        }

        const isSuperadmin = document.body.dataset.role === 'superadmin';

        container.innerHTML = products.map(product => `
            <div class="product-item ${!product.isActive ? 'product-inactive' : ''}" data-id="${product.id}">
                <div class="product-info">
                    <span class="product-name">${product.name}</span>
                    <span class="product-price">Gs. ${Number(product.price).toLocaleString('es-PY')}</span>
                </div>
                ${isSuperadmin ? `
                <div class="product-actions">
                    <button class="btn-icon" onclick="window.activityDetail.toggleProduct('${product.id}', ${!product.isActive})" title="${product.isActive ? 'Desactivar' : 'Activar'}">
                        ${product.isActive ? icon('check') : icon('error')}
                    </button>
                    <button class="btn-icon btn-danger" onclick="window.activityDetail.deleteProduct('${product.id}')" title="Eliminar">
                        ${icon('error')}
                    </button>
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    async saveProduct() {
        const nameInput = document.getElementById('new-product-name');
        const priceInput = document.getElementById('new-product-price');

        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);

        if (!name || name.length < 2) {
            this.showToast('El nombre debe tener al menos 2 caracteres', 'error');
            return;
        }

        if (isNaN(price) || price < 0) {
            this.showToast('El precio debe ser un número válido', 'error');
            return;
        }

        try {
            await api.createProduct(this.currentActivityId, name, price);
            this.showToast('Producto creado', 'success');
            this.hideProductForm();
            // Reload products
            this.products = await api.getProducts(this.currentActivityId);
            this.renderProducts(this.products);
        } catch (error) {
            console.error('Error creating product:', error);
            this.showToast('Error al crear producto', 'error');
        }
    }

    async toggleProduct(productId, isActive) {
        try {
            await api.updateProduct(productId, { isActive });
            this.products = await api.getProducts(this.currentActivityId);
            this.renderProducts(this.products);
        } catch (error) {
            console.error('Error updating product:', error);
            this.showToast('Error al actualizar producto', 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Eliminar este producto?')) return;

        try {
            await api.deleteProduct(productId);
            this.showToast('Producto eliminado', 'success');
            this.products = await api.getProducts(this.currentActivityId);
            this.renderProducts(this.products);
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showToast('Error al eliminar producto', 'error');
        }
    }

    hideProductForm() {
        document.getElementById('add-product-form').classList.add('hidden');
        document.getElementById('new-product-name').value = '';
        document.getElementById('new-product-price').value = '';
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

        container.innerHTML = vouchers.map(voucher => {
            const items = voucher.items;
            const itemsSummary = items && items.length > 0
                ? items.map(i => `${i.quantity}x ${i.productName}`).join(', ')
                : '';

            return `
                <div class="voucher-item">
                    <div>
                        <h4>${voucher.customerName}</h4>
                        <p class="text-muted">Monto: Gs. ${Number(voucher.amount).toLocaleString('es-PY')}</p>
                        ${itemsSummary ? `<p class="text-muted text-small">${itemsSummary}</p>` : ''}
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
            `;
        }).join('');
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

const activityDetail = new ActivityDetail();
window.activityDetail = activityDetail;
export default activityDetail;
