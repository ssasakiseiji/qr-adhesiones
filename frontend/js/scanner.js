import api from './api.js';
import { icon } from './icons.js';

class Scanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
    }

    init() {
        // Scanner will be initialized when view is shown
    }

    async startScanner() {
        if (this.isScanning) return;

        try {
            const { Html5Qrcode } = window;
            this.html5QrCode = new Html5Qrcode("qr-reader");

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            };

            await this.html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    this.onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Ignore scan errors (they happen continuously)
                }
            );

            this.isScanning = true;
        } catch (error) {
            console.error('Error starting scanner:', error);
            this.showToast('Error al iniciar la cámara', 'error');
        }
    }

    async stopScanner() {
        if (!this.isScanning || !this.html5QrCode) return;

        try {
            await this.html5QrCode.stop();
            this.html5QrCode.clear();
            this.isScanning = false;
        } catch (error) {
            console.error('Error stopping scanner:', error);
        }
    }

    async onScanSuccess(qrCode) {
        // Stop scanning immediately
        await this.stopScanner();

        try {
            this.showLoading(true);
            const response = await api.scanQRCode(qrCode);
            
            this.displayScanResult(response);
        } catch (error) {
            console.error('Error scanning QR:', error);
            this.displayScanError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderItemsHtml(items) {
        if (!items || items.length === 0) return '';
        const lines = items.map(i =>
            `<span>${i.quantity}x ${i.productName} — $${i.subtotal.toFixed(2)}</span>`
        ).join('');
        return `<div class="scan-items"><strong>Productos:</strong><div class="scan-items-list">${lines}</div></div>`;
    }

    displayScanResult(response) {
        const { voucher, canRedeem } = response;
        const resultContainer = document.getElementById('scan-result');
        const statusEl = document.getElementById('scan-status');
        const detailsEl = document.getElementById('scan-details');
        const actionsEl = document.getElementById('scan-actions');

        // Hide scanner, show result
        document.getElementById('scanner-container').style.display = 'none';
        resultContainer.classList.remove('hidden');

        const itemsHtml = this.renderItemsHtml(voucher.items);

        if (voucher.isRedeemed) {
            statusEl.innerHTML = `${icon('warning')} Voucher Ya Retirado`;
            statusEl.style.color = 'var(--warning)';

            detailsEl.innerHTML = `
                <p><strong>Cliente:</strong> ${voucher.customerName}</p>
                <p><strong>Monto:</strong> $${voucher.amount}</p>
                ${itemsHtml}
                <p><strong>Retirado el:</strong> ${new Date(voucher.redeemedAt).toLocaleString()}</p>
            `;

            actionsEl.innerHTML = `
                <button class="btn btn-secondary" onclick="window.scanner.resetScanner()">
                    Escanear Otro
                </button>
            `;
        } else {
            statusEl.innerHTML = `${icon('check')} Voucher Válido`;
            statusEl.style.color = 'var(--success)';

            detailsEl.innerHTML = `
                <p><strong>Cliente:</strong> ${voucher.customerName}</p>
                <p><strong>Monto:</strong> $${voucher.amount}</p>
                ${itemsHtml}
                <p><strong>Actividad:</strong> ${voucher.activity.name}</p>
                <p><strong>Creado:</strong> ${new Date(voucher.createdAt).toLocaleString()}</p>
            `;

            actionsEl.innerHTML = `
                <button class="btn btn-primary" onclick="window.scanner.redeemVoucher('${voucher.id}')">
                    Marcar como Retirado
                </button>
                <button class="btn btn-secondary" onclick="window.scanner.resetScanner()">
                    Cancelar
                </button>
            `;
        }
    }

    displayScanError(message) {
        const resultContainer = document.getElementById('scan-result');
        const statusEl = document.getElementById('scan-status');
        const detailsEl = document.getElementById('scan-details');
        const actionsEl = document.getElementById('scan-actions');

        document.getElementById('scanner-container').style.display = 'none';
        resultContainer.classList.remove('hidden');

        statusEl.innerHTML = `${icon('error')} Error`;
        statusEl.style.color = 'var(--error)';
        
        detailsEl.innerHTML = `<p>${message}</p>`;
        
        actionsEl.innerHTML = `
            <button class="btn btn-secondary" onclick="window.scanner.resetScanner()">
                Intentar de Nuevo
            </button>
        `;
    }

    async redeemVoucher(voucherId) {
        try {
            this.showLoading(true);
            await api.redeemVoucher(voucherId);
            
            this.showToast('Voucher marcado como retirado', 'success');
            
            // Trigger event
            window.dispatchEvent(new Event('voucher-redeemed'));
            
            // Reset scanner after short delay
            setTimeout(() => {
                this.resetScanner();
            }, 2000);
        } catch (error) {
            console.error('Error redeeming voucher:', error);
            this.showToast('Error al marcar voucher', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    resetScanner() {
        document.getElementById('scanner-container').style.display = 'block';
        document.getElementById('scan-result').classList.add('hidden');
        this.startScanner();
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

const scanner = new Scanner();
window.scanner = scanner; // Make available globally for onclick handlers
export default scanner;
