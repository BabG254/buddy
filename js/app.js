import AuthManager from './auth.js';
import MapManager from './map.js';
import ChatManager from './chat.js';
import UtilityManager from './utils.js';
import AdminManager from './admin.js';
import PaymentManager from './payment.js';
import AdsManager from './ads.js';

class App {
    constructor() {
        this.authManager = null;
        this.mapManager = null;
        this.chatManager = null;
        this.utilityManager = null;
        this.adminManager = null;
        this.paymentManager = null;
        this.adsManager = null;
        this.init();
    }

    async init() {
        // Check if Supabase is loaded
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase not loaded. Please check your configuration.');
            this.showError('Failed to initialize app. Please refresh the page.');
            return;
        }

        try {
            // Initialize core managers first
            this.authManager = new AuthManager();
            this.mapManager = new MapManager(this.authManager);
            this.chatManager = new ChatManager(this.authManager);
            this.utilityManager = new UtilityManager(this.authManager);

            // Initialize monetization and admin managers
            this.paymentManager = new PaymentManager(this.authManager);
            this.adminManager = new AdminManager(this.authManager);
            this.adsManager = new AdsManager(this.authManager, this.paymentManager);

            // Make managers globally accessible
            window.authManager = this.authManager;
            window.mapManager = this.mapManager;
            window.chatManager = this.chatManager;
            window.utilityManager = this.utilityManager;
            window.adminManager = this.adminManager;
            window.paymentManager = this.paymentManager;
            window.adsManager = this.adsManager;

            // Setup event listeners
            this.setupEventListeners();

            // Initialize components
            await this.authManager.init();

            // Initialize payment system (before ads to check premium status)
            await this.paymentManager.init();

            // Initialize ads system (checks for premium status)
            await this.adsManager.init();

            console.log('DrinkingBuddy app initialized successfully!');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to initialize app. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Auth form listeners
        this.setupAuthListeners();
        
        // Tab navigation
        this.setupTabNavigation();
        
        // Quick actions
        this.setupQuickActions();
        
        // Profile and settings
        this.setupProfileListeners();
        
        // Safety features
        this.setupSafetyFeatures();
        
        // App lifecycle
        this.setupAppLifecycle();
    }

    setupAuthListeners() {
        // Google auth
        document.getElementById('google-auth')?.addEventListener('click', async () => {
            const button = document.getElementById('google-auth');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';
            
            const result = await this.authManager.signInWithGoogle();
            
            if (!result.success) {
                this.showError(result.error);
                button.disabled = false;
                button.innerHTML = '<i class="fab fa-google text-red-500 mr-2"></i>Continue with Google';
            }
        });

        // Email auth
        document.getElementById('email-auth')?.addEventListener('click', async () => {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                this.showError('Please enter both email and password');
                return;
            }

            const button = document.getElementById('email-auth');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';
            
            // Try sign in first, then sign up if user doesn't exist
            let result = await this.authManager.signInWithEmail(email, password);
            
            if (!result.success && result.error.includes('Invalid login credentials')) {
                // Try to sign up
                const username = email.split('@')[0];
                result = await this.authManager.signUpWithEmail(email, password, { username });
                
                if (result.success) {
                    this.showSuccess('Account created! Please check your email to verify your account.');
                }
            }
            
            if (!result.success) {
                this.showError(result.error);
                button.disabled = false;
                button.innerHTML = 'Continue with Email';
            }
        });

        // Enter key for email input
        document.getElementById('password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('email-auth').click();
            }
        });
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('[data-tab]');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Hide all views
        document.getElementById('chat-view').classList.add('hidden');
        document.getElementById('profile-view').classList.add('hidden');
        document.getElementById('admin-view').classList.add('hidden');
        
        // Show map view (default)
        document.getElementById('map-view').classList.remove('hidden');
        
        // Handle specific tab actions
        switch(tabName) {
            case 'chat':
                this.chatManager.openChatView();
                break;
            case 'friends':
                this.showFriendsSection();
                break;
            case 'quick':
                this.showQuickActionsSection();
                break;
            case 'admin':
                this.showAdminView();
                break;
        }
    }

    showFriendsSection() {
        // Scroll to friends section
        const friendsSection = document.querySelector('.friends-section');
        if (friendsSection) {
            friendsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showQuickActionsSection() {
        // Scroll to quick actions section
        const quickSection = document.querySelector('.quick-actions-section');
        if (quickSection) {
            quickSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setupQuickActions() {
        // Group QR code
        document.querySelector('[data-action="group-qr"]')?.addEventListener('click', () => {
            this.showGroupQRCode();
        });

        // Group chat
        document.querySelector('[data-action="group-chat"]')?.addEventListener('click', () => {
            this.chatManager.openGroupChat();
        });

        // Vibe mode
        document.querySelector('[data-action="vibe-mode"]')?.addEventListener('click', () => {
            this.toggleVibeMode();
        });

        // Safety features
        document.querySelector('[data-action="safety"]')?.addEventListener('click', () => {
            this.showSafetyMenu();
        });
    }

    setupProfileListeners() {
        // Profile button
        document.getElementById('profile-btn')?.addEventListener('click', () => {
            document.getElementById('profile-view').classList.remove('hidden');
        });

        // Back from profile
        document.getElementById('back-from-profile')?.addEventListener('click', () => {
            document.getElementById('profile-view').classList.add('hidden');
        });

        // Back from admin
        document.getElementById('back-from-admin')?.addEventListener('click', () => {
            document.getElementById('admin-view').classList.add('hidden');
            document.getElementById('map-view').classList.remove('hidden');
            // Reset tab to map
            document.querySelectorAll('[data-tab]').forEach(tab => tab.classList.remove('active'));
            document.querySelector('[data-tab="map"]').classList.add('active');
        });

        // Settings toggles
        document.querySelectorAll('.settings-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.updateUserSetting(e.target.name, e.target.checked);
            });
        });
    }

    setupSafetyFeatures() {
        // Emergency contact setup
        document.querySelector('[data-action="emergency-contacts"]')?.addEventListener('click', () => {
            this.showEmergencyContactsManager();
        });

        // Safety check-in
        document.querySelector('[data-action="safety-checkin"]')?.addEventListener('click', () => {
            this.showSafetyCheckIn();
        });

        // Panic button (hidden, activated by specific gesture)
        this.setupPanicButton();
    }

    setupAppLifecycle() {
        // Handle app visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // App is hidden/minimized
                this.handleAppHidden();
            } else {
                // App is visible again
                this.handleAppVisible();
            }
        });

        // Handle beforeunload
        window.addEventListener('beforeunload', () => {
            this.handleAppClose();
        });

        // Handle online/offline
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });
    }

    async showGroupQRCode() {
        if (!this.mapManager.currentGroup) {
            this.showError('You need to be in a group to show QR code');
            return;
        }

        const qrData = JSON.stringify({
            type: 'group_invite',
            groupId: this.mapManager.currentGroup.id,
            code: this.mapManager.currentGroup.code,
            groupName: this.mapManager.currentGroup.name
        });

        this.showDialog('Group QR Code', `
            <div class="text-center">
                <div class="bg-white p-4 rounded-lg mb-4 mx-auto w-48 h-48 flex items-center justify-center">
                    <div class="text-black text-center">
                        <i class="fas fa-qrcode text-6xl mb-2"></i>
                        <p class="text-sm">QR Code</p>
                        <p class="text-xs">Coming Soon</p>
                    </div>
                </div>
                <p class="text-sm text-gray-400">Share this code for friends to join</p>
                <p class="text-lg font-mono bg-gray-800 p-2 rounded mt-2">${this.mapManager.currentGroup.code}</p>
                <button onclick="navigator.clipboard.writeText('${this.mapManager.currentGroup.code}'); app.showSuccess('Code copied!')" class="mt-2 bg-gold text-dark px-4 py-2 rounded-lg text-sm">
                    Copy Code
                </button>
            </div>
        `);
    }

    showCreateGroupDialog() {
        // Trigger interstitial ad for non-premium users
        if (window.adsManager) {
            window.adsManager.showInterstitialOnTransition('group_create');
        }
        
        // Show create group dialog
        alert('Create Group Dialog would open here');
    }

    showAddFriendDialog() {
        // Simple add friend functionality
        alert('Add Friend Dialog would open here');
    }

    toggleVibeMode() {
        const body = document.body;
        const isVibeMode = body.classList.contains('vibe-mode');
        
        if (isVibeMode) {
            body.classList.remove('vibe-mode');
            this.showSuccess('Vibe mode disabled');
        } else {
            body.classList.add('vibe-mode');
            this.applyVibeMode();
            this.showSuccess('Vibe mode enabled!');
        }
    }

    applyVibeMode() {
        const hour = new Date().getHours();
        const body = document.body;
        
        // Remove existing vibe classes
        body.classList.remove('vibe-energetic', 'vibe-chill', 'vibe-late-night');
        
        if (hour >= 22 || hour <= 2) {
            // Late night energy
            body.classList.add('vibe-energetic');
            this.updateVibeColors(['#ff00ff', '#ccff00', '#7df9ff']);
        } else if (hour >= 3 && hour <= 6) {
            // Late night chill
            body.classList.add('vibe-late-night');
            this.updateVibeColors(['#9400d3', '#4b0082', '#191970']);
        } else if (hour >= 18 && hour <= 21) {
            // Evening energy
            body.classList.add('vibe-energetic');
            this.updateVibeColors(['#d4af37', '#ff6b35', '#f7931e']);
        } else {
            // Daytime chill
            body.classList.add('vibe-chill');
            this.updateVibeColors(['#20b2aa', '#48d1cc', '#87ceeb']);
        }
    }

    updateVibeColors(colors) {
        const root = document.documentElement;
        root.style.setProperty('--vibe-primary', colors[0]);
        root.style.setProperty('--vibe-secondary', colors[1]);
        root.style.setProperty('--vibe-accent', colors[2]);
    }

    showSafetyMenu() {
        this.showDialog('Safety Options', `
            <div class="space-y-3">
                <button onclick="app.sendEmergencyAlert()" class="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Emergency Alert
                </button>
                
                <button onclick="app.shareLocationWithEmergencyContact()" class="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-medium">
                    <i class="fas fa-map-marker-alt mr-2"></i>
                    Share Location with Emergency Contact
                </button>
                
                <button onclick="app.startSafetyTimer()" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium">
                    <i class="fas fa-clock mr-2"></i>
                    Safety Check-in Timer
                </button>
                
                <button onclick="app.callUber()" class="w-full bg-black text-white py-2 px-4 rounded-lg font-medium">
                    <i class="fas fa-car mr-2"></i>
                    Call Safe Ride
                </button>
            </div>
        `);
    }

    setupPanicButton() {
        // Triple tap to activate panic mode
        let tapCount = 0;
        let tapTimer = null;

        document.addEventListener('touchstart', () => {
            tapCount++;
            
            if (tapTimer) {
                clearTimeout(tapTimer);
            }
            
            tapTimer = setTimeout(() => {
                if (tapCount === 3) {
                    this.activatePanicMode();
                }
                tapCount = 0;
            }, 1000);
        });
    }

    showEmergencyContactsManager() {
        this.utilityManager.showEmergencyContactsManager();
    }

    async activatePanicMode() {
        // Send emergency alerts
        await this.sendEmergencyAlert();
        
        // Flash screen
        document.body.style.background = 'red';
        setTimeout(() => {
            document.body.style.background = '';
        }, 500);
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    }

    async sendEmergencyAlert() {
        if (!navigator.geolocation) {
            this.showError('Location not available for emergency alert');
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                // Send to emergency contacts
                await this.notifyEmergencyContacts(latitude, longitude);
                
                // Send to friends
                await this.notifyFriendsEmergency(latitude, longitude);
                
                this.showSuccess('Emergency alert sent!');
            } catch (error) {
                console.error('Error sending emergency alert:', error);
                this.showError('Failed to send emergency alert');
            }
        });
    }

    async updateUserSetting(setting, value) {
        if (!this.authManager.currentUser) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ [setting]: value })
                .eq('id', this.authManager.currentUser.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating setting:', error);
            this.showError('Failed to update setting');
        }
    }

    handleAppHidden() {
        // Reduce location update frequency
        if (this.mapManager && this.mapManager.locationUpdateInterval) {
            clearInterval(this.mapManager.locationUpdateInterval);
            this.mapManager.locationUpdateInterval = setInterval(
                () => this.mapManager.updateLocationIfNeeded(),
                30000 // 30 seconds when hidden
            );
        }
    }

    handleAppVisible() {
        // Resume normal location updates
        if (this.mapManager) {
            this.mapManager.startLocationTracking();
        }
        
        // Refresh data
        this.refreshAppData();
    }

    handleAppClose() {
        // Update user as offline
        if (this.authManager.currentUser) {
            this.authManager.updateUserPresence(false);
        }
    }

    handleOnline() {
        this.showSuccess('Connection restored');
        this.refreshAppData();
    }

    handleOffline() {
        this.showError('You are offline. Some features may not work.');
    }

    async refreshAppData() {
        try {
            if (this.mapManager) {
                await this.mapManager.loadFriends();
            }
            
            if (this.chatManager) {
                await this.chatManager.loadRecentChats();
            }
        } catch (error) {
            console.error('Error refreshing app data:', error);
        }
    }

    showDialog(title, content) {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">${title}</h3>
                <div class="dialog-content">${content}</div>
                <button onclick="this.parentElement.parentElement.remove()" class="mt-4 w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                    Close
                </button>
            </div>
        `;

        document.body.appendChild(dialog);

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg text-white max-w-sm ${
            type === 'success' ? 'bg-green-600' :
            type === 'error' ? 'bg-red-600' :
            type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showAdminView() {
        if (!this.adminManager.isAdmin) {
            this.showError('Access denied: Admin privileges required');
            return;
        }
        
        // Hide map view and show admin view
        document.getElementById('map-view').classList.add('hidden');
        document.getElementById('admin-view').classList.remove('hidden');
        
        // Load admin data
        this.adminManager.loadAnalytics();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

export default App;
