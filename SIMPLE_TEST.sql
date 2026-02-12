-- Simple test to verify broadcast visibility
-- Run this in Supabase SQL Editor

-- 1. Check if your broadcast exists
SELECT COUNT(*) as total_broadcasts FROM public.broadcast_messages;

-- 2. Check active broadcasts
SELECT COUNT(*) as active_broadcasts 
FROM public.broadcast_messages 
WHERE is_active = true;

-- 3. Check if your user can read broadcasts (simulate authenticated user)
-- This tests the RLS policy
SELECT COUNT(*) as readable_broadcasts 
FROM public.broadcast_messages 
WHERE is_active = true;

-- 4. Show all broadcast details
SELECT 
    id,
    title,
    is_active,
    publish_at,
    expires_at,
    created_at
FROM public.broadcast_messages 
ORDER BY created_at DESC;
