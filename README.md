# DrinkingBuddy - Setup Guide

## 🚀 Quick Start

### 1. Backend Setup (Supabase)

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account
   - Create a new project

2. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy your `Project URL` and `anon/public key`

3. **Update Configuration**
   - Open `js/config.js`
   - Replace `YOUR_SUPABASE_URL` with your Project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

4. **Setup Database**
   - Go to Supabase SQL Editor
   - Copy and paste the entire contents of `database/schema.sql`
   - Execute the script

5. **Configure Authentication**
   - Go to Authentication → Settings
   - Add your domain to "Site URL" (e.g., `http://localhost:3000`)
   - Enable Google OAuth (optional)

### 2. Frontend Setup

1. **Clone/Download the project**
2. **Serve the files** using any static server:

   ```bash
   # Using Python
   python -m http.server 3000
   
   # Using Node.js (http-server)
   npx http-server -p 3000
   
   # Using Live Server (VS Code extension)
   Right-click index.html → "Open with Live Server"
   ```

3. **Open in browser**: `http://localhost:3000`

## 🔧 Configuration Options

### Environment Variables (js/config.js)

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
6. In Supabase Authentication → Settings → Auth Providers:
   - Enable Google
   - Add your Client ID and Client Secret

## 📱 Features Overview

### ✅ Implemented Features

- **Real-time Authentication** (Email/Password + Google OAuth)
- **Live Location Tracking** with Leaflet maps
- **Real-time Group Chat** with location sharing
- **Friend System** (add/remove friends)
- **Group Management** (create/join with codes)
- **Safety Features** (emergency alerts, panic mode)
- **Vibe Mode** (adaptive UI based on time)
- **Profile Management** with settings
- **Mobile-first Responsive Design**
- **Real-time Updates** (friends, messages, locations)

### 🛡️ Security Features

- **Row Level Security (RLS)** on all database tables
- **Location Auto-delete** after 6 hours ("Burn After Party")
- **Emergency Contact System**
- **Panic Mode** (triple-tap activation)
- **Safe Ride Integration** ready

### 📊 Database Schema

The app uses 8 main tables:
- `profiles` - User profiles and settings
- `user_locations` - Real-time location data
- `groups` - Party/event groups
- `group_members` - Group membership
- `friendships` - Friend connections
- `messages` - Chat messages
- `pings` - Location requests/alerts
- `emergency_contacts` - Safety contacts

## 🎨 Customization

### Themes & Colors

Edit the CSS variables in `index.html`:

```css
:root {
    --gold: #d4af37;
    --neon: #ccff00;
    --electric: #7df9ff;
    --magenta: #ff00ff;
    --dark: #121212;
}
```

### Vibe Mode Colors

Modify `app.js` → `applyVibeMode()` function:

```javascript
updateVibeColors(['#ff00ff', '#ccff00', '#7df9ff']);
```

## 📱 Mobile Deployment

### Progressive Web App (PWA)

Add a `manifest.json`:

```json
{
  "name": "DrinkingBuddy",
  "short_name": "DrinkBuddy",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#121212",
  "theme_color": "#d4af37",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### Deployment Options

1. **Vercel** (Recommended)
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**
   - Drag and drop folder to netlify.com
   - Or connect Git repository

3. **GitHub Pages**
   - Push to GitHub repository
   - Enable Pages in repository settings

## 🔧 Troubleshooting

### Common Issues

1. **"Supabase not loaded" error**
   - Check internet connection
   - Verify CDN links are working

2. **Location not working**
   - Enable location permissions in browser
   - Use HTTPS (required for geolocation)

3. **Authentication fails**
   - Check Supabase configuration
   - Verify Site URL in Supabase settings

4. **Real-time not working**
   - Check Supabase RLS policies
   - Verify user authentication

### Production Checklist

- [ ] Update Supabase URLs in config
- [ ] Enable RLS policies
- [ ] Configure authentication providers
- [ ] Set up custom domain
- [ ] Test on mobile devices
- [ ] Configure HTTPS
- [ ] Set up monitoring

## 💰 Monetization Ready

The app includes:
- Ad placeholder containers
- Subscription model hooks
- Payment integration points
- Premium feature flags

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

**DrinkingBuddy** - Stay Close. Party Hard. 🍻
