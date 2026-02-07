import auth from './auth.js';
import activities from './activities.js';
import vouchers from './vouchers.js';
import scanner from './scanner.js';
import metrics from './metrics.js';
import activityDetail from './activityDetail.js';
import qrTemplate from './qrTemplate.js';
import logoManager from './logoManager.js';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.initialized = false;
        this.init();
    }

    init() {
        // Check authentication on load
        auth.checkAuth();

        // Initialize modules when app is ready
        window.addEventListener('app-ready', async () => {
            await this.onAppReady();
        });

        // Navigation
        this.initNavigation();
    }

    async onAppReady() {
        this.showSplash(true);
        try {
            if (!this.initialized) {
                await this.initializeApp();
            } else {
                await this.reloadData();
            }
        } finally {
            this.showSplash(false);
        }
    }

    async initializeApp() {
        try {
            // Initialize all modules (event listeners + first data load)
            await activities.init();
            vouchers.init();
            scanner.init();
            metrics.init();
            activityDetail.init();
            qrTemplate.init();
            logoManager.init();

            // Load initial data
            await this.loadDashboard();

            // Listen for activity changes
            window.addEventListener('activity-changed', () => {
                this.onActivityChanged();
            });

            // Listen for voucher events
            window.addEventListener('voucher-created', () => {
                this.onVoucherCreated();
            });

            window.addEventListener('voucher-redeemed', () => {
                this.onVoucherRedeemed();
            });

            // Listen for activity detail navigation
            window.addEventListener('navigate-activity-detail', (e) => {
                this.openActivityDetail(e.detail.activityId);
            });

            // Listen for generic view navigation
            window.addEventListener('navigate-view', (e) => {
                this.navigateToView(e.detail.view);
            });

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    async reloadData() {
        try {
            // Reload activities (state was reset by session-reset event)
            await activities.loadActivities();
            // Navigate to dashboard (which also loads dashboard data)
            await this.navigateToView('dashboard');
        } catch (error) {
            console.error('Error reloading data:', error);
        }
    }

    showSplash(show) {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.toggle('hidden', !show);
        }
    }

    initNavigation() {
        // Bottom navigation
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.navigateToView(view);
            });
        });

        // Quick action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.navigateToView(view);
            });
        });
    }

    async navigateToView(viewName) {
        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Update navigation - activity-detail keeps "activities" highlighted
        const navView = viewName === 'activity-detail' ? 'activities' : viewName;
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === navView);
        });

        this.currentView = viewName;

        // Handle view-specific logic
        switch (viewName) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'sales':
                vouchers.resetForm();
                await vouchers.loadProductsForActivity();
                break;
            case 'scanner':
                await scanner.startScanner();
                break;
            case 'metrics':
                await metrics.loadMetrics();
                break;
            case 'activities':
                // Activities already loaded
                break;
        }
    }

    async openActivityDetail(activityId) {
        await this.navigateToView('activity-detail');
        await activityDetail.loadDetail(activityId);
    }

    async loadDashboard() {
        await metrics.updateDashboard();
    }

    async onActivityChanged() {
        if (this.currentView === 'dashboard') {
            await this.loadDashboard();
        }
        if (this.currentView === 'sales') {
            await vouchers.loadProductsForActivity();
        }
    }

    async onVoucherCreated() {
        if (this.currentView === 'dashboard') {
            await this.loadDashboard();
        }
    }

    async onVoucherRedeemed() {
        if (this.currentView === 'dashboard') {
            await this.loadDashboard();
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}
