import { supabase, APP_CONFIG } from './config.js';

class MapManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.map = null;
        this.userMarker = null;
        this.friendMarkers = new Map();
        this.currentLocation = null;
        this.watchId = null;
        this.friends = new Map();
        this.currentGroup = null;
    }

    async init() {
        // Initialize Leaflet map
        this.map = L.map('map-container', {
            center: [40.7128, -74.0060], // Default to NYC
            zoom: 15,
            zoomControl: false
        });

        // Add tile layer (using OpenStreetMap - completely free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add zoom control in bottom right
        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);

        // Start location tracking
        this.startLocationTracking();
        
        // Load friends and group data
        await this.loadFriends();
        await this.loadCurrentGroup();
        
        // Subscribe to real-time updates
        this.subscribeToLocationUpdates();
        this.subscribeToGroupUpdates();
    }

    startLocationTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        };

        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => this.updateUserLocation(position),
            (error) => this.handleLocationError(error),
            options
        );

        // Watch position changes
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.updateUserLocation(position),
            (error) => this.handleLocationError(error),
            options
        );
    }

    async updateUserLocation(position) {
        const { latitude, longitude } = position.coords;
        this.currentLocation = { lat: latitude, lng: longitude };

        // Update map center on first location
        if (!this.userMarker) {
            this.map.setView([latitude, longitude], 15);
        }

        // Update or create user marker
        if (this.userMarker) {
            this.userMarker.setLatLng([latitude, longitude]);
        } else {
            this.userMarker = L.circleMarker([latitude, longitude], {
                radius: 12,
                fillColor: '#7df9ff',
                color: '#d4af37',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            // Add user avatar to marker
            const user = await this.getUserProfile();
            if (user && user.avatar_url) {
                this.userMarker.bindPopup(`
                    <div class="text-center">
                        <img src="${user.avatar_url}" class="w-12 h-12 rounded-full mx-auto mb-2">
                        <p class="font-semibold">${user.username || 'You'}</p>
                        <p class="text-xs text-gray-500">Your location</p>
                    </div>
                `);
            }
        }

        // Update location in database
        await this.saveLocationToDatabase(latitude, longitude);
        
        // Check distance from group
        this.checkDistanceFromGroup();
    }

    async saveLocationToDatabase(lat, lng) {
        if (!this.authManager.currentUser) return;

        try {
            const { error } = await supabase
                .from('user_locations')
                .upsert({
                    user_id: this.authManager.currentUser.id,
                    latitude: lat,
                    longitude: lng,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error saving location:', error);
        }
    }

    async getUserProfile() {
        if (!this.authManager.currentUser) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.authManager.currentUser.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    async loadFriends() {
        if (!this.authManager.currentUser) return;

        try {
            // Get user's friends
            const { data: friendships, error: friendsError } = await supabase
                .from('friendships')
                .select(`
                    friend_id,
                    profiles!friendships_friend_id_fkey (
                        id, username, avatar_url, is_online, last_seen
                    )
                `)
                .eq('user_id', this.authManager.currentUser.id)
                .eq('status', 'accepted');

            if (friendsError) throw friendsError;

            // Get friend locations
            const friendIds = friendships.map(f => f.friend_id);
            if (friendIds.length === 0) return;

            const { data: locations, error: locError } = await supabase
                .from('user_locations')
                .select('*')
                .in('user_id', friendIds);

            if (locError) throw locError;

            // Update friends map and markers
            friendships.forEach(friendship => {
                const friend = friendship.profiles;
                const location = locations.find(l => l.user_id === friend.id);
                
                this.friends.set(friend.id, {
                    ...friend,
                    location: location
                });

                this.updateFriendMarker(friend, location);
            });

            this.updateFriendsList();
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    updateFriendMarker(friend, location) {
        if (!location) {
            // Remove marker if no location
            if (this.friendMarkers.has(friend.id)) {
                this.map.removeLayer(this.friendMarkers.get(friend.id));
                this.friendMarkers.delete(friend.id);
            }
            return;
        }

        const { latitude, longitude } = location;
        
        if (this.friendMarkers.has(friend.id)) {
            // Update existing marker
            this.friendMarkers.get(friend.id).setLatLng([latitude, longitude]);
        } else {
            // Create new marker
            const marker = L.circleMarker([latitude, longitude], {
                radius: 10,
                fillColor: friend.is_online ? '#ccff00' : '#666',
                color: '#d4af37',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            marker.bindPopup(`
                <div class="text-center">
                    <img src="${friend.avatar_url}" class="w-12 h-12 rounded-full mx-auto mb-2">
                    <p class="font-semibold">${friend.username}</p>
                    <p class="text-xs text-gray-500">${friend.is_online ? 'Online' : `Last seen: ${new Date(friend.last_seen).toLocaleTimeString()}`}</p>
                    <div class="mt-2 space-y-1">
                        <button onclick="mapManager.pingFriend('${friend.id}')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs w-full">Ping</button>
                        <button onclick="chatManager.openDirectChat('${friend.id}')" class="bg-green-500 text-white px-2 py-1 rounded text-xs w-full">Chat</button>
                    </div>
                </div>
            `);

            this.friendMarkers.set(friend.id, marker);
        }
    }

    async pingFriend(friendId) {
        try {
            const { error } = await supabase
                .from('pings')
                .insert({
                    from_user_id: this.authManager.currentUser.id,
                    to_user_id: friendId,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            
            // Show success message
            this.showNotification('Ping sent!', 'success');
        } catch (error) {
            console.error('Error sending ping:', error);
            this.showNotification('Failed to send ping', 'error');
        }
    }

    subscribeToLocationUpdates() {
        if (!this.authManager.currentUser) return;

        // Subscribe to friend location updates
        supabase
            .channel('location_updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_locations'
            }, (payload) => {
                this.handleLocationUpdate(payload);
            })
            .subscribe();
    }

    handleLocationUpdate(payload) {
        const { new: newLocation, old: oldLocation, eventType } = payload;
        
        if (eventType === 'DELETE' || !newLocation) return;
        
        // Update friend marker if it's a friend
        const friend = this.friends.get(newLocation.user_id);
        if (friend) {
            friend.location = newLocation;
            this.updateFriendMarker(friend, newLocation);
        }
    }

    async createGroup(groupName) {
        if (!this.authManager.currentUser) return;

        try {
            const groupCode = this.generateGroupCode();
            
            const { data, error } = await supabase
                .from('groups')
                .insert({
                    name: groupName,
                    code: groupCode,
                    creator_id: this.authManager.currentUser.id,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + APP_CONFIG.GROUP_AUTO_DELETE).toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Add creator to group
            await this.joinGroup(data.id, this.authManager.currentUser.id);
            
            this.currentGroup = data;
            this.updateGroupDisplay();
            
            return { success: true, group: data };
        } catch (error) {
            console.error('Error creating group:', error);
            return { success: false, error: error.message };
        }
    }

    async joinGroupByCode(code) {
        try {
            const { data: group, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('code', code.toUpperCase())
                .gt('expires_at', new Date().toISOString())
                .single();

            if (groupError) throw new Error('Invalid or expired group code');

            await this.joinGroup(group.id, this.authManager.currentUser.id);
            
            this.currentGroup = group;
            this.updateGroupDisplay();
            
            return { success: true, group };
        } catch (error) {
            console.error('Error joining group:', error);
            return { success: false, error: error.message };
        }
    }

    async joinGroup(groupId, userId) {
        const { error } = await supabase
            .from('group_members')
            .insert({
                group_id: groupId,
                user_id: userId,
                joined_at: new Date().toISOString()
            });

        if (error) throw error;
    }

    generateGroupCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    updateGroupDisplay() {
        const groupInfo = document.querySelector('.group-info');
        if (this.currentGroup && groupInfo) {
            groupInfo.innerHTML = `
                <div class="flex items-center mb-2">
                    <h3 class="font-semibold">${this.currentGroup.name}</h3>
                    <span class="ml-2 text-xs bg-magenta bg-opacity-20 text-magenta px-2 py-1 rounded-full">Active</span>
                </div>
                <p class="text-xs text-gray-400 mb-2">Code: ${this.currentGroup.code}</p>
                <div class="flex -space-x-2" id="group-avatars">
                    <!-- Group member avatars will be inserted here -->
                </div>
            `;
        }
    }

    checkDistanceFromGroup() {
        if (!this.currentLocation || this.friends.size === 0) return;

        let minDistance = Infinity;
        let closestFriend = null;

        this.friends.forEach(friend => {
            if (friend.location) {
                const distance = this.calculateDistance(
                    this.currentLocation.lat,
                    this.currentLocation.lng,
                    friend.location.latitude,
                    friend.location.longitude
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestFriend = friend;
                }
            }
        });

        if (minDistance > APP_CONFIG.MAX_DISTANCE_ALERT) {
            this.showDistanceAlert(minDistance, closestFriend);
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lng2-lng1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    showDistanceAlert(distance, friend) {
        const distanceKm = (distance / 1000).toFixed(2);
        this.showNotification(
            `You're ${distanceKm}km away from ${friend.username}!`, 
            'warning'
        );
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

    updateFriendsList() {
        const friendsContainer = document.querySelector('.friends-grid');
        if (!friendsContainer) return;

        friendsContainer.innerHTML = '';

        this.friends.forEach(friend => {
            const distance = friend.location && this.currentLocation ? 
                this.calculateDistance(
                    this.currentLocation.lat,
                    this.currentLocation.lng,
                    friend.location.latitude,
                    friend.location.longitude
                ) : null;

            const distanceText = distance ? 
                distance < 1000 ? `${Math.round(distance)}m away` : `${(distance/1000).toFixed(1)}km away` :
                `Last seen ${friend.last_seen ? new Date(friend.last_seen).toLocaleTimeString() : 'Unknown'}`;

            const friendElement = document.createElement('div');
            friendElement.className = 'bg-gray-900 rounded-xl p-3 flex items-center';
            friendElement.innerHTML = `
                <div class="relative mr-3">
                    <img src="${friend.avatar_url}" class="w-12 h-12 rounded-full border-2 ${friend.is_online ? 'border-gold' : 'border-gray-600'}">
                    <span class="absolute bottom-0 right-0 w-3 h-3 ${friend.is_online ? 'bg-neon' : 'bg-gray-500'} rounded-full border border-dark"></span>
                </div>
                <div class="flex-1">
                    <h3 class="font-medium">${friend.username}</h3>
                    <p class="text-xs text-gray-400">${distanceText}</p>
                </div>
                <button onclick="mapManager.centerOnFriend('${friend.id}')" class="text-electric">
                    <i class="fas fa-location-arrow"></i>
                </button>
            `;

            friendsContainer.appendChild(friendElement);
        });
    }

    centerOnFriend(friendId) {
        const friend = this.friends.get(friendId);
        if (friend && friend.location) {
            this.map.setView([friend.location.latitude, friend.location.longitude], 16);
            
            // Open friend's popup
            const marker = this.friendMarkers.get(friendId);
            if (marker) {
                marker.openPopup();
            }
        }
    }

    handleLocationError(error) {
        console.error('Location error:', error);
        let message = 'Unable to get your location. ';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Please enable location permissions.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Location information unavailable.';
                break;
            case error.TIMEOUT:
                message += 'Location request timed out.';
                break;
        }
        
        this.showNotification(message, 'error');
    }

    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        if (this.map) {
            this.map.remove();
        }
    }
}

export default MapManager;
