// API Configuration
const API_BASE_URL = '/api';

class API {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('token');
        this._sessionExpired = false;
    }

    setToken(token) {
        this.token = token;
        this._sessionExpired = false;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async request(endpoint, options = {}) {
        // If session already expired, reject immediately to prevent cascading calls
        if (this._sessionExpired) {
            throw new Error('Session expired');
        }

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders()
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || (response.status === 403 && (data.error === 'Token expired' || data.error === 'Invalid token'))) {
                    // Only fire session-expired once to prevent cascading events
                    if (!this._sessionExpired) {
                        this._sessionExpired = true;
                        this.clearToken();
                        window.dispatchEvent(new Event('session-expired'));
                    }
                    throw new Error('Session expired');
                }
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            if (error.message !== 'Session expired') {
                console.error('API Error:', error);
            }
            throw error;
        }
    }

    // Auth endpoints
    async register(username, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    // Activity endpoints
    async getActivities() {
        return this.request('/activities');
    }

    async createActivity(name, description) {
        return this.request('/activities', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
    }

    async updateActivity(id, data) {
        return this.request(`/activities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteActivity(id) {
        return this.request(`/activities/${id}`, {
            method: 'DELETE'
        });
    }

    // Voucher endpoints
    async getVouchers(activityId = null, isRedeemed = null) {
        let endpoint = '/vouchers?';
        if (activityId) endpoint += `activityId=${activityId}&`;
        if (isRedeemed !== null) endpoint += `isRedeemed=${isRedeemed}`;
        return this.request(endpoint);
    }

    async createVoucher(activityId, customerName, amount, items = null) {
        const body = { activityId, customerName, amount };
        if (items) body.items = items;
        return this.request('/vouchers', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    async getVoucher(id) {
        return this.request(`/vouchers/${id}`);
    }

    async redeemVoucher(id) {
        return this.request(`/vouchers/${id}/redeem`, {
            method: 'PUT'
        });
    }

    async scanQRCode(qrCode) {
        return this.request(`/vouchers/scan/${encodeURIComponent(qrCode)}`);
    }

    // Logo endpoints
    async getLogos() {
        return this.request('/logos');
    }

    async createLogo(name, svgContent) {
        return this.request('/logos', {
            method: 'POST',
            body: JSON.stringify({ name, svgContent })
        });
    }

    async deleteLogo(id) {
        return this.request(`/logos/${id}`, {
            method: 'DELETE'
        });
    }

    // Product endpoints
    async getProducts(activityId) {
        return this.request(`/products/activity/${activityId}`);
    }

    async createProduct(activityId, name, price) {
        return this.request(`/products/activity/${activityId}`, {
            method: 'POST',
            body: JSON.stringify({ name, price })
        });
    }

    async updateProduct(id, data) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    // Activity template
    async updateTemplate(activityId, templateData) {
        return this.request(`/activities/${activityId}/template`, {
            method: 'PUT',
            body: JSON.stringify(templateData)
        });
    }

    // Metrics endpoints
    async getSummaryMetrics() {
        return this.request('/metrics/summary');
    }

    async getActivityMetrics(activityId) {
        return this.request(`/metrics/activity/${activityId}`);
    }
}

export default new API();
