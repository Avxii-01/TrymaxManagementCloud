-- Force refresh user metadata to match database role
-- This updates the user's auth metadata to reflect the new database role

-- Step 1: Get the user's current database role
SELECT user_id, role 
FROM public.user_roles 
WHERE user_id = 'USER_UUID_HERE';  -- Replace with actual user_id

-- Step 2: Update user metadata to match database role
-- Run this in Supabase SQL Editor or via admin API
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'),
    '{role}',
    '"director"'::jsonb
)
WHERE id = 'USER_UUID_HERE';  -- Replace with actual user_id

-- Step 3: Verify the metadata update
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE id = 'USER_UUID_HERE';  -- Replace with actual user_id

-- Alternative: Use Supabase Admin Function
-- This forces the user to refresh their session
SELECT auth.admin.refresh_user_session('USER_UUID_HERE');
