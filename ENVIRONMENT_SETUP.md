# Environment Setup Guide

## Quick Start

1. **Copy the environment template**
   ```bash
   cp .env.example .env
   ```

2. **Get your Supabase credentials**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project (or create a new one)
   - Navigate to Settings → API
   - Copy the following values:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **Anon/Public Key** → `VITE_SUPABASE_ANON_KEY`

3. **Update your .env file**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Restart the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

## Troubleshooting

### Blank Page on Login
If you see a blank page when trying to login, this usually means:
- Environment variables are not set correctly
- The `.env` file is missing
- The development server needs to be restarted after adding the `.env` file

### Configuration Required Screen
If you see a "Configuration Required" screen, this means the app detected missing Supabase credentials. Follow the Quick Start steps above.

### Authentication Errors
If you can't log in even with correct credentials:
1. Verify your Supabase project is active
2. Check that the URL and key are copied correctly (no extra spaces)
3. Ensure your Supabase project has authentication enabled

## Security Notes

- **Never commit your `.env` file** to version control
- The `.env` file is already in `.gitignore` for your protection
- Only share the anon/public key, never the service role key
- For production, use environment variables provided by your hosting service

## Default Login Credentials

After setting up Supabase, you'll need to create users. The default admin login is:
- Username: `admin` or Email: `admin@system.local`
- Password: (set during initial setup)

## Need Help?

1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure Supabase project is properly configured
4. Contact your system administrator if issues persist