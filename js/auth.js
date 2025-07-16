import { supabase } from './config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const { data: { user } } = await supabase.auth.getUser();
        this.currentUser = user;
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.handleAuthChange(event, session);
        });
    }

    handleAuthChange(event, session) {
        if (event === 'SIGNED_IN') {
            this.showMainApp();
            this.updateUserPresence(true);
        } else if (event === 'SIGNED_OUT') {
            this.showAuthScreen();
            this.updateUserPresence(false);
        }
    }

    async signInWithGoogle() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Google sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithEmail(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Email sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signUpWithEmail(email, password, metadata = {}) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            
            if (error) throw error;
            
            // Create user profile
            if (data.user) {
                await this.createUserProfile(data.user, metadata);
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Email sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    async createUserProfile(user, metadata) {
        try {
            const { error } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        email: user.email,
                        username: metadata.username || user.email.split('@')[0],
                        avatar_url: metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.username || user.email)}&background=d4af37&color=121212`,
                        created_at: new Date().toISOString(),
                        is_online: true,
                        location_sharing: true,
                        burn_after_party: true,
                        allow_tag_back: true
                    }
                ]);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }

    async updateUserPresence(isOnline) {
        if (!this.currentUser) return;
        
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_online: isOnline,
                    last_seen: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error updating user presence:', error);
        }
    }

    async signOut() {
        try {
            await this.updateUserPresence(false);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Initialize app components
        if (window.mapManager) {
            window.mapManager.init();
        }
        if (window.chatManager) {
            window.chatManager.init();
        }
        
        // Initialize admin features if user is admin
        if (window.adminManager) {
            window.adminManager.checkAdminStatus();
        }
        
        // Update premium status and UI
        if (window.paymentManager) {
            window.paymentManager.updatePremiumStatus();
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}

export default AuthManager;
