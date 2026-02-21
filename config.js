// Supabase Configuration
// Replace these values with your actual Supabase project credentials
// Find them at: https://app.supabase.com/project/_/settings/api

// ⚠️ SECURITY WARNING:
// - Never commit this file with real credentials to public repositories
// - Consider using environment variables or a .env file for production
// - Add config.js to .gitignore if it contains sensitive data
// - The anon key below is publicly exposed - ensure RLS policies are properly configured

export const supabaseConfig = {
    // Your Supabase project URL
    url: "https://gptfbpktebajhvwvlfkd.supabase.co",
    
    // Your Supabase anonymous/public key (starts with "eyJ")
    // This key is exposed to the browser - security depends on RLS policies
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZicGt0ZWJhamh2d3ZsZmtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDkzOTQsImV4cCI6MjA4NjkyNTM5NH0.G5K-x2646_M_XJpdiA8lkFk2KeMASK68lUM7kT2vXDI"
};
