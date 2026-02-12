-- Debug script to check broadcast system setup
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check if broadcast_messages table exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'broadcast_messages';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'broadcast_messages'
ORDER BY ordinal_position;

-- 3. Check if create_broadcast function exists
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'create_broadcast';

-- 4. Check if RLS is enabled
SELECT rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'broadcast_messages';

-- 5. Check RLS policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'broadcast_messages';

-- 6. Test if we can query the table (should work for any authenticated user)
SELECT COUNT(*) as total_broadcasts 
FROM public.broadcast_messages;

-- 7. Test if Super Director can create a broadcast (replace with actual user ID)
-- First, let's see who is a Super Director:
SELECT u.id, u.name, u.email, r.is_super_director 
FROM public.profiles u 
LEFT JOIN public.user_roles r ON u.id = r.user_id 
WHERE r.is_super_director = true;
