import api from './api.js?v=2';
import activities from './activities.js?v=2';
import qrTemplate from './qrTemplate.js?v=2';

class Vouchers {
    constructor() {
        this.currentVoucher = null;
        this.products = [];
        this.cart = {}; // { productId: quantity }
        this.hasProducts = false;
        this.totalEditable = false;
    }

    init() {
        this.initEventListeners();
    }

    initEventListeners() {
        // Voucher form
        document.getElementById('voucher-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createVoucher();
        });

        // Download QR button
        document.getElementById('download-qr').addEventListener('click', () => {
            this.downloadQR();
        });

        // New voucher button
        document.getElementById('new-voucher').addEventListener('click', () => {
            this.resetForm();
        });

        // Toggle edit total
        document.getElementById('toggle-edit-total').addEventListener('click', () => {
            this.toggleEditTotal();
        });

        // Listen for activity changes to reload products
        document.getElementById('activity-selector').addEventListener('change', () => {
            this.loadProductsForActivity();
        });
    }

    async loadProductsForActivity() {
        const activity = activities.getCurrentActivity();
        if (!activity) {
            this.products = [];
            this.hasProducts = false;
            this.renderProductPicker();
            return;
        }

        try {
            const allProducts = await api.getProducts(activity.id);
            this.products = allProducts.filter(p => p.isActive);
            this.hasProducts = this.products.length > 0;
            this.cart = {};
            this.totalEditable = false;
            this.renderProductPicker();
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = [];
            this.hasProducts = false;
            this.renderProductPicker();
        }
    }

    renderProductPicker() {
        const pickerContainer = document.getElementById('product-picker');
        const pickerList = document.getElementById('product-picker-list');
        const amountInput = document.getElementById('voucher-amount');
        const toggleBtn = document.getElementById('toggle-edit-total');

        if (!this.hasProducts) {
            pickerContainer.classList.add('hidden');
            toggleBtn.classList.add('hidden');
            amountInput.readOnly = false;
            amountInput.value = '';
            return;
        }

        pickerContainer.classList.remove('hidden');
        toggleBtn.classList.remove('hidden');

        pickerList.innerHTML = this.products.map(product => {
            const qty = this.cart[product.id] || 0;
            const subtotal = qty * parseFloat(product.price);
            return `
                <div class="product-picker-item">
                    <div class="product-picker-info">
                        <span class="product-picker-name">${product.name}</span>
                        <span class="product-picker-price">Gs. ${Number(product.price).toLocaleString('es-PY')}</span>
                    </div>
                    <div class="product-picker-controls">
                        <button type="button" class="qty-btn qty-minus" data-product-id="${product.id}" ${qty === 0 ? 'disabled' : ''}>−</button>
                        <span class="qty-value">${qty}</span>
                        <button type="button" class="qty-btn qty-plus" data-product-id="${product.id}">+</button>
                    </div>
                    <div class="product-picker-subtotal">
                        ${qty > 0 ? `Gs. ${Number(subtotal).toLocaleString('es-PY')}` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Bind quantity buttons
        pickerList.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.productId;
                this.cart[productId] = (this.cart[productId] || 0) + 1;
                this.renderProductPicker();
                this.updateTotal();
            });
        });

        pickerList.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.productId;
                if (this.cart[productId] > 0) {
                    this.cart[productId]--;
                    if (this.cart[productId] === 0) delete this.cart[productId];
                }
                this.renderProductPicker();
                this.updateTotal();
            });
        });

        // Set amount field state
        if (!this.totalEditable) {
            amountInput.readOnly = true;
            this.updateTotal();
        }
    }

    updateTotal() {
        if (this.totalEditable) return;

        let total = 0;
        for (const [productId, qty] of Object.entries(this.cart)) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                total += qty * parseFloat(product.price);
            }
        }

        document.getElementById('voucher-amount').value = total > 0 ? total.toFixed(2) : '';
    }

    toggleEditTotal() {
        this.totalEditable = !this.totalEditable;
        const amountInput = document.getElementById('voucher-amount');
        const toggleBtn = document.getElementById('toggle-edit-total');

        if (this.totalEditable) {
            amountInput.readOnly = false;
            amountInput.focus();
            toggleBtn.textContent = 'Auto';
            toggleBtn.title = 'Volver al cálculo automático';
        } else {
            amountInput.readOnly = true;
            toggleBtn.textContent = 'Editar';
            toggleBtn.title = 'Editar total manualmente';
            this.updateTotal();
        }
    }

    buildItems() {
        if (!this.hasProducts || Object.keys(this.cart).length === 0) return null;

        const items = [];
        for (const [productId, qty] of Object.entries(this.cart)) {
            if (qty <= 0) continue;
            const product = this.products.find(p => p.id === productId);
            if (!product) continue;
            items.push({
                productId: product.id,
                productName: product.name,
                unitPrice: parseFloat(product.price),
                quantity: qty,
                subtotal: qty * parseFloat(product.price)
            });
        }
        return items.length > 0 ? items : null;
    }

    async createVoucher() {
        const activity = activities.getCurrentActivity();

        if (!activity) {
            this.showToast('Por favor selecciona una actividad', 'error');
            return;
        }

        const customerName = document.getElementById('customer-name').value;
        const amount = parseFloat(document.getElementById('voucher-amount').value);
        const items = this.buildItems();

        if (isNaN(amount) || amount <= 0) {
            this.showToast('El monto debe ser mayor a 0', 'error');
            return;
        }

        try {
            this.showLoading(true);
            const response = await api.createVoucher(activity.id, customerName, amount, items);

            this.currentVoucher = response.voucher;
            qrTemplate.setCurrentVoucher(response.voucher);
            this.displayVoucher(response.voucher);

            this.showToast('Voucher creado exitosamente', 'success');

            // Trigger voucher created event
            window.dispatchEvent(new Event('voucher-created'));
        } catch (error) {
            console.error('Error creating voucher:', error);
            this.showToast('Error al crear voucher', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayVoucher(voucher) {
        // Hide form, show result
        document.getElementById('voucher-form').style.display = 'none';
        document.getElementById('qr-result').classList.remove('hidden');

        // Display QR code
        const qrDisplay = document.getElementById('qr-code-display');
        qrDisplay.innerHTML = `<img src="${voucher.qrCodeImage}" alt="QR Code" loading="lazy">`;

        // Display customer info
        document.getElementById('result-customer').textContent = voucher.customerName;
        document.getElementById('result-amount').textContent = `Gs. ${Number(voucher.amount).toLocaleString('es-PY')}`;
    }

    downloadQR() {
        if (!this.currentVoucher) return;

        const link = document.createElement('a');
        link.href = this.currentVoucher.qrCodeImage;
        link.download = `voucher-${this.currentVoucher.customerName.replace(/\s+/g, '-')}.png`;
        link.click();
    }

    resetForm() {
        document.getElementById('voucher-form').reset();
        document.getElementById('voucher-form').style.display = 'block';
        document.getElementById('qr-result').classList.add('hidden');
        this.currentVoucher = null;
        this.cart = {};
        this.totalEditable = false;

        const toggleBtn = document.getElementById('toggle-edit-total');
        toggleBtn.textContent = 'Editar';
        toggleBtn.title = 'Editar total manualmente';

        this.renderProductPicker();
    }

    async loadVouchers(activityId = null, isRedeemed = null) {
        try {
            const vouchers = await api.getVouchers(activityId, isRedeemed);
            return vouchers;
        } catch (error) {
            console.error('Error loading vouchers:', error);
            this.showToast('Error al cargar vouchers', 'error');
            return [];
        }
    }

    renderVouchersList(vouchers, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (vouchers.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay vouchers</p>';
            return;
        }

        container.innerHTML = vouchers.map(voucher => `
            <div class="voucher-item">
                <div>
                    <h4>${voucher.customerName}</h4>
                    <p class="text-muted">Monto: Gs. ${Number(voucher.amount).toLocaleString('es-PY')}</p>
                    <small class="text-muted">${new Date(voucher.createdAt).toLocaleString()}</small>
                </div>
                <div>
                    <span class="voucher-badge ${voucher.isRedeemed ? 'redeemed' : 'pending'}">
                        ${voucher.isRedeemed ? 'Retirado' : 'Pendiente'}
                    </span>
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

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

export default new Vouchers();
