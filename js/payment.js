// Paddle Payment Integration for DrinkingBuddy
class PaymentManager {
    constructor() {
        this.paddle = null;
        this.isInitialized = false;
        this.initializePaddle();
    }

    async initializePaddle() {
        try {
            // Wait for Paddle to be loaded
            if (typeof Paddle === 'undefined') {
                console.log('Waiting for Paddle to load...');
                setTimeout(() => this.initializePaddle(), 100);
                return;
            }

            // Initialize Paddle with vendor configuration
            Paddle.Setup({
                vendor: window.AppConfig.paddle.vendorId,
                debug: window.AppConfig.paddle.environment === 'sandbox'
            });

            this.paddle = Paddle;
            this.isInitialized = true;
            console.log('Paddle initialized successfully');

            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize Paddle:', error);
        }
    }

    setupEventListeners() {
        // Listen for successful payments
        Paddle.Checkout.onClose(() => {
            console.log('Paddle checkout closed');
        });
    }

    // Open Paddle checkout for subscription
    async openSubscriptionCheckout() {
        if (!this.isInitialized) {
            console.error('Paddle not initialized');
            return;
        }

        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Open Paddle checkout
            Paddle.Checkout.open({
                product: window.AppConfig.paddle.products.premium,
                email: user.email,
                passthrough: JSON.stringify({
                    user_id: user.id,
                    app: 'drinkingbuddy'
                }),
                successCallback: (data) => this.handleSuccessfulPayment(data),
                closeCallback: (data) => this.handleCheckoutClose(data)
            });
        } catch (error) {
            console.error('Failed to open checkout:', error);
            this.showError('Failed to open payment. Please try again.');
        }
    }

    // Handle successful payment
    async handleSuccessfulPayment(data) {
        console.log('Payment successful:', data);
        
        try {
            // Update user premium status in database
            await this.updatePremiumStatus(data);
            
            // Update UI
            this.updateUIForPremium();
            
            // Hide ads for premium users
            if (window.adsManager) {
                window.adsManager.hideAllAds();
            }
            
            this.showSuccess('Payment successful! Premium features unlocked.');
        } catch (error) {
            console.error('Failed to update premium status:', error);
            this.showError('Payment successful but failed to update account. Please contact support.');
        }
    }

    // Handle checkout close
    handleCheckoutClose(data) {
        if (data && data.checkout) {
            console.log('Checkout completed:', data.checkout);
        } else {
            console.log('Checkout cancelled by user');
        }
    }

    // Update premium status in database
    async updatePremiumStatus(paymentData) {
        try {
            const user = await this.getCurrentUser();
            if (!user) throw new Error('User not found');

            // Calculate premium expiration (assuming monthly subscription)
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);

            // Update user profile
            const { error } = await window.supabase
                .from('profiles')
                .update({
                    is_premium: true,
                    premium_expires_at: expiresAt.toISOString(),
                    paddle_subscription_id: paymentData.checkout?.id,
                    paddle_customer_id: paymentData.user?.id
                })
                .eq('id', user.id);

            if (error) throw error;

            // Record payment in paddle_payments table
            await window.supabase
                .from('paddle_payments')
                .insert({
                    user_id: user.id,
                    paddle_payment_id: paymentData.checkout?.id,
                    amount: paymentData.checkout?.total,
                    currency: paymentData.checkout?.currency || 'USD',
                    status: 'completed',
                    payment_method: paymentData.checkout?.method_details?.type || 'card',
                    created_at: new Date().toISOString()
                });

            console.log('Premium status updated successfully');
        } catch (error) {
            console.error('Failed to update premium status:', error);
            throw error;
        }
    }

    // Check if user has premium access
    async checkPremiumStatus() {
        try {
            const user = await this.getCurrentUser();
            if (!user) return false;

            const { data, error } = await window.supabase
                .from('profiles')
                .select('is_premium, premium_expires_at')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            // Check if premium is still active
            if (data.is_premium && data.premium_expires_at) {
                const expiresAt = new Date(data.premium_expires_at);
                const now = new Date();
                return expiresAt > now;
            }

            return false;
        } catch (error) {
            console.error('Failed to check premium status:', error);
            return false;
        }
    }

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await window.supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    // Update UI for premium users
    updateUIForPremium() {
        // Hide premium upgrade buttons
        const upgradeButtons = document.querySelectorAll('.upgrade-premium, .premium-cta');
        upgradeButtons.forEach(button => {
            button.style.display = 'none';
        });

        // Show premium badge
        const premiumBadges = document.querySelectorAll('.premium-badge');
        premiumBadges.forEach(badge => {
            badge.style.display = 'block';
        });

        // Update any premium status text
        const statusElements = document.querySelectorAll('.premium-status');
        statusElements.forEach(element => {
            element.textContent = 'Premium Active';
            element.classList.add('active');
        });
    }

    // Update UI for non-premium users
    updateUIForNonPremium() {
        // Show premium upgrade buttons
        const upgradeButtons = document.querySelectorAll('.upgrade-premium, .premium-cta');
        upgradeButtons.forEach(button => {
            button.style.display = 'block';
        });

        // Hide premium badge
        const premiumBadges = document.querySelectorAll('.premium-badge');
        premiumBadges.forEach(badge => {
            badge.style.display = 'none';
        });

        // Update premium status text
        const statusElements = document.querySelectorAll('.premium-status');
        statusElements.forEach(element => {
            element.textContent = 'Free';
            element.classList.remove('active');
        });
    }

    // Initialize premium features based on user status
    async initializePremiumFeatures() {
        const isPremium = await this.checkPremiumStatus();
        
        if (isPremium) {
            this.updateUIForPremium();
            // Hide ads for premium users
            if (window.adsManager) {
                window.adsManager.hideAllAds();
            }
        } else {
            this.updateUIForNonPremium();
        }
    }

    // Show success message
    showSuccess(message) {
        // Create or update success notification
        this.showNotification(message, 'success');
    }

    // Show error message
    showError(message) {
        // Create or update error notification
        this.showNotification(message, 'error');
    }

    // Show notification (generic)
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.payment-notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `payment-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.paymentManager = new PaymentManager();
    
    // Initialize premium features
    window.paymentManager.initializePremiumFeatures();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}
