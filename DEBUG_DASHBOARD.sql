-- Debug script to check why broadcasts aren't showing on dashboard
-- Run this in Supabase SQL Editor

-- 1. Check if broadcasts exist in database
SELECT 
    id, 
    title, 
    message, 
    type, 
    is_pinned, 
    is_active, 
    created_by, 
    created_at, 
    publish_at, 
    expires_at
FROM public.broadcast_messages 
ORDER BY created_at DESC;

-- 2. Test the exact query the frontend uses
SELECT *
FROM public.broadcast_messages
WHERE is_active = true
  AND publish_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
ORDER BY is_pinned DESC, created_at DESC;

-- 3. Check RLS policies - are they blocking the query?
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'broadcast_messages';

-- 4. Test if your user can read broadcasts (replace with your actual user ID)
-- First, get your user ID:
SELECT id, name, email 
FROM public.profiles 
WHERE email = 'your-email@example.com'; -- Replace with your email

-- Then test with your user ID:
-- SET LOCAL ROLE authenticated; -- This simulates the frontend context
-- SELECT COUNT(*) FROM public.broadcast_messages WHERE is_active = true;
