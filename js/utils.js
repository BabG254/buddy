import { supabase } from './config.js';

class UtilityManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    // Add friend by email
    async showAddFriendDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Add Friend</h3>
                
                <input type="email" id="friend-email" placeholder="Friend's email" 
                       class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-gold">
                
                <div class="flex space-x-2">
                    <button onclick="utilityManager.addFriendByEmail()" class="flex-1 bg-gold text-dark py-2 px-4 rounded-lg font-medium">
                        Add Friend
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                        Cancel
                    </button>
                </div>
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

    async addFriendByEmail() {
        const email = document.getElementById('friend-email').value.trim();
        if (!email) return;

        try {
            // Find user by email
            const { data: user, error: userError } = await supabase
                .from('profiles')
                .select('id, username, email')
                .eq('email', email)
                .single();

            if (userError) throw new Error('User not found');

            if (user.id === this.authManager.currentUser.id) {
                throw new Error('Cannot add yourself as a friend');
            }

            // Check if friendship already exists
            const { data: existing } = await supabase
                .from('friendships')
                .select('*')
                .or(`and(user_id.eq.${this.authManager.currentUser.id},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${this.authManager.currentUser.id})`)
                .single();

            if (existing) {
                throw new Error('Friendship already exists or pending');
            }

            // Send friend request
            const { error } = await supabase
                .from('friendships')
                .insert([
                    {
                        user_id: this.authManager.currentUser.id,
                        friend_id: user.id,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            this.showNotification(`Friend request sent to ${user.username}!`, 'success');
            document.querySelector('.fixed').remove();

        } catch (error) {
            console.error('Error adding friend:', error);
            this.showNotification(error.message, 'error');
        }
    }

    // Create or join group dialog
    async showCreateGroupDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Group Options</h3>
                
                <div class="space-y-3 mb-4">
                    <button onclick="utilityManager.showCreateGroupForm()" class="w-full bg-gold text-dark py-2 px-4 rounded-lg font-medium">
                        Create New Group
                    </button>
                    
                    <button onclick="utilityManager.showJoinGroupForm()" class="w-full bg-gray-700 text-white py-2 px-4 rounded-lg font-medium">
                        Join Existing Group
                    </button>
                </div>
                
                <button onclick="this.closest('.fixed').remove()" class="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                    Cancel
                </button>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    showCreateGroupForm() {
        document.querySelector('.fixed').remove();
        
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Create Group</h3>
                
                <input type="text" id="group-name" placeholder="Group name (e.g., Friday Night Out)" 
                       class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-gold">
                
                <div class="flex space-x-2">
                    <button onclick="utilityManager.createGroup()" class="flex-1 bg-gold text-dark py-2 px-4 rounded-lg font-medium">
                        Create
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    showJoinGroupForm() {
        document.querySelector('.fixed').remove();
        
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Join Group</h3>
                
                <input type="text" id="group-code" placeholder="Enter group code" 
                       class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-gold"
                       style="text-transform: uppercase;">
                
                <div class="flex space-x-2">
                    <button onclick="utilityManager.joinGroup()" class="flex-1 bg-gold text-dark py-2 px-4 rounded-lg font-medium">
                        Join
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Auto-uppercase input
        document.getElementById('group-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    async createGroup() {
        const groupName = document.getElementById('group-name').value.trim();
        if (!groupName) return;

        const result = await window.mapManager.createGroup(groupName);
        
        if (result.success) {
            this.showNotification(`Group "${groupName}" created! Code: ${result.group.code}`, 'success');
            document.querySelector('.fixed').remove();
        } else {
            this.showNotification(result.error, 'error');
        }
    }

    async joinGroup() {
        const groupCode = document.getElementById('group-code').value.trim();
        if (!groupCode) return;

        const result = await window.mapManager.joinGroupByCode(groupCode);
        
        if (result.success) {
            this.showNotification(`Joined group "${result.group.name}"!`, 'success');
            document.querySelector('.fixed').remove();
        } else {
            this.showNotification(result.error, 'error');
        }
    }

    // Show location on map (called from chat location messages)
    showLocation(lat, lng) {
        if (window.mapManager && window.mapManager.map) {
            window.mapManager.map.setView([lat, lng], 16);
            
            // Add temporary marker
            const tempMarker = L.circleMarker([lat, lng], {
                radius: 15,
                fillColor: '#ff00ff',
                color: '#ffffff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(window.mapManager.map);

            // Remove after 5 seconds
            setTimeout(() => {
                window.mapManager.map.removeLayer(tempMarker);
            }, 5000);

            // Close chat view to show map
            if (window.chatManager) {
                window.chatManager.closeChatView();
            }
        }
    }

    // Emergency contact management
    async showEmergencyContactsManager() {
        try {
            const { data: contacts, error } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', this.authManager.currentUser.id);

            if (error) throw error;

            const dialog = document.createElement('div');
            dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto';
            dialog.innerHTML = `
                <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-md border border-gray-700">
                    <h3 class="text-lg font-semibold mb-4">Emergency Contacts</h3>
                    
                    <div id="contacts-list" class="space-y-3 mb-4">
                        ${contacts.map(contact => `
                            <div class="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <p class="font-medium">${contact.name}</p>
                                    <p class="text-sm text-gray-400">${contact.phone}</p>
                                    <p class="text-xs text-gray-500">${contact.relationship || ''}</p>
                                </div>
                                <button onclick="utilityManager.removeEmergencyContact('${contact.id}')" class="text-red-500">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                        
                        ${contacts.length === 0 ? '<p class="text-gray-400 text-center py-4">No emergency contacts added</p>' : ''}
                    </div>
                    
                    <button onclick="utilityManager.showAddEmergencyContactForm()" class="w-full bg-gold text-dark py-2 px-4 rounded-lg font-medium mb-3">
                        Add Contact
                    </button>
                    
                    <button onclick="this.closest('.fixed').remove()" class="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                        Close
                    </button>
                </div>
            `;

            document.body.appendChild(dialog);

        } catch (error) {
            console.error('Error loading emergency contacts:', error);
            this.showNotification('Failed to load emergency contacts', 'error');
        }
    }

    showAddEmergencyContactForm() {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-gray-900 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Add Emergency Contact</h3>
                
                <input type="text" id="contact-name" placeholder="Name" 
                       class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-gold">
                       
                <input type="tel" id="contact-phone" placeholder="Phone number" 
                       class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-gold">
                       
                <input type="text" id="contact-relationship" placeholder="Relationship (optional)" 
                       class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-gold">
                
                <div class="flex space-x-2">
                    <button onclick="utilityManager.addEmergencyContact()" class="flex-1 bg-gold text-dark py-2 px-4 rounded-lg font-medium">
                        Add
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    async addEmergencyContact() {
        const name = document.getElementById('contact-name').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();
        const relationship = document.getElementById('contact-relationship').value.trim();

        if (!name || !phone) {
            this.showNotification('Name and phone are required', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('emergency_contacts')
                .insert([
                    {
                        user_id: this.authManager.currentUser.id,
                        name,
                        phone,
                        relationship: relationship || null,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            this.showNotification('Emergency contact added!', 'success');
            document.querySelector('.fixed').remove();

        } catch (error) {
            console.error('Error adding emergency contact:', error);
            this.showNotification('Failed to add emergency contact', 'error');
        }
    }

    async removeEmergencyContact(contactId) {
        if (!confirm('Remove this emergency contact?')) return;

        try {
            const { error } = await supabase
                .from('emergency_contacts')
                .delete()
                .eq('id', contactId);

            if (error) throw error;

            this.showNotification('Emergency contact removed', 'success');
            
            // Refresh the list
            document.querySelector('.fixed').remove();
            this.showEmergencyContactsManager();

        } catch (error) {
            console.error('Error removing emergency contact:', error);
            this.showNotification('Failed to remove emergency contact', 'error');
        }
    }

    // Spotify integration placeholder
    async connectSpotify() {
        // This would integrate with Spotify Web API
        this.showNotification('Spotify integration coming soon!', 'info');
    }

    // Share app functionality
    shareApp() {
        if (navigator.share) {
            navigator.share({
                title: 'DrinkingBuddy',
                text: 'Stay Close. Party Hard. - Join me on DrinkingBuddy!',
                url: window.location.origin
            });
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(window.location.origin);
            this.showNotification('App link copied to clipboard!', 'success');
        }
    }

    // QR Code generator (placeholder)
    generateQRCode(data) {
        // In a real app, you'd use a QR code library like qrcode.js
        this.showNotification('QR Code generation coming soon!', 'info');
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
}

export default UtilityManager;
