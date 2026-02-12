-- Debug script to check current database schema
-- This will help us understand what tables/columns actually exist

-- Check if profiles table exists and its columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check if user_roles table exists and its columns  
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;

-- Check if user_access_audit table exists and its columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_access_audit' 
ORDER BY ordinal_position;

-- Check if our RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('block_user_access', 'unblock_user_access')
ORDER BY routine_name;

-- Check sample data from profiles
SELECT id, name, email, is_blocked, blocked_at, blocked_by
FROM public.profiles 
LIMIT 3;

-- Check sample data from user_roles
SELECT user_id, is_super_director
FROM public.user_roles 
LIMIT 3;
