import auth from './auth.js?v=3';
import activities from './activities.js?v=3';
import vouchers from './vouchers.js?v=3';
import scanner from './scanner.js?v=3';
import metrics from './metrics.js?v=3';
import activityDetail from './activityDetail.js?v=3';
import qrTemplate from './qrTemplate.js?v=3';
import logoManager from './logoManager.js?v=3';
import users from './users.js?v=3';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.initialized = false;
        this.init();
    }

    init() {
        // IMPORTANT: Register event listeners BEFORE checkAuth(),
        // because checkAuth() -> showApp() dispatches 'app-ready' synchronously
        window.addEventListener('app-ready', async () => {
            await this.onAppReady();
        });

        // Listen for role-ready to apply UI permissions
        window.addEventListener('role-ready', (e) => {
            this.applyRolePermissions(e.detail.role);
        });

        // Navigation
        this.initNavigation();
        this.initProfileDropdown();

        // Check authentication on load (may fire 'app-ready' synchronously)
        auth.checkAuth();
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
            users.init();

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

    initProfileDropdown() {
        const profileBtn = document.getElementById('profile-btn');
        const profileMenu = document.getElementById('profile-menu');

        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
        });

        // Close on click outside
        document.addEventListener('click', () => {
            profileMenu.classList.add('hidden');
        });

        // Prevent menu clicks from closing (except action buttons)
        profileMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Settings button navigates to settings view
        document.getElementById('settings-btn').addEventListener('click', () => {
            profileMenu.classList.add('hidden');
            this.navigateToView('settings');
        });
    }

    applyRolePermissions(role) {
        // Navigation visibility
        const salesNav = document.querySelector('.nav-item[data-view="sales"]');
        const activitiesNav = document.querySelector('.nav-item[data-view="activities"]');

        if (role === 'esbirro') {
            salesNav.classList.add('hidden');
            activitiesNav.classList.add('hidden');
        } else {
            salesNav.classList.remove('hidden');
            activitiesNav.classList.remove('hidden');
        }

        // Quick action "Nueva Venta" in dashboard
        const salesAction = document.querySelector('.action-btn[data-view="sales"]');
        if (salesAction) {
            salesAction.classList.toggle('hidden', role === 'esbirro');
        }

        // Settings button in profile dropdown (superadmin only)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.classList.toggle('hidden', role !== 'superadmin');
        }

        // Activities view management buttons (superadmin only)
        const newActivityBtn = document.getElementById('new-activity-btn');
        if (newActivityBtn) {
            newActivityBtn.classList.toggle('hidden', role !== 'superadmin');
        }

        // Product management in activity detail (superadmin only)
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.classList.toggle('hidden', role !== 'superadmin');
        }

        // Template button in activity detail (superadmin only)
        const templateBtn = document.getElementById('detail-template-btn');
        if (templateBtn) {
            templateBtn.classList.toggle('hidden', role !== 'superadmin');
        }

        // Store role on body for CSS-based hiding if needed
        document.body.dataset.role = role || '';

        // Update profile info in dropdown
        const user = auth.getUser();
        if (user) {
            document.getElementById('profile-name').textContent = user.username;
            const roleLabels = { esbirro: 'Esbirro', comision: 'Comision', superadmin: 'Superadmin' };
            document.getElementById('profile-role').textContent = roleLabels[user.role] || user.role;
        }
    }

    async navigateToView(viewName) {
        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Update navigation - activity-detail and settings don't have nav items
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
            case 'settings':
                await users.loadUsers();
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

// Signal that JS modules loaded (disables HTML failsafe)
window.__appLoaded = true;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}
