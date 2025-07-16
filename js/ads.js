import { APP_CONFIG } from './config.js';

class AdsManager {
    constructor(authManager, paymentManager) {
        this.authManager = authManager;
        this.paymentManager = paymentManager;
        this.isAdMobLoaded = false;
        this.interstitialAd = null;
        this.isPremiumUser = false;
        this.adConfig = null; // Will be set based on platform
    }

    async init() {
        // Check if user is premium
        this.isPremiumUser = await this.paymentManager.checkPremiumStatus();
        
        if (this.isPremiumUser) {
            console.log('Premium user - ads disabled');
            return;
        }

        // Initialize AdMob
        await this.initializeAdMob();
        
        // Show banner ads
        this.showBannerAds();
        
        // Setup interstitial ads for transitions
        this.setupInterstitialAds();
    }

    async initializeAdMob() {
        try {
            // For web, we'll use a simple placeholder system
            // In a real mobile app, you'd use the AdMob SDK with your actual IDs
            
            // Set up platform-specific ad units
            const isAndroid = /Android/i.test(navigator.userAgent);
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            
            if (isAndroid) {
                this.adConfig = {
                    appId: APP_CONFIG.admob.android.appId,
                    bannerId: APP_CONFIG.admob.android.bannerId,
                    interstitialId: APP_CONFIG.admob.android.interstitialId
                };
            } else if (isIOS) {
                this.adConfig = {
                    appId: APP_CONFIG.admob.ios.appId,
                    bannerId: APP_CONFIG.admob.ios.bannerId,
                    interstitialId: APP_CONFIG.admob.ios.interstitialId
                };
            } else {
                // Default to Android IDs for web testing
                this.adConfig = {
                    appId: APP_CONFIG.admob.android.appId,
                    bannerId: APP_CONFIG.admob.android.bannerId,
                    interstitialId: APP_CONFIG.admob.android.interstitialId
                };
            }
            
            this.isAdMobLoaded = true;
            console.log('AdMob initialized with config:', this.adConfig);
            
        } catch (error) {
            console.error('Error initializing AdMob:', error);
        }
    }

    showBannerAds() {
        if (this.isPremiumUser) return;

        // Show banner ad at bottom
        const adBanner = document.getElementById('ad-banner');
        if (adBanner) {
            adBanner.classList.remove('hidden');
            this.loadBannerAd(adBanner);
        }

        // Add banner ads to specific sections
        this.addProfilePageBanner();
    }

    loadBannerAd(container) {
        if (this.isPremiumUser) return;

        // Simulate a real banner ad
        container.innerHTML = `
            <div class="flex items-center justify-center space-x-2 text-xs">
                <div class="bg-blue-600 text-white px-2 py-1 rounded text-xs">Ad</div>
                <span>🎮 Play Epic Mobile Games - Download Now!</span>
                <button onclick="paymentManager.showPricingModal()" class="text-gold hover:underline">
                    Remove ads
                </button>
            </div>
        `;

        // Rotate ads every 30 seconds
        setTimeout(() => {
            if (!this.isPremiumUser && container) {
                this.rotateBannerAd(container);
            }
        }, 30000);
    }

    rotateBannerAd(container) {
        const ads = [
            '🎮 Play Epic Mobile Games - Download Now!',
            '🍕 Order Food Delivery - 50% Off First Order!',
            '🎵 Stream Unlimited Music - 3 Months Free!',
            '🚗 Ride Share App - Get $10 Credit!',
            '📱 Best Dating App - Find Your Match!'
        ];

        const randomAd = ads[Math.floor(Math.random() * ads.length)];
        
        container.innerHTML = `
            <div class="flex items-center justify-center space-x-2 text-xs">
                <div class="bg-blue-600 text-white px-2 py-1 rounded text-xs">Ad</div>
                <span>${randomAd}</span>
                <button onclick="paymentManager.showPricingModal()" class="text-gold hover:underline">
                    Remove ads
                </button>
            </div>
        `;
    }

    addProfilePageBanner() {
        if (this.isPremiumUser) return;

        const profileView = document.getElementById('profile-view');
        if (profileView && !profileView.querySelector('.profile-ad-banner')) {
            const adBanner = document.createElement('div');
            adBanner.className = 'profile-ad-banner bg-gray-800 p-3 m-4 rounded-lg border border-gray-700';
            adBanner.innerHTML = `
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center">
                        <div class="bg-blue-600 text-white px-2 py-1 rounded text-xs mr-2">Ad</div>
                        <span>🎵 Spotify Premium - 3 Months Free</span>
                    </div>
                    <button onclick="paymentManager.showPricingModal()" class="text-gold text-xs hover:underline">
                        Remove ads
                    </button>
                </div>
            `;

            // Insert after profile header
            const profileHeader = profileView.querySelector('.flex.flex-col.items-center');
            if (profileHeader) {
                profileHeader.parentNode.insertBefore(adBanner, profileHeader.nextSibling);
            }
        }
    }

    setupInterstitialAds() {
        if (this.isPremiumUser) return;

        // Show interstitial ads on certain actions
        this.addInterstitialTriggers();
    }

    addInterstitialTriggers() {
        // Show ad when creating groups
        const originalCreateGroup = window.utilityManager?.createGroup;
        if (originalCreateGroup) {
            window.utilityManager.createGroup = async () => {
                await this.showInterstitialAd();
                return originalCreateGroup.call(window.utilityManager);
            };
        }

        // Show ad when joining groups
        const originalJoinGroup = window.utilityManager?.joinGroup;
        if (originalJoinGroup) {
            window.utilityManager.joinGroup = async () => {
                await this.showInterstitialAd();
                return originalJoinGroup.call(window.utilityManager);
            };
        }

        // Show ad when opening profile (occasionally)
        document.getElementById('profile-btn')?.addEventListener('click', () => {
            if (Math.random() < 0.3) { // 30% chance
                this.showInterstitialAd();
            }
        });
    }

    showInterstitialOnTransition(transitionType) {
        if (this.isPremiumUser) return;

        // Show interstitial ad on specific transitions
        const transitions = ['group_create', 'group_join', 'profile_update'];
        if (transitions.includes(transitionType)) {
            this.showInterstitialAd();
        }
    }

    async showInterstitialAd() {
        if (this.isPremiumUser) return;

        return new Promise((resolve) => {
            const interstitial = document.createElement('div');
            interstitial.className = 'ad-interstitial fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
            interstitial.innerHTML = `
                <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700 text-center">
                    <div class="mb-4">
                        <div class="bg-blue-600 text-white px-3 py-1 rounded-full text-xs inline-block mb-3">
                            Advertisement
                        </div>
                        <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-lg mb-4">
                            <h3 class="text-xl font-bold text-white mb-2">🎮 Super Game!</h3>
                            <p class="text-sm text-gray-200">The most addictive mobile game ever!</p>
                            <button class="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold mt-3">
                                Download Now
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button id="close-ad" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm">
                            Close (<span id="countdown">5</span>)
                        </button>
                        <button onclick="paymentManager.showPricingModal()" class="flex-1 bg-gold text-dark py-2 px-4 rounded-lg text-sm font-semibold">
                            Remove Ads
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(interstitial);

            // Countdown timer
            let countdown = 5;
            const countdownEl = interstitial.querySelector('#countdown');
            const closeBtn = interstitial.querySelector('#close-ad');
            
            closeBtn.disabled = true;
            
            const timer = setInterval(() => {
                countdown--;
                countdownEl.textContent = countdown;
                
                if (countdown === 0) {
                    clearInterval(timer);
                    closeBtn.disabled = false;
                    closeBtn.textContent = 'Close';
                    closeBtn.onclick = () => {
                        interstitial.remove();
                        resolve();
                    };
                }
            }, 1000);

            // Auto-close after 10 seconds
            setTimeout(() => {
                if (document.body.contains(interstitial)) {
                    interstitial.remove();
                    resolve();
                }
            }, 10000);
        });
    }

    async showRewardedAd(reward) {
        if (this.isPremiumUser) return { success: true, reward };

        return new Promise((resolve) => {
            const rewardedAd = document.createElement('div');
            rewardedAd.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
            rewardedAd.innerHTML = `
                <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700 text-center">
                    <div class="mb-4">
                        <i class="fas fa-gift text-gold text-3xl mb-3"></i>
                        <h3 class="text-lg font-bold">Watch Ad for Reward</h3>
                        <p class="text-sm text-gray-400 mb-4">${reward}</p>
                    </div>
                    
                    <div class="bg-gradient-to-r from-green-600 to-blue-600 p-4 rounded-lg mb-4">
                        <div class="text-white">
                            <h4 class="font-bold">🌟 Premium App</h4>
                            <p class="text-xs">Experience the best mobile app!</p>
                            <div class="mt-2 bg-white bg-opacity-20 rounded p-2">
                                <div class="w-full bg-gray-300 rounded-full h-2">
                                    <div id="ad-progress" class="bg-green-400 h-2 rounded-full transition-all duration-1000" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button onclick="this.closest('.fixed').remove(); resolve({ success: false })" 
                                class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm">
                            Skip
                        </button>
                        <button id="collect-reward" disabled 
                                class="flex-1 bg-gold text-dark py-2 px-4 rounded-lg text-sm font-semibold opacity-50">
                            Collect Reward
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(rewardedAd);

            // Simulate ad progress
            const progressBar = rewardedAd.querySelector('#ad-progress');
            const collectBtn = rewardedAd.querySelector('#collect-reward');
            
            let progress = 0;
            const progressTimer = setInterval(() => {
                progress += 10;
                progressBar.style.width = progress + '%';
                
                if (progress >= 100) {
                    clearInterval(progressTimer);
                    collectBtn.disabled = false;
                    collectBtn.classList.remove('opacity-50');
                    collectBtn.onclick = () => {
                        rewardedAd.remove();
                        resolve({ success: true, reward });
                    };
                }
            }, 300);
        });
    }

    // Call this when user becomes premium
    disableAds() {
        this.isPremiumUser = true;
        
        // Hide all ads
        document.querySelectorAll('.ad-interstitial, .profile-ad-banner').forEach(ad => ad.remove());
        
        const adBanner = document.getElementById('ad-banner');
        if (adBanner) {
            adBanner.style.display = 'none';
        }
        
        console.log('Ads disabled for premium user');
    }

    // Call this when user subscription expires
    enableAds() {
        this.isPremiumUser = false;
        this.showBannerAds();
        this.setupInterstitialAds();
        
        console.log('Ads enabled for non-premium user');
    }

    // Hide all ads for premium users
    hideAllAds() {
        // Hide banner ads
        const adBanner = document.getElementById('ad-banner');
        if (adBanner) {
            adBanner.classList.add('hidden');
        }

        // Hide profile page ads
        const profileAds = document.querySelectorAll('.profile-ad-banner');
        profileAds.forEach(ad => ad.remove());

        // Disable interstitial ads
        this.isPremiumUser = true;
        
        console.log('All ads hidden for premium user');
    }

    // Analytics for ad performance
    trackAdImpression(adType, adId) {
        // In a real app, you'd send this to your analytics service
        console.log(`Ad impression: ${adType} - ${adId}`);
        
        if (window.adminManager) {
            window.adminManager.logSystemEvent('info', 'Ad impression tracked', {
                adType,
                adId,
                userId: this.authManager.currentUser?.id
            });
        }
    }

    trackAdClick(adType, adId) {
        console.log(`Ad click: ${adType} - ${adId}`);
        
        if (window.adminManager) {
            window.adminManager.logSystemEvent('info', 'Ad click tracked', {
                adType,
                adId,
                userId: this.authManager.currentUser?.id
            });
        }
    }
}

export default AdsManager;
