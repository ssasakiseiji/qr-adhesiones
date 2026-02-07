import api from './api.js?v=4';
import { icon } from './icons.js?v=4';

class Scanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
    }

    init() {
        // Gallery import
        document.getElementById('gallery-scan-btn').addEventListener('click', () => {
            document.getElementById('gallery-file-input').click();
        });

        document.getElementById('gallery-file-input').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.scanFromFile(e.target.files[0]);
            }
            // Reset so same file can be selected again
            e.target.value = '';
        });
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
            this.showToast('Error al iniciar la camara', 'error');
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

    async scanFromFile(file) {
        if (!file) return;

        try {
            await this.stopScanner();
            this.showLoading(true, 'Leyendo imagen...');

            const html5QrCode = new Html5Qrcode("qr-reader");
            const result = await html5QrCode.scanFile(file, false);
            await html5QrCode.clear();
            await this.onScanSuccess(result);
        } catch (error) {
            console.error('Error scanning file:', error);
            this.displayScanError('No se pudo leer un codigo QR de la imagen');
        } finally {
            this.showLoading(false);
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
            `<span>${i.quantity}x ${i.productName} — Gs. ${Number(i.subtotal).toLocaleString('es-PY')}</span>`
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
                <p><strong>Monto:</strong> Gs. ${Number(voucher.amount).toLocaleString('es-PY')}</p>
                ${itemsHtml}
                <p><strong>Retirado el:</strong> ${new Date(voucher.redeemedAt).toLocaleString()}</p>
            `;

            actionsEl.innerHTML = `
                <button class="btn btn-secondary" onclick="window.scanner.resetScanner()">
                    Escanear Otro
                </button>
            `;
        } else {
            statusEl.innerHTML = `${icon('check')} Voucher Valido`;
            statusEl.style.color = 'var(--success)';

            detailsEl.innerHTML = `
                <p><strong>Cliente:</strong> ${voucher.customerName}</p>
                <p><strong>Monto:</strong> Gs. ${Number(voucher.amount).toLocaleString('es-PY')}</p>
                ${itemsHtml}
                <p><strong>Actividad:</strong> ${voucher.activity.name}</p>
                <p><strong>Creado:</strong> ${new Date(voucher.createdAt).toLocaleString()}</p>
            `;

            actionsEl.innerHTML = `
                <button class="btn btn-primary" id="redeem-btn" onclick="window.scanner.redeemVoucher('${voucher.id}')">
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
        // Show processing state on the button
        const redeemBtn = document.getElementById('redeem-btn');
        if (redeemBtn) {
            redeemBtn.disabled = true;
            redeemBtn.textContent = 'Procesando...';
        }

        try {
            this.showLoading(true, 'Procesando...');
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
            // Restore button
            if (redeemBtn) {
                redeemBtn.disabled = false;
                redeemBtn.textContent = 'Marcar como Retirado';
            }
        } finally {
            this.showLoading(false);
        }
    }

    resetScanner() {
        document.getElementById('scanner-container').style.display = 'block';
        document.getElementById('scan-result').classList.add('hidden');
        this.startScanner();
    }

    showLoading(show, text = '') {
        document.getElementById('loading-overlay').classList.toggle('hidden', !show);
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
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
