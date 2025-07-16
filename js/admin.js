import { supabase, APP_CONFIG } from './config.js';

class AdminManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.isAdmin = false;
    }

    async checkAdminStatus() {
        if (!this.authManager.currentUser) return false;
        
        const userEmail = this.authManager.currentUser.email;
        this.isAdmin = APP_CONFIG.admin.emails.includes(userEmail);
        
        if (this.isAdmin) {
            await this.setupAdminProfile();
            this.addAdminUI();
        }
        
        return this.isAdmin;
    }

    async setupAdminProfile() {
        try {
            // Update profile to mark as admin
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_admin: true,
                    username: APP_CONFIG.admin.displayName
                })
                .eq('id', this.authManager.currentUser.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error setting up admin profile:', error);
        }
    }

    addAdminUI() {
        // Add crown icon to profile
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn && !profileBtn.querySelector('.admin-crown')) {
            const crown = document.createElement('i');
            crown.className = 'fas fa-crown admin-crown absolute -top-1 -right-1 text-gold text-xs';
            profileBtn.appendChild(crown);
        }

        // Show admin tab in bottom navigation
        const adminTab = document.getElementById('admin-tab');
        if (adminTab) {
            adminTab.classList.remove('hidden');
        }

        // Update profile display
        const profileName = document.querySelector('#profile-view h2');
        if (profileName) {
            profileName.innerHTML = `
                <i class="fas fa-crown text-gold mr-2"></i>
                ${APP_CONFIG.admin.displayName}
            `;
        }

        // Add admin badge to profile
        const profileImage = document.querySelector('#profile-view img');
        if (profileImage && !profileImage.parentNode.querySelector('.admin-badge')) {
            const badge = document.createElement('div');
            badge.className = 'admin-badge absolute -top-2 -right-2 bg-gold text-dark text-xs px-2 py-1 rounded-full font-bold';
            badge.innerHTML = '<i class="fas fa-crown mr-1"></i>ADMIN';
            profileImage.parentNode.appendChild(badge);
        }
    }

    showAdminPanel() {
        const adminPanel = document.createElement('div');
        adminPanel.id = 'admin-panel';
        adminPanel.className = 'absolute inset-0 bg-dark z-50 flex flex-col';
        adminPanel.innerHTML = `
            <div class="p-4 border-b border-gray-800 flex items-center">
                <button id="back-from-admin" class="mr-3">
                    <i class="fas fa-arrow-left text-gold"></i>
                </button>
                <div class="flex items-center">
                    <i class="fas fa-shield-alt text-gold mr-2"></i>
                    <h3 class="font-medium">Admin Panel</h3>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4">
                <!-- User Analytics -->
                <div class="bg-gray-900 rounded-xl p-4 mb-4">
                    <h3 class="font-semibold mb-3 flex items-center">
                        <i class="fas fa-chart-bar text-gold mr-2"></i>
                        Analytics
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-2xl font-bold text-gold" id="total-users">-</p>
                            <p class="text-xs text-gray-400">Total Users</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-2xl font-bold text-electric" id="active-users">-</p>
                            <p class="text-xs text-gray-400">Active Now</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-2xl font-bold text-neon" id="total-groups">-</p>
                            <p class="text-xs text-gray-400">Active Groups</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-2xl font-bold text-magenta" id="premium-users">-</p>
                            <p class="text-xs text-gray-400">Premium Users</p>
                        </div>
                    </div>
                </div>

                <!-- User Management -->
                <div class="bg-gray-900 rounded-xl p-4 mb-4">
                    <h3 class="font-semibold mb-3 flex items-center">
                        <i class="fas fa-users-cog text-gold mr-2"></i>
                        User Management
                    </h3>
                    <div class="space-y-2">
                        <button onclick="adminManager.showAllUsers()" class="w-full bg-gray-800 text-white py-2 px-4 rounded-lg font-medium text-left">
                            <i class="fas fa-list mr-2"></i>View All Users
                        </button>
                        <button onclick="adminManager.showReportedUsers()" class="w-full bg-gray-800 text-white py-2 px-4 rounded-lg font-medium text-left">
                            <i class="fas fa-flag mr-2"></i>Reported Users
                        </button>
                        <button onclick="adminManager.showSubscriptions()" class="w-full bg-gray-800 text-white py-2 px-4 rounded-lg font-medium text-left">
                            <i class="fas fa-credit-card mr-2"></i>Subscriptions
                        </button>
                    </div>
                </div>

                <!-- System Logs -->
                <div class="bg-gray-900 rounded-xl p-4 mb-4">
                    <h3 class="font-semibold mb-3 flex items-center">
                        <i class="fas fa-terminal text-gold mr-2"></i>
                        System Logs
                    </h3>
                    <div class="bg-gray-800 p-3 rounded-lg max-h-40 overflow-y-auto">
                        <div id="system-logs" class="text-xs text-gray-300 font-mono">
                            Loading logs...
                        </div>
                    </div>
                    <button onclick="adminManager.refreshLogs()" class="mt-2 bg-gray-700 text-white py-1 px-3 rounded text-xs">
                        Refresh Logs
                    </button>
                </div>

                <!-- Revenue Analytics -->
                <div class="bg-gray-900 rounded-xl p-4">
                    <h3 class="font-semibold mb-3 flex items-center">
                        <i class="fas fa-dollar-sign text-gold mr-2"></i>
                        Revenue
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-gold" id="monthly-revenue">$0</p>
                            <p class="text-xs text-gray-400">This Month</p>
                        </div>
                        <div class="bg-gray-800 p-3 rounded-lg text-center">
                            <p class="text-xl font-bold text-electric" id="total-revenue">$0</p>
                            <p class="text-xs text-gray-400">All Time</p>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="bg-gray-900 rounded-xl p-4 mb-4">
                    <h3 class="font-semibold mb-3 flex items-center">
                        <i class="fas fa-history text-gold mr-2"></i>
                        Recent Activity
                    </h3>
                    <div id="admin-recent-activity" class="bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                        Loading activity...
                    </div>
                </div>
            </div>
        `;

        // Remove existing admin panel
        const existingPanel = document.getElementById('admin-panel');
        if (existingPanel) existingPanel.remove();

        document.getElementById('app-container').appendChild(adminPanel);

        // Add back button listener
        document.getElementById('back-from-admin').addEventListener('click', () => {
            adminPanel.remove();
        });

        // Load analytics data
        this.loadAnalytics();
        this.loadSystemLogs();
    }

    async loadAnalytics() {
        try {
            // Load user statistics
            const { data: totalUsers, error: usersError } = await supabase
                .from('profiles')
                .select('id', { count: 'exact' });

            if (!usersError) {
                document.getElementById('total-users').textContent = totalUsers.length || 0;
            }

            // Load active groups
            const { data: activeGroups, error: groupsError } = await supabase
                .from('groups')
                .select('id', { count: 'exact' })
                .eq('is_active', true);

            if (!groupsError) {
                document.getElementById('active-groups').textContent = activeGroups.length || 0;
            }

            // Load premium users
            const { data: premiumUsers, error: premiumError } = await supabase
                .from('profiles')
                .select('id', { count: 'exact' })
                .eq('is_premium', true);

            if (!premiumError) {
                document.getElementById('premium-users').textContent = premiumUsers.length || 0;
            }

            // Load recent activity
            this.loadRecentActivity();

        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const { data: logs, error } = await supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            const activityContainer = document.getElementById('admin-recent-activity');
            if (activityContainer && !error && logs) {
                activityContainer.innerHTML = logs.map(log => `
                    <div class="flex items-center justify-between py-2 border-b border-gray-700">
                        <div>
                            <p class="font-medium">${log.action}</p>
                            <p class="text-xs text-gray-400">${new Date(log.created_at).toLocaleString()}</p>
                        </div>
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-700">${log.type}</span>
                    </div>
                `).join('');
            } else {
                activityContainer.innerHTML = '<div class="text-gray-400 text-center py-4">No recent activity</div>';
            }

        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async loadSystemLogs() {
        try {
            const { data: logs, error } = await supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const logsContainer = document.getElementById('system-logs');
            if (logsContainer) {
                logsContainer.innerHTML = logs.map(log => 
                    `[${new Date(log.created_at).toLocaleTimeString()}] ${log.level}: ${log.message}`
                ).join('\n') || 'No logs available';
            }

        } catch (error) {
            console.error('Error loading logs:', error);
            const logsContainer = document.getElementById('system-logs');
            if (logsContainer) {
                logsContainer.textContent = 'Error loading logs';
            }
        }
    }

    async showAllUsers() {
        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.showUserListDialog('All Users', users);

        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async showReportedUsers() {
        try {
            const { data: reports, error } = await supabase
                .from('user_reports')
                .select(`
                    *,
                    reported_user:profiles!user_reports_reported_user_id_fkey(username, email),
                    reporter:profiles!user_reports_reporter_id_fkey(username)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.showReportsDialog(reports);

        } catch (error) {
            console.error('Error loading reported users:', error);
        }
    }

    showUserListDialog(title, users) {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[80vh] border border-gray-700">
                <div class="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 class="font-semibold">${title}</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="overflow-y-auto max-h-96 p-4">
                    ${users.map(user => `
                        <div class="flex items-center justify-between bg-gray-800 p-3 rounded-lg mb-2">
                            <div class="flex items-center">
                                <img src="${user.avatar_url}" class="w-10 h-10 rounded-full mr-3">
                                <div>
                                    <p class="font-medium flex items-center">
                                        ${user.username}
                                        ${user.is_admin ? '<i class="fas fa-crown text-gold ml-2"></i>' : ''}
                                        ${user.is_premium ? '<i class="fas fa-star text-gold ml-2"></i>' : ''}
                                    </p>
                                    <p class="text-xs text-gray-400">${user.email}</p>
                                    <p class="text-xs text-gray-500">
                                        ${user.is_online ? 'Online' : `Last seen: ${new Date(user.last_seen).toLocaleDateString()}`}
                                    </p>
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                ${!user.is_admin ? `
                                    <button onclick="adminManager.suspendUser('${user.id}')" class="bg-red-600 text-white px-2 py-1 rounded text-xs">
                                        Suspend
                                    </button>
                                ` : ''}
                                <button onclick="adminManager.viewUserDetails('${user.id}')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                                    Details
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    async suspendUser(userId) {
        if (!confirm('Are you sure you want to suspend this user?')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_suspended: true })
                .eq('id', userId);

            if (error) throw error;

            this.showNotification('User suspended successfully', 'success');
            
            // Refresh the user list
            document.querySelector('.fixed').remove();
            this.showAllUsers();

        } catch (error) {
            console.error('Error suspending user:', error);
            this.showNotification('Failed to suspend user', 'error');
        }
    }

    async logSystemEvent(level, message, metadata = {}) {
        try {
            await supabase
                .from('system_logs')
                .insert([
                    {
                        level,
                        message,
                        metadata,
                        created_at: new Date().toISOString()
                    }
                ]);
        } catch (error) {
            console.error('Error logging system event:', error);
        }
    }

    refreshLogs() {
        this.loadSystemLogs();
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

    async viewAllUsers() {
        // This would open a user management interface
        console.log('Opening user management interface...');
        // Placeholder for now - would show a modal with user list
        alert('Admin Feature: User management interface would open here');
    }

    async viewSystemLogs() {
        // This would open system logs viewer
        console.log('Opening system logs...');
        alert('Admin Feature: System logs interface would open here');
    }

    async viewReports() {
        // This would open user reports interface
        console.log('Opening user reports...');
        alert('Admin Feature: User reports interface would open here');
    }

    async generateReport() {
        // This would generate and download analytics report
        console.log('Generating analytics report...');
        alert('Admin Feature: Analytics report generation would start here');
    }
}

export default AdminManager;
