import api from './api.js?v=3';

class LogoManager {
    constructor() {
        this.logos = [];
        this.selectedLogoId = null;
        this.pendingSvgContent = null;
        this.onSelectCallback = null;
    }

    init() {
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('manage-logos-btn').addEventListener('click', () => this.openManager());
        document.getElementById('logo-modal-close').addEventListener('click', () => this.closeManager());

        document.getElementById('logo-upload-btn').addEventListener('click', () => {
            document.getElementById('logo-file-input').click();
        });

        document.getElementById('logo-file-input').addEventListener('change', (e) => this.handleFileUpload(e));

        document.getElementById('logo-paste-btn').addEventListener('click', () => this.togglePasteArea());

        document.getElementById('logo-svg-textarea').addEventListener('input', (e) => this.handlePaste(e));

        document.getElementById('logo-save-btn').addEventListener('click', () => this.saveLogo());
    }

    async loadLogos() {
        try {
            this.logos = await api.getLogos();
            this.renderLogosList();
            this.renderLogoSelector(this.selectedLogoId);
        } catch (error) {
            console.error('Error loading logos:', error);
        }
    }

    renderLogoSelector(selectedId) {
        const container = document.getElementById('template-logo-selector');
        if (!container) return;

        this.selectedLogoId = selectedId || null;

        if (this.logos.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size:0.85rem;padding:0.5rem;">No hay logos. Usa "Gestionar Logos" para importar.</p>';
            return;
        }

        container.innerHTML = `
            <div class="logo-option ${!selectedId ? 'selected' : ''}" data-logo-id="">
                <div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.7rem;">Sin logo</div>
                <span class="logo-name">Ninguno</span>
            </div>
            ${this.logos.map(logo => `
                <div class="logo-option ${selectedId === logo.id ? 'selected' : ''}" data-logo-id="${logo.id}">
                    <div class="logo-thumb">${this.sanitizeSvg(logo.svgContent)}</div>
                    <span class="logo-name">${this.escapeHtml(logo.name)}</span>
                </div>
            `).join('')}
        `;

        container.querySelectorAll('.logo-option').forEach(opt => {
            opt.addEventListener('click', () => {
                container.querySelectorAll('.logo-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedLogoId = opt.dataset.logoId || null;
                if (this.onSelectCallback) this.onSelectCallback(this.selectedLogoId);
            });
        });
    }

    renderLogosList() {
        const container = document.getElementById('logos-list');
        if (!container) return;

        if (this.logos.length === 0) {
            container.innerHTML = '<p class="text-muted text-center" style="font-size:0.85rem;">No hay logos guardados</p>';
            return;
        }

        container.innerHTML = this.logos.map(logo => `
            <div class="logo-list-item">
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <div class="logo-thumb-small">${this.sanitizeSvg(logo.svgContent)}</div>
                    <span>${this.escapeHtml(logo.name)}</span>
                </div>
                <button class="btn btn-danger" data-delete-logo="${logo.id}">Eliminar</button>
            </div>
        `).join('');

        container.querySelectorAll('[data-delete-logo]').forEach(btn => {
            btn.addEventListener('click', async () => {
                await this.deleteLogo(btn.dataset.deleteLogo);
            });
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
            this.showToast('Solo se permiten archivos SVG', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (content.includes('<svg')) {
                this.pendingSvgContent = content;
                this.showLogoPreview(content);
                // Auto-fill name from filename
                const nameInput = document.getElementById('logo-name');
                if (!nameInput.value) {
                    nameInput.value = file.name.replace(/\.svg$/i, '');
                }
            } else {
                this.showToast('El archivo no contiene SVG valido', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    handlePaste(event) {
        const content = event.target.value.trim();
        if (content.includes('<svg')) {
            this.pendingSvgContent = content;
            this.showLogoPreview(content);
        } else {
            document.getElementById('logo-preview').classList.add('hidden');
            document.getElementById('logo-save-btn').classList.add('hidden');
            this.pendingSvgContent = null;
        }
    }

    showLogoPreview(svgContent) {
        const preview = document.getElementById('logo-preview');
        preview.innerHTML = this.sanitizeSvg(svgContent);
        const svg = preview.querySelector('svg');
        if (svg) {
            svg.style.maxWidth = '100px';
            svg.style.maxHeight = '100px';
        }
        preview.classList.remove('hidden');
        document.getElementById('logo-save-btn').classList.remove('hidden');
    }

    async saveLogo() {
        const name = document.getElementById('logo-name').value.trim();
        if (!name) {
            this.showToast('Ingresa un nombre para el logo', 'error');
            return;
        }
        if (!this.pendingSvgContent) {
            this.showToast('Importa un archivo SVG primero', 'error');
            return;
        }

        try {
            await api.createLogo(name, this.pendingSvgContent);
            this.showToast('Logo guardado', 'success');
            this.resetForm();
            await this.loadLogos();
        } catch (error) {
            this.showToast('Error al guardar logo', 'error');
        }
    }

    async deleteLogo(id) {
        try {
            await api.deleteLogo(id);
            this.showToast('Logo eliminado', 'success');
            if (this.selectedLogoId === id) {
                this.selectedLogoId = null;
                if (this.onSelectCallback) this.onSelectCallback(null);
            }
            await this.loadLogos();
        } catch (error) {
            this.showToast(error.message || 'Error al eliminar logo', 'error');
        }
    }

    resetForm() {
        this.pendingSvgContent = null;
        document.getElementById('logo-name').value = '';
        document.getElementById('logo-svg-textarea').value = '';
        document.getElementById('logo-svg-textarea').classList.add('hidden');
        document.getElementById('logo-preview').classList.add('hidden');
        document.getElementById('logo-save-btn').classList.add('hidden');
    }

    openManager() {
        document.getElementById('logo-modal').classList.remove('hidden');
        this.loadLogos();
    }

    closeManager() {
        document.getElementById('logo-modal').classList.add('hidden');
        this.resetForm();
    }

    togglePasteArea() {
        document.getElementById('logo-svg-textarea').classList.toggle('hidden');
    }

    getSelectedLogo() {
        if (!this.selectedLogoId) return null;
        return this.logos.find(l => l.id === this.selectedLogoId) || null;
    }

    sanitizeSvg(svgContent) {
        let clean = svgContent.replace(/<script[\s\S]*?<\/script>/gi, '');
        clean = clean.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
        clean = clean.replace(/javascript\s*:/gi, '');
        return clean;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

export default new LogoManager();
