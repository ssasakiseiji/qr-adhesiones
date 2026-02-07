import api from './api.js?v=3';
import activities from './activities.js?v=3';
import logoManager from './logoManager.js?v=3';

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

        // Gradient color picker sync
        const colorPicker2 = document.getElementById('template-bg-color2');
        const colorText2 = document.getElementById('template-bg-color2-text');

        colorPicker2.addEventListener('input', (e) => {
            colorText2.value = e.target.value;
            this.updatePreview();
        });

        colorText2.addEventListener('change', (e) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                colorPicker2.value = e.target.value;
                this.updatePreview();
            } else if (e.target.value === '') {
                this.updatePreview();
            }
        });

        document.getElementById('clear-gradient-btn').addEventListener('click', () => {
            colorText2.value = '';
            this.updatePreview();
        });

        // Logo size
        document.getElementById('template-logo-size').addEventListener('change', () => this.updatePreview());

        // Live preview on input changes
        document.getElementById('template-title').addEventListener('input', () => this.updatePreview());
        document.getElementById('template-product').addEventListener('input', () => this.updatePreview());
        document.getElementById('template-pickup-date').addEventListener('change', () => this.updatePreview());
        document.getElementById('template-pickup-start').addEventListener('change', () => this.updatePreview());
        document.getElementById('template-pickup-end').addEventListener('change', () => this.updatePreview());

        // Text color toggle
        document.querySelectorAll('.text-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.text-color-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderColor = 'transparent';
                });
                e.currentTarget.classList.add('active');
                e.currentTarget.style.borderColor = 'var(--primary)';
                document.getElementById('template-text-color').value = e.currentTarget.dataset.color;
                this.updatePreview();
            });
        });

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

        // Populate gradient color
        const bgColor2 = this.currentActivity.templateBgColor2 || '';
        document.getElementById('template-bg-color2-text').value = bgColor2;
        if (bgColor2) document.getElementById('template-bg-color2').value = bgColor2;

        // Populate logo size
        document.getElementById('template-logo-size').value = this.currentActivity.templateLogoSize || 180;

        // Populate text color toggle
        const textColor = this.currentActivity.templateTextColor || '#ffffff';
        document.getElementById('template-text-color').value = textColor;
        document.querySelectorAll('.text-color-btn').forEach(btn => {
            const isActive = btn.dataset.color === textColor;
            btn.classList.toggle('active', isActive);
            btn.style.borderColor = isActive ? 'var(--primary)' : 'transparent';
        });

        // Populate pickup fields
        document.getElementById('template-pickup-date').value = this.currentActivity.pickupDate || '';
        document.getElementById('template-pickup-start').value = this.currentActivity.pickupStartTime || '';
        document.getElementById('template-pickup-end').value = this.currentActivity.pickupEndTime || '';

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

        const bgColor2Text = document.getElementById('template-bg-color2-text').value;
        const data = {
            templateTitle: document.getElementById('template-title').value.trim(),
            templateProductName: document.getElementById('template-product').value.trim(),
            templateBgColor: document.getElementById('template-bg-color').value,
            templateBgColor2: bgColor2Text && /^#[0-9A-Fa-f]{6}$/.test(bgColor2Text) ? bgColor2Text : null,
            templateTextColor: document.getElementById('template-text-color').value,
            templateLogoSize: parseInt(document.getElementById('template-logo-size').value) || 180,
            templateLogoId: logoManager.selectedLogoId || null,
            pickupDate: document.getElementById('template-pickup-date').value || null,
            pickupStartTime: document.getElementById('template-pickup-start').value || null,
            pickupEndTime: document.getElementById('template-pickup-end').value || null
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

        const bgColor2Val = document.getElementById('template-bg-color2-text').value;
        const template = {
            templateTitle: document.getElementById('template-title').value || 'Titulo del Evento',
            templateProductName: document.getElementById('template-product').value || 'Producto',
            templateBgColor: document.getElementById('template-bg-color').value || '#1e293b',
            templateBgColor2: bgColor2Val && /^#[0-9A-Fa-f]{6}$/.test(bgColor2Val) ? bgColor2Val : null,
            templateTextColor: document.getElementById('template-text-color').value || '#ffffff',
            templateLogoSize: parseInt(document.getElementById('template-logo-size').value) || 180,
            templateLogo: logoManager.getSelectedLogo(),
            pickupDate: document.getElementById('template-pickup-date').value || '',
            pickupStartTime: document.getElementById('template-pickup-start').value || '',
            pickupEndTime: document.getElementById('template-pickup-end').value || ''
        };

        const sampleVoucher = {
            customerName: 'Juan Perez',
            amount: '500',
            items: null,
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
        const textColor = template.templateTextColor || '#ffffff';

        // 1. Background - solid or gradient
        const bgColor2 = template.templateBgColor2 || null;
        if (bgColor2) {
            const gradient = ctx.createLinearGradient(0, 0, 0, H);
            gradient.addColorStop(0, bgColor);
            gradient.addColorStop(1, bgColor2);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fillRect(0, 0, W, H);

        let currentY = 60;

        // 2. Logo (configurable size)
        if (template.templateLogo && template.templateLogo.svgContent) {
            try {
                const logoSize = template.templateLogoSize || 180;
                const logoDataUrl = this.prepareSvgForCanvas(template.templateLogo.svgContent, logoSize, logoSize);
                const logoImg = await this.loadImage(logoDataUrl);
                ctx.drawImage(logoImg, (W - logoSize) / 2, currentY, logoSize, logoSize);
                currentY += logoSize + 30;
            } catch (e) {
                console.warn('Could not render logo:', e);
                currentY += 30;
            }
        } else {
            currentY += 30;
        }

        // 3. Title
        ctx.fillStyle = textColor;
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        const titleText = template.templateTitle || template.name || '';
        this.drawWrappedText(ctx, titleText, W / 2, currentY, W - 120, 42);
        const titleLines = this.measureWrappedLines(ctx, titleText, W - 120);
        currentY += titleLines * 42 + 40;

        // 4. QR code - prominent, bigger (350px), white rounded box
        const qrSize = 350;
        const qrPad = 20;
        const qrBoxX = (W - qrSize - qrPad * 2) / 2;
        const qrBoxY = currentY;

        ctx.fillStyle = '#ffffff';
        this.roundRect(ctx, qrBoxX, qrBoxY, qrSize + qrPad * 2, qrSize + qrPad * 2, 16);
        ctx.fill();

        if (qrCodeDataUrl) {
            try {
                const qrImg = await this.loadImage(qrCodeDataUrl);
                ctx.drawImage(qrImg, qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize);
            } catch (e) {
                ctx.fillStyle = '#cccccc';
                ctx.font = '16px Inter, sans-serif';
                ctx.fillText('QR Code', W / 2, qrBoxY + qrSize / 2 + qrPad);
            }
        }

        currentY = qrBoxY + qrSize + qrPad * 2 + 40;

        // 5. Products (items list or template product name)
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        const items = voucher.items && voucher.items.length > 0 ? voucher.items : null;

        if (items) {
            ctx.font = '26px Inter, sans-serif';
            for (const item of items) {
                const itemText = `${item.quantity}x ${item.productName}`;
                ctx.fillText(itemText, W / 2, currentY);
                currentY += 34;
            }
            currentY += 10;
        } else if (template.templateProductName) {
            ctx.font = '28px Inter, sans-serif';
            this.drawWrappedText(ctx, template.templateProductName, W / 2, currentY, W - 120, 34);
            const productLines = this.measureWrappedLines(ctx, template.templateProductName, W - 120);
            currentY += productLines * 34 + 20;
        }

        // 6. Voucher value
        ctx.fillStyle = textColor;
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.textAlign = 'center';
        const formattedAmount = Number(voucher.amount).toLocaleString('es-PY');
        ctx.fillText(`Gs. ${formattedAmount}`, W / 2, currentY);
        currentY += 50;

        // 7. Customer name
        ctx.fillStyle = textColor;
        ctx.font = '28px Inter, sans-serif';
        ctx.textAlign = 'center';
        this.drawWrappedText(ctx, voucher.customerName || '', W / 2, currentY, W - 120, 34);
        const nameLines = this.measureWrappedLines(ctx, voucher.customerName || '', W - 120);
        currentY += nameLines * 34 + 20;

        // 8. Pickup date and time range (from template/activity, not voucher)
        if (template.pickupDate || template.pickupStartTime || template.pickupEndTime) {
            ctx.font = '24px Inter, sans-serif';
            ctx.fillStyle = textColor;
            let pickupStr = '';
            if (template.pickupDate) {
                const dateObj = new Date(template.pickupDate + 'T12:00:00');
                pickupStr = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
            }
            if (template.pickupStartTime && template.pickupEndTime) {
                pickupStr += (pickupStr ? ' de ' : '') + template.pickupStartTime + ' a ' + template.pickupEndTime + ' hs';
            } else if (template.pickupStartTime) {
                pickupStr += (pickupStr ? ' a las ' : '') + template.pickupStartTime + ' hs';
            }
            ctx.fillText(pickupStr, W / 2, currentY);
        }
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
        const pdfW = 100;
        const pdfH = pdfW * (canvas.height / canvas.width);
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfW, pdfH]
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
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

    measureWrappedLines(ctx, text, maxWidth) {
        if (!text) return 1;
        const words = text.split(' ');
        let line = '';
        let lineCount = 1;

        for (const word of words) {
            const testLine = line ? line + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
                line = word;
                lineCount++;
            } else {
                line = testLine;
            }
        }
        return lineCount;
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
