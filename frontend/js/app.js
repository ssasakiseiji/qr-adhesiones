import auth from './auth.js?v=2';
import activities from './activities.js?v=2';
import vouchers from './vouchers.js?v=2';
import scanner from './scanner.js?v=2';
import metrics from './metrics.js?v=2';
import activityDetail from './activityDetail.js?v=2';
import qrTemplate from './qrTemplate.js?v=2';
import logoManager from './logoManager.js?v=2';

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

        // Failsafe: hide splash after 10s no matter what
        const failsafe = setTimeout(() => {
            console.warn('Splash failsafe triggered');
            this.showSplash(false);
        }, 10000);

        try {
            if (!this.initialized) {
                await this.initializeApp();
            } else {
                await this.reloadData();
            }
        } catch (error) {
            console.error('App ready error:', error);
        } finally {
            clearTimeout(failsafe);
            this.showSplash(false);
        }
    }

    async initializeApp() {
        // Initialize all modules (event listeners only once)
        if (!this.initialized) {
            vouchers.init();
            scanner.init();
            metrics.init();
            activityDetail.init();
            qrTemplate.init();
            logoManager.init();
            activities.initEventListeners();

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
        }

        // Load data (can fail if token is rejected by server)
        await activities.loadActivities();
        await this.loadDashboard();

        this.initialized = true;
    }

    async reloadData() {
        // Reload activities (state was reset by session-reset event)
        await activities.loadActivities();
        // Navigate to dashboard (which also loads dashboard data)
        await this.navigateToView('dashboard');
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
