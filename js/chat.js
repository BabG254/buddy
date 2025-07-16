import { supabase } from './config.js';

class ChatManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.currentChat = null;
        this.currentChatType = null; // 'group' or 'direct'
        this.messageSubscription = null;
        this.typingTimeouts = new Map();
    }

    async init() {
        this.setupEventListeners();
        await this.loadRecentChats();
        this.subscribeToMessages();
    }

    setupEventListeners() {
        // Chat tab click
        document.querySelector('[data-tab="chat"]').addEventListener('click', () => {
            this.openChatView();
        });

        // Back to map
        document.getElementById('back-to-map').addEventListener('click', () => {
            this.closeChatView();
        });

        // Send message
        const sendButton = document.querySelector('.chat-send-button');
        const messageInput = document.querySelector('.chat-message-input');
        
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
                
                // Typing indicator
                this.handleTyping();
            });
        }

        // Group chat button
        document.querySelector('[data-action="group-chat"]')?.addEventListener('click', () => {
            this.openGroupChat();
        });
    }

    async openChatView(chatId = null, chatType = 'group') {
        document.getElementById('chat-view').classList.remove('hidden');
        document.getElementById('map-view').classList.add('hidden');
        
        if (chatId) {
            await this.loadChat(chatId, chatType);
        } else {
            // Load default group chat
            await this.loadGroupChat();
        }
    }

    closeChatView() {
        document.getElementById('chat-view').classList.add('hidden');
        document.getElementById('map-view').classList.remove('hidden');
        
        // Reset tab selection
        document.querySelectorAll('.tab-icon').forEach(tab => tab.classList.remove('active'));
        document.querySelector('[data-tab="map"]').classList.add('active');
    }

    async loadGroupChat() {
        // Get user's current group
        if (!this.authManager.currentUser) return;

        try {
            const { data: membership, error } = await supabase
                .from('group_members')
                .select(`
                    group_id,
                    groups (
                        id, name, code
                    )
                `)
                .eq('user_id', this.authManager.currentUser.id)
                .order('joined_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !membership) {
                this.showNoGroupMessage();
                return;
            }

            await this.loadChat(membership.group_id, 'group');
        } catch (error) {
            console.error('Error loading group chat:', error);
            this.showNoGroupMessage();
        }
    }

    async loadChat(chatId, chatType) {
        this.currentChat = chatId;
        this.currentChatType = chatType;

        // Update chat header
        await this.updateChatHeader(chatId, chatType);
        
        // Load messages
        await this.loadMessages(chatId, chatType);
        
        // Mark messages as read
        await this.markMessagesAsRead(chatId, chatType);
    }

    async updateChatHeader(chatId, chatType) {
        const headerContainer = document.querySelector('.chat-header');
        if (!headerContainer) return;

        try {
            if (chatType === 'group') {
                const { data: group, error } = await supabase
                    .from('groups')
                    .select('name, code')
                    .eq('id', chatId)
                    .single();

                if (error) throw error;

                headerContainer.innerHTML = `
                    <button id="back-to-map" class="mr-3">
                        <i class="fas fa-arrow-left text-gold"></i>
                    </button>
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-gold rounded-full flex items-center justify-center mr-2">
                            <i class="fas fa-users text-dark text-sm"></i>
                        </div>
                        <div>
                            <h3 class="font-medium">${group.name}</h3>
                            <p class="text-xs text-gray-400">Group • Code: ${group.code}</p>
                        </div>
                    </div>
                    <button class="ml-auto text-electric">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                `;
            } else {
                // Direct chat header
                const { data: user, error } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, is_online')
                    .eq('id', chatId)
                    .single();

                if (error) throw error;

                headerContainer.innerHTML = `
                    <button id="back-to-map" class="mr-3">
                        <i class="fas fa-arrow-left text-gold"></i>
                    </button>
                    <div class="flex items-center">
                        <img src="${user.avatar_url}" class="w-8 h-8 rounded-full border border-gold mr-2">
                        <div>
                            <h3 class="font-medium">${user.username}</h3>
                            <p class="text-xs text-gray-400">${user.is_online ? 'Online' : 'Offline'}</p>
                        </div>
                    </div>
                    <button class="ml-auto text-electric">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                `;
            }

            // Re-attach back button listener
            document.getElementById('back-to-map').addEventListener('click', () => {
                this.closeChatView();
            });

        } catch (error) {
            console.error('Error updating chat header:', error);
        }
    }

    async loadMessages(chatId, chatType) {
        try {
            let query = supabase
                .from('messages')
                .select(`
                    *,
                    profiles!messages_user_id_fkey (
                        username, avatar_url
                    )
                `)
                .order('created_at', { ascending: true })
                .limit(50);

            if (chatType === 'group') {
                query = query.eq('group_id', chatId);
            } else {
                query = query.or(`and(user_id.eq.${this.authManager.currentUser.id},direct_to.eq.${chatId}),and(user_id.eq.${chatId},direct_to.eq.${this.authManager.currentUser.id})`);
            }

            const { data: messages, error } = await query;

            if (error) throw error;

            this.renderMessages(messages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const isOwn = message.user_id === this.authManager.currentUser.id;
        const div = document.createElement('div');
        div.className = `chat-bubble ${isOwn ? 'me' : 'friend'} slide-up`;

        const time = new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit', 
            minute: '2-digit'
        });

        if (message.type === 'location') {
            const locationData = JSON.parse(message.content);
            div.innerHTML = `
                <div class="bg-gray-800 rounded-lg p-2">
                    <div class="flex items-center">
                        <i class="fas fa-map-marker-alt text-electric mr-2"></i>
                        <div>
                            <p class="text-sm font-medium">Location Shared</p>
                            <p class="text-xs text-gray-400">${locationData.description || 'Current location'}</p>
                        </div>
                        <button onclick="mapManager.showLocation(${locationData.lat}, ${locationData.lng})" class="ml-auto text-electric text-xs">
                            View
                        </button>
                    </div>
                </div>
                <p class="text-xs text-gray-400 mt-1">
                    ${isOwn ? 'You' : message.profiles.username} - ${time}
                </p>
            `;
        } else {
            div.innerHTML = `
                <p>${this.escapeHtml(message.content)}</p>
                <p class="text-xs text-gray-400 mt-1">
                    ${isOwn ? 'You' : message.profiles.username} - ${time}
                </p>
            `;
        }

        return div;
    }

    async sendMessage() {
        const input = document.querySelector('.chat-message-input');
        if (!input || !input.value.trim() || !this.currentChat) return;

        const content = input.value.trim();
        input.value = '';

        try {
            const messageData = {
                user_id: this.authManager.currentUser.id,
                content: content,
                type: 'text',
                created_at: new Date().toISOString()
            };

            if (this.currentChatType === 'group') {
                messageData.group_id = this.currentChat;
            } else {
                messageData.direct_to = this.currentChat;
            }

            const { error } = await supabase
                .from('messages')
                .insert([messageData]);

            if (error) throw error;

            // Message will be added via real-time subscription
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Show error and restore message
            input.value = content;
            this.showNotification('Failed to send message', 'error');
        }
    }

    async sendLocationMessage() {
        if (!this.currentChat || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            
            const locationData = {
                lat: latitude,
                lng: longitude,
                description: 'Current location'
            };

            try {
                const messageData = {
                    user_id: this.authManager.currentUser.id,
                    content: JSON.stringify(locationData),
                    type: 'location',
                    created_at: new Date().toISOString()
                };

                if (this.currentChatType === 'group') {
                    messageData.group_id = this.currentChat;
                } else {
                    messageData.direct_to = this.currentChat;
                }

                const { error } = await supabase
                    .from('messages')
                    .insert([messageData]);

                if (error) throw error;

            } catch (error) {
                console.error('Error sending location:', error);
                this.showNotification('Failed to send location', 'error');
            }
        });
    }

    subscribeToMessages() {
        if (this.messageSubscription) {
            supabase.removeChannel(this.messageSubscription);
        }

        this.messageSubscription = supabase
            .channel('messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                this.handleNewMessage(payload.new);
            })
            .subscribe();
    }

    async handleNewMessage(message) {
        // Check if message is for current chat
        const isForCurrentChat = (
            (this.currentChatType === 'group' && message.group_id === this.currentChat) ||
            (this.currentChatType === 'direct' && (
                (message.user_id === this.currentChat && message.direct_to === this.authManager.currentUser.id) ||
                (message.user_id === this.authManager.currentUser.id && message.direct_to === this.currentChat)
            ))
        );

        if (isForCurrentChat) {
            // Get user info for the message
            const { data: user, error } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', message.user_id)
                .single();

            if (!error) {
                message.profiles = user;
                
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    const messageElement = this.createMessageElement(message);
                    messagesContainer.appendChild(messageElement);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }
        }

        // Update notification badge if not in current chat
        if (!isForCurrentChat && message.user_id !== this.authManager.currentUser.id) {
            this.updateNotificationBadge();
        }
    }

    async openDirectChat(userId) {
        await this.openChatView(userId, 'direct');
    }

    async addFriend(email) {
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

            return { success: true, message: `Friend request sent to ${user.username}` };
        } catch (error) {
            console.error('Error adding friend:', error);
            return { success: false, error: error.message };
        }
    }

    showNoGroupMessage() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="text-center text-gray-400 mt-8">
                    <i class="fas fa-users text-4xl mb-4 opacity-50"></i>
                    <p>You're not in any group yet</p>
                    <button onclick="this.showCreateGroupDialog()" class="mt-4 bg-gold text-dark px-4 py-2 rounded-lg font-medium">
                        Create or Join Group
                    </button>
                </div>
            `;
        }
    }

    showCreateGroupDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-dark-800 rounded-xl p-6 m-4 w-full max-w-sm border border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Group Options</h3>
                
                <div class="space-y-3">
                    <button onclick="this.showCreateGroupForm()" class="w-full bg-gold text-dark py-2 px-4 rounded-lg font-medium">
                        Create New Group
                    </button>
                    
                    <button onclick="this.showJoinGroupForm()" class="w-full bg-gray-700 text-white py-2 px-4 rounded-lg font-medium">
                        Join Existing Group
                    </button>
                    
                    <button onclick="this.closeDialog()" class="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Close dialog functionality
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }

    handleTyping() {
        if (!this.currentChat) return;

        // Clear existing timeout
        if (this.typingTimeouts.has(this.currentChat)) {
            clearTimeout(this.typingTimeouts.get(this.currentChat));
        }

        // Set typing indicator
        this.setTypingIndicator(true);

        // Clear typing indicator after 2 seconds
        const timeout = setTimeout(() => {
            this.setTypingIndicator(false);
        }, 2000);

        this.typingTimeouts.set(this.currentChat, timeout);
    }

    async setTypingIndicator(isTyping) {
        // In a real app, you'd send this to other users
        // For now, we'll just store it locally
    }

    updateNotificationBadge() {
        const badge = document.querySelector('[data-tab="chat"] .notification-badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + 1;
        }
    }

    async markMessagesAsRead(chatId, chatType) {
        // Reset notification badge
        const badge = document.querySelector('[data-tab="chat"] .notification-badge');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }

        // In a real app, you'd mark messages as read in the database
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg text-white max-w-sm ${
            type === 'success' ? 'bg-green-600' :
            type === 'error' ? 'bg-red-600' :
            type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    destroy() {
        if (this.messageSubscription) {
            supabase.removeChannel(this.messageSubscription);
        }
        
        // Clear typing timeouts
        this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.typingTimeouts.clear();
    }
}

export default ChatManager;
