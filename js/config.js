// Supabase Configuration
// You'll need to replace these with your actual Supabase project credentials
// Get them from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

const SUPABASE_URL = 'https://uuwuklfvfyvlkwqgelnd.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d3VrbGZ2Znl2bGt3cWdlbG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTUzMzksImV4cCI6MjA2ODI3MTMzOX0.7JVU2_DLyxzwlbg8cwGlo55umccaVFv2_kFbnNHgb1k'; // Replace with your Supabase anon key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App configuration
const APP_CONFIG = {
    MAX_DISTANCE_ALERT: 200, // meters
    LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
    GROUP_AUTO_DELETE: 6 * 60 * 60 * 1000, // 6 hours
    BURN_AFTER_PARTY_HOURS: 6,
    
    // Admin configuration
    admin: {
        emails: [
            'ceo@drinkingbuddy.com', // Change this to your actual email
            'admin@drinkingbuddy.com' // Secondary admin email
        ],
        displayName: 'G' // Your preferred visible name
    },
    
    // Paddle configuration (replace with your actual keys)
    paddle: {
        vendorId: 'your_paddle_vendor_id_here', // Your Paddle vendor ID
        publicKey: 'your_paddle_public_key_here', // Your Paddle public key
        environment: 'sandbox', // Change to 'production' for live
        products: {
            premium: 'your_monthly_product_id', // $1.30/month product ID
            yearly: 'your_yearly_product_id' // $13/year product ID
        }
    },
    
    // AdMob configuration - your actual credentials
    admob: {
        android: {
            appId: 'ca-app-pub-8052656033181537~7112861732',
            bannerId: 'ca-app-pub-8052656033181537/1448120444',
            interstitialId: 'ca-app-pub-8052656033181537/3748331798'
        },
        ios: {
            appId: 'ca-app-pub-8052656033181537~1256548753',
            bannerId: 'ca-app-pub-8052656033181537/9438291108',
            interstitialId: 'ca-app-pub-8052656033181537/6317303747'
        }
    }
};

export { supabase, APP_CONFIG };

// Make globally accessible
window.supabase = supabase;
window.AppConfig = APP_CONFIG;
