import api from './api.js';
import activities from './activities.js';

class Vouchers {
    constructor() {
        this.currentVoucher = null;
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
    }

    async createVoucher() {
        const activity = activities.getCurrentActivity();
        
        if (!activity) {
            this.showToast('Por favor selecciona una actividad', 'error');
            return;
        }

        const customerName = document.getElementById('customer-name').value;
        const amount = parseFloat(document.getElementById('voucher-amount').value);

        try {
            this.showLoading(true);
            const response = await api.createVoucher(activity.id, customerName, amount);
            
            this.currentVoucher = response.voucher;
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
        qrDisplay.innerHTML = `<img src="${voucher.qrCodeImage}" alt="QR Code">`;

        // Display customer info
        document.getElementById('result-customer').textContent = voucher.customerName;
        document.getElementById('result-amount').textContent = `$${voucher.amount}`;
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
                    <p class="text-muted">Monto: $${voucher.amount}</p>
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
