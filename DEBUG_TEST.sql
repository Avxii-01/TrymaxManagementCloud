-- SIMPLE DEBUG TEST --
-- Run this in Supabase SQL Editor to test if functions exist

SELECT 'Testing if functions exist...' as status;

-- Test if check_user_access function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'check_user_access' 
AND routine_schema = 'public';

-- Test if block_user_access function exists  
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'block_user_access' 
AND routine_schema = 'public';

-- Test if profiles table has is_blocked column
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_blocked';

-- Test if user_access_audit table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_access_audit';
