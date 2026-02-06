import api from './api.js';
import activities from './activities.js';
import logoManager from './logoManager.js';

class QrTemplate {
    constructor() {
        this.currentActivity = null;
        this.currentVoucher = null;
    }

    init() {
        this.initEventListeners();
    }

    initEventListeners() {
        // Template config modal
        document.getElementById('template-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveTemplate();
        });

        document.getElementById('template-modal-close').addEventListener('click', () => {
            document.getElementById('template-modal').classList.add('hidden');
        });

        // Color picker sync
        const colorPicker = document.getElementById('template-bg-color');
        const colorText = document.getElementById('template-bg-color-text');

        colorPicker.addEventListener('input', (e) => {
            colorText.value = e.target.value;
            this.updatePreview();
        });

        colorText.addEventListener('change', (e) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                colorPicker.value = e.target.value;
                this.updatePreview();
            }
        });

        // Live preview on input changes
        document.getElementById('template-title').addEventListener('input', () => this.updatePreview());
        document.getElementById('template-product').addEventListener('input', () => this.updatePreview());

        // Logo select callback triggers preview
        logoManager.onSelectCallback = () => this.updatePreview();

        // "Modelo QR" button in activity detail
        document.getElementById('detail-template-btn').addEventListener('click', () => {
            this.openTemplateConfig();
        });

        // Voucher card modal
        document.getElementById('voucher-card-modal-close').addEventListener('click', () => {
            document.getElementById('voucher-card-modal').classList.add('hidden');
        });

        // Export buttons
        document.getElementById('export-png-btn').addEventListener('click', () => this.exportPng());
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportPdf());

        // "Ver Tarjeta" button
        document.getElementById('view-card-btn').addEventListener('click', () => this.openVoucherCard());
    }

    async openTemplateConfig() {
        // Get current activity data from the activityDetail module
        const activityId = document.getElementById('detail-activity-name').dataset.activityId;
        if (!activityId) return;

        // Find activity with template data
        const allActivities = await api.getActivities();
        this.currentActivity = allActivities.find(a => a.id === activityId);
        if (!this.currentActivity) return;

        // Populate form
        document.getElementById('template-title').value = this.currentActivity.templateTitle || '';
        document.getElementById('template-product').value = this.currentActivity.templateProductName || '';
        const bgColor = this.currentActivity.templateBgColor || '#1e293b';
        document.getElementById('template-bg-color').value = bgColor;
        document.getElementById('template-bg-color-text').value = bgColor;

        // Load logos and select the current one
        await logoManager.loadLogos();
        logoManager.renderLogoSelector(this.currentActivity.templateLogoId);

        // Show modal
        document.getElementById('template-modal').classList.remove('hidden');

        // Render preview
        this.updatePreview();
    }

    async saveTemplate() {
        if (!this.currentActivity) return;

        const data = {
            templateTitle: document.getElementById('template-title').value.trim(),
            templateProductName: document.getElementById('template-product').value.trim(),
            templateBgColor: document.getElementById('template-bg-color').value,
            templateLogoId: logoManager.selectedLogoId || null
        };

        try {
            this.showLoading(true);
            const result = await api.updateTemplate(this.currentActivity.id, data);
            this.currentActivity = result.activity;

            // Refresh activities list
            await activities.loadActivities();

            this.showToast('Modelo QR guardado', 'success');
            document.getElementById('template-modal').classList.add('hidden');
        } catch (error) {
            console.error('Error saving template:', error);
            this.showToast('Error al guardar modelo', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async updatePreview() {
        const canvas = document.getElementById('template-preview-canvas');
        if (!canvas) return;

        const template = {
            templateTitle: document.getElementById('template-title').value || 'Titulo del Evento',
            templateProductName: document.getElementById('template-product').value || 'Producto',
            templateBgColor: document.getElementById('template-bg-color').value || '#1e293b',
            templateLogo: logoManager.getSelectedLogo()
        };

        const sampleVoucher = {
            customerName: 'Juan Perez',
            amount: '500',
            createdAt: new Date().toISOString()
        };

        // Generate a simple sample QR as placeholder
        const sampleQr = this.generatePlaceholderQR();

        await this.renderCard(canvas, {
            template,
            voucher: sampleVoucher,
            qrCodeDataUrl: sampleQr
        });
    }

    async openVoucherCard() {
        if (!this.currentVoucher) return;

        const activity = activities.getCurrentActivity();
        if (!activity) return;

        // Fetch full activity with template data
        const allActivities = await api.getActivities();
        const fullActivity = allActivities.find(a => a.id === activity.id);

        if (!fullActivity) return;

        const canvas = document.getElementById('voucher-card-canvas');
        document.getElementById('voucher-card-modal').classList.remove('hidden');

        await this.renderCard(canvas, {
            template: fullActivity,
            voucher: this.currentVoucher,
            qrCodeDataUrl: this.currentVoucher.qrCodeImage
        });
    }

    setCurrentVoucher(voucher) {
        this.currentVoucher = voucher;
    }

    // ========================
    // Canvas Rendering Engine
    // ========================

    async renderCard(canvas, { template, voucher, qrCodeDataUrl }) {
        const ctx = canvas.getContext('2d');
        const W = 800;
        const H = 1200;
        canvas.width = W;
        canvas.height = H;

        // Wait for font
        try {
            await document.fonts.load('bold 36px Inter');
            await document.fonts.load('28px Inter');
            await document.fonts.load('20px Inter');
        } catch (e) { /* fallback to sans-serif */ }

        const bgColor = template.templateBgColor || '#1e293b';

        // 1. Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, W, H);

        // 2. Decorative top band
        ctx.fillStyle = this.lightenColor(bgColor, 10);
        ctx.fillRect(0, 0, W, 200);

        // 3. Logo
        if (template.templateLogo && template.templateLogo.svgContent) {
            try {
                const logoDataUrl = this.prepareSvgForCanvas(template.templateLogo.svgContent, 140, 140);
                const logoImg = await this.loadImage(logoDataUrl);
                const logoX = (W - 140) / 2;
                ctx.drawImage(logoImg, logoX, 30, 140, 140);
            } catch (e) {
                console.warn('Could not render logo:', e);
            }
        }

        // 4. Divider
        this.drawDivider(ctx, W, 220);

        // 5. Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        this.drawWrappedText(ctx, template.templateTitle || template.name || '', W / 2, 275, W - 120, 42);

        // 6. Divider
        this.drawDivider(ctx, W, 320);

        // 7. "TITULAR" label + name
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText('TITULAR', W / 2, 365);

        ctx.fillStyle = '#ffffff';
        ctx.font = '28px Inter, sans-serif';
        this.drawWrappedText(ctx, voucher.customerName || '', W / 2, 400, W - 120, 34);

        // 8. "PRODUCTO" label + amount + product
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText('PRODUCTO', W / 2, 460);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Inter, sans-serif';
        const amountStr = `$${voucher.amount}`;
        const productStr = template.templateProductName ? ` - ${template.templateProductName}` : '';
        this.drawWrappedText(ctx, amountStr + productStr, W / 2, 500, W - 100, 38);

        // 9. Divider
        this.drawDivider(ctx, W, 555);

        // 10. QR code with white rounded background
        const qrSize = 300;
        const qrPad = 20;
        const qrBoxX = (W - qrSize - qrPad * 2) / 2;
        const qrBoxY = 585;

        ctx.fillStyle = '#ffffff';
        this.roundRect(ctx, qrBoxX, qrBoxY, qrSize + qrPad * 2, qrSize + qrPad * 2, 16);
        ctx.fill();

        if (qrCodeDataUrl) {
            try {
                const qrImg = await this.loadImage(qrCodeDataUrl);
                ctx.drawImage(qrImg, qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize);
            } catch (e) {
                // Draw placeholder
                ctx.fillStyle = '#cccccc';
                ctx.font = '16px Inter, sans-serif';
                ctx.fillText('QR Code', W / 2, qrBoxY + qrSize / 2 + qrPad);
            }
        }

        // 11. Footer
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '16px Inter, sans-serif';
        const dateStr = voucher.createdAt
            ? new Date(voucher.createdAt).toLocaleDateString('es-AR')
            : new Date().toLocaleDateString('es-AR');
        ctx.fillText(`Voucher generado el ${dateStr}`, W / 2, 970);

        // 12. Decorative bottom band
        ctx.fillStyle = this.lightenColor(bgColor, 10);
        ctx.fillRect(0, H - 40, W, 40);
    }

    // ========================
    // Export Functions
    // ========================

    exportPng() {
        const canvas = document.getElementById('voucher-card-canvas');
        const customerName = this.currentVoucher?.customerName || 'voucher';
        const filename = `voucher-${customerName.replace(/\s+/g, '-')}.png`;

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        link.click();
    }

    exportPdf() {
        const canvas = document.getElementById('voucher-card-canvas');
        const customerName = this.currentVoucher?.customerName || 'voucher';
        const filename = `voucher-${customerName.replace(/\s+/g, '-')}.pdf`;

        if (!window.jspdf) {
            this.showToast('Cargando libreria PDF...', 'info');
            setTimeout(() => this.exportPdf(), 1000);
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [100, 150]
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);
        pdf.save(filename);
    }

    // ========================
    // Helper Functions
    // ========================

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    prepareSvgForCanvas(svgContent, maxW, maxH) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svg = doc.documentElement;

        if (svg.nodeName === 'parsererror' || doc.querySelector('parsererror')) {
            throw new Error('Invalid SVG');
        }

        svg.setAttribute('width', String(maxW));
        svg.setAttribute('height', String(maxH));

        // Remove scripts and event handlers for safety
        svg.querySelectorAll('script').forEach(s => s.remove());
        const allElements = svg.querySelectorAll('*');
        allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
            });
        });

        const serialized = new XMLSerializer().serializeToString(svg);
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(serialized)));
    }

    lightenColor(hex, percent) {
        const num = parseInt((hex || '#1e293b').replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100));
        const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
        const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
        return `rgb(${r},${g},${b})`;
    }

    roundRect(ctx, x, y, w, h, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    drawDivider(ctx, canvasWidth, y) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(canvasWidth - 60, y);
        ctx.stroke();
    }

    drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (const word of words) {
            const testLine = line ? line + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
                ctx.fillText(line, x, currentY);
                line = word;
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }

    generatePlaceholderQR() {
        // Generate a simple gray QR placeholder for preview
        const c = document.createElement('canvas');
        c.width = 300;
        c.height = 300;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = '#333333';
        // Draw a simple pattern
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                if (Math.random() > 0.5) {
                    ctx.fillRect(i * 20, j * 20, 18, 18);
                }
            }
        }
        // Corner squares
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 60, 60);
        ctx.fillRect(240, 0, 60, 60);
        ctx.fillRect(0, 240, 60, 60);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 8, 44, 44);
        ctx.fillRect(248, 8, 44, 44);
        ctx.fillRect(8, 248, 44, 44);
        ctx.fillStyle = '#000000';
        ctx.fillRect(16, 16, 28, 28);
        ctx.fillRect(256, 16, 28, 28);
        ctx.fillRect(16, 256, 28, 28);
        return c.toDataURL('image/png');
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

export default new QrTemplate();
