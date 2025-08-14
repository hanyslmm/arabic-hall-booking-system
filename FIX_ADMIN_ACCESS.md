# Fix Admin Access Issue

## Problem
After recent changes made by the ChatGPT AI agent, the admin user lost privileges to see data. The issue was caused by a migration that changed the user role system and may have overwritten the admin's role.

## Root Cause
The migration `20250120000000_comprehensive_user_privilege_overhaul.sql` unified the role system but in the process set all users to 'owner' role initially, which may have affected how the admin user's permissions are evaluated.

## Solution

### Option 1: Quick Fix via Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `/scripts/fix-admin-access.sql`
4. Run the script
5. Refresh your application

The script will:
- Update the admin user to have 'owner' role
- Fix the `is_admin_user()` function to properly detect admin users
- Add a protection trigger to prevent accidental role changes
- Verify that admin access is restored

### Option 2: Apply Migration File

If you have access to run migrations:

1. The migration file `/supabase/migrations/20250121000000_fix_admin_role_access.sql` has been created
2. Deploy it to your Supabase project:
   ```bash
   npx supabase db push
   ```

### Option 3: Manual Fix

If the above options don't work, manually run these SQL commands in your Supabase SQL Editor:

```sql
-- 1. Update admin user role
UPDATE public.profiles 
SET user_role = 'owner'
WHERE email = 'admin@system.local' OR username = 'admin';

-- 2. Verify the update
SELECT id, email, username, user_role 
FROM public.profiles 
WHERE email = 'admin@system.local' OR username = 'admin';
```

## What Changed in the Code

1. **Migration File Created**: `/supabase/migrations/20250121000000_fix_admin_role_access.sql`
   - Ensures admin user has 'owner' role
   - Fixes the `is_admin_user()` function
   - Updates RLS policies for admin access
   - Adds protection trigger to prevent role changes

2. **Updated useAuth Hook**: `/src/hooks/useAuth.tsx`
   - Added verification check when auto-fixing admin role
   - Better error handling and logging

3. **Helper Script Created**: `/scripts/fix-admin-access.sql`
   - Can be run directly in Supabase SQL Editor
   - Includes verification steps

## Verification

After applying the fix, verify that:

1. The admin user can log in
2. The dashboard shows data correctly
3. All statistics and occupancy data are visible
4. The admin can access all sections of the application

## Prevention

To prevent this issue in the future:

1. The protection trigger will prevent the admin role from being accidentally changed
2. The `is_admin_user()` function now has fallback checks for admin email/username
3. The useAuth hook will auto-fix the admin role if it detects an issue

## Need Help?

If you're still experiencing issues after applying these fixes:

1. Check the browser console for any error messages
2. Verify the admin user exists in the profiles table
3. Check that RLS is enabled on all tables
4. Ensure the admin user is properly authenticated