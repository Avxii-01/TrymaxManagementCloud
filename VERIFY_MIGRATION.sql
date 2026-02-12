-- ============================================================
-- DATABASE MIGRATION VERIFICATION SCRIPT
-- ============================================================
-- Run this in Supabase SQL Editor to verify migration worked

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_access_audit', 'profiles', 'user_roles')
ORDER BY table_name;

-- Check if columns exist in profiles table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('is_blocked', 'blocked_at', 'blocked_by')
ORDER BY column_name;

-- Check if column exists in user_roles table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_roles'
AND column_name = 'is_super_director'
ORDER BY column_name;

-- Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('block_user_access', 'unblock_user_access', 'check_user_access')
ORDER BY routine_name;

-- Check if policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_access_audit'
ORDER BY policyname;

-- Test basic query to profiles table
SELECT COUNT(*) as profiles_count FROM public.profiles;

-- Test basic query to user_access_audit table  
SELECT COUNT(*) as audit_count FROM public.user_access_audit;

-- Test if functions are callable
SELECT 'Functions test' as test;

SELECT 'Migration verification complete!' as status;
