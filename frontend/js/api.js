// API Configuration
const API_BASE_URL = '/api';

class API {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
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
                    this.clearToken();
                    window.location.reload();
                    return;
                }
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
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

    async createVoucher(activityId, customerName, amount) {
        return this.request('/vouchers', {
            method: 'POST',
            body: JSON.stringify({ activityId, customerName, amount })
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

    // Metrics endpoints
    async getSummaryMetrics() {
        return this.request('/metrics/summary');
    }

    async getActivityMetrics(activityId) {
        return this.request(`/metrics/activity/${activityId}`);
    }
}

export default new API();
