import api from './api.js?v=4';
import auth from './auth.js?v=4';
import { icon } from './icons.js?v=4';

class ActivityDetail {
    constructor() {
        this.currentActivityId = null;
        this.currentActivity = null;
        this.products = [];
        this.costs = [];
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

        // Cost management
        document.getElementById('add-cost-btn').addEventListener('click', () => {
            document.getElementById('add-cost-form').classList.remove('hidden');
            document.getElementById('new-cost-description').focus();
        });

        document.getElementById('cancel-cost-btn').addEventListener('click', () => {
            this.hideCostForm();
        });

        document.getElementById('save-cost-btn').addEventListener('click', async () => {
            await this.saveCost();
        });

        // Allow Enter key in cost form
        document.getElementById('new-cost-amount').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveCost();
            }
        });

        // Finalizar button
        document.getElementById('detail-finish-btn').addEventListener('click', async () => {
            await this.finishActivity();
        });
    }

    async loadDetail(activityId) {
        this.currentActivityId = activityId;

        this.showLoading(true);
        try {
            const [metricsData, vouchersResponse, products, costs] = await Promise.all([
                api.getActivityMetrics(activityId),
                api.getVouchers(activityId, null, 1, 100),
                api.getProducts(activityId),
                api.getCosts(activityId)
            ]);

            this.currentActivity = metricsData.activity;
            this.products = products;
            this.costs = costs;
            document.getElementById('detail-filter-status').value = '';

            this.renderHeader(metricsData.activity);
            this.renderMetrics(metricsData.metrics);
            const vouchers = vouchersResponse.vouchers || vouchersResponse;
            this.renderVouchers(Array.isArray(vouchers) ? vouchers : []);
            this.renderProducts(products);
            this.renderCosts(costs);
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
        const finishBtn = document.getElementById('detail-finish-btn');
        const isSuperadmin = document.body.dataset.role === 'superadmin';

        if (activity.finishedAt) {
            badge.textContent = 'Finalizada';
            badge.className = 'voucher-badge finished';
            finishBtn.classList.add('hidden');
        } else if (activity.isActive !== false) {
            badge.textContent = 'Activa';
            badge.className = 'voucher-badge redeemed';
            finishBtn.classList.toggle('hidden', !isSuperadmin);
        } else {
            badge.textContent = 'Inactiva';
            badge.className = 'voucher-badge pending';
            finishBtn.classList.toggle('hidden', !isSuperadmin);
        }
    }

    renderMetrics(metrics) {
        const container = document.getElementById('detail-metrics');
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">${icon('money')}</div>
                <div class="stat-content">
                    <h3>Recaudacion</h3>
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
                <div class="stat-icon">${icon('warning')}</div>
                <div class="stat-content">
                    <h3>Por Retirar</h3>
                    <p class="stat-value">${metrics.pendingCount}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">${icon('chart')}</div>
                <div class="stat-content">
                    <h3>Ganancia</h3>
                    <p class="stat-value">Gs. ${Number(metrics.profit || 0).toLocaleString('es-PY')}</p>
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

    renderCosts(costs) {
        const container = document.getElementById('costs-list');
        const totalEl = document.getElementById('costs-total-amount');
        const role = auth.getRole();
        const isSuperadmin = role === 'superadmin';
        const canManage = role === 'comision' || role === 'superadmin';

        // Show add button based on role
        const addBtn = document.getElementById('add-cost-btn');
        if (addBtn) addBtn.classList.toggle('hidden', !canManage);

        const total = costs.reduce((sum, c) => sum + (parseInt(c.amount) || 0), 0);
        totalEl.textContent = `Gs. ${Number(total).toLocaleString('es-PY')}`;

        if (costs.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay costos registrados</p>';
            return;
        }

        container.innerHTML = costs.map(cost => `
            <div class="product-item" data-id="${cost.id}">
                <div class="product-info">
                    <span class="product-name">${cost.description}</span>
                    <span class="product-price">Gs. ${Number(cost.amount).toLocaleString('es-PY')}</span>
                </div>
                ${isSuperadmin ? `
                <div class="product-actions">
                    <button class="btn-icon btn-danger" onclick="window.activityDetail.deleteCost('${cost.id}')" title="Eliminar">
                        ${icon('error')}
                    </button>
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    async saveCost() {
        const descInput = document.getElementById('new-cost-description');
        const amountInput = document.getElementById('new-cost-amount');

        const description = descInput.value.trim();
        const amount = parseInt(amountInput.value);

        if (!description || description.length < 2) {
            this.showToast('La descripcion debe tener al menos 2 caracteres', 'error');
            return;
        }

        if (isNaN(amount) || amount < 0) {
            this.showToast('El monto debe ser un numero valido', 'error');
            return;
        }

        try {
            await api.createCost(this.currentActivityId, description, amount);
            this.showToast('Costo registrado', 'success');
            this.hideCostForm();
            this.costs = await api.getCosts(this.currentActivityId);
            this.renderCosts(this.costs);
        } catch (error) {
            console.error('Error creating cost:', error);
            this.showToast('Error al registrar costo', 'error');
        }
    }

    async deleteCost(costId) {
        if (!confirm('Eliminar este costo?')) return;

        try {
            await api.deleteCost(costId);
            this.showToast('Costo eliminado', 'success');
            this.costs = await api.getCosts(this.currentActivityId);
            this.renderCosts(this.costs);
        } catch (error) {
            console.error('Error deleting cost:', error);
            this.showToast('Error al eliminar costo', 'error');
        }
    }

    hideCostForm() {
        document.getElementById('add-cost-form').classList.add('hidden');
        document.getElementById('new-cost-description').value = '';
        document.getElementById('new-cost-amount').value = '';
    }

    async saveProduct() {
        const nameInput = document.getElementById('new-product-name');
        const priceInput = document.getElementById('new-product-price');

        const name = nameInput.value.trim();
        const price = parseInt(priceInput.value);

        if (!name || name.length < 2) {
            this.showToast('El nombre debe tener al menos 2 caracteres', 'error');
            return;
        }

        if (isNaN(price) || price < 0) {
            this.showToast('El precio debe ser un numero valido', 'error');
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
        if (!confirm('Eliminar este producto?')) return;

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

    async finishActivity() {
        if (!confirm('Finalizar esta actividad? No se podran crear mas ventas.')) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            await api.updateActivity(this.currentActivityId, { finishedAt: today });
            this.showToast('Actividad finalizada', 'success');
            // Reload detail
            await this.loadDetail(this.currentActivityId);
            // Refresh activities list
            window.dispatchEvent(new Event('activity-changed'));
        } catch (error) {
            console.error('Error finishing activity:', error);
            this.showToast('Error al finalizar actividad', 'error');
        }
    }

    async loadVouchers() {
        const isRedeemed = document.getElementById('detail-filter-status').value;
        try {
            const response = await api.getVouchers(
                this.currentActivityId,
                isRedeemed !== '' ? isRedeemed : null,
                1,
                100
            );
            const vouchers = response.vouchers || response;
            this.renderVouchers(Array.isArray(vouchers) ? vouchers : []);
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
